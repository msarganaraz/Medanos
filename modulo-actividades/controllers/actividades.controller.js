const db = require('../../database/db');

function obtenerActividades(req, res) {
  try {
    const actividades = db.prepare('SELECT * FROM actividades WHERE activo = 1 ORDER BY nombre').all();
    res.json({ success: true, actividades });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerActividad(req, res) {
  const { id } = req.params;
  try {
    const actividad = db.prepare('SELECT * FROM actividades WHERE id = ?').get(id);
    if (!actividad) return res.status(404).json({ success: false, error: 'Actividad no encontrada' });

    const instructores = db.prepare(`
      SELECT i.id, i.apellido, i.nombre FROM instructores i
      JOIN instructor_actividades ia ON i.id = ia.instructor_id
      WHERE ia.actividad_id = ?
    `).all(id);

    res.json({ success: true, actividad, instructores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function crearActividad(req, res) {
  const { nombre, descripcion, dias_horario, precio_base } = req.body;

  if (!nombre) {
    return res.json({ success: false, error: 'Nombre es requerido' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO actividades (nombre, descripcion, dias_horario, precio_base, activo)
      VALUES (?, ?, ?, ?, 1)
    `).run(nombre, descripcion || null, dias_horario || null, precio_base || 0);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function editarActividad(req, res) {
  const { id } = req.params;
  const { nombre, descripcion, dias_horario, precio_base, activo } = req.body;

  if (!nombre) {
    return res.json({ success: false, error: 'Nombre es requerido' });
  }

  try {
    db.prepare(`
      UPDATE actividades SET nombre = ?, descripcion = ?, dias_horario = ?, precio_base = ?, activo = ?
      WHERE id = ?
    `).run(nombre, descripcion || null, dias_horario || null, precio_base || 0, activo ? 1 : 0, id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function asignarInstructor(req, res) {
  const { actividad_id } = req.params;
  const { instructor_id } = req.body;

  if (!instructor_id) {
    return res.json({ success: false, error: 'instructor_id es requerido' });
  }

  try {
    const existe = db.prepare('SELECT id FROM instructor_actividades WHERE instructor_id = ? AND actividad_id = ?').get(instructor_id, actividad_id);
    if (existe) {
      return res.json({ success: false, error: 'El instructor ya está asignado a esta actividad' });
    }

    db.prepare(`
      INSERT INTO instructor_actividades (instructor_id, actividad_id)
      VALUES (?, ?)
    `).run(instructor_id, actividad_id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerActividades,
  obtenerActividad,
  crearActividad,
  editarActividad,
  asignarInstructor
};
