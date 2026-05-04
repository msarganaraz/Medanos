const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');
const {
  obtenerSocios,
  obtenerSocio,
  crearSocio,
  editarSocio,
  asignarActividad
} = require('../controllers/socios.controller');

// GET lista de socios — admin, recepcion, tesoreria
router.get('/api/socios', requireRole(['admin', 'recepcion', 'tesoreria']), obtenerSocios);

// GET socio por ID — admin, recepcion, tesoreria
router.get('/api/socios/:id', requireRole(['admin', 'recepcion', 'tesoreria']), obtenerSocio);

// POST crear socio — admin, recepcion
router.post('/api/socios', requireRole(['admin', 'recepcion']), crearSocio);

// PUT editar socio — admin, recepcion
router.put('/api/socios/:id', requireRole(['admin', 'recepcion']), editarSocio);

// POST asignar actividad a socio — admin, recepcion
router.post('/api/socios/:socio_id/actividades', requireRole(['admin', 'recepcion']), asignarActividad);

// GET página de socios
router.get('/socios', requireRole(['admin', 'recepcion', 'tesoreria']), (req, res) => {
  res.render('socios', { usuario: req.session.usuario });
});

// GET página de legajo (perfil de socio)
router.get('/socios/:id/legajo', requireRole(['admin', 'recepcion', 'tesoreria']), (req, res) => {
  res.render('legajo', { usuario: req.session.usuario, socioId: req.params.id });
});

module.exports = router;
