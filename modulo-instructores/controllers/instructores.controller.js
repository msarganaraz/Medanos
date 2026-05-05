const db = require('../../database/db');
const { calcularLiquidacion } = require('../services/liquidacion');

function obtenerInstructores(req, res) {
  try {
    const instructores = db.prepare('SELECT * FROM instructores WHERE activo = 1 ORDER BY apellido').all();
    res.json({ success: true, instructores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerInstructor(req, res) {
  const { id } = req.params;
  try {
    const instructor = db.prepare('SELECT * FROM instructores WHERE id = ?').get(id);
    if (!instructor) return res.status(404).json({ success: false, error: 'Instructor no encontrado' });
    const franjaRows = db.prepare(`
      SELECT a.id as actividad_id, a.nombre as actividad_nombre,
        f.dia_semana, f.hora_inicio, f.hora_fin
      FROM actividades a
      JOIN franjas_horarias f ON f.actividad_id = a.id
      JOIN instructor_franjas inf ON inf.franja_id = f.id
      WHERE inf.instructor_id = ? AND a.activo = 1
      ORDER BY a.nombre, f.dia_semana, f.hora_inicio
    `).all(id);

    const actMap = {};
    franjaRows.forEach(function(row) {
      if (!actMap[row.actividad_id]) {
        actMap[row.actividad_id] = { id: row.actividad_id, nombre: row.actividad_nombre, franjas: [] };
      }
      actMap[row.actividad_id].franjas.push({ dia_semana: row.dia_semana, hora_inicio: row.hora_inicio, hora_fin: row.hora_fin });
    });
    const actividades = Object.values(actMap);
    res.json({ success: true, instructor, actividades });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function crearInstructor(req, res) {
  const { apellido, nombre, tipo_contrato, monto_fijo, valor_hora, valor_por_alumno, telefono, email } = req.body;
  if (!apellido || !nombre || !tipo_contrato) {
    return res.json({ success: false, error: 'Faltam campos requeridos' });
  }
  try {
    const result = db.prepare(`
      INSERT INTO instructores (apellido, nombre, tipo_contrato, monto_fijo, valor_hora, valor_por_alumno, telefono, email, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(apellido, nombre, tipo_contrato, monto_fijo || 0, valor_hora || 0, valor_por_alumno || 0, telefono || null, email || null);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function editarInstructor(req, res) {
  const { id } = req.params;
  const { apellido, nombre, tipo_contrato, monto_fijo, valor_hora, valor_por_alumno, telefono, email, activo } = req.body;
  if (!apellido || !nombre || !tipo_contrato) {
    return res.json({ success: false, error: 'Faltam campos requeridos' });
  }
  try {
    db.prepare(`
      UPDATE instructores SET apellido = ?, nombre = ?, tipo_contrato = ?, monto_fijo = ?, valor_hora = ?, valor_por_alumno = ?, telefono = ?, email = ?, activo = ?
      WHERE id = ?
    `).run(apellido, nombre, tipo_contrato, monto_fijo || 0, valor_hora || 0, valor_por_alumno || 0, telefono || null, email || null, activo ? 1 : 0, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function generarLiquidacion(req, res) {
  const { instructor_id, periodo, horas, alumnos } = req.body;
  if (!instructor_id || !periodo) {
    return res.json({ success: false, error: 'instructor_id y periodo son requeridos' });
  }
  try {
    const instructor = db.prepare('SELECT * FROM instructores WHERE id = ?').get(instructor_id);
    if (!instructor) return res.status(404).json({ success: false, error: 'Instructor no encontrado' });

    const monto_calculado = calcularLiquidacion(instructor, { horas: horas || 0, alumnos: alumnos || 0 });

    const result = db.prepare(`
      INSERT INTO liquidaciones (instructor_id, periodo, monto_calculado, estado, detalle_json)
      VALUES (?, ?, ?, 'BORRADOR', ?)
    `).run(instructor_id, periodo, monto_calculado, JSON.stringify({ horas, alumnos }));

    res.json({ success: true, id: result.lastInsertRowid, monto_calculado });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerLiquidaciones(req, res) {
  try {
    const liquidaciones = db.prepare(`
      SELECT l.*, i.apellido, i.nombre FROM liquidaciones l
      JOIN instructores i ON l.instructor_id = i.id
      ORDER BY l.periodo DESC
    `).all();
    res.json({ success: true, liquidaciones });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function aprobarLiquidacion(req, res) {
  const { id } = req.params;
  try {
    db.prepare('UPDATE liquidaciones SET estado = ? WHERE id = ?').run('APROBADA', id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function pagarLiquidacion(req, res) {
  const { id } = req.params;
  try {
    const liquidacion = db.prepare('SELECT * FROM liquidaciones WHERE id = ?').get(id);
    if (!liquidacion) return res.status(404).json({ success: false, error: 'Liquidación no encontrada' });

    const fecha_pago = new Date().toISOString().split('T')[0];
    db.prepare('UPDATE liquidaciones SET estado = ?, monto_pagado = ?, fecha_pago = ? WHERE id = ?').run('PAGADA', liquidacion.monto_calculado, fecha_pago, id);

    db.prepare(`
      INSERT INTO movimientos_caja (fecha, tipo, concepto, importe, referencia_id, referencia_tipo, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(fecha_pago, 'egreso', `Liquidación instructor ID ${liquidacion.instructor_id}`, liquidacion.monto_calculado, id, 'liquidacion', req.session.usuario.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerInstructores,
  obtenerInstructor,
  crearInstructor,
  editarInstructor,
  generarLiquidacion,
  obtenerLiquidaciones,
  aprobarLiquidacion,
  pagarLiquidacion
};
