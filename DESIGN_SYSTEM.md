# 🎨 Sistema de Diseño Médanos Verdes v2

Documentación completa del sistema de diseño consolidado para la aplicación Club Médanos Verdes.

## 📋 Tabla de Contenidos

1. [Variables CSS](#variables-css)
2. [Componentes](#componentes)
3. [Patrones Comunes](#patrones-comunes)
4. [Guía de Uso](#guía-de-uso)
5. [Ejemplos](#ejemplos)

---

## 🎯 Variables CSS

Todas las variables están definidas en `public/styles.css` en la sección `:root`.

### Colores Primarios

```css
--primary: #2d6219;           /* Verde principal */
--primary-dark: #1f4511;      /* Verde oscuro */
--primary-light: #4a8c2a;     /* Verde claro */
--secondary: #7a8c2e;         /* Verde secundario */
```

### Colores Semánticos

```css
--accent: #059669;            /* Acento (éxito/activo) */
--accent-light: #d1fae5;      /* Acento claro */
--warning: #d97706;           /* Advertencia */
--danger: #dc2626;            /* Peligro/Error */
--danger-light: #fee2e2;      /* Peligro claro */
--success: #10b981;           /* Éxito */
```

### Escala Neutral

```css
--neutral-50: #f9fafb;        /* Fondo más claro */
--neutral-100: #f3f4f6;       /* Fondo claro */
--neutral-200: #e5e7eb;       /* Bordes */
--neutral-300: #d1d5db;       /* Bordes oscuros */
--neutral-400: #9ca3af;       /* Placeholder */
--neutral-500: #6b7280;       /* Texto secundario */
--neutral-600: #4b5563;       /* Texto */
--neutral-700: #374151;       /* Texto oscuro */
--neutral-800: #1f2937;       /* Texto muy oscuro */
--neutral-900: #111827;       /* Negro casi puro */
```

### Sombras (Elevation)

```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
--shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.15);
```

### Border Radius (Consistencia)

```css
--radius-sm: 6px;             /* Pequeño */
--radius-md: 8px;             /* Mediano */
--radius-lg: 12px;            /* Grande */
--radius-xl: 16px;            /* Muy grande */
```

### Espaciado (Base 8px)

```css
--space-xs: 4px;              /* Mínimo */
--space-sm: 8px;              /* Pequeño */
--space-md: 12px;             /* Mediano */
--space-lg: 16px;             /* Grande */
--space-xl: 20px;             /* Muy grande */
--space-2xl: 24px;            /* Extra grande */
--space-3xl: 32px;            /* Doble grande */
--space-4xl: 40px;            /* Triple grande */
```

### Tipografía

```css
--font-sans: 'DM Sans', sans-serif;
--font-mono: 'Courier New', monospace;

/* Tamaños */
--text-xs: 12px;
--text-sm: 13px;
--text-base: 14px;
--text-lg: 16px;
--text-xl: 18px;
--text-2xl: 20px;
--text-3xl: 22px;
--text-4xl: 28px;

/* Pesos */
--weight-normal: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

### Transiciones

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 🧩 Componentes

### Botones

#### Primario
```html
<button class="btn btn-primary">Acción principal</button>
```

#### Secundario
```html
<button class="btn btn-secondary">Acción secundaria</button>
```

#### Peligro
```html
<button class="btn btn-danger">Acción peligrosa</button>
```

#### Éxito
```html
<button class="btn btn-success">Acción exitosa</button>
```

#### Tamaños
```html
<button class="btn btn-primary btn-sm">Pequeño</button>
<button class="btn btn-primary">Normal</button>
<button class="btn btn-primary btn-lg">Grande</button>
```

### Modales

```html
<div class="modal" id="miModal">
  <div style="position: relative;">
    <button class="modal-close" onclick="cerrarModal('miModal')">✕</button>
    <div class="modal-content">
      <div class="modal-header">Título del Modal</div>
      <!-- Contenido aquí -->
    </div>
  </div>
</div>
```

### Cards

```html
<div class="card">
  <div class="card-header">
    <div class="card-title">Título</div>
    <div class="card-subtitle">Subtítulo</div>
  </div>
  <div class="card-body">Contenido</div>
  <div class="card-footer">Pie</div>
</div>
```

### Activity Cards (Grilla)

```html
<div class="activities-grid">
  <div class="activity-card">
    <div class="card-header">
      <div class="card-title">Nombre</div>
      <div class="card-desc">Descripción</div>
    </div>
    <div class="card-body">
      <div class="card-detail">
        <span class="card-detail-label">Etiqueta:</span>
        <span class="card-detail-value">Valor</span>
      </div>
    </div>
    <div class="card-actions">
      <button class="btn-action btn-edit">Editar</button>
      <button class="btn-action btn-config">Configurar</button>
    </div>
  </div>
</div>
```

### Formularios

```html
<div class="form-group">
  <label>Nombre *</label>
  <input type="text" placeholder="Ingresa tu nombre" required>
</div>

<div class="form-group">
  <label>Selecciona una opción</label>
  <select>
    <option value="">Seleccionar...</option>
    <option value="1">Opción 1</option>
  </select>
</div>

<div class="form-group">
  <label>Descripción</label>
  <textarea rows="3"></textarea>
</div>

<div class="form-actions">
  <button type="submit" class="btn-submit">Guardar</button>
  <button type="button" class="btn-cancel">Cancelar</button>
</div>
```

### Tablas

```html
<table>
  <thead>
    <tr>
      <th>Columna 1</th>
      <th>Columna 2</th>
      <th>Acciones</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Dato 1</td>
      <td>Dato 2</td>
      <td>
        <button class="btn-action">Editar</button>
      </td>
    </tr>
  </tbody>
</table>
```

### Badges (Estado)

```html
<!-- Estados -->
<span class="badge badge-activo">Activo</span>
<span class="badge badge-inactivo">Inactivo</span>
<span class="badge badge-suspendido">Suspendido</span>

<!-- Pagos -->
<span class="badge badge-pagada">Pagada</span>
<span class="badge badge-pendiente">Pendiente</span>
<span class="badge badge-vencida">Vencida</span>

<!-- Tipos -->
<span class="badge badge-fijo">Fijo</span>
<span class="badge badge-por_hora">Por hora</span>
<span class="badge badge-por_alumno">Por alumno</span>
<span class="badge badge-combinado">Combinado</span>

<!-- Financiero -->
<span class="badge badge-ingreso">Ingreso</span>
<span class="badge badge-egreso">Egreso</span>
```

### Stats Grid (Indicadores)

```html
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-label">Ingresos</div>
    <div class="stat-value">$5,234</div>
  </div>
  
  <div class="stat-card egreso">
    <div class="stat-label">Egresos</div>
    <div class="stat-value">$1,234</div>
  </div>
  
  <div class="stat-card saldo">
    <div class="stat-label">Saldo</div>
    <div class="stat-value">$4,000</div>
  </div>
</div>
```

### Búsqueda

```html
<div class="search-bar">
  <input type="text" placeholder="Buscar...">
  <select>
    <option>Filtro 1</option>
  </select>
</div>
```

### Pestañas (Tabs)

```html
<div class="tabs">
  <button class="tab active" onclick="mostrarTab('tab1')">Pestaña 1</button>
  <button class="tab" onclick="mostrarTab('tab2')">Pestaña 2</button>
</div>

<div id="tab1" class="tab-content active">Contenido 1</div>
<div id="tab2" class="tab-content">Contenido 2</div>
```

---

## 📐 Patrones Comunes

### Layout Base

```html
<div class="container">
  <div class="header">
    <h1>📱 Título de Módulo</h1>
    <p>Descripción breve</p>
  </div>

  <div class="top-bar">
    <button class="btn btn-primary">+ Nueva acción</button>
    <a href="/dashboard" class="btn btn-secondary">← Volver</a>
  </div>

  <div class="content-card">
    <!-- Contenido principal -->
  </div>
</div>
```

### Header

```html
<div class="header">
  <h1>🎯 Título con Emoji</h1>
  <p>Descripción del módulo</p>
</div>
```

### Empty State

```html
<div class="empty-state">
  <div class="empty-state-icon">📭</div>
  <div class="empty-state-title">No hay datos</div>
  <div class="empty-state-description">Comienza creando tu primer registro</div>
</div>
```

---

## 📝 Guía de Uso

### 1. **En EJS - Usar clases del sistema**

❌ **No hagas esto:**
```html
<style>
  .mi-boton { background: #2d6219; padding: 10px 20px; }
</style>
<button class="mi-boton">Click</button>
```

✅ **Haz esto:**
```html
<button class="btn btn-primary">Click</button>
```

### 2. **Variables CSS - Siempre reutilizar**

❌ **No:**
```css
.card { padding: 20px; margin: 15px; }
```

✅ **Sí:**
```css
.card { padding: var(--space-xl); margin: var(--space-lg); }
```

### 3. **Colores - Usar semántica**

❌ **No:**
```css
.estado-activo { color: #059669; }
```

✅ **Sí:**
```css
.estado-activo { color: var(--accent); }
```

### 4. **Nueva característica - Extender desde CSS**

Si necesitas un componente nuevo:

```css
/* En styles.css */
.new-component {
  background: var(--neutral-50);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}
```

---

## 💡 Ejemplos

### Ejemplo 1: Modal de Formulario Completo

```html
<div class="modal" id="miModal">
  <div style="position: relative;">
    <button class="modal-close" onclick="cerrarModal('miModal')">✕</button>
    <div class="modal-content">
      <div class="modal-header">Crear Nuevo Usuario</div>
      <form onsubmit="guardar(event)">
        <div class="form-group">
          <label>Nombre completo *</label>
          <input type="text" required>
        </div>
        
        <div class="form-group">
          <label>Email *</label>
          <input type="email" required>
        </div>
        
        <div class="form-group">
          <label>Rol</label>
          <select>
            <option value="">Seleccionar...</option>
            <option value="admin">Administrador</option>
            <option value="user">Usuario</option>
          </select>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn-submit">Guardar</button>
          <button type="button" class="btn-cancel" onclick="cerrarModal('miModal')">Cancelar</button>
        </div>
      </form>
    </div>
  </div>
</div>
```

### Ejemplo 2: Tabla con Acciones

```html
<div class="content-card">
  <div class="search-bar">
    <input type="text" placeholder="Buscar...">
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Estado</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Juan Pérez</td>
        <td><span class="badge badge-activo">Activo</span></td>
        <td>
          <button class="btn-action btn-edit">Editar</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Ejemplo 3: Grilla de Cards

```html
<div class="activities-grid">
  <div class="activity-card">
    <div class="card-header">
      <div class="card-title">Natación</div>
      <div class="card-desc">Clases de natación para todas las edades</div>
    </div>
    <div class="card-body">
      <div class="card-detail">
        <span class="card-detail-label">Horario:</span>
        <span class="card-detail-value">Lun-Mié-Vie 18:00</span>
      </div>
      <div class="card-detail">
        <span class="card-detail-label">Precio:</span>
        <span class="card-detail-value">$1,500/mes</span>
      </div>
    </div>
    <div class="card-actions">
      <button class="btn-action btn-edit">Editar</button>
      <button class="btn-action btn-config">Instructores</button>
    </div>
  </div>
</div>
```

---

## 🚀 Checklist para Nuevas Características

- [ ] Usar variables CSS para todos los valores
- [ ] Componentes reutilizan clases del sistema
- [ ] Responden en móvil (@media queries)
- [ ] Animaciones/transiciones usan `--transition-*`
- [ ] Colores son semánticos (--primary, --danger, etc.)
- [ ] Espaciado en múltiplos de 4px o 8px
- [ ] Shadows se usan para elevation
- [ ] Border radius consistente
- [ ] Documentado en este archivo

---

## 📞 Soporte

Para preguntas o sugerencias sobre el sistema de diseño:
1. Revisa las variables en `public/styles.css`
2. Consulta los ejemplos en este documento
3. Verifica los módulos existentes como referencia

**Última actualización:** 2026-05-04
