# Medanos Verdes — Sistema de Gestión de Club

**Fecha:** 2026-04-28  
**Estado:** Aprobado

---

## Contexto

Sistema de gestión para el Club Médanos Verdes (León Nicanoff 890, Santa Rosa, La Pampa). El club tiene muchos socios, diversas actividades deportivas y recreativas, y múltiples instructores con esquemas de cobro diferentes. El diseño visual reutiliza el sistema de diseño del proyecto IPAV del mismo autor.

---

## Stack tecnológico

- **Backend:** Node.js + Express
- **Base de datos:** SQLite (único archivo, compartido entre módulos)
- **Vistas:** EJS (server-side rendering)
- **Frontend:** HTML/CSS/JS vanilla (sin frameworks)
- **Sesiones:** express-session con cookie HTTP-only
- **Font:** DM Sans (Google Fonts)
- **Patrón de API:** REST bajo `/api/<modulo>/...` consumida via fetch desde las vistas EJS

---

## Arquitectura general

### Estructura de carpetas

```
medanos-verdes/
├── servidor.js                  ← entrada principal, monta todos los módulos
├── package.json
├── database/
│   ├── db.js                    ← conexión SQLite compartida
│   └── schema.sql               ← esquema completo de tablas
├── middleware/
│   └── auth.js                  ← verificación de sesión y control de roles
├── public/
│   ├── login.html               ← login split-panel
│   ├── dashboard.html           ← panel principal con tarjetas de módulos
│   └── images/                  ← logo.png del club
├── modulo-socios/
│   ├── routes/socios.routes.js
│   ├── controllers/socios.controller.js
│   └── views/                   ← socios.ejs, legajo.ejs
├── modulo-actividades/
│   ├── routes/actividades.routes.js
│   ├── controllers/actividades.controller.js
│   └── views/
├── modulo-instructores/
│   ├── routes/instructores.routes.js
│   ├── controllers/instructores.controller.js
│   └── views/
├── modulo-cuotas/
│   ├── routes/cuotas.routes.js
│   ├── controllers/cuotas.controller.js
│   └── views/
├── modulo-caja/
│   ├── routes/caja.routes.js
│   ├── controllers/caja.controller.js
│   └── views/
└── modulo-admin/
    ├── routes/admin.routes.js
    ├── controllers/admin.controller.js
    └── views/
```

### Flujo de navegación

1. `/` → redirige a `/login` o `/dashboard` según sesión activa
2. `/login` → autenticación → sesión creada → redirige a `/dashboard`
3. `/dashboard` → muestra tarjetas de módulos filtradas por rol del usuario
4. Cada módulo monta sus rutas en `servidor.js`
5. Las vistas EJS consumen la API REST del mismo módulo via fetch
6. Cada endpoint devuelve `{ success: true|false, data: ..., error: "mensaje" }`

---

## Módulos

### Socios
- Alta, edición y baja lógica de socios
- Campos: número de socio (auto-generado), apellido, nombre, DNI, fecha de nacimiento, teléfono, email, domicilio, fecha de alta, estado, observaciones
- Estados: Activo / Inactivo / Suspendido
- Asignación a una o varias actividades
- Asignación de plan de cuota vigente
- Vista de legajo: historial de pagos, actividades, notas

### Actividades
- ABM de disciplinas (Natación, Aquagym, Fútbol, Tenis, Gimnasia Funcional, etc.)
- Campos: nombre, descripción, días y horarios, precio base, activo
- Asignación de uno o más instructores por actividad

### Instructores
- ABM de instructores
- Campos: apellido, nombre, DNI, CUIL, teléfono, email, tipo de contrato, montos, activo
- Tipos de contrato:
  - **Fijo mensual:** monto fijo independiente de alumnos u horas
  - **Por hora:** tarifa × horas trabajadas registradas en el período
  - **Por alumno:** tarifa × cantidad de alumnos en el período
  - **Combinado:** configuración mixta (ej: fijo + por alumno)
- Asignación a actividades
- Liquidaciones mensuales calculadas automáticamente según tipo de contrato

### Cuotas y Pagos
- Planes de cuota configurables: individual, familiar, por actividad, combo, con descuento
- Generación mensual de cuotas (acción manual del admin: "Generar cuotas del mes")
- Socios sin plan vigente quedan marcados como "sin plan" y no reciben cuota automática
- Registro de pagos: fecha, importe, medio de pago (efectivo, transferencia, débito, otro)
- Estado de deuda por socio: pendiente / pagada / vencida
- Recibo simple para imprimir/mostrar en pantalla

### Caja / Tesorería
- Registro de movimientos: ingreso / egreso
- Concepto libre + referencia opcional (pago de socio, liquidación instructor, gasto)
- Cada pago de cuota genera automáticamente un movimiento de caja tipo ingreso
- Cada liquidación pagada genera un movimiento de caja tipo egreso
- Cierre de caja diario
- Reportes mensuales: total recaudado, total pagado a instructores, saldo

### Admin
- ABM de usuarios del sistema
- Roles: Administrador, Recepción, Tesorería, Instructor
- Cambio de contraseñas
- Configuración general del club (nombre, datos de contacto)

---

## Control de acceso por rol

| Módulo | Admin | Recepción | Tesorería | Instructor |
|---|---|---|---|---|
| Socios | Completo | Completo | Solo lectura | Sin acceso |
| Actividades | Completo | Solo lectura | Sin acceso | Sus clases |
| Instructores | Completo | Solo lectura | Solo lectura | Su perfil |
| Cuotas/Pagos | Completo | Completo | Completo | Sin acceso |
| Caja | Completo | Sin acceso | Completo | Sin acceso |
| Admin | Completo | Sin acceso | Sin acceso | Sin acceso |

- El middleware `auth.js` verifica sesión en cada ruta
- Las tarjetas del dashboard solo se muestran si el usuario tiene acceso al módulo
- Las rutas API devuelven 403 si el rol no tiene permiso

---

## Base de datos

```sql
-- USUARIOS DEL SISTEMA
usuarios (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT,
  rol TEXT NOT NULL,   -- admin | recepcion | tesoreria | instructor
  activo INTEGER DEFAULT 1
)

-- SOCIOS
socios (
  id INTEGER PRIMARY KEY,
  numero_socio TEXT UNIQUE NOT NULL,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT UNIQUE,
  fecha_nacimiento TEXT,
  telefono TEXT,
  email TEXT,
  domicilio TEXT,
  fecha_alta TEXT NOT NULL,
  estado TEXT DEFAULT 'ACTIVO',  -- ACTIVO | INACTIVO | SUSPENDIDO
  observaciones TEXT
)

-- ACTIVIDADES
actividades (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  dias_horario TEXT,
  precio_base REAL DEFAULT 0,
  activo INTEGER DEFAULT 1
)

-- SOCIOS ↔ ACTIVIDADES
socio_actividades (
  id INTEGER PRIMARY KEY,
  socio_id INTEGER REFERENCES socios(id),
  actividad_id INTEGER REFERENCES actividades(id),
  fecha_desde TEXT NOT NULL,
  fecha_hasta TEXT
)

-- INSTRUCTORES
instructores (
  id INTEGER PRIMARY KEY,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT,
  cuil TEXT,
  telefono TEXT,
  email TEXT,
  tipo_contrato TEXT NOT NULL,  -- fijo | por_hora | por_alumno | combinado
  monto_fijo REAL DEFAULT 0,
  valor_hora REAL DEFAULT 0,
  valor_por_alumno REAL DEFAULT 0,
  activo INTEGER DEFAULT 1
)

-- INSTRUCTORES ↔ ACTIVIDADES
instructor_actividades (
  id INTEGER PRIMARY KEY,
  instructor_id INTEGER REFERENCES instructores(id),
  actividad_id INTEGER REFERENCES actividades(id)
)

-- PLANES DE CUOTA
planes_cuota (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  monto REAL NOT NULL,
  tipo TEXT  -- individual | familiar | actividad | combo | descuento
)

-- SOCIOS ↔ PLAN VIGENTE
socio_planes (
  id INTEGER PRIMARY KEY,
  socio_id INTEGER REFERENCES socios(id),
  plan_id INTEGER REFERENCES planes_cuota(id),
  fecha_desde TEXT NOT NULL,
  fecha_hasta TEXT
)

-- CUOTAS GENERADAS
cuotas (
  id INTEGER PRIMARY KEY,
  socio_id INTEGER REFERENCES socios(id),
  periodo TEXT NOT NULL,          -- formato: YYYY-MM
  monto_total REAL NOT NULL,
  estado TEXT DEFAULT 'PENDIENTE', -- PENDIENTE | PAGADA | VENCIDA
  fecha_vencimiento TEXT
)

-- PAGOS
pagos (
  id INTEGER PRIMARY KEY,
  cuota_id INTEGER REFERENCES cuotas(id),
  socio_id INTEGER REFERENCES socios(id),
  fecha_pago TEXT NOT NULL,
  importe REAL NOT NULL,
  medio_pago TEXT,  -- efectivo | transferencia | debito | otro
  usuario_id INTEGER REFERENCES usuarios(id),
  observaciones TEXT
)

-- LIQUIDACIONES DE INSTRUCTORES
liquidaciones (
  id INTEGER PRIMARY KEY,
  instructor_id INTEGER REFERENCES instructores(id),
  periodo TEXT NOT NULL,          -- formato: YYYY-MM
  monto_calculado REAL NOT NULL,
  monto_pagado REAL DEFAULT 0,
  estado TEXT DEFAULT 'BORRADOR', -- BORRADOR | APROBADA | PAGADA
  fecha_pago TEXT,
  detalle_json TEXT               -- detalle del cálculo serializado
)

-- CAJA
movimientos_caja (
  id INTEGER PRIMARY KEY,
  fecha TEXT NOT NULL,
  tipo TEXT NOT NULL,             -- ingreso | egreso
  concepto TEXT NOT NULL,
  importe REAL NOT NULL,
  referencia_id INTEGER,
  referencia_tipo TEXT,           -- pago | liquidacion | manual
  usuario_id INTEGER REFERENCES usuarios(id)
)
```

---

## UI/UX

### Identidad visual del club

| Elemento | Color |
|---|---|
| Verde oscuro (primario) | `#2d6219` |
| Verde oliva (secundario) | `#7a8c2e` |
| Azul cielo (acento) | `#4aabd8` |
| Amarillo sol (highlight) | `#f5c518` |
| Fondo claro (contenido) | `#f1f5f9` |
| Fondo oscuro (login panel) | `#0f172a` |

### Login
- Split panel: izquierda con degradado verde oscuro, derecha formulario oscuro glassmorphism
- Logo del club (`images/logo.png`) en el panel izquierdo
- Nombre: "Club Médanos Verdes", subtítulo: "Para todas las edades"
- Grilla 2×3 con los 6 módulos del sistema como features con íconos
- Animaciones: formas flotantes, slide-up en los elementos, shimmer en el botón
- Font: DM Sans

### Dashboard
Tarjetas de módulos con color propio:

| Módulo | Ícono | Color acento |
|---|---|---|
| Socios | 👥 | Verde `#2d6219` |
| Actividades | 🏊 | Azul cielo `#4aabd8` |
| Instructores | 🏋️ | Verde oliva `#7a8c2e` |
| Cuotas y Pagos | 💳 | Verde esmeralda `#059669` |
| Caja | 💰 | Ámbar `#d97706` |
| Admin | ⚙️ | Rojo `#dc2626` |

Cada tarjeta: barra de color en la parte superior, ícono, nombre, descripción, flecha. Hover con glow y elevación `translateY(-4px)`. Tarjetas no accesibles por rol no se renderizan.

### Vistas de módulo
- Header con degradado verde `#2d6219 → #4a8c2a`
- Navegación interna con links activos
- Contenido en cards blancas sobre fondo `#f1f5f9`
- Tablas con hover, badges de estado (verde/ámbar/rojo)
- Modales para formularios de alta/edición
- Búsqueda con filtros, resultados sin recarga de página

---

## Manejo de errores y sesiones

- Sesiones con `express-session`, cookie HTTP-only, expiración 8 horas
- Middleware `auth.js` en todas las rutas: verifica sesión, verifica rol mínimo requerido
- Respuesta estándar de API: `{ success: true|false, data: ..., error: "mensaje legible" }`
- Errores de DB logueados en consola, nunca expuestos al cliente
- Validación en frontend (UX) y en backend (seguridad), siempre ambos

---

## Fuera de alcance (v1)

- Módulo de asistencia (arquitectura prevista, no implementado)
- App móvil
- Notificaciones por email/WhatsApp
- Integración con medios de pago online

---

## Actividades del club (referencia)

Aquagym, Escuela de Fútbol, Escuela de Natación, Escuela de Tenis, Fitness 30, Baby Natación, Gimnasia Funcional, Pentatlón Moderno, Pileta Libre, Temporada de Pileta, Cumpleaños con Entretenimiento, Pasitos Deportivos, Colonia de Vacaciones, Fútbol 5, Alquiler de canchas de tenis.
