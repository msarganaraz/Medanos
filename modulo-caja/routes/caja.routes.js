const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');
const {
  obtenerMovimientos,
  registrarMovimiento,
  obtenerReporteDelMes,
  obtenerResumenPorConcepto
} = require('../controllers/caja.controller');

router.get('/api/caja/movimientos', requireRole(['admin', 'tesoreria']), obtenerMovimientos);
router.post('/api/caja/movimiento', requireRole(['admin', 'tesoreria']), registrarMovimiento);
router.get('/api/caja/reporte', requireRole(['admin', 'tesoreria']), obtenerReporteDelMes);
router.get('/api/caja/resumen', requireRole(['admin', 'tesoreria']), obtenerResumenPorConcepto);

router.get('/caja', requireRole(['admin', 'tesoreria']), (req, res) => {
  res.render('caja', { usuario: req.session.usuario });
});

module.exports = router;
