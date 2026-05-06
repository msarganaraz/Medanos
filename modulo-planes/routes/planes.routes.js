// modulo-planes/routes/planes.routes.js
const express = require('express');
const { requireRole } = require('../../middleware/auth');
const {
  listarPlanes,
  crearPlanHandler,
  actualizarPlanHandler,
  listarActividades,
  crearActividadHandler,
  actualizarActividadHandler,
  desactivarActividadHandler
} = require('../controllers/planes.controller');

const router = express.Router();

// Planes
router.get('/api/planes', (req, res) => listarPlanes(req, res));
router.post('/api/planes', requireRole(['admin']), (req, res) => crearPlanHandler(req, res));
router.put('/api/planes/:id', requireRole(['admin']), (req, res) => actualizarPlanHandler(req, res));

// Actividades
router.get('/api/actividades', (req, res) => listarActividades(req, res));
router.post('/api/actividades', requireRole(['admin']), (req, res) => crearActividadHandler(req, res));
router.put('/api/actividades/:id', requireRole(['admin']), (req, res) => actualizarActividadHandler(req, res));
router.delete('/api/actividades/:id', requireRole(['admin']), (req, res) => desactivarActividadHandler(req, res));

// Views
router.get('/planes', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.render('modulo-planes/planes');
});

router.get('/actividades', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.render('modulo-planes/actividades');
});

module.exports = router;
