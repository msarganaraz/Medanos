const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');
const {
  obtenerActividades,
  obtenerActividad,
  crearActividad,
  editarActividad,
  asignarInstructor,
  desasignarInstructor
} = require('../controllers/actividades.controller');

// GET lista de actividades — admin, recepcion, instructor
router.get('/api/actividades', requireRole(['admin', 'recepcion', 'instructor']), obtenerActividades);

// GET actividad por ID — admin, recepcion, instructor
router.get('/api/actividades/:id', requireRole(['admin', 'recepcion', 'instructor']), obtenerActividad);

// POST crear actividad — admin, recepcion
router.post('/api/actividades', requireRole(['admin', 'recepcion']), crearActividad);

// PUT editar actividad — admin, recepcion
router.put('/api/actividades/:id', requireRole(['admin', 'recepcion']), editarActividad);

// POST asignar instructor a actividad — admin, recepcion
router.post('/api/actividades/:actividad_id/instructores', requireRole(['admin', 'recepcion']), asignarInstructor);

// DELETE desasignar instructor de actividad — admin, recepcion
router.delete('/api/actividades/:actividad_id/instructores/:instructor_id', requireRole(['admin', 'recepcion']), desasignarInstructor);

// GET página de actividades
router.get('/actividades', requireRole(['admin', 'recepcion', 'instructor']), (req, res) => {
  res.render('actividades', { usuario: req.session.usuario });
});

module.exports = router;
