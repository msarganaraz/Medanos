const db = require('../../database/db');

function crearSocio(numero_socio, apellido, nombre, plan_id, dni, email, telefono, domicilio) {
  try {
    const result = db.prepare(`
      INSERT INTO socios (numero_socio, apellido, nombre, plan_id, dni, email, telefono, domicilio, fecha_alta, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')
    `).run(numero_socio, apellido, nombre, plan_id, dni || null, email || null, telefono || null, domicilio || null, new Date().toISOString().split('T')[0]);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error creating socio: ${err.message}`);
  }
}

function obtenerSocios(filtro = {}) {
  try {
    let query = 'SELECT * FROM socios WHERE 1=1';
    const params = [];

    if (filtro.estado) {
      query += ' AND estado = ?';
      params.push(filtro.estado);
    }
    if (filtro.plan_id) {
      query += ' AND plan_id = ?';
      params.push(filtro.plan_id);
    }
    if (filtro.busqueda) {
      query += ' AND (numero_socio LIKE ? OR apellido LIKE ? OR nombre LIKE ?)';
      const search = '%' + filtro.busqueda + '%';
      params.push(search, search, search);
    }

    query += ' ORDER BY apellido, nombre';
    const socios = db.prepare(query).all(...params);
    return socios;
  } catch (err) {
    throw new Error(`Error fetching socios: ${err.message}`);
  }
}

function obtenerSocio(id) {
  try {
    const socio = db.prepare('SELECT * FROM socios WHERE id = ?').get(id);
    if (!socio) return null;

    const miembros = db.prepare('SELECT * FROM miembros_grupo WHERE socio_id = ? AND activo = 1 ORDER BY apellido').all(id);
    const actividades = db.prepare(`
      SELECT ag.*, a.nombre as actividad_nombre, a.precio_base as precio
      FROM actividades_grupo ag
      JOIN actividades a ON ag.actividad_id = a.id
      WHERE ag.socio_id = ? AND ag.fecha_hasta IS NULL
      ORDER BY a.nombre
    `).all(id);

    return { socio, miembros, actividades };
  } catch (err) {
    throw new Error(`Error fetching socio: ${err.message}`);
  }
}

function actualizarSocio(id, updates) {
  try {
    const fields = [];
    const values = [];

    if (updates.apellido !== undefined) { fields.push('apellido = ?'); values.push(updates.apellido); }
    if (updates.nombre !== undefined) { fields.push('nombre = ?'); values.push(updates.nombre); }
    if (updates.plan_id !== undefined) { fields.push('plan_id = ?'); values.push(updates.plan_id); }
    if (updates.estado !== undefined) { fields.push('estado = ?'); values.push(updates.estado); }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.telefono !== undefined) { fields.push('telefono = ?'); values.push(updates.telefono); }
    if (updates.domicilio !== undefined) { fields.push('domicilio = ?'); values.push(updates.domicilio); }

    if (fields.length === 0) return { success: true };

    values.push(id);
    db.prepare(`UPDATE socios SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return { success: true };
  } catch (err) {
    throw new Error(`Error updating socio: ${err.message}`);
  }
}

function agregarMiembroGrupo(socio_id, apellido, nombre, relacion, dni) {
  try {
    const result = db.prepare(`
      INSERT INTO miembros_grupo (socio_id, apellido, nombre, dni, relacion)
      VALUES (?, ?, ?, ?, ?)
    `).run(socio_id, apellido, nombre, dni || null, relacion);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error adding member: ${err.message}`);
  }
}

function quitarMiembroGrupo(miembro_id) {
  try {
    db.prepare('UPDATE miembros_grupo SET activo = 0 WHERE id = ?').run(miembro_id);
    return { success: true };
  } catch (err) {
    throw new Error(`Error removing member: ${err.message}`);
  }
}

function agregarActividadAlGrupo(socio_id, actividad_id, cantidad) {
  try {
    const existe = db.prepare('SELECT id FROM actividades_grupo WHERE socio_id = ? AND actividad_id = ? AND fecha_hasta IS NULL').get(socio_id, actividad_id);
    if (existe) {
      throw new Error('Activity already assigned to this group');
    }

    const result = db.prepare(`
      INSERT INTO actividades_grupo (socio_id, actividad_id, cantidad, fecha_desde)
      VALUES (?, ?, ?, ?)
    `).run(socio_id, actividad_id, cantidad || 1, new Date().toISOString().split('T')[0]);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error adding activity: ${err.message}`);
  }
}

function quitarActividadDelGrupo(actividad_grupo_id) {
  try {
    db.prepare('UPDATE actividades_grupo SET fecha_hasta = ? WHERE id = ?').run(new Date().toISOString().split('T')[0], actividad_grupo_id);
    return { success: true };
  } catch (err) {
    throw new Error(`Error removing activity: ${err.message}`);
  }
}

module.exports = {
  crearSocio,
  obtenerSocios,
  obtenerSocio,
  actualizarSocio,
  agregarMiembroGrupo,
  quitarMiembroGrupo,
  agregarActividadAlGrupo,
  quitarActividadDelGrupo
};
