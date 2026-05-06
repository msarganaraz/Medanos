// modulo-socios/controllers/socios.controller.js
const {
  crearSocio,
  obtenerSocios,
  obtenerSocio,
  actualizarSocio,
  agregarMiembroGrupo,
  quitarMiembroGrupo,
  agregarActividadAlGrupo,
  quitarActividadDelGrupo
} = require('../services/socios.service');

function listarSocios(req, res) {
  try {
    const { estado, plan_id, busqueda } = req.query;
    const socios = obtenerSocios({ estado, plan_id, busqueda });
    res.json({ success: true, socios });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function verSocio(req, res) {
  try {
    const { id } = req.params;
    const data = obtenerSocio(id);
    if (!data) return res.status(404).json({ success: false, error: 'Socio no encontrado' });
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function crearSocioHandler(req, res) {
  try {
    const { numero_socio, apellido, nombre, plan_id, dni, email, telefono, domicilio } = req.body;
    if (!numero_socio || !apellido || !nombre || !plan_id) {
      return res.json({ success: false, error: 'Campos requeridos: numero_socio, apellido, nombre, plan_id' });
    }
    const result = crearSocio(numero_socio, apellido, nombre, plan_id, dni, email, telefono, domicilio);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function editarSocioHandler(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    actualizarSocio(id, updates);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function agregarMiembroHandler(req, res) {
  try {
    const { id } = req.params;
    const { apellido, nombre, relacion, dni } = req.body;
    if (!apellido || !nombre || !relacion) {
      return res.json({ success: false, error: 'Campos requeridos: apellido, nombre, relacion' });
    }
    const result = agregarMiembroGrupo(id, apellido, nombre, relacion, dni);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function quitarMiembroHandler(req, res) {
  try {
    const { miembro_id } = req.params;
    quitarMiembroGrupo(miembro_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function agregarActividadHandler(req, res) {
  try {
    const { id } = req.params;
    const { actividad_id, cantidad } = req.body;
    if (!actividad_id) {
      return res.json({ success: false, error: 'actividad_id requerido' });
    }
    const result = agregarActividadAlGrupo(id, actividad_id, cantidad || 1);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function quitarActividadHandler(req, res) {
  try {
    const { actividad_grupo_id } = req.params;
    quitarActividadDelGrupo(actividad_grupo_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  listarSocios,
  verSocio,
  crearSocioHandler,
  editarSocioHandler,
  agregarMiembroHandler,
  quitarMiembroHandler,
  agregarActividadHandler,
  quitarActividadHandler
};
