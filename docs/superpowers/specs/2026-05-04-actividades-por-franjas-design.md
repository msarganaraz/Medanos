# Diseño: Sistema de Gestión de Actividades por Franjas Horarias

**Fecha:** 2026-05-04  
**Decisión:** Reemplazo completo del módulo de Actividades actual

---

## 1. Contexto y Motivación

El sistema actual muestra actividades como tarjetas con badges de instructores, pero no diferencia **franjas horarias específicas**. Para una actividad como Natación que funciona 7am-21hs con múltiples instructores simultáneamente en diferentes horarios, el administrativo necesita:

1. Ver **ocupación por franja horaria** (cuántos socios en Lunes 18-19hs)
2. Asignar socios a **franjas específicas**, no solo a actividades
3. Visualizar instructores asignados a cada franja
4. Soportar actividades flexibles (Gimnasio) sin franjas definidas

---

## 2. Estructura de Datos

### Nuevas Tablas

**`franjas_horarias`**
```sql
CREATE TABLE franjas_horarias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actividad_id INTEGER REFERENCES actividades(id),
  dia_semana INTEGER NOT NULL (0-6, 0=Lunes, 6=Domingo),
  hora_inicio INTEGER NOT NULL (0-23),
  hora_fin INTEGER NOT NULL (0-23),
  capacidad INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**`socio_franjas`** (reemplaza `socio_actividades`)
```sql
CREATE TABLE socio_franjas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER REFERENCES socios(id),
  franja_id INTEGER REFERENCES franjas_horarias(id),
  fecha_desde TEXT NOT NULL,
  fecha_hasta TEXT DEFAULT NULL
);
```

**`instructor_franjas`** (reemplaza `instructor_actividades`)
```sql
CREATE TABLE instructor_franjas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instructor_id INTEGER REFERENCES instructores(id),
  franja_id INTEGER REFERENCES franjas_horarias(id)
);
```

### Modificaciones a Tabla Existente

**`actividades`** - agregar campo:
```sql
ALTER TABLE actividades ADD COLUMN tiene_horarios_flexibles INTEGER DEFAULT 0;
```

---

## 3. Migración de Datos Existentes

**Cómo convertir actividades actuales:**

1. Leer campo `dias_horario` de cada actividad (ej: "Lun-Mié-Vie 18:00 a 19:00")
2. Parsear días y horarios
3. Crear registros en `franjas_horarias`
4. Ejemplo:
   - "Natación" con "Lun-Mié-Vie 18:00 a 19:00" → 3 franjas:
     - (actividad_id=1, dia=0, 18, 19) [Lunes]
     - (actividad_id=1, dia=2, 18, 19) [Miércoles]
     - (actividad_id=1, dia=4, 18, 19) [Viernes]

5. Socios en `socio_actividades` → migrar a `socio_franjas` (asignar a todas las franjas de la actividad)
6. Instructores en `instructor_actividades` → migrar a `instructor_franjas`

---

## 4. Interfaz de Usuario

### 4.1 Dashboard Principal

**Ruta:** `/actividades` (reemplaza vista actual de tarjetas)

**Componentes:**
- Filtro de fecha: [Hoy ▼] [Esta Semana ▼]
- Para cada actividad (con franjas):
  - Grilla con días (columnas) y franjas horarias (filas)
  - Cada celda muestra: `[N socios | M profes]`
  - Click en celda → modal readonly con lista de socios + instructores
  - Botón [➕ Gestionar Actividad]

- Para cada actividad (flexible):
  - Texto: "Acceso libre — X socios inscritos"
  - Botón [➕ Gestionar Actividad]

**Mockup estructura:**
```
┌─ NATACIÓN
│  ┌─────────┬──────────┬─────────┐
│  │ LUNES   │ MIÉRCOLES│ VIERNES │
│  ├─────────┼──────────┼─────────┤
│  │ 7-8am   │ 7-8am    │ 7-8am   │
│  │ [3|2]   │ [4|2]    │ [3|1]   │
│  ├─────────┼──────────┼─────────┤
│  │ 18-19hs │ 18-19hs  │ 18-19hs │
│  │ [8|3]   │ [7|2]    │ [6|3]   │
│  └─────────┴──────────┴─────────┘
│  [➕ Gestionar]
│
├─ TENIS
│  ┌─────────┬──────────┐
│  │ MARTES  │ JUEVES   │
│  ├─────────┼──────────┤
│  │ 17-18:30│ 17-18:30 │
│  │ [5|2]   │ [6|2]    │
│  └─────────┴──────────┘
│  [➕ Gestionar]
│
└─ GIMNASIO
   Acceso libre — 87 socios inscritos
   [➕ Gestionar]
```

### 4.2 Vista de Detalle - Grilla de Gestión

**Ruta:** `/actividades/{id}/gestionar`

**Componentes:**
- Título: "NATACIÓN — Gestionar Socios e Instructores"
- Botón: [← Volver al Dashboard]
- Tabs para cambiar día: [LUNES] [MIÉRCOLES] [VIERNES]

**Para cada franja del día:**
```
┌─────────────────────────────────────────┐
│ 7-8am                                   │
├────────────────────┬────────────────────┤
│ SOCIOS (3)         │ INSTRUCTORES (2)   │
│ • García, Juan     │ • Sánchez, Pablo ✕ │
│ • López, María ✕   │ • Ríos, Marina ✕   │
│ • Rodríguez, Carlos│                    │
│ [+ Agregar]        │ [+ Agregar]        │
└────────────────────┴────────────────────┘
```

**Comportamientos:**
- Click ✕ → confirmación → quita de esa franja
- Click [+ Agregar] → modal con dropdown de disponibles → agrega inmediatamente
- La grilla se actualiza en tiempo real

**Para actividades flexibles (Gimnasio):**
```
GIMNASIO — Gestionar Socios

[← Volver al Dashboard]

┌────────────────────┐
│ SOCIOS INSCRITOS   │
│ • García, Juan ✕   │
│ • López, María ✕   │
│ • Rodríguez, Carlos│
│ • ... (87 total)   │
│ [+ Agregar]        │
└────────────────────┘
```

---

## 5. Flujos de Trabajo

### Flujo 1: Asignar un socio a una franja específica

1. Dashboard → click [➕ Gestionar Natación]
2. Entra a grilla → selecciona día (LUNES)
3. En franja "Lunes 18-19hs", click [+ Agregar]
4. Modal: dropdown con socios sin asignar a esa franja
5. Selecciona socio → confirma
6. Socio se agrega a la lista inmediatamente

### Flujo 2: Quitar un socio de una franja

1. En grilla → ve socio en franja
2. Click ✕ junto al socio
3. Confirmación: "¿Quitar a García de Natación Lunes 18-19hs?"
4. Se elimina → grilla se actualiza

### Flujo 3: Asignar instructor a una franja

1. En grilla → mismo flujo que socio
2. Click [+ Agregar] en sección INSTRUCTORES
3. Modal: dropdown con instructores disponibles
4. Selecciona → se agrega

### Flujo 4: Gestionar actividad flexible

1. Dashboard → click [➕ Gestionar Gimnasio]
2. Ve lista de socios inscritos (sin franjas)
3. Click ✕ → quita socio completamente
4. Click [+ Agregar] → agrega nuevo socio

---

## 6. API Endpoints

### Obtener actividades con franjas (Dashboard)

**`GET /api/actividades`**
```json
{
  "success": true,
  "actividades": [
    {
      "id": 1,
      "nombre": "Natación",
      "tiene_horarios_flexibles": false,
      "franjas": [
        {
          "id": 1,
          "dia_semana": 0,
          "hora_inicio": 7,
          "hora_fin": 8,
          "socios_count": 3,
          "instructores_count": 2
        },
        ...
      ]
    },
    {
      "id": 6,
      "nombre": "Gimnasio",
      "tiene_horarios_flexibles": true,
      "socios_count": 87
    }
  ]
}
```

### Obtener franjas de una actividad (Grilla)

**`GET /api/actividades/{id}/franjas`**
```json
{
  "success": true,
  "actividad": { "id": 1, "nombre": "Natación" },
  "franjas": [
    {
      "id": 1,
      "dia_semana": 0,
      "hora_inicio": 7,
      "hora_fin": 8,
      "socios": [
        { "id": 10, "apellido": "García", "nombre": "Juan" }
      ],
      "instructores": [
        { "id": 11, "apellido": "Sánchez", "nombre": "Pablo" }
      ]
    }
  ]
}
```

### Agregar socio a franja

**`POST /api/franjas/{id}/socios`**
```json
{
  "socio_id": 10,
  "fecha_desde": "2026-05-04"
}
```

### Quitar socio de franja

**`DELETE /api/franjas/{id}/socios/{socio_id}`**

### Agregar instructor a franja

**`POST /api/franjas/{id}/instructores`**
```json
{
  "instructor_id": 11
}
```

### Quitar instructor de franja

**`DELETE /api/franjas/{id}/instructores/{instructor_id}`**

---

## 7. Casos Especiales

### Actividades sin franjas definidas
- Si `tiene_horarios_flexibles = 1` → no mostrar grilla, solo lista de socios
- No se pueden asignar a franjas

### Cambios de horarios
- Si un admin modifica una franja (ej: cambiar Lunes 18-19hs a 19-20hs)
- Los socios asignados a esa franja se mantienen (pero con nuevo horario)

### Reportes futuros
- Estructura permite contar: "En Natación Lunes 18-19hs hay 8 socios"
- Datos listos para dashboard de concurrencia mensual

---

## 8. Scope de Implementación

### Fase 1 (Inicial)
- Migración de datos: convertir actividades a franjas
- Dashboard principal con grilla de ocupación
- Vista de detalle con gestión por franja
- API endpoints básicos

### Fase 2 (Futuro)
- Dashboard de reportes de concurrencia
- Historial de asignaciones
- Exportar reportes

---

## 9. Preguntas Resueltas

✓ Estructura de datos: tabla `franjas_horarias` como entidad central  
✓ Tipo de asignación: Socio → Franja específica (día + hora)  
✓ Soporte para flexible: campo `tiene_horarios_flexibles`  
✓ Interfaz principal: Dashboard con grilla de ocupación  
✓ Gestión de cambios: Grilla por franja horaria  
✓ Migración: Parsear `dias_horario` existentes a franjas  

