const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');
const {
  obtenerUsuarios,
  obtenerUsuario,
  crearUsuario,
  editarUsuario,
  cambiarContraseña
} = require('../controllers/admin.controller');

// GET lista de usuarios — solo admin
router.get('/api/admin/usuarios', requireRole(['admin']), obtenerUsuarios);

// GET usuario por ID — solo admin
router.get('/api/admin/usuarios/:id', requireRole(['admin']), obtenerUsuario);

// POST crear usuario — solo admin
router.post('/api/admin/usuarios', requireRole(['admin']), crearUsuario);

// PUT editar usuario — solo admin
router.put('/api/admin/usuarios/:id', requireRole(['admin']), editarUsuario);

// POST cambiar contraseña
router.post('/api/admin/cambiar-contraseña/:id', (req, res, next) => {
  const usuarioLogueado = req.session.usuario;
  const usuarioId = parseInt(req.params.id);

  if (!usuarioLogueado) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }

  if (usuarioLogueado.rol !== 'admin' && usuarioLogueado.id !== usuarioId) {
    return res.status(403).json({ success: false, error: 'Acceso denegado' });
  }

  next();
}, cambiarContraseña);

// GET página principal del módulo
router.get('/admin', requireRole(['admin']), (req, res) => {
  res.render('usuarios', { usuario: req.session.usuario });
});

module.exports = router;
