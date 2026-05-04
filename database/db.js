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
