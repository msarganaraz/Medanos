function calcularMontoCuota(plan) {
  return plan.monto || 0;
}

function validarEstadoDeuda(cuotas) {
  if (!cuotas || cuotas.length === 0) {
    return 'PAGADO';
  }

  for (const cuota of cuotas) {
    if (cuota.estado === 'VENCIDA') {
      return 'VENCIDO';
    }
  }

  for (const cuota of cuotas) {
    if (cuota.estado === 'PENDIENTE') {
      return 'DEBE';
    }
  }

  return 'PAGADO';
}

module.exports = { calcularMontoCuota, validarEstadoDeuda };
