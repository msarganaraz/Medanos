const { calcularMontoCuota, validarEstadoDeuda } = require('../modulo-cuotas/services/cuotas.logic');

describe('Lógica de cuotas', () => {
  describe('calcularMontoCuota', () => {
    test('Plan con monto: retorna el monto', () => {
      const plan = { id: 1, nombre: 'Individual', monto: 5000 };
      expect(calcularMontoCuota(plan)).toBe(5000);
    });

    test('Plan sin monto: retorna 0', () => {
      const plan = { id: 2, nombre: 'Familiar' };
      expect(calcularMontoCuota(plan)).toBe(0);
    });

    test('Plan con monto 0: retorna 0', () => {
      const plan = { id: 3, nombre: 'Prueba', monto: 0 };
      expect(calcularMontoCuota(plan)).toBe(0);
    });
  });

  describe('validarEstadoDeuda', () => {
    test('Sin cuotas: retorna PAGADO', () => {
      expect(validarEstadoDeuda([])).toBe('PAGADO');
      expect(validarEstadoDeuda(null)).toBe('PAGADO');
    });

    test('Cuota vencida: retorna VENCIDO', () => {
      const cuotas = [
        { id: 1, estado: 'VENCIDA' },
        { id: 2, estado: 'PENDIENTE' }
      ];
      expect(validarEstadoDeuda(cuotas)).toBe('VENCIDO');
    });

    test('Sin vencidas pero con pendientes: retorna DEBE', () => {
      const cuotas = [
        { id: 1, estado: 'PENDIENTE' },
        { id: 2, estado: 'PAGADA' }
      ];
      expect(validarEstadoDeuda(cuotas)).toBe('DEBE');
    });

    test('Todas pagadas: retorna PAGADO', () => {
      const cuotas = [
        { id: 1, estado: 'PAGADA' },
        { id: 2, estado: 'PAGADA' }
      ];
      expect(validarEstadoDeuda(cuotas)).toBe('PAGADO');
    });

    test('Prioridad: VENCIDO > DEBE > PAGADO', () => {
      const cuotas1 = [{ estado: 'VENCIDA' }, { estado: 'PENDIENTE' }, { estado: 'PAGADA' }];
      expect(validarEstadoDeuda(cuotas1)).toBe('VENCIDO');

      const cuotas2 = [{ estado: 'PENDIENTE' }, { estado: 'PAGADA' }];
      expect(validarEstadoDeuda(cuotas2)).toBe('DEBE');
    });
  });
});
