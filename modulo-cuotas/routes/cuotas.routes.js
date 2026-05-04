const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');
const {
  obtenerPlanes,
  crearPlan,
  editarPlan,
  obtenerCuotas,
  generarCuotasDelMes,
  registrarPago
} = require('../controllers/cuotas.controller');

// GET planes de cuota
router.get('/api/planes', requireRole(['admin', 'recepcion', 'tesoreria']), obtenerPlanes);

// POST crear plan
router.post('/api/planes', requireRole(['admin', 'recepcion']), crearPlan);

// PUT editar plan
router.put('/api/planes/:id', requireRole(['admin', 'recepcion']), editarPlan);

// GET cuotas
router.get('/api/cuotas', requireRole(['admin', 'recepcion', 'tesoreria']), obtenerCuotas);

// POST generar cuotas del mes
router.post('/api/cuotas/generar', requireRole(['admin', 'tesoreria']), generarCuotasDelMes);

// POST registrar pago
router.post('/api/pagos', requireRole(['admin', 'recepcion', 'tesoreria']), registrarPago);

// GET página de cuotas
router.get('/cuotas', requireRole(['admin', 'recepcion', 'tesoreria']), (req, res) => {
  res.render('cuotas', { usuario: req.session.usuario });
});

module.exports = router;
