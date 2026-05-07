const db = require('../../database/db');

function calcularMontoParaSocio(socio_id) {
  try {
    const socio = db.prepare('SELECT id FROM socios WHERE id = ? AND estado = "ACTIVO"').get(socio_id);
    if (!socio) return null;

    // Obtener monto del plan base usando socio_planes con fecha vigente
    const planActual = db.prepare(`
      SELECT p.monto FROM planes_cuota p
      JOIN socio_planes sp ON p.id = sp.plan_id
      WHERE sp.socio_id = ?
        AND sp.fecha_desde <= date('now')
        AND (sp.fecha_hasta IS NULL OR sp.fecha_hasta >= date('now'))
      LIMIT 1
    `).get(socio_id);

    const monto_base = planActual ? planActual.monto : 0;

    // Obtener suma de actividades vigentes
    const actividades = db.prepare(`
      SELECT SUM(a.precio_base * ag.cantidad) as total
      FROM actividades_grupo ag
      JOIN actividades a ON ag.actividad_id = a.id
      WHERE ag.socio_id = ?
        AND ag.fecha_desde <= date('now')
        AND (ag.fecha_hasta IS NULL OR ag.fecha_hasta >= date('now'))
    `).get(socio_id);

    const monto_actividades = actividades.total || 0;
    const monto_total = monto_base + monto_actividades;

    return {
      monto_base,
      monto_actividades,
      monto_total,
      detalles: {
        plan_monto: monto_base,
        actividades: actividades.total || 0
      }
    };
  } catch (err) {
    throw new Error(`Error calculating monto: ${err.message}`);
  }
}

function generarCuotasDelMes(periodo) {
  try {
    const socios_activos = db.prepare('SELECT id FROM socios WHERE estado = "ACTIVO"').all();
    const creadas = [];
    const errores = [];

    for (const socio of socios_activos) {
      try {
        // Verificar que no exista cuota para este mes
        const existe = db.prepare('SELECT id FROM cuotas WHERE socio_id = ? AND periodo = ?').get(socio.id, periodo);
        if (existe) continue;

        // Calcular monto
        const calculo = calcularMontoParaSocio(socio.id);
        if (!calculo) continue;

        // Crear cuota
        const [año, mes] = periodo.split('-');
        const fecha_vencimiento = new Date(`${año}-${mes}-10`).toISOString().split('T')[0];

        const result = db.prepare(`
          INSERT INTO cuotas (socio_id, periodo, monto_total, estado, fecha_vencimiento, detalle_json)
          VALUES (?, ?, ?, 'PENDIENTE', ?, ?)
        `).run(socio.id, periodo, calculo.monto_total, fecha_vencimiento, JSON.stringify(calculo.detalles));

        creadas.push({ socio_id: socio.id, cuota_id: result.lastInsertRowid });
      } catch (err) {
        errores.push({ socio_id: socio.id, error: err.message });
      }
    }

    return { creadas, errores, total: creadas.length };
  } catch (err) {
    throw new Error(`Error generating cuotas: ${err.message}`);
  }
}

function registrarPago(cuota_id, socio_id, importe, medio_pago, usuario_id, observaciones) {
  try {
    const cuota = db.prepare('SELECT monto_total, socio_id FROM cuotas WHERE id = ?').get(cuota_id);
    if (!cuota) throw new Error('Cuota not found');

    // Crear registro de pago
    const result = db.prepare(`
      INSERT INTO pagos (cuota_id, socio_id, fecha_pago, importe, medio_pago, usuario_id, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(cuota_id, socio_id, new Date().toISOString().split('T')[0], importe, medio_pago || null, usuario_id || null, observaciones || null);

    // Actualizar estado de cuota si está completamente pagada
    const total_pagado = db.prepare('SELECT SUM(importe) as total FROM pagos WHERE cuota_id = ?').get(cuota_id);
    if (total_pagado.total >= cuota.monto_total) {
      db.prepare('UPDATE cuotas SET estado = "PAGADA" WHERE id = ?').run(cuota_id);

      // Reactivar socio si estaba suspendido
      db.prepare('UPDATE socios SET estado = "ACTIVO" WHERE id = ? AND estado IN ("SUSPENDIDO", "DADO_DE_BAJA")').run(socio_id);
    }

    return { success: true, pago_id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error registering pago: ${err.message}`);
  }
}

function obtenerCuotasDelMes(periodo) {
  try {
    const cuotas = db.prepare(`
      SELECT c.*, s.numero_socio, s.apellido, s.nombre, s.estado as socio_estado,
             COALESCE(SUM(p.importe), 0) as total_pagado
      FROM cuotas c
      JOIN socios s ON c.socio_id = s.id
      LEFT JOIN pagos p ON c.id = p.cuota_id
      WHERE c.periodo = ?
      GROUP BY c.id
      ORDER BY s.apellido, s.nombre
    `).all(periodo);
    return cuotas;
  } catch (err) {
    throw new Error(`Error fetching cuotas: ${err.message}`);
  }
}

function obtenerCuota(cuota_id) {
  try {
    const cuota = db.prepare(`
      SELECT c.*, s.numero_socio, s.apellido, s.nombre
      FROM cuotas c
      JOIN socios s ON c.socio_id = s.id
      WHERE c.id = ?
    `).get(cuota_id);

    if (!cuota) return null;

    const pagos = db.prepare('SELECT * FROM pagos WHERE cuota_id = ? ORDER BY fecha_pago DESC').all(cuota_id);
    const total_pagado = pagos.reduce((sum, p) => sum + p.importe, 0);

    return { cuota, pagos, total_pagado, saldo: cuota.monto_total - total_pagado };
  } catch (err) {
    throw new Error(`Error fetching cuota: ${err.message}`);
  }
}

function obtenerCuotasMorosas() {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const morosas = db.prepare(`
      SELECT c.*, s.numero_socio, s.apellido, s.nombre, s.estado as socio_estado,
             COALESCE(SUM(p.importe), 0) as total_pagado,
             c.monto_total - COALESCE(SUM(p.importe), 0) as saldo
      FROM cuotas c
      JOIN socios s ON c.socio_id = s.id
      LEFT JOIN pagos p ON c.id = p.cuota_id
      WHERE c.estado = 'PENDIENTE' AND c.fecha_vencimiento < ?
      GROUP BY c.id
      ORDER BY c.fecha_vencimiento
    `).all(hoy);
    return morosas;
  } catch (err) {
    throw new Error(`Error fetching morosas: ${err.message}`);
  }
}

module.exports = {
  calcularMontoParaSocio,
  generarCuotasDelMes,
  registrarPago,
  obtenerCuotasDelMes,
  obtenerCuota,
  obtenerCuotasMorosas
};
