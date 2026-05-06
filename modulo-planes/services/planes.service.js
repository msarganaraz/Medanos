const db = require('../../database/db');

// PLANES

function obtenerPlanes() {
  try {
    return db.prepare('SELECT * FROM planes_cuota ORDER BY nombre').all();
  } catch (err) {
    throw new Error(`Error fetching planes: ${err.message}`);
  }
}

function crearPlan(nombre, descripcion, monto) {
  try {
    const result = db.prepare(`
      INSERT INTO planes_cuota (nombre, descripcion, monto)
      VALUES (?, ?, ?)
    `).run(nombre, descripcion || null, monto);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error creating plan: ${err.message}`);
  }
}

function actualizarPlan(id, nombre, descripcion, monto) {
  try {
    db.prepare(`
      UPDATE planes_cuota SET nombre = ?, descripcion = ?, monto = ? WHERE id = ?
    `).run(nombre, descripcion || null, monto, id);
    return { success: true };
  } catch (err) {
    throw new Error(`Error updating plan: ${err.message}`);
  }
}

// ACTIVIDADES

function obtenerActividades() {
  try {
    return db.prepare('SELECT id, nombre, descripcion, precio_base, activo FROM actividades WHERE activo = 1 ORDER BY nombre').all();
  } catch (err) {
    throw new Error(`Error fetching actividades: ${err.message}`);
  }
}

function crearActividad(nombre, descripcion, precio_base) {
  try {
    const result = db.prepare(`
      INSERT INTO actividades (nombre, descripcion, precio_base, activo)
      VALUES (?, ?, ?, 1)
    `).run(nombre, descripcion || null, precio_base || 0);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error creating actividad: ${err.message}`);
  }
}

function actualizarActividad(id, nombre, descripcion, precio_base) {
  try {
    db.prepare(`
      UPDATE actividades SET nombre = ?, descripcion = ?, precio_base = ? WHERE id = ?
    `).run(nombre, descripcion || null, precio_base || 0, id);
    return { success: true };
  } catch (err) {
    throw new Error(`Error updating actividad: ${err.message}`);
  }
}

function desactivarActividad(id) {
  try {
    db.prepare('UPDATE actividades SET activo = 0 WHERE id = ?').run(id);
    return { success: true };
  } catch (err) {
    throw new Error(`Error deactivating actividad: ${err.message}`);
  }
}

module.exports = {
  obtenerPlanes,
  crearPlan,
  actualizarPlan,
  obtenerActividades,
  crearActividad,
  actualizarActividad,
  desactivarActividad
};
