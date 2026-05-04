const { calcularLiquidacion } = require('../modulo-instructores/services/liquidacion');

describe('Cálculo de liquidaciones', () => {
  test('Contrato fijo: retorna monto_fijo', () => {
    const instructor = { tipo_contrato: 'fijo', monto_fijo: 5000 };
    expect(calcularLiquidacion(instructor)).toBe(5000);
  });

  test('Contrato por_hora: retorna horas * valor_hora', () => {
    const instructor = { tipo_contrato: 'por_hora', valor_hora: 500 };
    expect(calcularLiquidacion(instructor, { horas: 10 })).toBe(5000);
  });

  test('Contrato por_alumno: retorna alumnos * valor_por_alumno', () => {
    const instructor = { tipo_contrato: 'por_alumno', valor_por_alumno: 200 };
    expect(calcularLiquidacion(instructor, { alumnos: 15 })).toBe(3000);
  });

  test('Contrato combinado: retorna fijo + hora + alumno', () => {
    const instructor = {
      tipo_contrato: 'combinado',
      monto_fijo: 2000,
      valor_hora: 300,
      valor_por_alumno: 100
    };
    expect(calcularLiquidacion(instructor, { horas: 8, alumnos: 20 })).toBe(6400);
  });

  test('Tipo de contrato inválido: retorna 0', () => {
    const instructor = { tipo_contrato: 'invalido' };
    expect(calcularLiquidacion(instructor)).toBe(0);
  });

  test('Sin extras especificados: usa 0 como defaults', () => {
    const instructor = {
      tipo_contrato: 'combinado',
      monto_fijo: 1000,
      valor_hora: 200,
      valor_por_alumno: 50
    };
    expect(calcularLiquidacion(instructor)).toBe(1000);
  });

  test('Combinado con todos los parámetros', () => {
    const instructor = {
      tipo_contrato: 'combinado',
      monto_fijo: 3000,
      valor_hora: 250,
      valor_por_alumno: 150
    };
    expect(calcularLiquidacion(instructor, { horas: 5, alumnos: 25 })).toBe(8000);
  });
});
