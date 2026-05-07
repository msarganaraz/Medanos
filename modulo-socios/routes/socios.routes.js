// modulo-socios/routes/socios.routes.js
const express = require('express');
const { requireRole } = require('../../middleware/auth');
const {
  listarSocios,
  verSocio,
  crearSocioHandler,
  editarSocioHandler,
  agregarMiembroHandler,
  quitarMiembroHandler,
  agregarActividadHandler,
  quitarActividadHandler
} = require('../controllers/socios.controller');

const router = express.Router();

router.get('/api/socios', (req, res) => listarSocios(req, res));
router.get('/api/socios/:id', (req, res) => verSocio(req, res));
router.post('/api/socios', requireRole(['admin']), (req, res) => crearSocioHandler(req, res));
router.put('/api/socios/:id', requireRole(['admin']), (req, res) => editarSocioHandler(req, res));

router.post('/api/socios/:id/miembros', requireRole(['admin']), (req, res) => agregarMiembroHandler(req, res));
router.delete('/api/socios/:id/miembros/:miembro_id', requireRole(['admin']), (req, res) => quitarMiembroHandler(req, res));

router.post('/api/socios/:id/actividades', requireRole(['admin']), (req, res) => agregarActividadHandler(req, res));
router.delete('/api/socios/:id/actividades/:actividad_grupo_id', requireRole(['admin']), (req, res) => quitarActividadHandler(req, res));

// View
router.get('/socios', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.render('socios');
});

module.exports = router;
