// modulo-cobranza/controllers/cobranza.controller.js
const {
  generarCuotasDelMes,
  obtenerCuotasDelMes,
  obtenerCuota,
  registrarPago,
  obtenerCuotasMorosas
} = require('../services/facturacion.service');
const { actualizarSocio } = require('../../modulo-socios/services/socios.service');

function dashboardCobranza(req, res) {
  try {
    const hoy = new Date();
    const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

    const cuotas = obtenerCuotasDelMes(periodo);
    const pagadas = cuotas.filter(c => c.estado === 'PAGADA').length;
    const pendientes = cuotas.filter(c => c.estado === 'PENDIENTE').length;
    const vencidas = cuotas.filter(c => c.estado === 'VENCIDA').length;
    const monto_total = cuotas.reduce((sum, c) => sum + c.monto_total, 0);
    const monto_cobrado = cuotas.reduce((sum, c) => sum + c.total_pagado, 0);

    res.json({
      success: true,
      periodo,
      stats: { pagadas, pendientes, vencidas, monto_total, monto_cobrado },
      cuotas
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function listarCuotas(req, res) {
  try {
    const { periodo, estado } = req.query;
    if (!periodo) {
      return res.json({ success: false, error: 'periodo requerido' });
    }

    let cuotas = obtenerCuotasDelMes(periodo);
    if (estado) {
      cuotas = cuotas.filter(c => c.estado === estado);
    }

    res.json({ success: true, cuotas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function verCuota(req, res) {
  try {
    const { id } = req.params;
    const data = obtenerCuota(id);
    if (!data) return res.status(404).json({ success: false, error: 'Cuota no encontrada' });
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function registrarPagoHandler(req, res) {
  try {
    const { cuota_id, socio_id, importe, medio_pago, observaciones } = req.body;
    const usuario_id = req.session.usuario?.id;

    if (!cuota_id || !socio_id || !importe) {
      return res.json({ success: false, error: 'Campos requeridos: cuota_id, socio_id, importe' });
    }

    const result = registrarPago(cuota_id, socio_id, importe, medio_pago, usuario_id, observaciones);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function generarCuotasHandler(req, res) {
  try {
    const { periodo } = req.body;
    if (!periodo) {
      return res.json({ success: false, error: 'periodo requerido (ej: "2026-05")' });
    }

    const resultado = generarCuotasDelMes(periodo);
    res.json({ success: true, ...resultado });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function cambiarEstadoSocioHandler(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['ACTIVO', 'SUSPENDIDO', 'DADO_DE_BAJA'].includes(estado)) {
      return res.json({ success: false, error: 'Estado inválido' });
    }

    actualizarSocio(id, { estado });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function listarMorosos(req, res) {
  try {
    const morosas = obtenerCuotasMorosas();
    res.json({ success: true, morosas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  dashboardCobranza,
  listarCuotas,
  verCuota,
  registrarPagoHandler,
  generarCuotasHandler,
  cambiarEstadoSocioHandler,
  listarMorosos
};
