const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');
const {
  obtenerInstructores,
  obtenerInstructor,
  crearInstructor,
  editarInstructor,
  generarLiquidacion,
  obtenerLiquidaciones,
  aprobarLiquidacion,
  pagarLiquidacion
} = require('../controllers/instructores.controller');

// GET lista de instructores — admin, recepcion, tesoreria, instructor
router.get('/api/instructores', requireRole(['admin', 'recepcion', 'tesoreria', 'instructor']), obtenerInstructores);

// GET instructor por ID
router.get('/api/instructores/:id', requireRole(['admin', 'recepcion', 'tesoreria', 'instructor']), obtenerInstructor);

// POST crear instructor — admin, recepcion
router.post('/api/instructores', requireRole(['admin', 'recepcion']), crearInstructor);

// PUT editar instructor — admin, recepcion
router.put('/api/instructores/:id', requireRole(['admin', 'recepcion']), editarInstructor);

// POST generar liquidación — admin, tesoreria
router.post('/api/liquidaciones/generar', requireRole(['admin', 'tesoreria']), generarLiquidacion);

// GET lista de liquidaciones — admin, tesoreria
router.get('/api/liquidaciones', requireRole(['admin', 'tesoreria']), obtenerLiquidaciones);

// POST aprobar liquidación — admin, tesoreria
router.post('/api/liquidaciones/:id/aprobar', requireRole(['admin', 'tesoreria']), aprobarLiquidacion);

// POST pagar liquidación — admin, tesoreria
router.post('/api/liquidaciones/:id/pagar', requireRole(['admin', 'tesoreria']), pagarLiquidacion);

// GET página de instructores
router.get('/instructores', requireRole(['admin', 'recepcion', 'tesoreria', 'instructor']), (req, res) => {
  res.render('instructores', { usuario: req.session.usuario });
});

// GET página de liquidaciones
router.get('/liquidaciones', requireRole(['admin', 'tesoreria']), (req, res) => {
  res.render('liquidaciones', { usuario: req.session.usuario });
});

module.exports = router;
