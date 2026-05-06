# Sistema de Socios, Planes y Cobranza — Plan de Implementación

> **Para agentas:** Usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea a tarea.

**Objetivo:** Implementar sistema administrativo completo para gestionar grupos familiares, planes de membresía y facturación automática mensual con seguimiento de pagos.

**Arquitectura:** Tres módulos independientes (modulo-socios, modulo-planes, modulo-cobranza) siguiendo el patrón existente de modulo-actividades. Backend con servicios reutilizables, controllers MVC, rutas REST. Frontend con vistas EJS. Job automatizado (node-cron) para generación mensual de cuotas.

**Tech Stack:** Node.js/Express, SQLite (sql.js), EJS, node-cron, vanilla JS frontend.

---

## Phase 1: Database Schema & Data

### Task 1: Agregar nuevas tablas a schema.sql

**Archivos:**
- Modify: `database/schema.sql`

- [ ] **Step 1: Abrir schema.sql y ubicar el final del archivo**

Ubicar la línea `CREATE TABLE movimientos_caja` (alrededor de línea 148).

- [ ] **Step 2: Agregar tabla `miembros_grupo` después de `socios`**

Después de la tabla `socios` (línea 25), agregar:

```sql
-- MIEMBROS DEL GRUPO FAMILIAR
CREATE TABLE miembros_grupo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER REFERENCES socios(id) NOT NULL,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT,
  relacion TEXT NOT NULL,
  activo INTEGER DEFAULT 1,
  fecha_alta TEXT DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 3: Agregar tabla `actividades_grupo`**

Después de `miembros_grupo`, agregar:

```sql
-- ACTIVIDADES CONTRATADAS POR GRUPO
CREATE TABLE actividades_grupo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER REFERENCES socios(id) NOT NULL,
  actividad_id INTEGER REFERENCES actividades(id) NOT NULL,
  cantidad INTEGER DEFAULT 1,
  fecha_desde TEXT NOT NULL,
  fecha_hasta TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 4: Commit**

```bash
cd C:\Medanos
git add database/schema.sql
git commit -m "schema: add miembros_grupo and actividades_grupo tables"
```

---

### Task 2: Modificar tabla `socios` (agregar plan_id, cambiar estado)

**Archivos:**
- Modify: `database/db.js` (migration logic)

- [ ] **Step 1: Verificar que db.js carga el schema correctamente**

Abrir `database/db.js` y confirmar que tiene inicialización del schema.

- [ ] **Step 2: Agregar lógica de migración en db.js**

Al final de `database/db.js`, después de la inicialización del schema, agregar:

```javascript
// Migration: add plan_id to socios
try {
  db.exec(`ALTER TABLE socios ADD COLUMN plan_id INTEGER REFERENCES planes_cuota(id);`);
} catch (err) {
  // Column already exists
}

// Migration: ensure estado column has correct values
// (No action needed if column exists; it will have NULL/0 values that we'll treat as ACTIVO)
```

- [ ] **Step 3: Commit**

```bash
git add database/db.js
git commit -m "database: add migration for socios.plan_id"
```

---

### Task 3: Crear seed data (planes y actividades)

**Archivos:**
- Create: `database/seed.sql`

- [ ] **Step 1: Crear archivo seed.sql**

Crear `database/seed.sql` con contenido:

```sql
-- Seed data para planes y actividades

-- Planes de cuota base
INSERT OR IGNORE INTO planes_cuota (id, nombre, descripcion, monto, tipo) VALUES
(1, 'Plan Básico', 'Acceso a actividades básicas', 50.00, 'BASICO'),
(2, 'Plan Premium', 'Acceso a todas las actividades', 100.00, 'PREMIUM');

-- Actividades disponibles
INSERT OR IGNORE INTO actividades (id, nombre, descripcion, precio_base, activo) VALUES
(1, 'Gimnasio', 'Acceso libre lunes a viernes 7am-21h', 20.00, 1),
(2, 'Natación', 'Clases de natación con instructor', 30.00, 1),
(3, 'Pilates', 'Clases de pilates avanzado', 35.00, 1),
(4, 'Yoga', 'Yoga para relajación y flexibilidad', 25.00, 1),
(5, 'Fútbol', 'Fútbol de salón competitivo', 40.00, 1);
```

- [ ] **Step 2: Ejecutar seed en initialization si es necesario**

Abrir `database/db.js` y al final de la inicialización, agregar:

```javascript
// Load seed data if needed (check if planes_cuota is empty)
const planCount = db.prepare('SELECT COUNT(*) as cnt FROM planes_cuota').get();
if (planCount.cnt === 0) {
  const seedSql = require('fs').readFileSync('./database/seed.sql', 'utf8');
  db.exec(seedSql);
}
```

- [ ] **Step 3: Commit**

```bash
git add database/seed.sql database/db.js
git commit -m "database: add seed data for planes and actividades"
```

---

## Phase 2: Backend Services

### Task 4: Crear modulo-socios/services/socios.service.js

**Archivos:**
- Create: `modulo-socios/services/socios.service.js`

- [ ] **Step 1: Crear archivo con funciones CRUD principales**

```javascript
const db = require('../../database/db');

function crearSocio(numero_socio, apellido, nombre, plan_id, dni, email, telefono, domicilio) {
  try {
    const result = db.prepare(`
      INSERT INTO socios (numero_socio, apellido, nombre, plan_id, dni, email, telefono, domicilio, fecha_alta, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')
    `).run(numero_socio, apellido, nombre, plan_id, dni || null, email || null, telefono || null, domicilio || null, new Date().toISOString().split('T')[0]);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error creating socio: ${err.message}`);
  }
}

function obtenerSocios(filtro = {}) {
  try {
    let query = 'SELECT * FROM socios WHERE 1=1';
    const params = [];
    
    if (filtro.estado) {
      query += ' AND estado = ?';
      params.push(filtro.estado);
    }
    if (filtro.plan_id) {
      query += ' AND plan_id = ?';
      params.push(filtro.plan_id);
    }
    if (filtro.busqueda) {
      query += ' AND (numero_socio LIKE ? OR apellido LIKE ? OR nombre LIKE ?)';
      const search = '%' + filtro.busqueda + '%';
      params.push(search, search, search);
    }
    
    query += ' ORDER BY apellido, nombre';
    const socios = db.prepare(query).all(...params);
    return socios;
  } catch (err) {
    throw new Error(`Error fetching socios: ${err.message}`);
  }
}

function obtenerSocio(id) {
  try {
    const socio = db.prepare('SELECT * FROM socios WHERE id = ?').get(id);
    if (!socio) return null;
    
    const miembros = db.prepare('SELECT * FROM miembros_grupo WHERE socio_id = ? AND activo = 1 ORDER BY apellido').all(id);
    const actividades = db.prepare(`
      SELECT ag.*, a.nombre as actividad_nombre, a.precio_base as precio
      FROM actividades_grupo ag
      JOIN actividades a ON ag.actividad_id = a.id
      WHERE ag.socio_id = ? AND ag.fecha_hasta IS NULL
      ORDER BY a.nombre
    `).all(id);
    
    return { socio, miembros, actividades };
  } catch (err) {
    throw new Error(`Error fetching socio: ${err.message}`);
  }
}

function actualizarSocio(id, updates) {
  try {
    const fields = [];
    const values = [];
    
    if (updates.apellido !== undefined) { fields.push('apellido = ?'); values.push(updates.apellido); }
    if (updates.nombre !== undefined) { fields.push('nombre = ?'); values.push(updates.nombre); }
    if (updates.plan_id !== undefined) { fields.push('plan_id = ?'); values.push(updates.plan_id); }
    if (updates.estado !== undefined) { fields.push('estado = ?'); values.push(updates.estado); }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.telefono !== undefined) { fields.push('telefono = ?'); values.push(updates.telefono); }
    if (updates.domicilio !== undefined) { fields.push('domicilio = ?'); values.push(updates.domicilio); }
    
    if (fields.length === 0) return { success: true };
    
    values.push(id);
    db.prepare(`UPDATE socios SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return { success: true };
  } catch (err) {
    throw new Error(`Error updating socio: ${err.message}`);
  }
}

function agregarMiembroGrupo(socio_id, apellido, nombre, relacion, dni) {
  try {
    const result = db.prepare(`
      INSERT INTO miembros_grupo (socio_id, apellido, nombre, dni, relacion)
      VALUES (?, ?, ?, ?, ?)
    `).run(socio_id, apellido, nombre, dni || null, relacion);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error adding member: ${err.message}`);
  }
}

function quitarMiembroGrupo(miembro_id) {
  try {
    db.prepare('UPDATE miembros_grupo SET activo = 0 WHERE id = ?').run(miembro_id);
    return { success: true };
  } catch (err) {
    throw new Error(`Error removing member: ${err.message}`);
  }
}

function agregarActividadAlGrupo(socio_id, actividad_id, cantidad) {
  try {
    const existe = db.prepare('SELECT id FROM actividades_grupo WHERE socio_id = ? AND actividad_id = ? AND fecha_hasta IS NULL').get(socio_id, actividad_id);
    if (existe) {
      throw new Error('Activity already assigned to this group');
    }
    
    const result = db.prepare(`
      INSERT INTO actividades_grupo (socio_id, actividad_id, cantidad, fecha_desde)
      VALUES (?, ?, ?, ?)
    `).run(socio_id, actividad_id, cantidad || 1, new Date().toISOString().split('T')[0]);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error adding activity: ${err.message}`);
  }
}

function quitarActividadDelGrupo(actividad_grupo_id) {
  try {
    db.prepare('UPDATE actividades_grupo SET fecha_hasta = ? WHERE id = ?').run(new Date().toISOString().split('T')[0], actividad_grupo_id);
    return { success: true };
  } catch (err) {
    throw new Error(`Error removing activity: ${err.message}`);
  }
}

module.exports = {
  crearSocio,
  obtenerSocios,
  obtenerSocio,
  actualizarSocio,
  agregarMiembroGrupo,
  quitarMiembroGrupo,
  agregarActividadAlGrupo,
  quitarActividadDelGrupo
};
```

- [ ] **Step 2: Commit**

```bash
git add modulo-socios/services/socios.service.js
git commit -m "feat: create socios service with CRUD operations"
```

---

### Task 5: Crear modulo-planes/services/planes.service.js

**Archivos:**
- Create: `modulo-planes/services/planes.service.js`

- [ ] **Step 1: Crear archivo con funciones para planes y actividades**

```javascript
const db = require('../../database/db');

// PLANES

function obtenerPlanes() {
  try {
    return db.prepare('SELECT * FROM planes_cuota ORDER BY nombre').all();
  } catch (err) {
    throw new Error(`Error fetching planes: ${err.message}`);
  }
}

function crearPlan(nombre, descripcion, monto) {
  try {
    const result = db.prepare(`
      INSERT INTO planes_cuota (nombre, descripcion, monto)
      VALUES (?, ?, ?)
    `).run(nombre, descripcion || null, monto);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error creating plan: ${err.message}`);
  }
}

function actualizarPlan(id, nombre, descripcion, monto) {
  try {
    db.prepare(`
      UPDATE planes_cuota SET nombre = ?, descripcion = ?, monto = ? WHERE id = ?
    `).run(nombre, descripcion || null, monto, id);
    return { success: true };
  } catch (err) {
    throw new Error(`Error updating plan: ${err.message}`);
  }
}

// ACTIVIDADES

function obtenerActividades() {
  try {
    return db.prepare('SELECT id, nombre, descripcion, precio_base, activo FROM actividades WHERE activo = 1 ORDER BY nombre').all();
  } catch (err) {
    throw new Error(`Error fetching actividades: ${err.message}`);
  }
}

function crearActividad(nombre, descripcion, precio_base) {
  try {
    const result = db.prepare(`
      INSERT INTO actividades (nombre, descripcion, precio_base, activo)
      VALUES (?, ?, ?, 1)
    `).run(nombre, descripcion || null, precio_base || 0);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error creating actividad: ${err.message}`);
  }
}

function actualizarActividad(id, nombre, descripcion, precio_base) {
  try {
    db.prepare(`
      UPDATE actividades SET nombre = ?, descripcion = ?, precio_base = ? WHERE id = ?
    `).run(nombre, descripcion || null, precio_base || 0, id);
    return { success: true };
  } catch (err) {
    throw new Error(`Error updating actividad: ${err.message}`);
  }
}

function desactivarActividad(id) {
  try {
    db.prepare('UPDATE actividades SET activo = 0 WHERE id = ?').run(id);
    return { success: true };
  } catch (err) {
    throw new Error(`Error deactivating actividad: ${err.message}`);
  }
}

module.exports = {
  obtenerPlanes,
  crearPlan,
  actualizarPlan,
  obtenerActividades,
  crearActividad,
  actualizarActividad,
  desactivarActividad
};
```

- [ ] **Step 2: Commit**

```bash
git add modulo-planes/services/planes.service.js
git commit -m "feat: create planes service for cuota and actividades management"
```

---

### Task 6: Crear modulo-cobranza/services/facturacion.service.js

**Archivos:**
- Create: `modulo-cobranza/services/facturacion.service.js`

- [ ] **Step 1: Crear archivo con lógica de cálculo y generación de cuotas**

```javascript
const db = require('../../database/db');

function calcularMontoParaSocio(socio_id) {
  try {
    const socio = db.prepare('SELECT plan_id FROM socios WHERE id = ? AND estado = "ACTIVO"').get(socio_id);
    if (!socio) return null;
    
    // Obtener monto del plan base
    const plan = db.prepare('SELECT monto FROM planes_cuota WHERE id = ?').get(socio.plan_id);
    const monto_base = plan ? plan.monto : 0;
    
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
  // periodo formato: "2026-05"
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
```

- [ ] **Step 2: Commit**

```bash
git add modulo-cobranza/services/facturacion.service.js
git commit -m "feat: create facturacion service with cuota generation and payment tracking"
```

---

### Task 7: Crear job de generación automática de cuotas

**Archivos:**
- Create: `jobs/generarCuotas.js`
- Modify: `server.js`

- [ ] **Step 1: Crear archivo del job**

Crear `jobs/generarCuotas.js`:

```javascript
const cron = require('node-cron');
const { generarCuotasDelMes } = require('../modulo-cobranza/services/facturacion.service');

function iniciarJobGenerarCuotas() {
  // Ejecutar el primer día de cada mes a las 00:01
  cron.schedule('1 0 1 * *', () => {
    try {
      const hoy = new Date();
      const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
      console.log(`[generarCuotas] Iniciando generación de cuotas para ${periodo}...`);
      
      const resultado = generarCuotasDelMes(periodo);
      console.log(`[generarCuotas] ✓ Completado: ${resultado.total} cuotas creadas`);
      if (resultado.errores.length > 0) {
        console.warn(`[generarCuotas] ⚠ ${resultado.errores.length} errores:`, resultado.errores);
      }
    } catch (err) {
      console.error('[generarCuotas] ✗ Error:', err.message);
    }
  });
  
  console.log('[generarCuotas] Job scheduled: runs on 1st of each month at 00:01');
}

module.exports = { iniciarJobGenerarCuotas };
```

- [ ] **Step 2: Modificar server.js para iniciar el job**

Abrir `server.js` y agregar al inicio (después de require's, antes de app.listen):

```javascript
const { iniciarJobGenerarCuotas } = require('./jobs/generarCuotas');

// Iniciar jobs automatizados
iniciarJobGenerarCuotas();
```

- [ ] **Step 3: Verificar que node-cron está en package.json**

Si no está instalado, en terminal:
```bash
npm install node-cron
```

- [ ] **Step 4: Commit**

```bash
git add jobs/generarCuotas.js server.js
git commit -m "feat: add automated monthly cuota generation job"
```

---

## Phase 3: Backend Routes & Controllers

### Task 8: Crear modulo-socios (controllers, routes)

**Archivos:**
- Create: `modulo-socios/controllers/socios.controller.js`
- Create: `modulo-socios/routes/socios.routes.js`

- [ ] **Step 1: Crear controlador**

```javascript
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
```

- [ ] **Step 2: Crear rutas**

```javascript
// modulo-socios/routes/socios.routes.js
const express = require('express');
const { requireRole } = require('../../middleware/auth');
const {
  listarSocios,
  verSocio,
  crearSocioHandler,
  editarSocioHandler,
  agregarMiembroHandler,
  quitarMiembroHandler,
  agregarActividadHandler,
  quitarActividadHandler
} = require('../controllers/socios.controller');

const router = express.Router();

router.get('/api/socios', (req, res) => listarSocios(req, res));
router.get('/api/socios/:id', (req, res) => verSocio(req, res));
router.post('/api/socios', requireRole(['admin']), (req, res) => crearSocioHandler(req, res));
router.put('/api/socios/:id', requireRole(['admin']), (req, res) => editarSocioHandler(req, res));

router.post('/api/socios/:id/miembros', requireRole(['admin']), (req, res) => agregarMiembroHandler(req, res));
router.delete('/api/socios/:id/miembros/:miembro_id', requireRole(['admin']), (req, res) => quitarMiembroHandler(req, res));

router.post('/api/socios/:id/actividades', requireRole(['admin']), (req, res) => agregarActividadHandler(req, res));
router.delete('/api/socios/:id/actividades/:actividad_grupo_id', requireRole(['admin']), (req, res) => quitarActividadHandler(req, res));

// View
router.get('/socios', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.render('modulo-socios/socios');
});

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add modulo-socios/controllers/socios.controller.js modulo-socios/routes/socios.routes.js
git commit -m "feat: add socios controller and routes"
```

---

### Task 9: Crear modulo-planes (controllers, routes)

**Archivos:**
- Create: `modulo-planes/controllers/planes.controller.js`
- Create: `modulo-planes/routes/planes.routes.js`

- [ ] **Step 1: Crear controlador**

```javascript
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
```

- [ ] **Step 2: Crear rutas**

```javascript
// modulo-planes/routes/planes.routes.js
const express = require('express');
const { requireRole } = require('../../middleware/auth');
const {
  listarPlanes,
  crearPlanHandler,
  actualizarPlanHandler,
  listarActividades,
  crearActividadHandler,
  actualizarActividadHandler,
  desactivarActividadHandler
} = require('../controllers/planes.controller');

const router = express.Router();

// Planes
router.get('/api/planes', (req, res) => listarPlanes(req, res));
router.post('/api/planes', requireRole(['admin']), (req, res) => crearPlanHandler(req, res));
router.put('/api/planes/:id', requireRole(['admin']), (req, res) => actualizarPlanHandler(req, res));

// Actividades
router.get('/api/actividades', (req, res) => listarActividades(req, res));
router.post('/api/actividades', requireRole(['admin']), (req, res) => crearActividadHandler(req, res));
router.put('/api/actividades/:id', requireRole(['admin']), (req, res) => actualizarActividadHandler(req, res));
router.delete('/api/actividades/:id', requireRole(['admin']), (req, res) => desactivarActividadHandler(req, res));

// Views
router.get('/planes', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.render('modulo-planes/planes');
});

router.get('/actividades', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.render('modulo-planes/actividades');
});

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add modulo-planes/controllers/planes.controller.js modulo-planes/routes/planes.routes.js
git commit -m "feat: add planes controller and routes"
```

---

### Task 10: Crear modulo-cobranza (controllers, routes)

**Archivos:**
- Create: `modulo-cobranza/controllers/cobranza.controller.js`
- Create: `modulo-cobranza/routes/cobranza.routes.js`

- [ ] **Step 1: Crear controlador**

```javascript
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
```

- [ ] **Step 2: Crear rutas**

```javascript
// modulo-cobranza/routes/cobranza.routes.js
const express = require('express');
const { requireRole } = require('../../middleware/auth');
const {
  dashboardCobranza,
  listarCuotas,
  verCuota,
  registrarPagoHandler,
  generarCuotasHandler,
  cambiarEstadoSocioHandler,
  listarMorosos
} = require('../controllers/cobranza.controller');

const router = express.Router();

router.get('/api/cobranza/dashboard', requireRole(['admin', 'recepcion']), (req, res) => dashboardCobranza(req, res));
router.get('/api/cobranza/cuotas', requireRole(['admin', 'recepcion']), (req, res) => listarCuotas(req, res));
router.get('/api/cobranza/cuotas/:id', requireRole(['admin', 'recepcion']), (req, res) => verCuota(req, res));
router.post('/api/cobranza/pagos', requireRole(['admin', 'recepcion']), (req, res) => registrarPagoHandler(req, res));
router.post('/api/cobranza/generar', requireRole(['admin']), (req, res) => generarCuotasHandler(req, res));
router.put('/api/socios/:id/estado', requireRole(['admin']), (req, res) => cambiarEstadoSocioHandler(req, res));
router.get('/api/cobranza/morosos', requireRole(['admin', 'recepcion']), (req, res) => listarMorosos(req, res));

// Views
router.get('/cobranza', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.render('modulo-cobranza/cobranza');
});

module.exports = router;
```

- [ ] **Step 3: Modificar server.js para registrar las rutas**

Abrir `server.js` y agregar (si no están) después de los otros routers:

```javascript
const sociosRouter = require('./modulo-socios/routes/socios.routes');
const planesRouter = require('./modulo-planes/routes/planes.routes');
const cobranzaRouter = require('./modulo-cobranza/routes/cobranza.routes');

app.use(sociosRouter);
app.use(planesRouter);
app.use(cobranzaRouter);
```

- [ ] **Step 4: Commit**

```bash
git add modulo-cobranza/controllers/cobranza.controller.js modulo-cobranza/routes/cobranza.routes.js server.js
git commit -m "feat: add cobranza controller, routes, and register all new modules"
```

---

## Phase 4: Frontend Views & Styles

### Task 11: Crear vistas de modulo-socios

**Archivos:**
- Create: `views/modulo-socios/socios.ejs`

- [ ] **Step 1: Crear vista principal de listado y gestión**

```ejs
<!-- views/modulo-socios/socios.ejs -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Socios - Medanos</title>
  <link rel="stylesheet" href="/css/modulos.css">
  <style>
    .socios-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header-socios { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .btn-crear { background: #10b981; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    .btn-crear:hover { background: #059669; }
    .busqueda-box { display: flex; gap: 10px; margin-bottom: 20px; }
    .busqueda-box input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
    .tabla-socios { width: 100%; border-collapse: collapse; }
    .tabla-socios th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: bold; }
    .tabla-socios td { padding: 12px; border-bottom: 1px solid #eee; }
    .tabla-socios tr:hover { background: #f9fafb; }
    .estado-badge { padding: 4px 8px; border-radius: 3px; font-size: 12px; }
    .estado-activo { background: #d1fae5; color: #065f46; }
    .estado-suspendido { background: #fef3c7; color: #92400e; }
    .estado-baja { background: #fee2e2; color: #991b1b; }
    .acciones { display: flex; gap: 8px; }
    .btn-sm { padding: 6px 12px; font-size: 12px; border: none; border-radius: 3px; cursor: pointer; }
    .btn-ver { background: #3b82f6; color: white; }
    .btn-editar { background: #8b5cf6; color: white; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; }
    .modal.activo { display: flex; align-items: center; justify-content: center; }
    .modal-content { background: white; padding: 30px; border-radius: 8px; max-width: 500px; width: 90%; }
    .modal-titulo { font-size: 20px; font-weight: bold; margin-bottom: 20px; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
    .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    .form-actions { display: flex; gap: 10px; margin-top: 20px; }
    .btn-guardar { background: #10b981; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    .btn-cancelar { background: #6b7280; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="socios-container">
    <div class="header-socios">
      <h1>Socios</h1>
      <button class="btn-crear" onclick="abrirModalCrearSocio()">+ Crear Socio</button>
    </div>

    <div class="busqueda-box">
      <input type="text" id="busqueda" placeholder="Buscar por número, apellido, nombre..." onkeyup="buscarSocios()">
      <select id="filtroEstado" onchange="filtrarSocios()">
        <option value="">Todos los estados</option>
        <option value="ACTIVO">Activo</option>
        <option value="SUSPENDIDO">Suspendido</option>
        <option value="DADO_DE_BAJA">Dado de baja</option>
      </select>
    </div>

    <table class="tabla-socios">
      <thead>
        <tr>
          <th>Nº Socio</th>
          <th>Apellido</th>
          <th>Nombre</th>
          <th>Estado</th>
          <th>Plan</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="tbody-socios">
        <!-- Cargado por JS -->
      </tbody>
    </table>
  </div>

  <!-- Modal: Crear/Editar Socio -->
  <div id="modalSocio" class="modal">
    <div class="modal-content">
      <div class="modal-titulo">Crear Socio</div>
      <form id="formSocio">
        <div class="form-group">
          <label>Número de Socio</label>
          <input type="text" id="numero_socio" required>
        </div>
        <div class="form-group">
          <label>Apellido</label>
          <input type="text" id="apellido" required>
        </div>
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="nombre" required>
        </div>
        <div class="form-group">
          <label>Plan</label>
          <select id="plan_id" required>
            <option value="">Seleccionar...</option>
          </select>
        </div>
        <div class="form-group">
          <label>DNI</label>
          <input type="text" id="dni">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="email">
        </div>
        <div class="form-group">
          <label>Teléfono</label>
          <input type="text" id="telefono">
        </div>
        <div class="form-group">
          <label>Domicilio</label>
          <input type="text" id="domicilio">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-guardar">Guardar</button>
          <button type="button" class="btn-cancelar" onclick="cerrarModal('modalSocio')">Cancelar</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let planes = [];
    let socios = [];

    document.addEventListener('DOMContentLoaded', function() {
      cargarPlanes();
      cargarSocios();
      document.getElementById('formSocio').addEventListener('submit', guardarSocio);
    });

    async function cargarPlanes() {
      const res = await fetch('/api/planes');
      const data = await res.json();
      if (data.success) {
        planes = data.planes;
        const select = document.getElementById('plan_id');
        planes.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.nombre;
          select.appendChild(opt);
        });
      }
    }

    async function cargarSocios() {
      const busqueda = document.getElementById('busqueda').value;
      const estado = document.getElementById('filtroEstado').value;
      const params = new URLSearchParams();
      if (busqueda) params.append('busqueda', busqueda);
      if (estado) params.append('estado', estado);

      const res = await fetch('/api/socios?' + params.toString());
      const data = await res.json();
      if (data.success) {
        socios = data.socios;
        renderizarTabla();
      }
    }

    function renderizarTabla() {
      const tbody = document.getElementById('tbody-socios');
      tbody.innerHTML = socios.map(s => {
        const plan = planes.find(p => p.id === s.plan_id);
        const badgeClass = {
          'ACTIVO': 'estado-activo',
          'SUSPENDIDO': 'estado-suspendido',
          'DADO_DE_BAJA': 'estado-baja'
        }[s.estado] || '';
        return `
          <tr>
            <td>${s.numero_socio || '-'}</td>
            <td>${s.apellido}</td>
            <td>${s.nombre}</td>
            <td><span class="estado-badge ${badgeClass}">${s.estado}</span></td>
            <td>${plan ? plan.nombre : '-'}</td>
            <td>
              <div class="acciones">
                <button class="btn-sm btn-ver" onclick="verSocio(${s.id})">Ver</button>
                <button class="btn-sm btn-editar" onclick="editarSocio(${s.id})">Editar</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    function buscarSocios() {
      cargarSocios();
    }

    function filtrarSocios() {
      cargarSocios();
    }

    function abrirModalCrearSocio() {
      document.getElementById('formSocio').reset();
      document.getElementById('modalSocio').classList.add('activo');
    }

    function cerrarModal(id) {
      document.getElementById(id).classList.remove('activo');
    }

    async function guardarSocio(e) {
      e.preventDefault();
      const datos = {
        numero_socio: document.getElementById('numero_socio').value,
        apellido: document.getElementById('apellido').value,
        nombre: document.getElementById('nombre').value,
        plan_id: parseInt(document.getElementById('plan_id').value),
        dni: document.getElementById('dni').value || null,
        email: document.getElementById('email').value || null,
        telefono: document.getElementById('telefono').value || null,
        domicilio: document.getElementById('domicilio').value || null
      };

      const res = await fetch('/api/socios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      const data = await res.json();
      if (data.success) {
        cerrarModal('modalSocio');
        cargarSocios();
        alert('Socio creado exitosamente');
      } else {
        alert('Error: ' + data.error);
      }
    }

    function verSocio(id) {
      alert('Detalle de socio ' + id + ' (implementar vista detalle)');
    }

    function editarSocio(id) {
      alert('Editar socio ' + id + ' (implementar modal de edición)');
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add views/modulo-socios/socios.ejs
git commit -m "feat: add socios listado view"
```

---

### Task 12: Crear vistas de modulo-planes

**Archivos:**
- Create: `views/modulo-planes/planes.ejs`
- Create: `views/modulo-planes/actividades.ejs`

- [ ] **Step 1: Crear vista de planes**

```ejs
<!-- views/modulo-planes/planes.ejs -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Planes - Medanos</title>
  <link rel="stylesheet" href="/css/modulos.css">
  <style>
    .planes-container { max-width: 900px; margin: 0 auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .btn-crear { background: #10b981; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    .tabla { width: 100%; border-collapse: collapse; }
    .tabla th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: bold; }
    .tabla td { padding: 12px; border-bottom: 1px solid #eee; }
    .btn-sm { padding: 6px 12px; font-size: 12px; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px; }
    .btn-editar { background: #8b5cf6; color: white; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; }
    .modal.activo { display: flex; align-items: center; justify-content: center; }
    .modal-content { background: white; padding: 30px; border-radius: 8px; max-width: 400px; width: 90%; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
    .form-group input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    .form-actions { display: flex; gap: 10px; margin-top: 20px; }
    .btn-guardar { background: #10b981; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    .btn-cancelar { background: #6b7280; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="planes-container">
    <div class="header">
      <h1>Planes de Cuota</h1>
      <button class="btn-crear" onclick="abrirModal()">+ Crear Plan</button>
    </div>

    <table class="tabla">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Descripción</th>
          <th>Monto Mensual</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="tbody">
      </tbody>
    </table>
  </div>

  <div id="modal" class="modal">
    <div class="modal-content">
      <h2>Plan de Cuota</h2>
      <form id="form">
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="nombre" required>
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <input type="text" id="descripcion">
        </div>
        <div class="form-group">
          <label>Monto Mensual</label>
          <input type="number" id="monto" step="0.01" required>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-guardar">Guardar</button>
          <button type="button" class="btn-cancelar" onclick="cerrarModal()">Cancelar</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let planes = [];
    let editando = null;

    document.addEventListener('DOMContentLoaded', function() {
      cargar();
      document.getElementById('form').addEventListener('submit', guardar);
    });

    async function cargar() {
      const res = await fetch('/api/planes');
      const data = await res.json();
      if (data.success) {
        planes = data.planes;
        const tbody = document.getElementById('tbody');
        tbody.innerHTML = planes.map(p => `
          <tr>
            <td>${p.nombre}</td>
            <td>${p.descripcion || '-'}</td>
            <td>$${p.monto}</td>
            <td>
              <button class="btn-sm btn-editar" onclick="editar(${p.id})">Editar</button>
            </td>
          </tr>
        `).join('');
      }
    }

    function abrirModal() {
      editando = null;
      document.getElementById('form').reset();
      document.getElementById('modal').classList.add('activo');
    }

    function cerrarModal() {
      document.getElementById('modal').classList.remove('activo');
    }

    function editar(id) {
      const plan = planes.find(p => p.id === id);
      editando = id;
      document.getElementById('nombre').value = plan.nombre;
      document.getElementById('descripcion').value = plan.descripcion || '';
      document.getElementById('monto').value = plan.monto;
      document.getElementById('modal').classList.add('activo');
    }

    async function guardar(e) {
      e.preventDefault();
      const datos = {
        nombre: document.getElementById('nombre').value,
        descripcion: document.getElementById('descripcion').value,
        monto: parseFloat(document.getElementById('monto').value)
      };

      const url = editando ? `/api/planes/${editando}` : '/api/planes';
      const method = editando ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      const data = await res.json();
      if (data.success) {
        cerrarModal();
        cargar();
      } else {
        alert('Error: ' + data.error);
      }
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: Crear vista de actividades**

```ejs
<!-- views/modulo-planes/actividades.ejs -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Actividades - Medanos</title>
  <link rel="stylesheet" href="/css/modulos.css">
  <style>
    .actividades-container { max-width: 900px; margin: 0 auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .btn-crear { background: #10b981; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    .tabla { width: 100%; border-collapse: collapse; }
    .tabla th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: bold; }
    .tabla td { padding: 12px; border-bottom: 1px solid #eee; }
    .btn-sm { padding: 6px 12px; font-size: 12px; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px; }
    .btn-editar { background: #8b5cf6; color: white; }
    .btn-eliminar { background: #ef4444; color: white; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; }
    .modal.activo { display: flex; align-items: center; justify-content: center; }
    .modal-content { background: white; padding: 30px; border-radius: 8px; max-width: 400px; width: 90%; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
    .form-group input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    .form-actions { display: flex; gap: 10px; margin-top: 20px; }
    .btn-guardar { background: #10b981; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    .btn-cancelar { background: #6b7280; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="actividades-container">
    <div class="header">
      <h1>Actividades</h1>
      <button class="btn-crear" onclick="abrirModal()">+ Crear Actividad</button>
    </div>

    <table class="tabla">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Descripción</th>
          <th>Precio</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="tbody">
      </tbody>
    </table>
  </div>

  <div id="modal" class="modal">
    <div class="modal-content">
      <h2>Actividad</h2>
      <form id="form">
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="nombre" required>
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <input type="text" id="descripcion">
        </div>
        <div class="form-group">
          <label>Precio Base</label>
          <input type="number" id="precio_base" step="0.01" required>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-guardar">Guardar</button>
          <button type="button" class="btn-cancelar" onclick="cerrarModal()">Cancelar</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let actividades = [];
    let editando = null;

    document.addEventListener('DOMContentLoaded', function() {
      cargar();
      document.getElementById('form').addEventListener('submit', guardar);
    });

    async function cargar() {
      const res = await fetch('/api/actividades');
      const data = await res.json();
      if (data.success) {
        actividades = data.actividades;
        const tbody = document.getElementById('tbody');
        tbody.innerHTML = actividades.map(a => `
          <tr>
            <td>${a.nombre}</td>
            <td>${a.descripcion || '-'}</td>
            <td>$${a.precio_base}</td>
            <td>
              <button class="btn-sm btn-editar" onclick="editar(${a.id})">Editar</button>
              <button class="btn-sm btn-eliminar" onclick="eliminar(${a.id})">Eliminar</button>
            </td>
          </tr>
        `).join('');
      }
    }

    function abrirModal() {
      editando = null;
      document.getElementById('form').reset();
      document.getElementById('modal').classList.add('activo');
    }

    function cerrarModal() {
      document.getElementById('modal').classList.remove('activo');
    }

    function editar(id) {
      const act = actividades.find(a => a.id === id);
      editando = id;
      document.getElementById('nombre').value = act.nombre;
      document.getElementById('descripcion').value = act.descripcion || '';
      document.getElementById('precio_base').value = act.precio_base;
      document.getElementById('modal').classList.add('activo');
    }

    async function guardar(e) {
      e.preventDefault();
      const datos = {
        nombre: document.getElementById('nombre').value,
        descripcion: document.getElementById('descripcion').value,
        precio_base: parseFloat(document.getElementById('precio_base').value)
      };

      const url = editando ? `/api/actividades/${editando}` : '/api/actividades';
      const method = editando ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      const data = await res.json();
      if (data.success) {
        cerrarModal();
        cargar();
      } else {
        alert('Error: ' + data.error);
      }
    }

    async function eliminar(id) {
      if (!confirm('¿Eliminar esta actividad?')) return;
      const res = await fetch(`/api/actividades/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        cargar();
      } else {
        alert('Error: ' + data.error);
      }
    }
  </script>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add views/modulo-planes/
git commit -m "feat: add planes and actividades views"
```

---

### Task 13: Crear vista de modulo-cobranza

**Archivos:**
- Create: `views/modulo-cobranza/cobranza.ejs`

- [ ] **Step 1: Crear vista principal de cobranza**

```ejs
<!-- views/modulo-cobranza/cobranza.ejs -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cobranza - Medanos</title>
  <link rel="stylesheet" href="/css/modulos.css">
  <style>
    .cobranza-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .dashboard-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
    .stat-card.pagadas { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .stat-card.pendientes { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .stat-card.vencidas { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .stat-label { font-size: 12px; opacity: 0.9; }
    .stat-value { font-size: 28px; font-weight: bold; margin-top: 10px; }
    .header-cobranza { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .btn-generar { background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    .filtros { display: flex; gap: 10px; margin-bottom: 20px; }
    .filtros input, .filtros select { padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
    .tabla { width: 100%; border-collapse: collapse; }
    .tabla th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: bold; }
    .tabla td { padding: 12px; border-bottom: 1px solid #eee; }
    .tabla tr:hover { background: #f9fafb; }
    .badge { padding: 4px 8px; border-radius: 3px; font-size: 12px; }
    .badge-pagada { background: #d1fae5; color: #065f46; }
    .badge-pendiente { background: #fef3c7; color: #92400e; }
    .badge-vencida { background: #fee2e2; color: #991b1b; }
    .btn-sm { padding: 6px 12px; font-size: 12px; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px; }
    .btn-ver { background: #3b82f6; color: white; }
    .btn-pagar { background: #10b981; color: white; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; }
    .modal.activo { display: flex; align-items: center; justify-content: center; }
    .modal-content { background: white; padding: 30px; border-radius: 8px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
    .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    .btn-guardar { background: #10b981; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    .btn-cancelar { background: #6b7280; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="cobranza-container">
    <div class="header-cobranza">
      <h1>Cobranza</h1>
      <button class="btn-generar" onclick="generarCuotasDelMes()">Generar Cuotas Mes Actual</button>
    </div>

    <div class="dashboard-stats">
      <div class="stat-card pagadas">
        <div class="stat-label">Pagadas</div>
        <div class="stat-value" id="stat-pagadas">0</div>
      </div>
      <div class="stat-card pendientes">
        <div class="stat-label">Pendientes</div>
        <div class="stat-value" id="stat-pendientes">0</div>
      </div>
      <div class="stat-card vencidas">
        <div class="stat-label">Vencidas</div>
        <div class="stat-value" id="stat-vencidas">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Monto Total</div>
        <div class="stat-value" id="stat-monto">$0</div>
      </div>
    </div>

    <div class="filtros">
      <input type="month" id="periodo" onchange="cargarCuotas()">
      <select id="filtroEstado" onchange="cargarCuotas()">
        <option value="">Todos los estados</option>
        <option value="PAGADA">Pagada</option>
        <option value="PENDIENTE">Pendiente</option>
        <option value="VENCIDA">Vencida</option>
      </select>
    </div>

    <table class="tabla">
      <thead>
        <tr>
          <th>Nº Socio</th>
          <th>Socio</th>
          <th>Período</th>
          <th>Monto</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="tbody">
      </tbody>
    </table>
  </div>

  <!-- Modal: Registrar Pago -->
  <div id="modalPago" class="modal">
    <div class="modal-content">
      <h2>Registrar Pago</h2>
      <form id="formPago">
        <div class="form-group">
          <label>Socio</label>
          <input type="text" id="pago-socio" readonly>
        </div>
        <div class="form-group">
          <label>Monto de Cuota</label>
          <input type="number" id="pago-monto-cuota" readonly>
        </div>
        <div class="form-group">
          <label>Importe Pagado</label>
          <input type="number" id="pago-importe" step="0.01" required>
        </div>
        <div class="form-group">
          <label>Medio de Pago</label>
          <select id="pago-medio">
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        <div class="form-group">
          <label>Observaciones</label>
          <input type="text" id="pago-observaciones">
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button type="submit" class="btn-guardar">Registrar Pago</button>
          <button type="button" class="btn-cancelar" onclick="cerrarModal('modalPago')">Cancelar</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let cuotaActual = null;

    document.addEventListener('DOMContentLoaded', function() {
      const hoy = new Date();
      const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
      document.getElementById('periodo').value = periodo;
      cargarCuotas();
      document.getElementById('formPago').addEventListener('submit', registrarPago);
    });

    async function cargarCuotas() {
      const periodo = document.getElementById('periodo').value;
      const estado = document.getElementById('filtroEstado').value;
      const params = new URLSearchParams({ periodo });
      if (estado) params.append('estado', estado);

      const res = await fetch('/api/cobranza/dashboard?' + params.toString());
      const data = await res.json();
      if (data.success) {
        document.getElementById('stat-pagadas').textContent = data.stats.pagadas;
        document.getElementById('stat-pendientes').textContent = data.stats.pendientes;
        document.getElementById('stat-vencidas').textContent = data.stats.vencidas;
        document.getElementById('stat-monto').textContent = '$' + data.stats.monto_total.toFixed(2);

        const tbody = document.getElementById('tbody');
        tbody.innerHTML = data.cuotas.map(c => {
          const badgeClass = {
            'PAGADA': 'badge-pagada',
            'PENDIENTE': 'badge-pendiente',
            'VENCIDA': 'badge-vencida'
          }[c.estado] || '';
          return `
            <tr>
              <td>${c.numero_socio}</td>
              <td>${c.apellido}, ${c.nombre}</td>
              <td>${c.periodo}</td>
              <td>$${c.monto_total.toFixed(2)}</td>
              <td><span class="badge ${badgeClass}">${c.estado}</span></td>
              <td>
                <button class="btn-sm btn-ver" onclick="verCuota(${c.id})">Ver</button>
                <button class="btn-sm btn-pagar" onclick="abrirModalPago(${c.id}, '${c.apellido}, ${c.nombre}', ${c.monto_total})">Pagar</button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    function abrirModalPago(cuota_id, socio_nombre, monto) {
      cuotaActual = cuota_id;
      document.getElementById('pago-socio').value = socio_nombre;
      document.getElementById('pago-monto-cuota').value = monto;
      document.getElementById('pago-importe').value = monto;
      document.getElementById('modalPago').classList.add('activo');
    }

    function cerrarModal(id) {
      document.getElementById(id).classList.remove('activo');
    }

    async function registrarPago(e) {
      e.preventDefault();
      const importe = parseFloat(document.getElementById('pago-importe').value);
      const medio = document.getElementById('pago-medio').value;
      const obs = document.getElementById('pago-observaciones').value;

      const res = await fetch('/api/cobranza/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuota_id: cuotaActual,
          socio_id: 1, // TODO: obtener del contexto
          importe,
          medio_pago: medio,
          observaciones: obs
        })
      });
      const data = await res.json();
      if (data.success) {
        cerrarModal('modalPago');
        cargarCuotas();
        alert('Pago registrado exitosamente');
      } else {
        alert('Error: ' + data.error);
      }
    }

    async function generarCuotasDelMes() {
      const periodo = document.getElementById('periodo').value;
      if (!periodo) {
        alert('Seleccionar período');
        return;
      }

      const res = await fetch('/api/cobranza/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Cuotas generadas: ${data.total}\n${data.errores.length} errores`);
        cargarCuotas();
      } else {
        alert('Error: ' + data.error);
      }
    }

    function verCuota(id) {
      alert('Detalle de cuota ' + id);
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add views/modulo-cobranza/cobranza.ejs
git commit -m "feat: add cobranza dashboard view"
```

---

### Task 14: Crear/actualizar estilos CSS compartidos

**Archivos:**
- Create/Modify: `public/css/modulos.css`

- [ ] **Step 1: Crear archivo CSS para estilos compartidos**

```css
/* public/css/modulos.css */

:root {
  --color-success: #10b981;
  --color-success-dark: #059669;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  --color-neutral-100: #f9fafb;
  --color-neutral-200: #f3f4f6;
  --color-neutral-400: #9ca3af;
  --color-neutral-700: #374151;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  background: #fafafa;
  color: var(--color-neutral-700);
  line-height: 1.6;
}

h1, h2, h3 {
  font-weight: 600;
  margin-bottom: 1rem;
}

h1 { font-size: 28px; }
h2 { font-size: 22px; }
h3 { font-size: 18px; }

/* Layout */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Buttons */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-info);
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-success {
  background: var(--color-success);
  color: white;
}

.btn-success:hover {
  background: var(--color-success-dark);
}

.btn-danger {
  background: var(--color-error);
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

/* Tables */
.table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.table th {
  background: var(--color-neutral-200);
  padding: 12px 15px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid var(--color-neutral-200);
}

.table td {
  padding: 12px 15px;
  border-bottom: 1px solid #e5e7eb;
}

.table tr:hover {
  background: var(--color-neutral-100);
}

/* Forms */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 14px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-info);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Badges */
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success {
  background: #d1fae5;
  color: #065f46;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.badge-danger {
  background: #fee2e2;
  color: #991b1b;
}

.badge-info {
  background: #dbeafe;
  color: #0c4a6e;
}

/* Alerts */
.alert {
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.alert-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

.alert-warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.alert-danger {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.alert-info {
  background: #dbeafe;
  color: #0c4a6e;
  border: 1px solid #93c5fd;
}

/* Cards */
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.card-header {
  font-weight: 600;
  margin-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
}

/* Modals */
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}

.modal.activo {
  display: flex;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
}

.modal-header {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}

/* Utilities */
.mt-1 { margin-top: 0.5rem; }
.mt-2 { margin-top: 1rem; }
.mt-3 { margin-top: 1.5rem; }
.mt-4 { margin-top: 2rem; }

.mb-1 { margin-bottom: 0.5rem; }
.mb-2 { margin-bottom: 1rem; }
.mb-3 { margin-bottom: 1.5rem; }
.mb-4 { margin-bottom: 2rem; }

.p-1 { padding: 0.5rem; }
.p-2 { padding: 1rem; }
.p-3 { padding: 1.5rem; }
.p-4 { padding: 2rem; }

.text-center { text-align: center; }
.text-right { text-align: right; }

.flex { display: flex; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.gap-2 { gap: 1rem; }

.d-none { display: none; }
```

- [ ] **Step 2: Commit**

```bash
git add public/css/modulos.css
git commit -m "feat: add shared CSS styles for all modules"
```

---

## Phase 5: Testing & Validation

### Task 15: Crear tests para facturacion.service.js

**Archivos:**
- Create: `tests/modulo-cobranza/facturacion.service.test.js`

- [ ] **Step 1: Escribir tests para calcularMontoParaSocio**

```javascript
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
```

- [ ] **Step 2: Ejecutar tests para verificar que pasan**

```bash
npm test -- tests/modulo-cobranza/facturacion.service.test.js
```

Esperado: PASS (o setup necesario para que pasen)

- [ ] **Step 3: Commit**

```bash
git add tests/modulo-cobranza/facturacion.service.test.js
git commit -m "test: add tests for facturacion service"
```

---

## Summary

Plan completo con 15 tasks:
- **Phase 1 (3 tasks):** Schema, migrations, seed data
- **Phase 2 (4 tasks):** Backend services (socios, planes, facturación, job)
- **Phase 3 (3 tasks):** Controllers y routes para los 3 módulos
- **Phase 4 (4 tasks):** Vistas EJS + CSS compartido
- **Phase 5 (1 task):** Tests críticos

Cada task produce código funcional y testeable, con commits frecuentes (uno por task).

**Ejecución recomendada:** Usa superpowers:subagent-driven-development para ejecutar una task por subagent, con reviews entre cada una.
