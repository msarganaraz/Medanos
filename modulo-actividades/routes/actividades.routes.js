const express = require('express');
const {
  obtenerActividades,
  obtenerActividad,
  crearActividad,
  editarActividad,
  crearFranja,
  obtenerDetallesFranjaHandler,
  agregarSocioFranja,
  quitarSocioFranja,
  agregarInstructorFranja,
  quitarInstructorFranja,
  obtenerSociosDisponibles,
  obtenerInstructoresDisponibles,
  eliminarFranjaHandler,
  desactivarActividad
} = require('../controllers/actividades.controller');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();

// Get all activities with franja info
router.get('/api/actividades', (req, res) => obtenerActividades(req, res));

// Get single activity
router.get('/api/actividades/:id', (req, res) => obtenerActividad(req, res));

// Create activity
router.post('/api/actividades', requireRole(['admin']), (req, res) => crearActividad(req, res));

// Edit activity
router.put('/api/actividades/:id', requireRole(['admin']), (req, res) => editarActividad(req, res));

// Crear franja para una actividad
router.post('/api/actividades/:id/franjas', requireRole(['admin']), (req, res) => crearFranja(req, res));

// Get franja details (socios + instructores)
router.get('/api/franjas/:franja_id', (req, res) => obtenerDetallesFranjaHandler(req, res));

// Add socio to franja
router.post('/api/franjas/:franja_id/socios', requireRole(['admin', 'recepcion']), (req, res) => agregarSocioFranja(req, res));

// Remove socio from franja
router.delete('/api/franjas/:franja_id/socios/:socio_id', requireRole(['admin', 'recepcion']), (req, res) => quitarSocioFranja(req, res));

// Add instructor to franja
router.post('/api/franjas/:franja_id/instructores', requireRole(['admin']), (req, res) => agregarInstructorFranja(req, res));

// Remove instructor from franja
router.delete('/api/franjas/:franja_id/instructores/:instructor_id', requireRole(['admin']), (req, res) => quitarInstructorFranja(req, res));

// Get available socios for a franja
router.get('/api/franjas/:franja_id/socios/disponibles', (req, res) => obtenerSociosDisponibles(req, res));

// Get available instructores for a franja
router.get('/api/franjas/:franja_id/instructores/disponibles', (req, res) => obtenerInstructoresDisponibles(req, res));

// Delete franja (cascade: socio_franjas + instructor_franjas)
router.delete('/api/franjas/:franja_id', requireRole(['admin']), (req, res) => eliminarFranjaHandler(req, res));

// Desactivar actividad (soft delete)
router.delete('/api/actividades/:id', requireRole(['admin']), (req, res) => desactivarActividad(req, res));

// View (EJS page)
router.get('/actividades', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.render('actividades');
});

module.exports = router;
