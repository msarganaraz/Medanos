const db = require('../../database/db');
const bcrypt = require('bcryptjs');

function obtenerUsuarios(req, res) {
  try {
    const usuarios = db.prepare('SELECT id, username, nombre, rol, activo FROM usuarios ORDER BY nombre').all();
    res.json({ success: true, usuarios });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerUsuario(req, res) {
  const { id } = req.params;
  try {
    const usuario = db.prepare('SELECT id, username, nombre, rol, activo FROM usuarios WHERE id = ?').get(id);
    if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    res.json({ success: true, usuario });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function crearUsuario(req, res) {
  const { username, nombre, rol, password } = req.body;

  if (!username || !nombre || !rol || !password) {
    return res.json({ success: false, error: 'Faltam campos requeridos' });
  }

  if (!['admin', 'recepcion', 'tesoreria', 'instructor'].includes(rol)) {
    return res.json({ success: false, error: 'Rol inválido' });
  }

  try {
    const existe = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(username);
    if (existe) {
      return res.json({ success: false, error: 'El usuario ya existe' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO usuarios (username, password_hash, nombre, rol, activo)
      VALUES (?, ?, ?, ?, 1)
    `).run(username, passwordHash, nombre, rol);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function editarUsuario(req, res) {
  const { id } = req.params;
  const { nombre, rol, activo } = req.body;

  if (!nombre || !rol) {
    return res.json({ success: false, error: 'Faltam campos requeridos' });
  }

  try {
    db.prepare(`
      UPDATE usuarios SET nombre = ?, rol = ?, activo = ? WHERE id = ?
    `).run(nombre, rol, activo ? 1 : 0, id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function cambiarContraseña(req, res) {
  const { id } = req.params;
  const { passwordActual, passwordNueva } = req.body;

  if (!passwordActual || !passwordNueva) {
    return res.json({ success: false, error: 'Contraseña actual y nueva son requeridas' });
  }

  try {
    const usuario = db.prepare('SELECT password_hash FROM usuarios WHERE id = ?').get(id);

    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (!bcrypt.compareSync(passwordActual, usuario.password_hash)) {
      return res.json({ success: false, error: 'Contraseña actual incorrecta' });
    }

    const passwordHash = bcrypt.hashSync(passwordNueva, 10);
    db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(passwordHash, id);

    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerUsuarios,
  obtenerUsuario,
  crearUsuario,
  editarUsuario,
  cambiarContraseña
};
