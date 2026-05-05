const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'medanos.db');
const schemaPath = path.join(__dirname, 'schema.sql');

let SQL;
let db;

async function initDB() {
  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const data = fs.readFileSync(dbPath);
    db = new SQL.Database(data);
  } else {
    db = new SQL.Database();

    const schema = fs.readFileSync(schemaPath, 'utf8');
    const statements = schema.split(';').filter(s => s.trim());
    statements.forEach(stmt => {
      if (stmt.trim()) db.run(stmt);
    });

    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    console.log('✓ Base de datos inicializada');
  }

  db.run('PRAGMA foreign_keys = ON');
  console.log('✓ Base de datos conectada');

  // Auto-migrate: agregar columnas/tablas que falten
  try {
    // Crear tabla franjas_horarias si no existe
    db.exec(`CREATE TABLE IF NOT EXISTS franjas_horarias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actividad_id INTEGER REFERENCES actividades(id),
      dia_semana INTEGER NOT NULL,
      hora_inicio INTEGER NOT NULL,
      hora_fin INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Crear tabla socio_franjas si no existe
    db.exec(`CREATE TABLE IF NOT EXISTS socio_franjas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      socio_id INTEGER REFERENCES socios(id),
      franja_id INTEGER REFERENCES franjas_horarias(id),
      fecha_desde TEXT NOT NULL,
      fecha_hasta TEXT
    )`);

    // Crear tabla instructor_franjas si no existe
    db.exec(`CREATE TABLE IF NOT EXISTS instructor_franjas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instructor_id INTEGER REFERENCES instructores(id),
      franja_id INTEGER REFERENCES franjas_horarias(id)
    )`);

    // Intentar agregar columna tiene_horarios_flexibles (ignora si ya existe)
    try {
      db.exec('ALTER TABLE actividades ADD COLUMN tiene_horarios_flexibles INTEGER DEFAULT 0');
      console.log('✓ Migración: agregada columna tiene_horarios_flexibles');
    } catch (err) {
      // Si falla, probablemente ya existe
    }

    console.log('✓ Migración: esquema verificado y actualizado');
  } catch (err) {
    console.error('⚠ Error en migración:', err.message);
  }

  // Seed database if empty
  const initSeed = require('./init-seed');
  await initSeed();

  // Crear franjas para actividades que no las tengan (migración de datos)
  try {
    const actividades = db.prepare('SELECT id, dias_horario FROM actividades WHERE activo = 1').all();
    const diasMap = { 'Lun': 0, 'Mar': 1, 'Mié': 2, 'Jue': 3, 'Vie': 4, 'Sab': 5, 'Dom': 6 };

    actividades.forEach(act => {
      if (!act.dias_horario) return;

      // Check if this activity has franjas
      const franjas = db.prepare('SELECT COUNT(*) as count FROM franjas_horarias WHERE actividad_id = ?').get(act.id);
      if (franjas.count > 0) return; // Ya tiene franjas

      // Parse dias_horario y crear franjas
      const partes = act.dias_horario.split(',')[0].trim().split(' ');
      const diasStr = partes[0];
      const horaInicio = parseInt(partes[1]);
      const horaFin = parseInt(partes[3]);

      const dias = diasStr.split('-').map(d => diasMap[d] || 0);
      dias.forEach(dia => {
        db.prepare(`
          INSERT INTO franjas_horarias (actividad_id, dia_semana, hora_inicio, hora_fin)
          VALUES (?, ?, ?, ?)
        `).run(act.id, dia, horaInicio, horaFin);
      });
    });
  } catch (err) {
    // Silently ignore if franjas already exist
  }
}

function saveDB() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

const handler = {
  prepare(sql) {
    return {
      get: (...args) => {
        const stmt = db.prepare(sql);
        stmt.bind(args);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...args) => {
        const stmt = db.prepare(sql);
        stmt.bind(args);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      },
      run: (...args) => {
        const stmt = db.prepare(sql);
        stmt.bind(args);
        stmt.step();
        stmt.free();
        saveDB();
        return { lastInsertRowid: db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] };
      }
    };
  },

  exec(sql) {
    return db.exec(sql);
  }
};

module.exports = { handler, initDB, saveDB };
module.exports.prepare = (sql) => handler.prepare(sql);
module.exports.exec = (sql) => handler.exec(sql);
module.exports.run = (sql) => handler.prepare(sql).run();
