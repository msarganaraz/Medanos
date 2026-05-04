const db = require('../../database/db');

function generarNumeroSocio() {
  const result = db.prepare('SELECT MAX(numero_socio) as max FROM socios').get();
  const max = result?.max ? parseInt(result.max) : 0;
  return String(max + 1).padStart(5, '0');
}

function obtenerSocios(req, res) {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM socios WHERE 1=1';
    let params = [];

    if (search) {
      query += ' AND (apellido LIKE ? OR nombre LIKE ? OR dni LIKE ?)';
      const searchTerm = `%${search}%`;
      params = [searchTerm, searchTerm, searchTerm];
    }

    query += ' ORDER BY apellido, nombre';
    const socios = db.prepare(query).all(...params);
    res.json({ success: true, socios });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerSocio(req, res) {
  const { id } = req.params;
  try {
    const socio = db.prepare('SELECT * FROM socios WHERE id = ?').get(id);
    if (!socio) return res.status(404).json({ success: false, error: 'Socio no encontrado' });

    const actividades = db.prepare(`
      SELECT a.id, a.nombre FROM actividades a
      JOIN socio_actividades sa ON a.id = sa.actividad_id
      WHERE sa.socio_id = ? AND sa.fecha_hasta IS NULL
    `).all(id);

    const pagos = db.prepare(`
      SELECT p.*, c.periodo, c.monto_total FROM pagos p
      JOIN cuotas c ON p.cuota_id = c.id
      WHERE p.socio_id = ?
      ORDER BY p.fecha_pago DESC
      LIMIT 10
    `).all(id);

    res.json({ success: true, socio, actividades, pagos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function crearSocio(req, res) {
  const { apellido, nombre, dni, fecha_nacimiento, telefono, email, domicilio } = req.body;

  if (!apellido || !nombre) {
    return res.json({ success: false, error: 'Apellido y nombre son requeridos' });
  }

  try {
    const numero_socio = generarNumeroSocio();
    const fecha_alta = new Date().toISOString().split('T')[0];

    const result = db.prepare(`
      INSERT INTO socios (numero_socio, apellido, nombre, dni, fecha_nacimiento, telefono, email, domicilio, fecha_alta, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')
    `).run(numero_socio, apellido, nombre, dni || null, fecha_nacimiento || null, telefono || null, email || null, domicilio || null, fecha_alta);

    res.json({ success: true, id: result.lastInsertRowid, numero_socio });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function editarSocio(req, res) {
  const { id } = req.params;
  const { apellido, nombre, dni, fecha_nacimiento, telefono, email, domicilio, estado, observaciones } = req.body;

  if (!apellido || !nombre) {
    return res.json({ success: false, error: 'Apellido y nombre son requeridos' });
  }

  try {
    db.prepare(`
      UPDATE socios SET apellido = ?, nombre = ?, dni = ?, fecha_nacimiento = ?, telefono = ?, email = ?, domicilio = ?, estado = ?, observaciones = ?
      WHERE id = ?
    `).run(apellido, nombre, dni || null, fecha_nacimiento || null, telefono || null, email || null, domicilio || null, estado, observaciones || null, id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function asignarActividad(req, res) {
  const { socio_id } = req.params;
  const { actividad_id } = req.body;

  if (!actividad_id) {
    return res.json({ success: false, error: 'actividad_id es requerido' });
  }

  try {
    const existe = db.prepare('SELECT id FROM socio_actividades WHERE socio_id = ? AND actividad_id = ? AND fecha_hasta IS NULL').get(socio_id, actividad_id);
    if (existe) {
      return res.json({ success: false, error: 'El socio ya está inscrito en esta actividad' });
    }

    const fecha_desde = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO socio_actividades (socio_id, actividad_id, fecha_desde)
      VALUES (?, ?, ?)
    `).run(socio_id, actividad_id, fecha_desde);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerSocios,
  obtenerSocio,
  crearSocio,
  editarSocio,
  asignarActividad
};
