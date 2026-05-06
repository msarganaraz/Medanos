const cron = require('node-cron');
const { generarCuotasDelMes } = require('../modulo-cobranza/services/facturacion.service');

function iniciarJobGenerarCuotas() {
  // Ejecutar el primer día de cada mes a las 00:01
  cron.schedule('1 0 1 * *', () => {
    try {
      const hoy = new Date();
      const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
      console.log(`[generarCuotas] Iniciando generación de cuotas para ${periodo}...`);

      const resultado = generarCuotasDelMes(periodo);
      console.log(`[generarCuotas] ✓ Completado: ${resultado.total} cuotas creadas`);
      if (resultado.errores.length > 0) {
        console.warn(`[generarCuotas] ⚠ ${resultado.errores.length} errores:`, resultado.errores);
      }
    } catch (err) {
      console.error('[generarCuotas] ✗ Error:', err.message);
    }
  });

  console.log('[generarCuotas] Job scheduled: runs on 1st of each month at 00:01');
}

module.exports = { iniciarJobGenerarCuotas };
