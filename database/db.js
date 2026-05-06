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

    // Migration: add detalle_json to cuotas
    try {
      db.exec(`ALTER TABLE cuotas ADD COLUMN detalle_json TEXT;`);
      console.log('✓ Migración: agregada columna detalle_json a cuotas');
    } catch (err) {
      // Column already exists
    }

    // Migration: ensure estado column has correct values
    // (No action needed if column exists; it will have NULL/0 values that we'll treat as ACTIVO)

    console.log('✓ Migración: esquema verificado y actualizado');
  } catch (err) {
    console.error('⚠ Error en migración:', err.message);
  }

  // Dual seed mechanism:
  // 1. seed.sql provides initial basic data (2 planes_cuota, 5 core actividades)
  //    - Runs first if planes_cuota table is empty
  //    - Uses INSERT OR IGNORE to safely coexist with other seeds
  // 2. init-seed.js provides additional test/demo data (socios, instructores, usuarios, etc.)
  //    - Runs after seed.sql
  //    - Checks if usuarios table is populated to avoid duplicate seeding
  // They work together to establish a complete initial database state

  // Load seed.sql if planes_cuota is empty
  const planCountResult = db.exec('SELECT COUNT(*) as cnt FROM planes_cuota');
  const planCount = planCountResult[0]?.values[0]?.[0] || 0;
  if (planCount === 0) {
    const seedPath = path.join(__dirname, 'seed.sql');
    if (!fs.existsSync(seedPath)) {
      console.log('⚠ seed.sql not found, skipping seed initialization');
    } else {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      const seedStatements = seedSql.split(';').filter(s => s.trim());

      let successCount = 0;
      seedStatements.forEach(stmt => {
        if (stmt.trim()) {
          try {
            db.exec(stmt);
            successCount++;
          } catch (err) {
            console.error('Error loading seed statement:', err.message);
          }
        }
      });

      saveDB();

      // Verify seed was loaded successfully
      const planCheckResult = db.exec('SELECT COUNT(*) as cnt FROM planes_cuota');
      const planesCargados = planCheckResult[0]?.values[0]?.[0] || 0;
      const actCheckResult = db.exec('SELECT COUNT(*) as cnt FROM actividades');
      const actividadesCargadas = actCheckResult[0]?.values[0]?.[0] || 0;

      console.log(`✓ Seed cargado: ${planesCargados} planes, ${actividadesCargadas} actividades`);
    }
  }

  // Seed database if empty
  const initSeed = require('./init-seed');
  await initSeed();

  // Crear franjas para actividades que no las tengan (migración de datos)
  try {
    const diasMap = { 'Lun': 0, 'Mar': 1, 'Mié': 2, 'Jue': 3, 'Vie': 4, 'Sab': 5, 'Dom': 6 };

    // Usar exec nativo de sql.js para leer actividades
    const actResult = db.exec('SELECT id, dias_horario FROM actividades WHERE activo = 1');
    if (!actResult.length) return;

    const cols = actResult[0].columns;
    const rows = actResult[0].values;

    rows.forEach(row => {
      const act = {};
      cols.forEach((col, i) => act[col] = row[i]);

      if (!act.dias_horario) return;

      // Verificar si ya tiene franjas
      const franjasResult = db.exec('SELECT COUNT(*) as count FROM franjas_horarias WHERE actividad_id = ' + act.id);
      const count = franjasResult[0]?.values[0][0] || 0;
      if (count > 0) return;

      // Parse dias_horario y crear franjas
      const partes = act.dias_horario.split(',')[0].trim().split(' ');
      const diasStr = partes[0];
      const horaInicio = parseInt(partes[1]);
      const horaFin = parseInt(partes[3]);

      diasStr.split('-').forEach(d => {
        const dia = diasMap[d];
        if (dia === undefined) return;
        db.exec('INSERT INTO franjas_horarias (actividad_id, dia_semana, hora_inicio, hora_fin) VALUES (' + act.id + ',' + dia + ',' + horaInicio + ',' + horaFin + ')');
      });
    });

    saveDB();
    console.log('✓ Franjas horarias generadas para actividades existentes');
  } catch (err) {
    console.error('⚠ Error creando franjas:', err.message);
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
