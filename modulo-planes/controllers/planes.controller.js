// modulo-planes/controllers/planes.controller.js
const {
  obtenerPlanes,
  crearPlan,
  actualizarPlan,
  obtenerActividades,
  crearActividad,
  actualizarActividad,
  desactivarActividad
} = require('../services/planes.service');

function listarPlanes(req, res) {
  try {
    const planes = obtenerPlanes();
    res.json({ success: true, planes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function crearPlanHandler(req, res) {
  try {
    const { nombre, descripcion, monto } = req.body;
    if (!nombre || monto === undefined) {
      return res.json({ success: false, error: 'Campos requeridos: nombre, monto' });
    }
    const result = crearPlan(nombre, descripcion, monto);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function actualizarPlanHandler(req, res) {
  try {
    const { id } = req.params;
    const { nombre, descripcion, monto } = req.body;
    if (!nombre || monto === undefined) {
      return res.json({ success: false, error: 'Campos requeridos: nombre, monto' });
    }
    actualizarPlan(id, nombre, descripcion, monto);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function listarActividades(req, res) {
  try {
    const actividades = obtenerActividades();
    res.json({ success: true, actividades });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function crearActividadHandler(req, res) {
  try {
    const { nombre, descripcion, precio_base } = req.body;
    if (!nombre) {
      return res.json({ success: false, error: 'Nombre es requerido' });
    }
    const result = crearActividad(nombre, descripcion, precio_base);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function actualizarActividadHandler(req, res) {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio_base } = req.body;
    if (!nombre) {
      return res.json({ success: false, error: 'Nombre es requerido' });
    }
    actualizarActividad(id, nombre, descripcion, precio_base);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function desactivarActividadHandler(req, res) {
  try {
    const { id } = req.params;
    desactivarActividad(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  listarPlanes,
  crearPlanHandler,
  actualizarPlanHandler,
  listarActividades,
  crearActividadHandler,
  actualizarActividadHandler,
  desactivarActividadHandler
};
