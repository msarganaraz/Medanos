-- USUARIOS DEL SISTEMA
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT,
  rol TEXT NOT NULL,
  activo INTEGER DEFAULT 1
);

-- SOCIOS
CREATE TABLE socios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_socio TEXT UNIQUE NOT NULL,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT UNIQUE,
  fecha_nacimiento TEXT,
  telefono TEXT,
  email TEXT,
  domicilio TEXT,
  fecha_alta TEXT NOT NULL,
  estado TEXT DEFAULT 'ACTIVO',
  observaciones TEXT
);

-- ACTIVIDADES
CREATE TABLE actividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  dias_horario TEXT,
  precio_base REAL DEFAULT 0,
  tiene_horarios_flexibles INTEGER DEFAULT 0,
  activo INTEGER DEFAULT 1
);

-- FRANJAS HORARIAS (hourly slots for activities)
CREATE TABLE franjas_horarias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actividad_id INTEGER REFERENCES actividades(id),
  dia_semana INTEGER NOT NULL,
  hora_inicio INTEGER NOT NULL,
  hora_fin INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- SOCIOS ↔ FRANJAS (replacing socio_actividades)
CREATE TABLE socio_franjas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER REFERENCES socios(id),
  franja_id INTEGER REFERENCES franjas_horarias(id),
  fecha_desde TEXT NOT NULL,
  fecha_hasta TEXT
);

-- INSTRUCTORES ↔ FRANJAS (replacing instructor_actividades)
CREATE TABLE instructor_franjas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instructor_id INTEGER REFERENCES instructores(id),
  franja_id INTEGER REFERENCES franjas_horarias(id)
);

-- SOCIOS ↔ ACTIVIDADES
CREATE TABLE socio_actividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER REFERENCES socios(id),
  actividad_id INTEGER REFERENCES actividades(id),
  fecha_desde TEXT NOT NULL,
  fecha_hasta TEXT
);

-- INSTRUCTORES
CREATE TABLE instructores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT,
  cuil TEXT,
  telefono TEXT,
  email TEXT,
  tipo_contrato TEXT NOT NULL,
  monto_fijo REAL DEFAULT 0,
  valor_hora REAL DEFAULT 0,
  valor_por_alumno REAL DEFAULT 0,
  activo INTEGER DEFAULT 1
);

-- INSTRUCTORES ↔ ACTIVIDADES
CREATE TABLE instructor_actividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instructor_id INTEGER REFERENCES instructores(id),
  actividad_id INTEGER REFERENCES actividades(id)
);

-- PLANES DE CUOTA
CREATE TABLE planes_cuota (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  monto REAL NOT NULL,
  tipo TEXT
);

-- SOCIOS ↔ PLAN VIGENTE
CREATE TABLE socio_planes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER REFERENCES socios(id),
  plan_id INTEGER REFERENCES planes_cuota(id),
  fecha_desde TEXT NOT NULL,
  fecha_hasta TEXT
);

-- CUOTAS GENERADAS
CREATE TABLE cuotas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER REFERENCES socios(id),
  periodo TEXT NOT NULL,
  monto_total REAL NOT NULL,
  estado TEXT DEFAULT 'PENDIENTE',
  fecha_vencimiento TEXT
);

-- PAGOS
CREATE TABLE pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cuota_id INTEGER REFERENCES cuotas(id),
  socio_id INTEGER REFERENCES socios(id),
  fecha_pago TEXT NOT NULL,
  importe REAL NOT NULL,
  medio_pago TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  observaciones TEXT
);

-- LIQUIDACIONES DE INSTRUCTORES
CREATE TABLE liquidaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instructor_id INTEGER REFERENCES instructores(id),
  periodo TEXT NOT NULL,
  monto_calculado REAL NOT NULL,
  monto_pagado REAL DEFAULT 0,
  estado TEXT DEFAULT 'BORRADOR',
  fecha_pago TEXT,
  detalle_json TEXT
);

-- CAJA / MOVIMIENTOS
CREATE TABLE movimientos_caja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  tipo TEXT NOT NULL,
  concepto TEXT NOT NULL,
  importe REAL NOT NULL,
  referencia_id INTEGER,
  referencia_tipo TEXT,
  usuario_id INTEGER REFERENCES usuarios(id)
);
