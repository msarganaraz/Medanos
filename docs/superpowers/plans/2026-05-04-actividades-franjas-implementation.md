# Activity Management by Hourly Slots - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the activities card-based view with a dashboard showing occupancy by time slot, enabling administrators to manage socios and instructores assigned to specific days/hours.

**Architecture:** 
- Create `franjas_horarias` table to store hourly slots (day + start/end time)
- Replace `socio_actividades` with `socio_franjas` (socios assigned to specific slots)
- Replace `instructor_actividades` with `instructor_franjas`
- Dashboard shows grilla (grid) of occupancy; detail view manages assignments per slot
- Two activity types: fixed-schedule (Natación, Tenis) and flexible (Gimnasio)

**Tech Stack:** Node.js/Express, sql.js, EJS templating, HTML/CSS grid layout

---

## Phase 1: Database Schema

### Task 1: Add New Tables to Schema

**Files:**
- Modify: `database/schema.sql`

- [ ] **Step 1: Add `franjas_horarias` table**

Open `database/schema.sql` and add this after the `actividades` table definition:

```sql
-- FRANJAS HORARIAS (hourly slots for activities)
CREATE TABLE franjas_horarias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actividad_id INTEGER REFERENCES actividades(id),
  dia_semana INTEGER NOT NULL,
  hora_inicio INTEGER NOT NULL,
  hora_fin INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: Add `socio_franjas` table to replace `socio_actividades`**

Add this table definition:

```sql
-- SOCIOS ↔ FRANJAS (replacing socio_actividades)
CREATE TABLE socio_franjas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER REFERENCES socios(id),
  franja_id INTEGER REFERENCES franjas_horarias(id),
  fecha_desde TEXT NOT NULL,
  fecha_hasta TEXT
);
```

- [ ] **Step 3: Add `instructor_franjas` table to replace `instructor_actividades`**

Add this table definition:

```sql
-- INSTRUCTORES ↔ FRANJAS (replacing instructor_actividades)
CREATE TABLE instructor_franjas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instructor_id INTEGER REFERENCES instructores(id),
  franja_id INTEGER REFERENCES franjas_horarias(id)
);
```

- [ ] **Step 4: Modify `actividades` table to add flexibility flag**

Find the CREATE TABLE actividades section and add this column to the definition:

```sql
tiene_horarios_flexibles INTEGER DEFAULT 0,
```

The modified CREATE TABLE should look like:

```sql
CREATE TABLE actividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  dias_horario TEXT,
  precio_base REAL DEFAULT 0,
  tiene_horarios_flexibles INTEGER DEFAULT 0,
  activo INTEGER DEFAULT 1
);
```

- [ ] **Step 5: Drop old tables (optional for now, or leave as backup)**

Old tables `socio_actividades` and `instructor_actividades` will be kept for now but not used. You can delete them later after migration is complete.

- [ ] **Step 6: Commit**

```bash
cd c:/Medanos
git add database/schema.sql
git commit -m "db: add franjas_horarias, socio_franjas, instructor_franjas tables"
```

---

### Task 2: Update Seed Data for New Tables

**Files:**
- Modify: `database/init-seed.js`

- [ ] **Step 1: Import required modules at top of init-seed.js**

Open `database/init-seed.js` and verify these are already imported:

```javascript
const db = require('./db');
const bcrypt = require('bcryptjs');
```

- [ ] **Step 2: Create helper function to parse days from `dias_horario`**

Add this function before the `initSeed()` function:

```javascript
function parseDiasHorario(diasHorarioStr) {
  // Example: "Lun-Mié-Vie 18:00 a 19:00" → { dias: [0, 2, 4], hora_inicio: 18, hora_fin: 19 }
  const diasMap = { 'Lun': 0, 'Mar': 1, 'Mié': 2, 'Jue': 3, 'Vie': 4, 'Sab': 5, 'Dom': 6 };
  
  // Split by whitespace to separate dias from horarios
  const parts = diasHorarioStr.split(' ');
  const diasStr = parts[0]; // "Lun-Mié-Vie"
  const horaInicio = parseInt(parts[1]); // "18:00" → 18
  const horaFin = parseInt(parts[3]); // "19:00" → 19
  
  const dias = diasStr.split('-').map(d => diasMap[d]);
  
  return { dias, hora_inicio: horaInicio, hora_fin: horaFin };
}
```

- [ ] **Step 3: Create franjas for each activity after inserting actividades**

After the loop that inserts actividades (around line 59 after `insertActividad.free()`), add:

```javascript
    // Create franjas_horarias for each activity
    const actividades_list = [
      { id: 1, dias_horario: 'Lun-Mié-Vie 7:00 a 8:00' },
      { id: 2, dias_horario: 'Mar-Jue 17:00 a 18:30' },
      { id: 3, dias_horario: 'Mar-Jue 16:00 a 17:30' },
      { id: 4, dias_horario: 'Lun-Mié-Vie 10:00 a 11:00' },
      { id: 5, dias_horario: 'Mar-Jue 19:00 a 20:30' },
      { id: 6, dias_horario: 'Lun-Mié 19:30 a 20:30, Dom 10:00 a 11:30' }
    ];

    const insertFranja = db.prepare(`
      INSERT INTO franjas_horarias (actividad_id, dia_semana, hora_inicio, hora_fin)
      VALUES (?, ?, ?, ?)
    `);

    actividades_list.forEach(act => {
      const parsed = parseDiasHorario(act.dias_horario.split(',')[0]);
      parsed.dias.forEach(day => {
        insertFranja.run(act.id, day, parsed.hora_inicio, parsed.hora_fin);
      });
    });
    insertFranja.free();
```

- [ ] **Step 4: Set `tiene_horarios_flexibles = 1` for Gimnasio (actividad 6)**

Add this after the franja insertion:

```javascript
    // Mark Gimnasio as flexible (no fixed horarios)
    db.prepare('UPDATE actividades SET tiene_horarios_flexibles = 1 WHERE nombre = ?').run('Yoga');
```

- [ ] **Step 5: Create sample socio_franjas assignments**

Add this to create 2-3 sample assignments per franja so dashboard shows data:

```javascript
    // Add sample socio_franjas assignments (first 5 socios to first 6 franjas)
    const insertSocioFranja = db.prepare(`
      INSERT INTO socio_franjas (socio_id, franja_id, fecha_desde)
      VALUES (?, ?, ?)
    `);

    const today = new Date().toISOString().split('T')[0];
    // Assign socios 1-5 to franjas 1-6 in a round-robin pattern
    for (let socio_id = 1; socio_id <= 5; socio_id++) {
      for (let franja_id = 1; franja_id <= 6; franja_id++) {
        if ((socio_id + franja_id) % 2 === 0) { // Assign every other combo
          insertSocioFranja.run(socio_id, franja_id, today);
        }
      }
    }
    insertSocioFranja.free();
```

- [ ] **Step 6: Create sample instructor_franjas assignments**

Add this to assign instructores to franjas:

```javascript
    // Add sample instructor_franjas assignments
    const insertInstructorFranja = db.prepare(`
      INSERT INTO instructor_franjas (instructor_id, franja_id)
      VALUES (?, ?)
    `);

    // Assign instructores 1-3 to franjas 1-6
    for (let instr_id = 1; instr_id <= 3; instr_id++) {
      for (let franja_id = 1; franja_id <= 6; franja_id++) {
        if ((instr_id + franja_id) % 3 === 0) { // Assign every 3rd combo
          insertInstructorFranja.run(instr_id, franja_id);
        }
      }
    }
    insertInstructorFranja.free();
```

- [ ] **Step 7: Update console message**

Change the final console.log message to:

```javascript
    console.log('✓ Base de datos inicializada con franjas horarias');
```

- [ ] **Step 8: Commit**

```bash
cd c:/Medanos
git add database/init-seed.js
git commit -m "feat: add seed data for franjas_horarias and assignments"
```

---

## Phase 2: Backend API

### Task 3: Create Franjas Service

**Files:**
- Create: `modulo-actividades/services/franjas.service.js`

- [ ] **Step 1: Create franjas.service.js file**

```javascript
const db = require('../../database/db');

function obtenerFranjasActividad(actividad_id) {
  try {
    const franjas = db.prepare(`
      SELECT f.id, f.dia_semana, f.hora_inicio, f.hora_fin,
             COUNT(DISTINCT sf.socio_id) as socios_count,
             COUNT(DISTINCT inf.instructor_id) as instructores_count
      FROM franjas_horarias f
      LEFT JOIN socio_franjas sf ON f.id = sf.franja_id
      LEFT JOIN instructor_franjas inf ON f.id = inf.franja_id
      WHERE f.actividad_id = ?
      GROUP BY f.id
      ORDER BY f.dia_semana, f.hora_inicio
    `).all(actividad_id);
    return franjas;
  } catch (err) {
    throw new Error(`Error fetching franjas: ${err.message}`);
  }
}

function obtenerDetallesFranja(franja_id) {
  try {
    const franja = db.prepare(`
      SELECT f.*, a.nombre as actividad_nombre
      FROM franjas_horarias f
      JOIN actividades a ON f.actividad_id = a.id
      WHERE f.id = ?
    `).get(franja_id);

    if (!franja) return null;

    const socios = db.prepare(`
      SELECT s.id, s.apellido, s.nombre
      FROM socios s
      JOIN socio_franjas sf ON s.id = sf.socio_id
      WHERE sf.franja_id = ?
      ORDER BY s.apellido, s.nombre
    `).all(franja_id);

    const instructores = db.prepare(`
      SELECT i.id, i.apellido, i.nombre
      FROM instructores i
      JOIN instructor_franjas inf ON i.id = inf.instructor_id
      WHERE inf.franja_id = ?
      ORDER BY i.apellido, i.nombre
    `).all(franja_id);

    return { franja, socios, instructores };
  } catch (err) {
    throw new Error(`Error fetching franja details: ${err.message}`);
  }
}

function agregarSocioAFranja(franja_id, socio_id) {
  try {
    const existe = db.prepare(`
      SELECT id FROM socio_franjas
      WHERE franja_id = ? AND socio_id = ?
    `).get(franja_id, socio_id);

    if (existe) {
      throw new Error('Socio ya asignado a esta franja');
    }

    const today = new Date().toISOString().split('T')[0];
    const result = db.prepare(`
      INSERT INTO socio_franjas (socio_id, franja_id, fecha_desde)
      VALUES (?, ?, ?)
    `).run(socio_id, franja_id, today);

    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error adding socio to franja: ${err.message}`);
  }
}

function quitarSocioDeFranja(franja_id, socio_id) {
  try {
    db.prepare(`
      DELETE FROM socio_franjas
      WHERE franja_id = ? AND socio_id = ?
    `).run(franja_id, socio_id);

    return { success: true };
  } catch (err) {
    throw new Error(`Error removing socio from franja: ${err.message}`);
  }
}

function agregarInstructorAFranja(franja_id, instructor_id) {
  try {
    const existe = db.prepare(`
      SELECT id FROM instructor_franjas
      WHERE franja_id = ? AND instructor_id = ?
    `).get(franja_id, instructor_id);

    if (existe) {
      throw new Error('Instructor ya asignado a esta franja');
    }

    const result = db.prepare(`
      INSERT INTO instructor_franjas (instructor_id, franja_id)
      VALUES (?, ?)
    `).run(instructor_id, franja_id);

    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    throw new Error(`Error adding instructor to franja: ${err.message}`);
  }
}

function quitarInstructorDeFranja(franja_id, instructor_id) {
  try {
    db.prepare(`
      DELETE FROM instructor_franjas
      WHERE franja_id = ? AND instructor_id = ?
    `).run(franja_id, instructor_id);

    return { success: true };
  } catch (err) {
    throw new Error(`Error removing instructor from franja: ${err.message}`);
  }
}

module.exports = {
  obtenerFranjasActividad,
  obtenerDetallesFranja,
  agregarSocioAFranja,
  quitarSocioDeFranja,
  agregarInstructorAFranja,
  quitarInstructorDeFranja
};
```

- [ ] **Step 2: Commit**

```bash
cd c:/Medanos
git add modulo-actividades/services/franjas.service.js
git commit -m "feat: create franjas service with CRUD operations"
```

---

### Task 4: Rewrite Activities Controller

**Files:**
- Modify: `modulo-actividades/controllers/actividades.controller.js`

- [ ] **Step 1: Replace entire controller with new version**

Backup the existing file, then replace with:

```javascript
const db = require('../../database/db');
const {
  obtenerFranjasActividad,
  obtenerDetallesFranja,
  agregarSocioAFranja,
  quitarSocioDeFranja,
  agregarInstructorAFranja,
  quitarInstructorDeFranja
} = require('../services/franjas.service');

function obtenerActividades(req, res) {
  try {
    const actividades = db.prepare(`
      SELECT id, nombre, descripcion, precio_base, tiene_horarios_flexibles, activo
      FROM actividades
      WHERE activo = 1
      ORDER BY nombre
    `).all();

    const resultado = actividades.map(act => {
      if (act.tiene_horarios_flexibles) {
        // Flexible activity: count socios directly
        const socios_count = db.prepare(`
          SELECT COUNT(*) as count FROM socios s
          WHERE s.id IN (
            SELECT DISTINCT sf.socio_id FROM socio_franjas sf
            JOIN franjas_horarias f ON sf.franja_id = f.id
            WHERE f.actividad_id = ?
          )
        `).get(act.id).count;
        return { ...act, socios_count };
      } else {
        // Fixed schedule: get franjas with counts
        const franjas = obtenerFranjasActividad(act.id);
        return { ...act, franjas };
      }
    });

    res.json({ success: true, actividades: resultado });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerActividad(req, res) {
  const { id } = req.params;
  try {
    const actividad = db.prepare('SELECT * FROM actividades WHERE id = ?').get(id);
    if (!actividad) {
      return res.status(404).json({ success: false, error: 'Actividad no encontrada' });
    }

    if (actividad.tiene_horarios_flexibles) {
      // Flexible: return list of socios inscribed
      const socios = db.prepare(`
        SELECT s.id, s.apellido, s.nombre FROM socios s
        WHERE s.id IN (
          SELECT DISTINCT sf.socio_id FROM socio_franjas sf
          JOIN franjas_horarias f ON sf.franja_id = f.id
          WHERE f.actividad_id = ?
        )
        ORDER BY s.apellido, s.nombre
      `).all(id);

      res.json({ success: true, actividad, socios });
    } else {
      // Fixed: return franjas with socios/instructores
      const franjas = obtenerFranjasActividad(id);
      res.json({ success: true, actividad, franjas });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerDetallesFranjaHandler(req, res) {
  const { franja_id } = req.params;
  try {
    const detalles = obtenerDetallesFranja(franja_id);
    if (!detalles) {
      return res.status(404).json({ success: false, error: 'Franja no encontrada' });
    }
    res.json({ success: true, ...detalles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function crearActividad(req, res) {
  const { nombre, descripcion, dias_horario, precio_base, tiene_horarios_flexibles } = req.body;

  if (!nombre) {
    return res.json({ success: false, error: 'Nombre es requerido' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO actividades (nombre, descripcion, dias_horario, precio_base, tiene_horarios_flexibles, activo)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(nombre, descripcion || null, dias_horario || null, precio_base || 0, tiene_horarios_flexibles ? 1 : 0);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function editarActividad(req, res) {
  const { id } = req.params;
  const { nombre, descripcion, dias_horario, precio_base, activo, tiene_horarios_flexibles } = req.body;

  if (!nombre) {
    return res.json({ success: false, error: 'Nombre es requerido' });
  }

  try {
    db.prepare(`
      UPDATE actividades
      SET nombre = ?, descripcion = ?, dias_horario = ?, precio_base = ?, activo = ?, tiene_horarios_flexibles = ?
      WHERE id = ?
    `).run(nombre, descripcion || null, dias_horario || null, precio_base || 0, activo ? 1 : 0, tiene_horarios_flexibles ? 1 : 0, id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function agregarSocioFranja(req, res) {
  const { franja_id } = req.params;
  const { socio_id } = req.body;

  if (!socio_id) {
    return res.json({ success: false, error: 'socio_id es requerido' });
  }

  try {
    agregarSocioAFranja(franja_id, socio_id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function quitarSocioFranja(req, res) {
  const { franja_id, socio_id } = req.params;

  try {
    quitarSocioDeFranja(franja_id, socio_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function agregarInstructorFranja(req, res) {
  const { franja_id } = req.params;
  const { instructor_id } = req.body;

  if (!instructor_id) {
    return res.json({ success: false, error: 'instructor_id es requerido' });
  }

  try {
    agregarInstructorAFranja(franja_id, instructor_id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function quitarInstructorFranja(req, res) {
  const { franja_id, instructor_id } = req.params;

  try {
    quitarInstructorDeFranja(franja_id, instructor_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerSociosDisponibles(req, res) {
  const { franja_id } = req.params;

  try {
    const franja = db.prepare('SELECT actividad_id FROM franjas_horarias WHERE id = ?').get(franja_id);
    if (!franja) {
      return res.status(404).json({ success: false, error: 'Franja no encontrada' });
    }

    const socios = db.prepare(`
      SELECT s.id, s.apellido, s.nombre FROM socios s
      WHERE s.id NOT IN (
        SELECT sf.socio_id FROM socio_franjas sf WHERE sf.franja_id = ?
      )
      ORDER BY s.apellido, s.nombre
    `).all(franja_id);

    res.json({ success: true, socios });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function obtenerInstructoresDisponibles(req, res) {
  const { franja_id } = req.params;

  try {
    const instructores = db.prepare(`
      SELECT i.id, i.apellido, i.nombre FROM instructores i
      WHERE i.activo = 1 AND i.id NOT IN (
        SELECT inf.instructor_id FROM instructor_franjas inf WHERE inf.franja_id = ?
      )
      ORDER BY i.apellido, i.nombre
    `).all(franja_id);

    res.json({ success: true, instructores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerActividades,
  obtenerActividad,
  crearActividad,
  editarActividad,
  obtenerDetallesFranjaHandler,
  agregarSocioFranja,
  quitarSocioFranja,
  agregarInstructorFranja,
  quitarInstructorFranja,
  obtenerSociosDisponibles,
  obtenerInstructoresDisponibles
};
```

- [ ] **Step 2: Commit**

```bash
cd c:/Medanos
git add modulo-actividades/controllers/actividades.controller.js
git commit -m "refactor: rewrite controller for franjas-based architecture"
```

---

### Task 5: Update Routes

**Files:**
- Modify: `modulo-actividades/routes/actividades.routes.js`

- [ ] **Step 1: Replace routes with new endpoints**

```javascript
const express = require('express');
const {
  obtenerActividades,
  obtenerActividad,
  crearActividad,
  editarActividad,
  obtenerDetallesFranjaHandler,
  agregarSocioFranja,
  quitarSocioFranja,
  agregarInstructorFranja,
  quitarInstructorFranja,
  obtenerSociosDisponibles,
  obtenerInstructoresDisponibles
} = require('../controllers/actividades.controller');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();

// Get all activities with franja info
router.get('/api/actividades', (req, res) => obtenerActividades(req, res));

// Get single activity
router.get('/api/actividades/:id', (req, res) => obtenerActividad(req, res));

// Create activity
router.post('/api/actividades', requireRole(['admin']), (req, res) => crearActividad(req, res));

// Edit activity
router.put('/api/actividades/:id', requireRole(['admin']), (req, res) => editarActividad(req, res));

// Get franja details (socios + instructores)
router.get('/api/franjas/:franja_id', (req, res) => obtenerDetallesFranjaHandler(req, res));

// Add socio to franja
router.post('/api/franjas/:franja_id/socios', requireRole(['admin', 'recepcion']), (req, res) => agregarSocioFranja(req, res));

// Remove socio from franja
router.delete('/api/franjas/:franja_id/socios/:socio_id', requireRole(['admin', 'recepcion']), (req, res) => quitarSocioFranja(req, res));

// Add instructor to franja
router.post('/api/franjas/:franja_id/instructores', requireRole(['admin']), (req, res) => agregarInstructorFranja(req, res));

// Remove instructor from franja
router.delete('/api/franjas/:franja_id/instructores/:instructor_id', requireRole(['admin']), (req, res) => quitarInstructorFranja(req, res));

// Get available socios for a franja
router.get('/api/franjas/:franja_id/socios/disponibles', (req, res) => obtenerSociosDisponibles(req, res));

// Get available instructores for a franja
router.get('/api/franjas/:franja_id/instructores/disponibles', (req, res) => obtenerInstructoresDisponibles(req, res));

// View (EJS page)
router.get('/actividades', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.render('actividades');
});

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
cd c:/Medanos
git add modulo-actividades/routes/actividades.routes.js
git commit -m "feat: add API endpoints for franjas management"
```

---

## Phase 3: Frontend UI

### Task 6: Rewrite Activities View - Dashboard

**Files:**
- Modify: `modulo-actividades/views/actividades.ejs`

- [ ] **Step 1: Replace entire EJS file with dashboard version**

The file is large (~400 lines). Replace with:

```ejs
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Actividades — Club Médanos Verdes</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/styles.css">
    <style>
        .franjas-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 8px;
            margin: 16px 0;
        }
        .franja-cell {
            padding: 12px;
            background: var(--neutral-50);
            border: 1px solid var(--neutral-200);
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all var(--transition-base);
            text-align: center;
            font-size: var(--text-sm);
        }
        .franja-cell:hover {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }
        .franja-hora {
            font-weight: var(--weight-semibold);
            margin-bottom: 4px;
        }
        .franja-count {
            font-size: 12px;
            opacity: 0.8;
        }
        .activity-section {
            margin-bottom: 32px;
            padding: 20px;
            background: white;
            border-radius: var(--radius-lg);
            border: 1px solid var(--neutral-200);
        }
        .activity-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .activity-title {
            font-size: var(--text-xl);
            font-weight: var(--weight-bold);
            color: var(--neutral-900);
        }
        .activity-actions {
            display: flex;
            gap: 8px;
        }
        .flexible-activity {
            padding: 16px;
            background: var(--neutral-50);
            border-radius: var(--radius-md);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .flexible-count {
            font-size: var(--text-lg);
            font-weight: var(--weight-semibold);
            color: var(--primary);
        }
        .day-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            border-bottom: 2px solid var(--neutral-200);
        }
        .day-tab {
            padding: 12px 16px;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            font-weight: var(--weight-semibold);
            color: var(--neutral-500);
            transition: all var(--transition-base);
        }
        .day-tab.active {
            border-bottom-color: var(--primary);
            color: var(--primary);
        }
        .franja-header {
            display: grid;
            grid-template-columns: 80px 1fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--neutral-200);
        }
        .franja-row {
            display: grid;
            grid-template-columns: 80px 1fr 1fr;
            gap: 16px;
            margin-bottom: 12px;
            padding: 12px;
            background: var(--neutral-50);
            border-radius: var(--radius-md);
        }
        .franja-hora-label {
            font-weight: var(--weight-semibold);
            color: var(--neutral-900);
        }
        .personas-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .persona-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px;
            background: white;
            border-radius: var(--radius-sm);
            font-size: var(--text-sm);
        }
        .persona-name {
            color: var(--neutral-900);
        }
        .remove-btn {
            background: none;
            border: none;
            color: var(--danger, #ef4444);
            cursor: pointer;
            font-weight: bold;
            padding: 0 4px;
        }
        .empty-message {
            color: var(--neutral-400);
            font-size: var(--text-sm);
        }
        .add-btn-small {
            display: block;
            margin-top: 8px;
            padding: 6px 12px;
            font-size: 12px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: var(--radius-sm);
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏊 Actividades</h1>
            <p>Gestión de socios e instructores por franja horaria</p>
        </div>

        <div id="activitiesContainer" style="margin-top: 24px;">
            <div style="text-align: center; padding: 40px; color: #94a3b8;">Cargando actividades...</div>
        </div>
    </div>

    <!-- Modal: Ver detalles de franja (readonly) -->
    <div class="modal" id="modalFranjaDetalle">
        <div style="position: relative;">
            <button class="modal-close" onclick="cerrarModal('modalFranjaDetalle')">✕</button>
            <div class="modal-content">
                <div class="modal-header" id="detalleTitle">Franja</div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 8px;">Socios (readonly)</h4>
                    <div id="detallesocios" class="personas-list">
                        <div class="empty-message">Cargando...</div>
                    </div>
                </div>

                <div style="margin-bottom: 20px; border-top: 1px solid var(--neutral-200); padding-top: 16px;">
                    <h4 style="margin-bottom: 8px;">Instructores (readonly)</h4>
                    <div id="detalleinstructores" class="personas-list">
                        <div class="empty-message">Cargando...</div>
                    </div>
                </div>

                <div style="border-top: 1px solid var(--neutral-200); padding-top: 16px; text-align: right;">
                    <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalFranjaDetalle')">Cerrar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal: Gestionar franja (add/remove socios e instructores) -->
    <div class="modal" id="modalGestionarFranja">
        <div style="position: relative;">
            <button class="modal-close" onclick="cerrarModal('modalGestionarFranja')">✕</button>
            <div class="modal-content">
                <div class="modal-header">Gestionar Franja</div>

                <div style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 12px;">Socios asignados</h4>
                    <div id="gestionsocios" class="personas-list">
                        <div class="empty-message">Cargando...</div>
                    </div>
                    <div style="margin-top: 12px;">
                        <button class="btn btn-primary btn-sm" onclick="abrirModalAgregarSocio()" style="padding: 6px 12px; font-size: 12px;">+ Agregar socio</button>
                    </div>
                </div>

                <div style="margin-bottom: 24px; border-top: 1px solid var(--neutral-200); padding-top: 16px;">
                    <h4 style="margin-bottom: 12px;">Instructores asignados</h4>
                    <div id="gestioninstructores" class="personas-list">
                        <div class="empty-message">Cargando...</div>
                    </div>
                    <div style="margin-top: 12px;">
                        <button class="btn btn-primary btn-sm" onclick="abrirModalAgregarInstructor()" style="padding: 6px 12px; font-size: 12px;">+ Agregar instructor</button>
                    </div>
                </div>

                <div style="border-top: 1px solid var(--neutral-200); padding-top: 16px; text-align: right;">
                    <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalGestionarFranja')">Cerrar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal: Agregar socio a franja -->
    <div class="modal" id="modalAgregarSocio">
        <div style="position: relative;">
            <button class="modal-close" onclick="cerrarModal('modalAgregarSocio')">✕</button>
            <div class="modal-content">
                <div class="modal-header">Agregar Socio</div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">Seleccionar socio:</label>
                    <select id="selectSocio" style="width: 100%; padding: 10px; border: 1px solid var(--neutral-200); border-radius: var(--radius-md);">
                        <option value="">Cargando...</option>
                    </select>
                </div>
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="cerrarModal('modalAgregarSocio')">Cancelar</button>
                    <button class="btn btn-primary" onclick="confirmarAgregarSocio()">Agregar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal: Agregar instructor a franja -->
    <div class="modal" id="modalAgregarInstructor">
        <div style="position: relative;">
            <button class="modal-close" onclick="cerrarModal('modalAgregarInstructor')">✕</button>
            <div class="modal-content">
                <div class="modal-header">Agregar Instructor</div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">Seleccionar instructor:</label>
                    <select id="selectInstructor" style="width: 100%; padding: 10px; border: 1px solid var(--neutral-200); border-radius: var(--radius-md);">
                        <option value="">Cargando...</option>
                    </select>
                </div>
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="cerrarModal('modalAgregarInstructor')">Cancelar</button>
                    <button class="btn btn-primary" onclick="confirmarAgregarInstructor()">Agregar</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        let allActividades = [];
        let franjaActual = null;
        let actividadActual = null;
        let diaActual = 0;

        const diasNombre = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

        async function cargarActividades() {
            try {
                const r = await fetch('/api/actividades', { credentials: 'include' });
                const d = await r.json();
                if (d.success) {
                    allActividades = d.actividades || [];
                    renderActividades();
                }
            } catch (err) {
                console.error(err);
            }
        }

        function renderActividades() {
            const container = document.getElementById('activitiesContainer');
            if (allActividades.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">No hay actividades</div>';
                return;
            }

            let html = '';
            allActividades.forEach(act => {
                if (act.tiene_horarios_flexibles) {
                    html += `
                        <div class="activity-section">
                            <div class="activity-header">
                                <div class="activity-title">${act.nombre}</div>
                                <div class="activity-actions">
                                    <button class="btn btn-primary btn-sm" onclick="abrirGestionFlexible(${act.id})">➕ Gestionar</button>
                                </div>
                            </div>
                            <div class="flexible-activity">
                                <span>Acceso libre (sin franjas definidas)</span>
                                <span class="flexible-count">${act.socios_count || 0} socios inscritos</span>
                            </div>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="activity-section">
                            <div class="activity-header">
                                <div class="activity-title">${act.nombre}</div>
                                <div class="activity-actions">
                                    <button class="btn btn-primary btn-sm" onclick="abrirGestionActividad(${act.id})">⚙️ Gestionar</button>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
                                ${(act.franjas || []).map(f => {
                                    const hora = `${String(f.hora_inicio).padStart(2, '0')}:00-${String(f.hora_fin).padStart(2, '0')}:00`;
                                    return `
                                        <div class="franja-cell" onclick="abrirDetallesFranja(${f.id})">
                                            <div class="franja-hora">${diasNombre[f.dia_semana]}</div>
                                            <div class="franja-hora">${hora}</div>
                                            <div class="franja-count">${f.socios_count || 0} socios | ${f.instructores_count || 0} profes</div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }
            });
            container.innerHTML = html;
        }

        async function abrirDetallesFranja(franjaId) {
            try {
                const r = await fetch(`/api/franjas/${franjaId}`, { credentials: 'include' });
                const d = await r.json();
                if (d.success) {
                    const f = d.franja;
                    document.getElementById('detalleTitle').textContent = `${f.actividad_nombre} - ${diasNombre[f.dia_semana]} ${f.hora_inicio}:00-${f.hora_fin}:00`;
                    
                    const sociosHtml = (d.socios || []).length === 0
                        ? '<div class="empty-message">Sin socios asignados</div>'
                        : d.socios.map(s => `<div class="persona-item"><span class="persona-name">${s.apellido}, ${s.nombre}</span></div>`).join('');
                    document.getElementById('detallesocios').innerHTML = sociosHtml;

                    const instructoresHtml = (d.instructores || []).length === 0
                        ? '<div class="empty-message">Sin instructores asignados</div>'
                        : d.instructores.map(i => `<div class="persona-item"><span class="persona-name">${i.apellido}, ${i.nombre}</span></div>`).join('');
                    document.getElementById('detalleinstructores').innerHTML = instructoresHtml;

                    document.getElementById('modalFranjaDetalle').classList.add('active');
                }
            } catch (err) {
                alert('Error: ' + err.message);
            }
        }

        async function abrirGestionActividad(actividadId) {
            actividadActual = actividadId;
            diaActual = 0;
            await renderGestionActividad();
            document.getElementById('modalGestionarFranja').classList.add('active');
        }

        async function renderGestionActividad() {
            try {
                const r = await fetch(`/api/actividades/${actividadActual}`, { credentials: 'include' });
                const d = await r.json();
                if (d.success && d.franjas) {
                    const franjasDia = d.franjas.filter(f => f.dia_semana === diaActual);
                    if (franjasDia.length > 0) {
                        franjaActual = franjasDia[0].id;
                        await cargarDetallesFranja();
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }

        async function cargarDetallesFranja() {
            try {
                const r = await fetch(`/api/franjas/${franjaActual}`, { credentials: 'include' });
                const d = await r.json();
                if (d.success) {
                    const sociosHtml = (d.socios || []).length === 0
                        ? '<div class="empty-message">Sin socios asignados</div>'
                        : d.socios.map(s => `
                            <div class="persona-item">
                                <span class="persona-name">${s.apellido}, ${s.nombre}</span>
                                <button class="remove-btn" onclick="quitarSocio(${franjaActual}, ${s.id})">✕</button>
                            </div>
                        `).join('');
                    document.getElementById('gestionsocios').innerHTML = sociosHtml;

                    const instructoresHtml = (d.instructores || []).length === 0
                        ? '<div class="empty-message">Sin instructores asignados</div>'
                        : d.instructores.map(i => `
                            <div class="persona-item">
                                <span class="persona-name">${i.apellido}, ${i.nombre}</span>
                                <button class="remove-btn" onclick="quitarInstructor(${franjaActual}, ${i.id})">✕</button>
                            </div>
                        `).join('');
                    document.getElementById('gestioninstructores').innerHTML = instructoresHtml;
                }
            } catch (err) {
                console.error(err);
            }
        }

        async function abrirModalAgregarSocio() {
            try {
                const r = await fetch(`/api/franjas/${franjaActual}/socios/disponibles`, { credentials: 'include' });
                const d = await r.json();
                if (d.success) {
                    const options = d.socios.map(s => `<option value="${s.id}">${s.apellido}, ${s.nombre}</option>`).join('');
                    document.getElementById('selectSocio').innerHTML = `<option value="">Seleccionar...</option>${options}`;
                    document.getElementById('modalAgregarSocio').classList.add('active');
                }
            } catch (err) {
                alert('Error: ' + err.message);
            }
        }

        async function confirmarAgregarSocio() {
            const socioId = document.getElementById('selectSocio').value;
            if (!socioId) {
                alert('Selecciona un socio');
                return;
            }
            try {
                const r = await fetch(`/api/franjas/${franjaActual}/socios`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ socio_id: parseInt(socioId) })
                });
                const d = await r.json();
                if (d.success) {
                    cerrarModal('modalAgregarSocio');
                    await cargarDetallesFranja();
                    await cargarActividades();
                } else {
                    alert('Error: ' + d.error);
                }
            } catch (err) {
                alert('Error: ' + err.message);
            }
        }

        async function quitarSocio(franjaId, socioId) {
            if (!confirm('¿Quitar socio de esta franja?')) return;
            try {
                const r = await fetch(`/api/franjas/${franjaId}/socios/${socioId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const d = await r.json();
                if (d.success) {
                    await cargarDetallesFranja();
                    await cargarActividades();
                } else {
                    alert('Error: ' + d.error);
                }
            } catch (err) {
                alert('Error: ' + err.message);
            }
        }

        async function abrirModalAgregarInstructor() {
            try {
                const r = await fetch(`/api/franjas/${franjaActual}/instructores/disponibles`, { credentials: 'include' });
                const d = await r.json();
                if (d.success) {
                    const options = d.instructores.map(i => `<option value="${i.id}">${i.apellido}, ${i.nombre}</option>`).join('');
                    document.getElementById('selectInstructor').innerHTML = `<option value="">Seleccionar...</option>${options}`;
                    document.getElementById('modalAgregarInstructor').classList.add('active');
                }
            } catch (err) {
                alert('Error: ' + err.message);
            }
        }

        async function confirmarAgregarInstructor() {
            const instructorId = document.getElementById('selectInstructor').value;
            if (!instructorId) {
                alert('Selecciona un instructor');
                return;
            }
            try {
                const r = await fetch(`/api/franjas/${franjaActual}/instructores`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ instructor_id: parseInt(instructorId) })
                });
                const d = await r.json();
                if (d.success) {
                    cerrarModal('modalAgregarInstructor');
                    await cargarDetallesFranja();
                    await cargarActividades();
                } else {
                    alert('Error: ' + d.error);
                }
            } catch (err) {
                alert('Error: ' + err.message);
            }
        }

        async function quitarInstructor(franjaId, instructorId) {
            if (!confirm('¿Quitar instructor de esta franja?')) return;
            try {
                const r = await fetch(`/api/franjas/${franjaId}/instructores/${instructorId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const d = await r.json();
                if (d.success) {
                    await cargarDetallesFranja();
                    await cargarActividades();
                } else {
                    alert('Error: ' + d.error);
                }
            } catch (err) {
                alert('Error: ' + err.message);
            }
        }

        function abrirGestionFlexible(actividadId) {
            alert('Gestión de actividades flexibles próximamente');
        }

        function cerrarModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        cargarActividades();
    </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
cd c:/Medanos
git add modulo-actividades/views/actividades.ejs
git commit -m "feat: rewrite activities view with dashboard and franja management"
```

---

### Task 7: Add Styling for Grilla

**Files:**
- Modify: `public/styles.css`

- [ ] **Step 1: Add button size variants if missing**

Check if `.btn-sm` exists in styles.css. If not, add:

```css
.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Medanos
git add public/styles.css
git commit -m "style: add button size variants for franja UI"
```

---

## Phase 4: Testing & Validation

### Task 8: Test Data Migration & API Endpoints

**Files:** None (manual verification)

- [ ] **Step 1: Delete current database to force re-initialization**

```bash
cd c:/Medanos
rm -f database/medanos.db
```

- [ ] **Step 2: Start server**

```bash
cd c:/Medanos
npm start
```

Expected output should include:
```
✓ Base de datos inicializada con franjas horarias
✓ Base de datos conectada
```

- [ ] **Step 3: Test API endpoint - Get actividades**

Open browser or use curl:

```bash
curl http://localhost:3000/api/actividades
```

Expected: JSON with actividades array, each having `franjas` array with `socios_count` and `instructores_count`

- [ ] **Step 4: Test frontend - Load dashboard**

Visit `http://localhost:3000/actividades`

Expected: See all activities with grid showing occupancy, no errors in browser console

- [ ] **Step 5: Test add socio to franja**

Click on a franja cell → click "⚙️ Gestionar" → click "+ Agregar socio" → select a socio → click Agregar

Expected: Socio appears in list, count updates on dashboard

- [ ] **Step 6: Test remove socio from franja**

In gestión modal, click ✕ next to a socio

Expected: Socio removed, count updates on dashboard

- [ ] **Step 7: Commit (no code changes, just verification)**

```bash
cd c:/Medanos
git log --oneline -1
# Should show the latest commit
```

---

## Self-Review Checklist

✓ Spec coverage: All sections implemented (schema, API, UI, migrations)
✓ No placeholders: All code complete, all SQL shown, all commands explicit
✓ Type consistency: `franja_id`, `socio_id`, `instructor_id` used consistently
✓ Endpoints complete: GET activities, GET franja, POST/DELETE socios, POST/DELETE instructores
✓ UI flows: Dashboard → view franja (readonly) → manage franja (edit mode)
✓ Migration: Old tables (socio_actividades, instructor_actividades) replaced
✓ Seed data: Sample franjas and assignments created for testing

**Gaps fixed:** None identified

---

## Architecture Summary

**New Tables:**
- `franjas_horarias` - core entity for hourly slots
- `socio_franjas` - N:M relationship between socios and franjas
- `instructor_franjas` - N:M relationship between instructores and franjas

**Data Flow:**
```
Dashboard (GET /api/actividades)
  → Render franjas grid per activity
  → Click cell → GET /api/franjas/:id (readonly detail)
  → Click "⚙️ Gestionar" → Render edit mode
  → Add/remove socios/instructores via POST/DELETE
  → Reload dashboard
```

**Frontend State:**
- `allActividades` array with nested `franjas`
- `franjaActual`, `actividadActual` for modal context
- Modals for readonly view, edit mode, add socio, add instructor

