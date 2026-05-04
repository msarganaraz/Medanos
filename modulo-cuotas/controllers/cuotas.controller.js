const db = require('../../database/db');
const { calcularMontoCuota } = require('../services/cuotas.logic');

function obtenerPlanes(req, res) {
  try {
    const planes = db.prepare('SELECT * FROM planes_cuota ORDER BY nombre').all();
    res.json({ success: true, planes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function crearPlan(req, res) {
  const { nombre, descripcion, monto, tipo } = req.body;
  if (!nombre || monto === undefined) {
    return res.json({ success: false, error: 'Nombre y monto son requeridos' });
  }
  try {
    const result = db.prepare(`
      INSERT INTO planes_cuota (nombre, descripcion, monto, tipo)
      VALUES (?, ?, ?, ?)
    `).run(nombre, descripcion || null, monto, tipo || null);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function editarPlan(req, res) {
  const { id } = req.params;
  const { nombre, descripcion, monto, tipo } = req.body;
  if (!nombre || monto === undefined) {
    return res.json({ success: false, error: 'Nombre y monto son requeridos' });
  }
  try {
    db.prepare('UPDATE planes_cuota SET nombre = ?, descripcion = ?, monto = ?, tipo = ? WHERE id = ?').run(nombre, descripcion || null, monto, tipo || null, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerCuotas(req, res) {
  try {
    const cuotas = db.prepare(`
      SELECT c.*, s.apellido, s.nombre FROM cuotas c
      JOIN socios s ON c.socio_id = s.id
      ORDER BY c.periodo DESC, s.apellido
    `).all();
    res.json({ success: true, cuotas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function generarCuotasDelMes(req, res) {
  try {
    const ahora = new Date();
    const periodo = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
    const vencimiento = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-10`;

    const socios = db.prepare('SELECT id FROM socios WHERE estado = "ACTIVO"').all();
    let generadas = 0;

    for (const socio of socios) {
      const plan = db.prepare('SELECT p.* FROM planes_cuota p JOIN socio_planes sp ON p.id = sp.plan_id WHERE sp.socio_id = ? AND (sp.fecha_hasta IS NULL OR sp.fecha_hasta > ?)').get(socio.id, new Date().toISOString().split('T')[0]);

      if (plan) {
        const monto = calcularMontoCuota(plan);
        const existe = db.prepare('SELECT id FROM cuotas WHERE socio_id = ? AND periodo = ?').get(socio.id, periodo);

        if (!existe) {
          db.prepare('INSERT INTO cuotas (socio_id, periodo, monto_total, estado, fecha_vencimiento) VALUES (?, ?, ?, "PENDIENTE", ?)').run(socio.id, periodo, monto, vencimiento);
          generadas++;
        }
      }
    }

    res.json({ success: true, message: `${generadas} cuotas generadas para ${periodo}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function registrarPago(req, res) {
  const { cuota_id, importe, medio_pago } = req.body;
  if (!cuota_id || !importe) {
    return res.json({ success: false, error: 'cuota_id e importe son requeridos' });
  }
  try {
    const cuota = db.prepare('SELECT * FROM cuotas WHERE id = ?').get(cuota_id);
    if (!cuota) return res.status(404).json({ success: false, error: 'Cuota no encontrada' });

    const fecha_pago = new Date().toISOString().split('T')[0];
    const result = db.prepare('INSERT INTO pagos (cuota_id, socio_id, fecha_pago, importe, medio_pago, usuario_id) VALUES (?, ?, ?, ?, ?, ?)').run(cuota_id, cuota.socio_id, fecha_pago, importe, medio_pago || null, req.session.usuario.id);

    const totalPagado = db.prepare('SELECT COALESCE(SUM(importe), 0) as total FROM pagos WHERE cuota_id = ?').get(cuota_id);
    const nuevaEstado = totalPagado.total >= cuota.monto_total ? 'PAGADA' : 'PENDIENTE';
    db.prepare('UPDATE cuotas SET estado = ? WHERE id = ?').run(nuevaEstado, cuota_id);

    db.prepare('INSERT INTO movimientos_caja (fecha, tipo, concepto, importe, referencia_id, referencia_tipo, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(fecha_pago, 'ingreso', `Pago cuota socio ${cuota.socio_id}`, importe, result.lastInsertRowid, 'pago', req.session.usuario.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerPlanes,
  crearPlan,
  editarPlan,
  obtenerCuotas,
  generarCuotasDelMes,
  registrarPago
};
