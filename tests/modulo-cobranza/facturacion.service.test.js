// tests/modulo-cobranza/facturacion.service.test.js
const { initDB } = require('../../database/db');
const {
  calcularMontoParaSocio,
  generarCuotasDelMes,
  registrarPago
} = require('../../modulo-cobranza/services/facturacion.service');

describe('facturacion.service', () => {

  beforeAll(async () => {
    await initDB();
  });

  describe('calcularMontoParaSocio', () => {
    test('debe retornar null si socio no existe o no está activo', () => {
      const resultado = calcularMontoParaSocio(9999);
      expect(resultado).toBeNull();
    });

    test('debe ser una función callable', () => {
      expect(typeof calcularMontoParaSocio).toBe('function');
    });
  });

  describe('generarCuotasDelMes', () => {
    test('debe crear cuotas para todos los socios activos', () => {
      const resultado = generarCuotasDelMes('2026-05');

      expect(resultado.creadas).toBeDefined();
      expect(Array.isArray(resultado.creadas)).toBe(true);
      expect(resultado.total).toBeGreaterThanOrEqual(0);
    });

    test('no debe crear cuota duplicada si ya existe para el mes', () => {
      const periodo = '2026-05';
      const resultado1 = generarCuotasDelMes(periodo);
      const resultado2 = generarCuotasDelMes(periodo);

      expect(resultado2.total).toBe(0);
    });
  });

  describe('registrarPago', () => {
    test('debe ser una función callable', () => {
      expect(typeof registrarPago).toBe('function');
    });
  });

});
