const db = require('../../database/db');

function obtenerFranjasActividad(actividad_id) {
  try {
    const franjas = db.prepare(`
      SELECT f.id, f.dia_semana, f.hora_inicio, f.hora_fin,
             COUNT(DISTINCT sf.socio_id) as socios_count,
             COUNT(DISTINCT inf.instructor_id) as instructores_count
      FROM franjas_horarias f
      LEFT JOIN socio_franjas sf ON f.id = sf.franja_id
      LEFT JOIN instructor_franjas inf ON f.id = inf.franja_id
      WHERE f.actividad_id = ?
      GROUP BY f.id
      ORDER BY f.dia_semana, f.hora_inicio
    `).all(actividad_id);
    return franjas;
  } catch (err) {
    throw new Error(`Error fetching franjas: ${err.message}`);
  }
}

function obtenerDetallesFranja(franja_id) {
  try {
    const franja = db.prepare(`
      SELECT f.*, a.nombre as actividad_nombre
      FROM franjas_horarias f
      JOIN actividades a ON f.actividad_id = a.id
      WHERE f.id = ?
    `).get(franja_id);

    if (!franja) return null;

    const socios = db.prepare(`
      SELECT s.id, s.apellido, s.nombre
      FROM socios s
      JOIN socio_franjas sf ON s.id = sf.socio_id
      WHERE sf.franja_id = ?
      ORDER BY s.apellido, s.nombre
    `).all(franja_id);

    const instructores = db.prepare(`
      SELECT i.id, i.apellido, i.nombre
      FROM instructores i
      JOIN instructor_franjas inf ON i.id = inf.instructor_id
      WHERE inf.franja_id = ?
      ORDER BY i.apellido, i.nombre
    `).all(franja_id);

    return { franja, socios, instructores };
  } catch (err) {
    throw new Error(`Error fetching franja details: ${err.message}`);
  }
}

function agregarSocioAFranja(franja_id, socio_id) {
  try {
    const existe = db.prepare(`
      SELECT id FROM socio_franjas
      WHERE franja_id = ? AND socio_id = ?
    `).get(franja_id, socio_id);

    if (existe) {
      throw new Error('Socio ya asignado a esta franja');
    }

    const today = new Date().toISOString().split('T')[0];
    const result = db.prepare(`
      INSERT INTO socio_franjas (socio_id, franja_id, fecha_desde)
      VALUES (?, ?, ?)
    `).run(socio_id, franja_id, today);

    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error adding socio to franja: ${err.message}`);
  }
}

function quitarSocioDeFranja(franja_id, socio_id) {
  try {
    db.prepare(`
      DELETE FROM socio_franjas
      WHERE franja_id = ? AND socio_id = ?
    `).run(franja_id, socio_id);

    return { success: true };
  } catch (err) {
    throw new Error(`Error removing socio from franja: ${err.message}`);
  }
}

function agregarInstructorAFranja(franja_id, instructor_id) {
  try {
    const existe = db.prepare(`
      SELECT id FROM instructor_franjas
      WHERE franja_id = ? AND instructor_id = ?
    `).get(franja_id, instructor_id);

    if (existe) {
      throw new Error('Instructor ya asignado a esta franja');
    }

    const result = db.prepare(`
      INSERT INTO instructor_franjas (instructor_id, franja_id)
      VALUES (?, ?)
    `).run(instructor_id, franja_id);

    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error adding instructor to franja: ${err.message}`);
  }
}

function quitarInstructorDeFranja(franja_id, instructor_id) {
  try {
    db.prepare(`
      DELETE FROM instructor_franjas
      WHERE franja_id = ? AND instructor_id = ?
    `).run(franja_id, instructor_id);

    return { success: true };
  } catch (err) {
    throw new Error(`Error removing instructor from franja: ${err.message}`);
  }
}

module.exports = {
  obtenerFranjasActividad,
  obtenerDetallesFranja,
  agregarSocioAFranja,
  quitarSocioDeFranja,
  agregarInstructorAFranja,
  quitarInstructorDeFranja
};
