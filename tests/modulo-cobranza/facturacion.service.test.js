// tests/modulo-cobranza/facturacion.service.test.js
const {
  calcularMontoParaSocio,
  generarCuotasDelMes,
  registrarPago
} = require('../../modulo-cobranza/services/facturacion.service');
const db = require('../../database/db');

describe('facturacion.service', () => {

  describe('calcularMontoParaSocio', () => {

    test('debe retornar null si socio no existe o no está activo', () => {
      const resultado = calcularMontoParaSocio(9999);
      expect(resultado).toBeNull();
    });

    test('debe calcular solo la cuota base si no hay actividades', () => {
      // Setup: crear socio con plan sin actividades
      const planId = db.prepare('SELECT id FROM planes_cuota LIMIT 1').get().id;
      const socioResult = db.prepare(`
        INSERT INTO socios (numero_socio, apellido, nombre, plan_id, fecha_alta, estado)
        VALUES (?, ?, ?, ?, ?, 'ACTIVO')
      `).run('TEST001', 'TestApellido', 'TestNombre', planId, '2026-01-01');
      const socioId = socioResult.lastInsertRowid;

      const resultado = calcularMontoParaSocio(socioId);

      expect(resultado.monto_base).toBeGreaterThan(0);
      expect(resultado.monto_actividades).toBe(0);
      expect(resultado.monto_total).toBe(resultado.monto_base);
    });

    test('debe sumar actividades vigentes', () => {
      // Setup: crear socio con 2 actividades
      const planId = db.prepare('SELECT id FROM planes_cuota LIMIT 1').get().id;
      const socioResult = db.prepare(`
        INSERT INTO socios (numero_socio, apellido, nombre, plan_id, fecha_alta, estado)
        VALUES (?, ?, ?, ?, ?, 'ACTIVO')
      `).run('TEST002', 'TestApellido2', 'TestNombre2', planId, '2026-01-01');
      const socioId = socioResult.lastInsertRowid;

      const actividades = db.prepare('SELECT id FROM actividades LIMIT 2').all();
      db.prepare(`
        INSERT INTO actividades_grupo (socio_id, actividad_id, cantidad, fecha_desde)
        VALUES (?, ?, 1, ?)
      `).run(socioId, actividades[0].id, '2026-01-01');
      db.prepare(`
        INSERT INTO actividades_grupo (socio_id, actividad_id, cantidad, fecha_desde)
        VALUES (?, ?, 2, ?)
      `).run(socioId, actividades[1].id, '2026-01-01');

      const resultado = calcularMontoParaSocio(socioId);

      expect(resultado.monto_actividades).toBeGreaterThan(0);
      expect(resultado.monto_total).toBe(resultado.monto_base + resultado.monto_actividades);
    });

    test('no debe contar actividades vencidas', () => {
      const planId = db.prepare('SELECT id FROM planes_cuota LIMIT 1').get().id;
      const socioResult = db.prepare(`
        INSERT INTO socios (numero_socio, apellido, nombre, plan_id, fecha_alta, estado)
        VALUES (?, ?, ?, ?, ?, 'ACTIVO')
      `).run('TEST003', 'TestApellido3', 'TestNombre3', planId, '2026-01-01');
      const socioId = socioResult.lastInsertRowid;

      const actId = db.prepare('SELECT id FROM actividades LIMIT 1').get().id;
      db.prepare(`
        INSERT INTO actividades_grupo (socio_id, actividad_id, cantidad, fecha_desde, fecha_hasta)
        VALUES (?, ?, 1, ?, ?)
      `).run(socioId, actId, '2026-01-01', '2026-01-15'); // Vencida hace tiempo

      const resultado = calcularMontoParaSocio(socioId);
      expect(resultado.monto_actividades).toBe(0);
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

      expect(resultado2.total).toBe(0); // No se crean nuevas
    });

  });

  describe('registrarPago', () => {

    test('debe registrar pago y cambiar estado de cuota a PAGADA', () => {
      // Setup: crear cuota pendiente
      const cuotaResult = db.prepare(`
        INSERT INTO cuotas (socio_id, periodo, monto_total, estado, fecha_vencimiento)
        VALUES (1, '2026-05', 100.00, 'PENDIENTE', '2026-05-10')
      `).run();
      const cuotaId = cuotaResult.lastInsertRowid;

      const resultado = registrarPago(cuotaId, 1, 100.00, 'EFECTIVO', null, null);

      expect(resultado.success).toBe(true);

      const cuota = db.prepare('SELECT estado FROM cuotas WHERE id = ?').get(cuotaId);
      expect(cuota.estado).toBe('PAGADA');
    });

    test('debe reactivar socio suspendido cuando paga', () => {
      // Setup
      const cuotaResult = db.prepare(`
        INSERT INTO cuotas (socio_id, periodo, monto_total, estado, fecha_vencimiento)
        VALUES (1, '2026-06', 100.00, 'PENDIENTE', '2026-06-10')
      `).run();
      const cuotaId = cuotaResult.lastInsertRowid;

      db.prepare('UPDATE socios SET estado = "SUSPENDIDO" WHERE id = 1').run();

      registrarPago(cuotaId, 1, 100.00, 'EFECTIVO', null, null);

      const socio = db.prepare('SELECT estado FROM socios WHERE id = 1').get();
      expect(socio.estado).toBe('ACTIVO');
    });

  });

});
