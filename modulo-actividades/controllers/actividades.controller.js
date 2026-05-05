const db = require('../../database/db');
const {
  obtenerFranjasActividad,
  obtenerDetallesFranja,
  agregarSocioAFranja,
  quitarSocioDeFranja,
  agregarInstructorAFranja,
  quitarInstructorDeFranja
} = require('../services/franjas.service');

function obtenerActividades(req, res) {
  try {
    const actividades = db.prepare(`
      SELECT id, nombre, descripcion, precio_base, activo
      FROM actividades
      WHERE activo = 1
      ORDER BY nombre
    `).all();

    const resultado = actividades.map(act => {
      // Get franjas for this activity
      const franjas = obtenerFranjasActividad(act.id);

      if (franjas.length === 0) {
        // No franjas = flexible activity, count socios directly
        const socios_count = db.prepare(`
          SELECT COUNT(*) as count FROM socios s
          WHERE s.id IN (
            SELECT DISTINCT sf.socio_id FROM socio_franjas sf
            WHERE sf.franja_id NOT IN (SELECT id FROM franjas_horarias)
          )
        `).get()?.count || 0;
        return { ...act, tiene_horarios_flexibles: 1, socios_count };
      } else {
        // Has franjas = fixed schedule activity
        return { ...act, tiene_horarios_flexibles: 0, franjas };
      }
    });

    res.json({ success: true, actividades: resultado });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerActividad(req, res) {
  const { id } = req.params;
  try {
    const actividad = db.prepare('SELECT * FROM actividades WHERE id = ?').get(id);
    if (!actividad) {
      return res.status(404).json({ success: false, error: 'Actividad no encontrada' });
    }

    if (actividad.tiene_horarios_flexibles) {
      // Flexible: return list of socios inscribed
      const socios = db.prepare(`
        SELECT s.id, s.apellido, s.nombre FROM socios s
        WHERE s.id IN (
          SELECT DISTINCT sf.socio_id FROM socio_franjas sf
          JOIN franjas_horarias f ON sf.franja_id = f.id
          WHERE f.actividad_id = ?
        )
        ORDER BY s.apellido, s.nombre
      `).all(id);

      res.json({ success: true, actividad, socios });
    } else {
      // Fixed: return franjas with socios/instructores
      const franjas = obtenerFranjasActividad(id);
      res.json({ success: true, actividad, franjas });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerDetallesFranjaHandler(req, res) {
  const { franja_id } = req.params;
  try {
    const detalles = obtenerDetallesFranja(franja_id);
    if (!detalles) {
      return res.status(404).json({ success: false, error: 'Franja no encontrada' });
    }
    res.json({ success: true, ...detalles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function crearActividad(req, res) {
  const { nombre, descripcion, dias_horario, precio_base, tiene_horarios_flexibles } = req.body;

  if (!nombre) {
    return res.json({ success: false, error: 'Nombre es requerido' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO actividades (nombre, descripcion, dias_horario, precio_base, tiene_horarios_flexibles, activo)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(nombre, descripcion || null, dias_horario || null, precio_base || 0, tiene_horarios_flexibles ? 1 : 0);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function editarActividad(req, res) {
  const { id } = req.params;
  const { nombre, descripcion, dias_horario, precio_base, activo, tiene_horarios_flexibles } = req.body;

  if (!nombre) {
    return res.json({ success: false, error: 'Nombre es requerido' });
  }

  try {
    db.prepare(`
      UPDATE actividades
      SET nombre = ?, descripcion = ?, dias_horario = ?, precio_base = ?, activo = ?, tiene_horarios_flexibles = ?
      WHERE id = ?
    `).run(nombre, descripcion || null, dias_horario || null, precio_base || 0, activo ? 1 : 0, tiene_horarios_flexibles ? 1 : 0, id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function agregarSocioFranja(req, res) {
  const { franja_id } = req.params;
  const { socio_id } = req.body;

  if (!socio_id) {
    return res.json({ success: false, error: 'socio_id es requerido' });
  }

  try {
    agregarSocioAFranja(franja_id, socio_id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function quitarSocioFranja(req, res) {
  const { franja_id, socio_id } = req.params;

  try {
    quitarSocioDeFranja(franja_id, socio_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function agregarInstructorFranja(req, res) {
  const { franja_id } = req.params;
  const { instructor_id } = req.body;

  if (!instructor_id) {
    return res.json({ success: false, error: 'instructor_id es requerido' });
  }

  try {
    agregarInstructorAFranja(franja_id, instructor_id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function quitarInstructorFranja(req, res) {
  const { franja_id, instructor_id } = req.params;

  try {
    quitarInstructorDeFranja(franja_id, instructor_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerSociosDisponibles(req, res) {
  const { franja_id } = req.params;

  try {
    const franja = db.prepare('SELECT actividad_id FROM franjas_horarias WHERE id = ?').get(franja_id);
    if (!franja) {
      return res.status(404).json({ success: false, error: 'Franja no encontrada' });
    }

    const socios = db.prepare(`
      SELECT s.id, s.apellido, s.nombre FROM socios s
      WHERE s.id NOT IN (
        SELECT sf.socio_id FROM socio_franjas sf WHERE sf.franja_id = ?
      )
      ORDER BY s.apellido, s.nombre
    `).all(franja_id);

    res.json({ success: true, socios });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerInstructoresDisponibles(req, res) {
  const { franja_id } = req.params;

  try {
    const instructores = db.prepare(`
      SELECT i.id, i.apellido, i.nombre FROM instructores i
      WHERE i.activo = 1 AND i.id NOT IN (
        SELECT inf.instructor_id FROM instructor_franjas inf WHERE inf.franja_id = ?
      )
      ORDER BY i.apellido, i.nombre
    `).all(franja_id);

    res.json({ success: true, instructores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerActividades,
  obtenerActividad,
  crearActividad,
  editarActividad,
  obtenerDetallesFranjaHandler,
  agregarSocioFranja,
  quitarSocioFranja,
  agregarInstructorFranja,
  quitarInstructorFranja,
  obtenerSociosDisponibles,
  obtenerInstructoresDisponibles
};
