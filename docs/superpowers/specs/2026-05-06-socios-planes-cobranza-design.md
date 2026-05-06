# Sistema de Socios, Planes y Cobranza

> **Para trabajadores agenciales:** Usa superpowers:subagent-driven-development o superpowers:executing-plans para implementar este plan tarea a tarea.

**Objetivo:** Construir un sistema administrativo para gestionar grupos familiares (socios), planes de membresía, y facturación automática mensual con seguimiento de pagos.

**Arquitectura:** Sistema modular con tres módulos independientes: modulo-socios (gestión de grupos), modulo-planes (definición de planes y actividades), modulo-cobranza (facturación automática, pagos y deuda). La facturación se genera automáticamente el 1º de cada mes, sumando cuota base + actividades contratadas. El admin puede cambiar actividades en cualquier momento (aplica al siguiente mes) y gestionar cobros/deudas.

**Stack:** Node.js/Express, SQLite (sql.js), EJS frontend, node-cron para automatización mensual.

---

## Modelo de Negocio

### Estructura Organizacional
- **Socio = Grupo familiar** (identificado por `numero_socio`)
- Un grupo tiene un **titular** y opcionalmente **miembros** (cónyuge, hijos, otros)
- El grupo contrata un **plan base** (cuota mensual fija)
- Además del plan, el grupo puede contratar **actividades adicionales** con costo fijo mensual

### Estructura Tarifaria
- **Cuota mensual base:** precio fijo del plan (ej: $50/mes por ser socio)
- **Actividades adicionales:** costo fijo por actividad (ej: Natación $30/mes, Gimnasio $20/mes)
- Las actividades se contratan por **cantidad** (ej: "2 cuotas de Natación" = $30×2 = $60)
- **Factura mensual = Cuota base + (Actividad1 × cantidad1) + (Actividad2 × cantidad2) + ...**
- Pago es **adelantado** (se cobra el mes completo sin importar si el grupo asiste o no)

### Ciclo de Cobro
1. **Primer día de cada mes:** generación automática de cuotas para todos los grupos ACTIVOS
2. **Durante el mes:** admin registra pagos recibidos
3. **Cambios de actividades:** si el grupo agrega/quita actividades en el mes, se refleja en la próxima cuota (no hay reembolsos ni cargos adicionales en el mes actual)
4. **Gestión de deuda:** si un grupo no paga, el admin puede:
   - Quitar solo algunas actividades (grupo sigue siendo socio, paga cuota base)
   - Dar de baja completamente (grupo suspendido/inactivo)
5. **Reactivación:** si un grupo paga cuota vencida, se reactiva automáticamente

---

## Estructura de Datos

### Tabla: `socios` (modificación)
```sql
CREATE TABLE socios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_socio TEXT UNIQUE NOT NULL,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT UNIQUE,
  email TEXT,
  telefono TEXT,
  domicilio TEXT,
  fecha_alta TEXT NOT NULL,
  estado TEXT DEFAULT 'ACTIVO',  -- ACTIVO, SUSPENDIDO, DADO_DE_BAJA
  plan_id INTEGER REFERENCES planes_cuota(id),
  observaciones TEXT
);
```

**Cambios:**
- Reemplazar campo `estado` existente (era booleano activo/inactivo) con texto: ACTIVO, SUSPENDIDO, DADO_DE_BAJA
- Agregar `plan_id` para vincular el grupo a su cuota base

### Tabla: `miembros_grupo` (nueva)
```sql
CREATE TABLE miembros_grupo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER REFERENCES socios(id) NOT NULL,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT,
  relacion TEXT NOT NULL,  -- TITULAR, CÓNYUGE, HIJO, OTRO
  activo INTEGER DEFAULT 1,
  fecha_alta TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Propósito:** Registrar personas dentro del grupo familiar para auditoría y control de acceso.

### Tabla: `actividades_grupo` (nueva)
```sql
CREATE TABLE actividades_grupo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER REFERENCES socios(id) NOT NULL,
  actividad_id INTEGER REFERENCES actividades(id) NOT NULL,
  cantidad INTEGER DEFAULT 1,  -- ej: 2 = dos cuotas de esa actividad
  fecha_desde TEXT NOT NULL,  -- cuándo comienza esta contratación
  fecha_hasta TEXT,  -- NULL = vigente; fecha cuando se cancela
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Propósito:** Define qué actividades tiene contratadas cada grupo y en qué cantidad.

### Tabla: `planes_cuota` (revisión)
La tabla ya existe. Estructura esperada:
```sql
CREATE TABLE planes_cuota (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,  -- ej: "Plan Básico", "Plan Premium"
  descripcion TEXT,
  monto REAL NOT NULL,  -- monto mensual de cuota base
  tipo TEXT  -- puede usarse para categorización
);
```

### Tabla: `cuotas` (simplificación)
La tabla ya existe. Estructura esperada:
```sql
CREATE TABLE cuotas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER REFERENCES socios(id) NOT NULL,
  periodo TEXT NOT NULL,  -- formato: "2026-05" (YYYY-MM)
  monto_total REAL NOT NULL,  -- suma de cuota base + actividades
  estado TEXT DEFAULT 'PENDIENTE',  -- PENDIENTE, PAGADA, VENCIDA
  fecha_vencimiento TEXT,  -- ej: "2026-05-10"
  fecha_generacion TEXT DEFAULT CURRENT_TIMESTAMP,
  detalle_json TEXT  -- (opcional) JSON con desglose: {cuota_base: X, actividades: [{...}]}
);
```

**Nota:** El campo `detalle_json` es opcional pero recomendado para transparencia (saber qué incluye cada cuota).

### Tabla: `pagos` (sin cambios)
La tabla ya existe. Estructura esperada:
```sql
CREATE TABLE pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cuota_id INTEGER REFERENCES cuotas(id) NOT NULL,
  socio_id INTEGER REFERENCES socios(id) NOT NULL,
  fecha_pago TEXT NOT NULL,
  importe REAL NOT NULL,
  medio_pago TEXT,  -- EFECTIVO, TRANSFERENCIA, TARJETA, OTRO
  usuario_id INTEGER REFERENCES usuarios(id),
  observaciones TEXT
);
```

---

## Lógica de Facturación Automática

### Generación Mensual de Cuotas

**Trigger:** Primer día de cada mes (00:01 UTC, ejecutado por job node-cron)

**Algoritmo:**
```
PARA CADA socio CON estado = 'ACTIVO':
  1. Obtener plan_id → recuperar monto_cuota_base de planes_cuota
  2. Sumar todas las actividades_grupo VIGENTES:
     monto_actividades = SUM(actividades.precio × actividades_grupo.cantidad)
     DONDE actividades_grupo.fecha_desde <= HOY
       AND (actividades_grupo.fecha_hasta IS NULL OR actividades_grupo.fecha_hasta >= HOY)
  3. monto_total = monto_cuota_base + monto_actividades
  4. Crear registro en cuotas:
     {socio_id, periodo: "YYYY-MM", monto_total, estado: 'PENDIENTE', 
      fecha_vencimiento: primer_dia_del_mes + 10_dias}
  5. (Opcional) Guardar desglose en detalle_json para auditoría
```

**Validación:**
- No crear cuota si ya existe para ese socio en ese período
- Si socio tiene cuota vencida del mes anterior, nueva cuota se marca como VENCIDA automáticamente

### Cambios de Actividades (Mid-Month)

Cuando el admin agrega/quita actividades a un grupo:
1. Modificar `actividades_grupo` (insertar nueva fila con fecha_desde = hoy, o actualizar fecha_hasta de fila existente)
2. La cuota del mes actual **NO se modifica** (pago adelantado)
3. En la próxima generación mensual (1º del próximo mes), la nueva cuota ya incluirá los cambios

---

## Flujos de Cobro y Gestión

### Flujo A: Pago Exitoso
```
1. Admin ve cuota PENDIENTE
2. Registra pago en modulo-cobranza (selecciona cuota, ingresa importe, medio)
3. Sistema crea registro en tabla pagos
4. Si importe >= monto_total:
   - Cambiar estado de cuota a PAGADA
   - Cambiar estado de socio a ACTIVO (si estaba SUSPENDIDO)
5. Si importe < monto_total:
   - Registrar como pago parcial (crear cuota con saldo pendiente o dejar PENDIENTE)
```

### Flujo B: No Pagar / Gestión de Deuda
```
1. Admin ve cuota VENCIDA (pasó fecha_vencimiento)
2. Decide una de dos opciones:

Opción A: Quitar actividades (grupo sigue siendo socio)
  - Admin selecciona qué actividades quitar
  - Sistema actualiza actividades_grupo (fecha_hasta = hoy)
  - Próxima cuota mensual solo incluirá cuota base (sin esas actividades)
  - Estado del socio sigue siendo ACTIVO (si paga) o SUSPENDIDO (si sigue sin pagar)

Opción B: Dar de baja completamente
  - Admin cambia estado del socio a DADO_DE_BAJA
  - Próximas cuotas no se generarán para este socio
  - Si después paga, admin puede cambiar estado de vuelta a ACTIVO
```

### Flujo C: Reactivación
```
1. Grupo con estado SUSPENDIDO o DADO_DE_BAJA paga cuota pendiente
2. Admin registra pago en modulo-cobranza
3. Sistema automáticamente cambia estado de socio a ACTIVO
4. Próxima cuota (1º del mes) se genera con todas las actividades vigentes
```

---

## Módulos Administrativos

### modulo-socios
**Rutas principales:**
- `GET /socios` — listar grupos (paginado, filtrable por estado/plan)
- `GET /socios/:id` — ver detalles del grupo, miembros, actividades vigentes
- `POST /socios` — crear grupo (titular + plan base)
- `PUT /socios/:id` — editar datos del grupo, cambiar plan base, cambiar estado
- `POST /socios/:id/miembros` — agregar miembro al grupo
- `DELETE /socios/:id/miembros/:miembro_id` — quitar miembro
- `POST /socios/:id/actividades` — agregar actividad al grupo
- `DELETE /socios/:id/actividades/:actividad_id` — quitar actividad (soft delete: set fecha_hasta)

**Vistas:**
- Listado con filtros (estado, plan, búsqueda por número/apellido)
- Formulario crear/editar grupo
- Detalle de grupo: datos, miembros, actividades actuales
- Modal para agregar miembros/actividades

### modulo-planes
**Rutas principales:**
- `GET /planes` — listar planes base
- `POST /planes` — crear plan
- `PUT /planes/:id` — editar plan
- `GET /actividades` — listar actividades
- `POST /actividades` — crear actividad
- `PUT /actividades/:id` — editar actividad (nombre, precio)
- `DELETE /actividades/:id` — marcar como inactiva (soft delete)

**Vistas:**
- Listado de planes base con precios
- Listado de actividades disponibles con precios
- Formularios crear/editar

### modulo-cobranza
**Rutas principales:**
- `GET /cobranza/dashboard` — cuotas del mes actual (resumen: pagadas/pendientes/vencidas, monto total)
- `GET /cobranza/cuotas` — listar todas las cuotas (filtros: período, estado, grupo)
- `GET /cobranza/cuotas/:id` — detalle de cuota (desglose de componentes si hay detalle_json)
- `POST /cobranza/pagos` — registrar pago (cuota_id, importe, medio_pago)
- `PUT /socios/:id/estado` — cambiar estado (ACTIVO ↔ SUSPENDIDO / DADO_DE_BAJA)
- `POST /socios/:id/actividades/:actividad_id/quitar` — quitar actividad específica (Flujo B opción A)
- `GET /cobranza/morosos` — reporte de grupos con deuda vencida
- `GET /cobranza/ingresos` — reporte de ingresos por período

**Vistas:**
- Dashboard: métricas del mes (pagadas, pendientes, vencidas, monto total)
- Listado de cuotas con filtros y búsqueda
- Detalle de cuota: desglose y opción para registrar pago
- Gestión de deuda: acciones para quitar actividades o dar de baja
- Reportes: morosos, ingresos mensuales, etc.

---

## Automatización

### Job Mensual (node-cron)
```
Cron: '0 0 1 * *'  // Primer día de cada mes, 00:00

Ejecutar:
  function generarCuotasDelMes() {
    // Algoritmo de facturación descrito arriba
  }
```

**Ubicación:** `server.js` o archivo separado `jobs/generarCuotas.js`

---

## Integración con Sistema Existente

- **Actividades existentes:** La tabla `actividades` ya existe. Se reutiliza para este sistema (mismas actividades del módulo de actividades).
- **Socios existentes:** La tabla `socios` ya existe pero necesita migración:
  - Agregar columna `plan_id`
  - Migrar campo `estado` (de booleano `activo` a texto con valores ACTIVO/SUSPENDIDO/DADO_DE_BAJA)
- **Usuarios/Roles:** Usar auth middleware existente; roles como 'admin', 'recepcion' tendrán acceso al modulo-cobranza

---

## Testing & Validación

### Unit Tests
- Función de cálculo de cuota (suma correcta de base + actividades)
- Función de generación de cuotas para todos los socios
- Función de reactivación automática al pagar
- Función de cambio de actividades

### Integration Tests
- Crear socio → agregar actividades → generar cuota → registrar pago → verificar estado
- Crear socio → no pagar → quitar actividad → generar cuota siguiente → verificar monto
- Dar de baja socio → verificar que no se genere cuota
- Reactivar socio → verificar que se genere cuota nuevamente

### Manual Testing (después de implementación)
- Crear grupo con 2 miembros, plan base + 2 actividades
- Generar cuota (1º del mes) → verificar monto = cuota_base + (actividad1 + actividad2)
- Quitar una actividad el 15 del mes
- Esperar al 1º del próximo mes → verificar cuota solo tenga actividad restante
- No pagar → quitar todas actividades → solo cobrar cuota base en siguiente mes
- Pagar cuota vencida → reactivar automáticamente

---

## Consideraciones Futuras (out of scope)

- Descuentos o promociones (no solicitado)
- Multi-moneda (asumir moneda única)
- Integración con pasarelas de pago automáticas (pagos manuales por ahora)
- Facturación con comprobantes fiscales (si es necesario, se agregará después)
- Reportes avanzados (exportar a PDF, etc.) — básico por ahora
