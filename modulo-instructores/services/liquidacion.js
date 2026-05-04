function calcularLiquidacion(instructor, extras = {}) {
  const { tipo_contrato, monto_fijo = 0, valor_hora = 0, valor_por_alumno = 0 } = instructor;
  const { horas = 0, alumnos = 0 } = extras;

  switch (tipo_contrato) {
    case 'fijo':
      return monto_fijo;
    case 'por_hora':
      return horas * valor_hora;
    case 'por_alumno':
      return alumnos * valor_por_alumno;
    case 'combinado':
      return monto_fijo + (horas * valor_hora) + (alumnos * valor_por_alumno);
    default:
      return 0;
  }
}

module.exports = { calcularLiquidacion };
