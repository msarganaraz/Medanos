const db = require('../../database/db');

function obtenerMovimientos(req, res) {
  try {
    const movimientos = db.prepare('SELECT mc.*, u.nombre as usuario_nombre FROM movimientos_caja mc LEFT JOIN usuarios u ON mc.usuario_id = u.id ORDER BY mc.fecha DESC').all();
    res.json({ success: true, movimientos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function registrarMovimiento(req, res) {
  const { tipo, concepto, importe, referencia_id, referencia_tipo } = req.body;
  const usuario_id = req.session.usuario?.id;

  if (!tipo || !concepto || !importe) {
    return res.json({ success: false, error: 'Faltam campos requeridos' });
  }
  if (!['ingreso', 'egreso'].includes(tipo)) {
    return res.json({ success: false, error: 'Tipo debe ser ingreso o egreso' });
  }

  try {
    const fecha = new Date().toISOString().split('T')[0];
    const result = db.prepare('INSERT INTO movimientos_caja (fecha, tipo, concepto, importe, referencia_id, referencia_tipo, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(fecha, tipo, concepto, importe, referencia_id || null, referencia_tipo || null, usuario_id);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerReporteDelMes(req, res) {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const mesAnio = `${año}-${mes}`;

  try {
    const ingresos = db.prepare('SELECT COALESCE(SUM(importe), 0) as total FROM movimientos_caja WHERE tipo = "ingreso" AND fecha LIKE ?').get(mesAnio + '%');
    const egresos = db.prepare('SELECT COALESCE(SUM(importe), 0) as total FROM movimientos_caja WHERE tipo = "egreso" AND fecha LIKE ?').get(mesAnio + '%');
    const saldo = ingresos.total - egresos.total;

    res.json({ success: true, mes: mesAnio, ingresos: ingresos.total, egresos: egresos.total, saldo: saldo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerResumenPorConcepto(req, res) {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');

  try {
    const resumen = db.prepare('SELECT concepto, tipo, COUNT(*) as cantidad, SUM(importe) as total FROM movimientos_caja WHERE fecha LIKE ? GROUP BY concepto, tipo ORDER BY concepto').all(`${año}-${mes}%`);
    res.json({ success: true, resumen });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerMovimientos,
  registrarMovimiento,
  obtenerReporteDelMes,
  obtenerResumenPorConcepto
};
