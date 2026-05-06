// modulo-cobranza/routes/cobranza.routes.js
const express = require('express');
const { requireRole } = require('../../middleware/auth');
const {
  dashboardCobranza,
  listarCuotas,
  verCuota,
  registrarPagoHandler,
  generarCuotasHandler,
  cambiarEstadoSocioHandler,
  listarMorosos
} = require('../controllers/cobranza.controller');

const router = express.Router();

router.get('/api/cobranza/dashboard', requireRole(['admin', 'recepcion']), (req, res) => dashboardCobranza(req, res));
router.get('/api/cobranza/cuotas', requireRole(['admin', 'recepcion']), (req, res) => listarCuotas(req, res));
router.get('/api/cobranza/cuotas/:id', requireRole(['admin', 'recepcion']), (req, res) => verCuota(req, res));
router.post('/api/cobranza/pagos', requireRole(['admin', 'recepcion']), (req, res) => registrarPagoHandler(req, res));
router.post('/api/cobranza/generar', requireRole(['admin']), (req, res) => generarCuotasHandler(req, res));
router.put('/api/socios/:id/estado', requireRole(['admin']), (req, res) => cambiarEstadoSocioHandler(req, res));
router.get('/api/cobranza/morosos', requireRole(['admin', 'recepcion']), (req, res) => listarMorosos(req, res));

// Views
router.get('/cobranza', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.render('modulo-cobranza/cobranza');
});

module.exports = router;
