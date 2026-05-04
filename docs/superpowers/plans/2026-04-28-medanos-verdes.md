# Medanos Verdes — Plan de Implementación

> **Para agentes:** usar superpowers:subagent-driven-development o superpowers:executing-plans para ejecutar tarea por tarea.

**Goal:** Construir el sistema de gestión del Club Médanos Verdes con login, dashboard y 6 módulos (Socios, Actividades, Instructores, Cuotas, Caja, Admin).

**Architecture:** Monolito Node.js + Express con API REST por módulo. Vistas EJS consumen la API via fetch. SQLite compartida. Middleware de sesión y roles central.

**Tech Stack:** Node.js, Express, better-sqlite3, EJS, express-session, bcryptjs, Jest (tests)

---

## Mapa de archivos

```
medanos-verdes/
├── servidor.js
├── package.json
├── .gitignore
├── database/
│   ├── db.js
│   └── schema.sql
├── middleware/
│   └── auth.js
├── public/
│   ├── login.html
│   ├── dashboard.html
│   └── images/
│       └── logo.png          ← copiar manualmente del club
├── modulo-socios/
│   ├── routes/socios.routes.js
│   ├── controllers/socios.controller.js
│   └── views/
│       ├── socios.ejs
│       └── legajo.ejs
├── modulo-actividades/
│   ├── routes/actividades.routes.js
│   ├── controllers/actividades.controller.js
│   └── views/actividades.ejs
├── modulo-instructores/
│   ├── routes/instructores.routes.js
│   ├── controllers/instructores.controller.js
│   ├── services/liquidacion.js
│   └── views/
│       ├── instructores.ejs
│       └── liquidaciones.ejs
├── modulo-cuotas/
│   ├── routes/cuotas.routes.js
│   ├── controllers/cuotas.controller.js
│   ├── services/cuotas.logic.js
│   └── views/
│       ├── cuotas.ejs
│       └── planes.ejs
├── modulo-caja/
│   ├── routes/caja.routes.js
│   ├── controllers/caja.controller.js
│   └── views/caja.ejs
├── modulo-admin/
│   ├── routes/admin.routes.js
│   ├── controllers/admin.controller.js
│   └── views/usuarios.ejs
└── tests/
    ├── auth.test.js
    ├── liquidacion.test.js
    └── cuotas.test.js
```

---

## Fases

- **Fase 1 (Tasks 1–6):** Fundación — proyecto, DB, auth, servidor, login, dashboard
- **Fase 2 (Tasks 7–8):** Módulo Admin — usuarios y roles
- **Fase 3 (Tasks 9–10):** Módulo Socios
- **Fase 4 (Tasks 11–12):** Módulo Actividades
- **Fase 5 (Tasks 13–15):** Módulo Instructores + liquidaciones
- **Fase 6 (Tasks 16–18):** Módulo Cuotas y Pagos
- **Fase 7 (Tasks 19–20):** Módulo Caja

---

---

## Fase 2: Módulo Admin

---

### Task 7: Módulo Admin — Backend (rutas y controlador)

**Files:**
- Create: `modulo-admin/routes/admin.routes.js`
- Create: `modulo-admin/controllers/admin.controller.js`

- [ ] **Step 1: Crear modulo-admin/controllers/admin.controller.js**

```js
const db = require('../../database/db');
const bcrypt = require('bcryptjs');

async function getUsuarios(req, res) {
  try {
    const usuarios = db.prepare('SELECT id, username, nombre, rol, activo FROM usuarios ORDER BY nombre').all();
    res.json({ success: true, usuarios });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function crearUsuario(req, res) {
  const { username, password, nombre, rol } = req.body;
  if (!username || !password || !nombre || !rol) {
    return res.json({ success: false, error: 'Faltam campos requeridos' });
  }
  try {
    const existente = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(username);
    if (existente) return res.json({ success: false, error: 'Usuario ya existe' });
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO usuarios (username, password_hash, nombre, rol, activo) VALUES (?, ?, ?, ?, 1)').run(username, hash, nombre, rol);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function editarUsuario(req, res) {
  const { id } = req.params;
  const { nombre, rol, activo } = req.body;
  if (!nombre || !rol) {
    return res.json({ success: false, error: 'Faltam campos requeridos' });
  }
  try {
    db.prepare('UPDATE usuarios SET nombre = ?, rol = ?, activo = ? WHERE id = ?').run(nombre, rol, activo ? 1 : 0, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function cambiarContrasena(req, res) {
  const { id } = req.params;
  const { password_actual, password_nuevo } = req.body;
  if (!password_actual || !password_nuevo) {
    return res.json({ success: false, error: 'Faltam campos requeridos' });
  }
  try {
    const usuario = db.prepare('SELECT password_hash FROM usuarios WHERE id = ?').get(id);
    if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    if (!bcrypt.compareSync(password_actual, usuario.password_hash)) {
      return res.json({ success: false, error: 'Contraseña actual incorrecta' });
    }
    const hash = bcrypt.hashSync(password_nuevo, 10);
    db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hash, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getUsuarios, crearUsuario, editarUsuario, cambiarContrasena };
```

- [ ] **Step 2: Crear modulo-admin/routes/admin.routes.js**

```js
const router = require('express').Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const ctrl = require('../controllers/admin.controller');

router.get('/', requireAuth, (req, res) => {
  if (req.session.usuario.rol !== 'admin') return res.status(403).send('Acceso denegado');
  res.render('modulo-admin/views/usuarios', { usuario: req.session.usuario });
});

router.get('/api/usuarios', requireAuth, requireRole('admin'), ctrl.getUsuarios);
router.post('/api/usuarios', requireAuth, requireRole('admin'), ctrl.crearUsuario);
router.put('/api/usuarios/:id', requireAuth, requireRole('admin'), ctrl.editarUsuario);
router.post('/api/usuarios/:id/cambiar-contrasena', requireAuth, ctrl.cambiarContrasena);

module.exports = router;
```

- [ ] **Step 3: Verificar que las rutas están registradas**

En `servidor.js`, la línea ya está:
```js
app.use('/admin', require('./modulo-admin/routes/admin.routes'));
```

Nada que hacer aquí.

- [ ] **Step 4: Testear con curl (manualmente)**

```bash
node servidor.js
```

En otra terminal:

```bash
curl -s http://localhost:3000/api/usuarios -H "Cookie: connect.sid=..." 
```

(La sesión puede que no esté disponible sin ir a través del navegador, así que por ahora es esperado que falle autenticación.)

- [ ] **Step 5: Commit**

```bash
git add modulo-admin/controllers/ modulo-admin/routes/
git commit -m "feat: modulo admin backend - CRUD usuarios y cambio de contrasena"
```

---

### Task 8: Módulo Admin — Frontend (vista de usuarios)

**Files:**
- Create: `modulo-admin/views/usuarios.ejs`

- [ ] **Step 1: Crear modulo-admin/views/usuarios.ejs**

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin — Usuarios — Club Médanos Verdes</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:'DM Sans',sans-serif; }
        body { background:#f1f5f9; color:#1e293b; min-height:100vh; }
        .header { background:linear-gradient(135deg,#2d6219 0%,#4a8c2a 100%); padding:24px 32px; box-shadow:0 4px 20px rgba(45,98,25,0.3); }
        .header-container { max-width:1400px; margin:0 auto; display:flex; justify-content:space-between; align-items:center; }
        .header h1 { font-size:24px; color:white; font-weight:700; }
        .header-nav { display:flex; gap:8px; }
        .header-nav a { padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; text-decoration:none; color:rgba(255,255,255,0.85); transition:all .2s; }
        .header-nav a:hover,.header-nav a.active { background:rgba(255,255,255,0.2); color:white; }
        .container { max-width:1400px; margin:0 auto; padding:24px; }
        .card { background:white; border-radius:12px; padding:24px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.06); margin-bottom:20px; }
        .toolbar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:20px; }
        .toolbar input { flex:1; min-width:200px; padding:10px 14px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; }
        .btn { padding:10px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all .2s; }
        .btn-primary { background:#2d6219; color:white; }
        .btn-primary:hover { background:#1a4d12; }
        .btn-secondary { background:#e2e8f0; color:#475569; }
        .btn-secondary:hover { background:#cbd5e1; }
        .btn-danger { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
        .btn-danger:hover { background:#fee2e2; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th { background:#f8fafc; padding:12px; text-align:left; font-weight:600; color:#475569; border-bottom:2px solid #e2e8f0; }
        td { padding:10px 12px; border-bottom:1px solid #f1f5f9; }
        tr:hover td { background:#f8fafc; }
        .badge { display:inline-block; padding:3px 10px; border-radius:6px; font-size:11px; font-weight:600; }
        .badge-admin { background:#fef2f2; color:#dc2626; }
        .badge-recepcion { background:#eff6ff; color:#2563eb; }
        .badge-tesoreria { background:#f0fdf4; color:#059669; }
        .badge-instructor { background:#fef3c7; color:#d97706; }
        .badge-activo { background:#f0fdf4; color:#059669; }
        .badge-inactivo { background:#f5f5f5; color:#6b7280; }
        .empty { text-align:center; padding:40px; color:#94a3b8; }
        .modal-overlay { display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center; }
        .modal-overlay.active { display:flex; }
        .modal { background:white; border-radius:16px; padding:30px; width:90%; max-width:700px; max-height:85vh; overflow-y:auto; }
        .modal h2 { font-size:20px; margin-bottom:20px; color:#0f172a; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .form-group { display:flex; flex-direction:column; gap:4px; }
        .form-group label { font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; }
        .form-group input,.form-group select { padding:8px 12px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; font-family:inherit; }
        .form-full { grid-column:1/-1; }
        .form-actions { display:flex; gap:12px; justify-content:flex-end; margin-top:20px; }
        .action-links { display:flex; gap:8px; }
        .link { color:#2d6219; text-decoration:none; font-weight:600; cursor:pointer; }
        .link:hover { text-decoration:underline; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-container">
            <h1>⚙️ Administración</h1>
            <div class="header-nav">
                <a href="/admin" class="active">Usuarios</a>
                <a href="/dashboard">← Dashboard</a>
                <a href="#" onclick="logout()" style="background:rgba(239,68,68,0.25); color:#fca5a5;">🚪 Salir</a>
            </div>
        </div>
    </div>
    <div class="container">
        <div class="card">
            <div class="toolbar">
                <input type="text" id="busqueda" placeholder="Buscar por usuario o nombre..." onkeydown="if(event.key==='Enter')buscar()">
                <button class="btn btn-primary" onclick="abrirModalNuevo()">+ Nuevo usuario</button>
                <button class="btn btn-secondary" onclick="buscar()">🔍 Buscar</button>
            </div>
            <div id="tabla-container"><div class="empty">Cargando usuarios...</div></div>
        </div>
    </div>

    <!-- Modal: Crear/Editar Usuario -->
    <div class="modal-overlay" id="modalUsuario" onclick="if(event.target===this)cerrarModal()">
        <div class="modal">
            <h2 id="modalTitulo">Nuevo usuario</h2>
            <div class="form-grid">
                <div class="form-group form-full"><label>Usuario</label><input type="text" id="f_username" placeholder="ej: jperez"></div>
                <div class="form-group"><label>Nombre</label><input type="text" id="f_nombre" placeholder="Juan Pérez"></div>
                <div class="form-group"><label>Rol</label><select id="f_rol"><option value="recepcion">Recepción</option><option value="tesoreria">Tesorería</option><option value="instructor">Instructor</option><option value="admin">Admin</option></select></div>
                <div class="form-group form-full"><label>Contraseña</label><input type="password" id="f_password" placeholder="Mínimo 6 caracteres"></div>
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarUsuario()">Guardar</button>
            </div>
        </div>
    </div>

    <!-- Modal: Cambiar Contraseña -->
    <div class="modal-overlay" id="modalCambiarPwd" onclick="if(event.target===this)cerrarModalPwd()">
        <div class="modal">
            <h2>Cambiar contraseña</h2>
            <div class="form-grid">
                <div class="form-group form-full"><label>Contraseña actual</label><input type="password" id="f_pwd_actual"></div>
                <div class="form-group form-full"><label>Nueva contraseña</label><input type="password" id="f_pwd_nueva"></div>
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="cerrarModalPwd()">Cancelar</button>
                <button class="btn btn-primary" onclick="cambiarContraseña()">Cambiar</button>
            </div>
        </div>
    </div>

    <script>
        let usuarioEnEdicion = null;

        async function buscar() {
            const texto = document.getElementById('busqueda').value.toLowerCase();
            try {
                const r = await fetch('/admin/api/usuarios', { credentials:'include' });
                const d = await r.json();
                if (!d.success) throw new Error(d.error);
                const filtrados = d.usuarios.filter(u => u.username.includes(texto) || u.nombre.toLowerCase().includes(texto));
                if (filtrados.length === 0) {
                    document.getElementById('tabla-container').innerHTML = '<div class="empty">No se encontraron usuarios</div>';
                    return;
                }
                const ROLES = { admin:'Admin', recepcion:'Recepción', tesoreria:'Tesorería', instructor:'Instructor' };
                document.getElementById('tabla-container').innerHTML = `
                    <table>
                        <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            ${filtrados.map(u => `<tr>
                                <td><strong>${u.username}</strong></td>
                                <td>${u.nombre}</td>
                                <td><span class="badge badge-${u.rol}">${ROLES[u.rol]}</span></td>
                                <td><span class="badge ${u.activo ? 'badge-activo' : 'badge-inactivo'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
                                <td><div class="action-links">
                                    <a class="link" onclick="editarUsuario(${u.id})">Editar</a>
                                    <a class="link" onclick="cambiarPwd(${u.id})">Pwd</a>
                                </div></td>
                            </tr>`).join('')}
                        </tbody>
                    </table>`;
            } catch (e) {
                document.getElementById('tabla-container').innerHTML = '<div class="empty">Error: '+e.message+'</div>';
            }
        }

        function abrirModalNuevo() {
            usuarioEnEdicion = null;
            document.getElementById('modalTitulo').textContent = 'Nuevo usuario';
            document.getElementById('f_username').value = '';
            document.getElementById('f_nombre').value = '';
            document.getElementById('f_password').value = '';
            document.getElementById('f_rol').value = 'recepcion';
            document.getElementById('f_username').disabled = false;
            document.getElementById('f_password').disabled = false;
            document.getElementById('modalUsuario').classList.add('active');
        }

        async function editarUsuario(id) {
            // Por ahora simplificado - en una versión real traería los datos del usuario
            usuarioEnEdicion = id;
            document.getElementById('modalTitulo').textContent = 'Editar usuario';
            document.getElementById('f_username').disabled = true;
            document.getElementById('f_password').disabled = true;
            document.getElementById('modalUsuario').classList.add('active');
        }

        async function guardarUsuario() {
            const username = document.getElementById('f_username').value.trim();
            const nombre = document.getElementById('f_nombre').value.trim();
            const rol = document.getElementById('f_rol').value;
            const password = document.getElementById('f_password').value;
            if (!username || !nombre || !rol) {
                alert('Faltam campos requeridos');
                return;
            }
            if (!usuarioEnEdicion && !password) {
                alert('Ingresá una contraseña');
                return;
            }
            try {
                const url = usuarioEnEdicion ? `/admin/api/usuarios/${usuarioEnEdicion}` : '/admin/api/usuarios';
                const method = usuarioEnEdicion ? 'PUT' : 'POST';
                const body = usuarioEnEdicion ? { nombre, rol, activo: 1 } : { username, nombre, rol, password };
                const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(body) });
                const d = await r.json();
                if (d.success) {
                    cerrarModal();
                    buscar();
                } else {
                    alert('Error: '+d.error);
                }
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        function cerrarModal() {
            document.getElementById('modalUsuario').classList.remove('active');
        }

        function cambiarPwd(id) {
            usuarioEnEdicion = id;
            document.getElementById('f_pwd_actual').value = '';
            document.getElementById('f_pwd_nueva').value = '';
            document.getElementById('modalCambiarPwd').classList.add('active');
        }

        async function cambiarContraseña() {
            const pwd_actual = document.getElementById('f_pwd_actual').value;
            const pwd_nueva = document.getElementById('f_pwd_nueva').value;
            if (!pwd_actual || !pwd_nueva) {
                alert('Completá los campos');
                return;
            }
            try {
                const r = await fetch(`/admin/api/usuarios/${usuarioEnEdicion}/cambiar-contrasena`, {
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    credentials:'include',
                    body: JSON.stringify({ password_actual: pwd_actual, password_nuevo: pwd_nueva })
                });
                const d = await r.json();
                if (d.success) {
                    cerrarModalPwd();
                    alert('Contraseña cambiada correctamente');
                } else {
                    alert('Error: '+d.error);
                }
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        function cerrarModalPwd() {
            document.getElementById('modalCambiarPwd').classList.remove('active');
        }

        async function logout() {
            await fetch('/api/logout', { method:'POST', credentials:'include' });
            window.location.href = '/login';
        }

        // Cargar usuarios al iniciar
        buscar();
    </script>
</body>
</html>
```

- [ ] **Step 2: Probar en el navegador**

```bash
node servidor.js
```

1. Abrir `http://localhost:3000` → login
2. Entrar con `admin` / `admin123`
3. Click en Dashboard
4. Click en tarjeta Admin → debe ir a `/admin`
5. Ver tabla con el usuario admin
6. Buscar, crear nuevo usuario, editar contraseña

- [ ] **Step 3: Commit**

```bash
git add modulo-admin/views/
git commit -m "feat: modulo admin frontend - vista usuarios con modal"
```

---

---

## Fase 3: Módulo Socios

---

### Task 9: Módulo Socios — Backend (rutas y controlador)

**Files:**
- Create: `modulo-socios/routes/socios.routes.js`
- Create: `modulo-socios/controllers/socios.controller.js`

- [ ] **Step 1: Crear modulo-socios/controllers/socios.controller.js**

```js
const db = require('../../database/db');

async function getDashboard(req, res) {
  try {
    const totalSocios = db.prepare('SELECT COUNT(*) as count FROM socios WHERE estado = "ACTIVO"').get().count;
    const socioDeudasCount = db.prepare('SELECT COUNT(DISTINCT socio_id) as count FROM cuotas WHERE estado IN ("PENDIENTE", "VENCIDA")').get().count;
    res.json({ success: true, totalSocios, socioDeudasCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function buscarSocios(req, res) {
  const { texto, estado } = req.body;
  try {
    let query = 'SELECT s.id, s.numero_socio, s.apellido, s.nombre, s.dni, s.estado, COUNT(DISTINCT sa.actividad_id) as actividades FROM socios s LEFT JOIN socio_actividades sa ON s.id = sa.socio_id WHERE 1=1';
    const params = [];
    if (texto) {
      query += ' AND (s.numero_socio LIKE ? OR s.dni LIKE ? OR s.apellido LIKE ? OR s.nombre LIKE ?)';
      const textoBusq = '%' + texto + '%';
      params.push(textoBusq, textoBusq, textoBusq, textoBusq);
    }
    if (estado) {
      query += ' AND s.estado = ?';
      params.push(estado);
    }
    query += ' GROUP BY s.id ORDER BY s.apellido, s.nombre';
    const socios = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM socios').get().count;
    res.json({ success: true, socios, total });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function obtenerSocio(req, res) {
  const { id } = req.params;
  try {
    const socio = db.prepare('SELECT * FROM socios WHERE id = ?').get(id);
    if (!socio) return res.status(404).json({ success: false, error: 'Socio no encontrado' });
    const actividades = db.prepare('SELECT a.id, a.nombre FROM actividades a JOIN socio_actividades sa ON a.id = sa.actividad_id WHERE sa.socio_id = ? AND sa.fecha_hasta IS NULL').all(id);
    const pagos = db.prepare(`
      SELECT p.id, p.fecha_pago, p.importe, c.periodo FROM pagos p 
      JOIN cuotas c ON p.cuota_id = c.id 
      WHERE p.socio_id = ? 
      ORDER BY p.fecha_pago DESC 
      LIMIT 20
    `).all(id);
    res.json({ success: true, socio, actividades, pagos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function crearSocio(req, res) {
  const { apellido, nombre, dni, telefono, email, domicilio } = req.body;
  if (!apellido || !nombre) {
    return res.json({ success: false, error: 'Faltam apellido y nombre' });
  }
  try {
    const numero = 'S' + Date.now();
    const result = db.prepare(`
      INSERT INTO socios (numero_socio, apellido, nombre, dni, telefono, email, domicilio, estado) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVO')
    `).run(numero, apellido, nombre, dni || null, telefono || null, email || null, domicilio || null);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function editarSocio(req, res) {
  const { id } = req.params;
  const { apellido, nombre, dni, telefono, email, domicilio, estado } = req.body;
  if (!apellido || !nombre) {
    return res.json({ success: false, error: 'Faltam apellido y nombre' });
  }
  try {
    db.prepare(`
      UPDATE socios 
      SET apellido = ?, nombre = ?, dni = ?, telefono = ?, email = ?, domicilio = ?, estado = ? 
      WHERE id = ?
    `).run(apellido, nombre, dni || null, telefono || null, email || null, domicilio || null, estado || 'ACTIVO', id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function asignarActividad(req, res) {
  const { id } = req.params;
  const { actividad_id } = req.body;
  if (!actividad_id) {
    return res.json({ success: false, error: 'Falta actividad_id' });
  }
  try {
    db.prepare('INSERT INTO socio_actividades (socio_id, actividad_id, fecha_desde) VALUES (?, ?, date("now"))').run(id, actividad_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function desasignarActividad(req, res) {
  const { id, actividad_id } = req.params;
  try {
    db.prepare('UPDATE socio_actividades SET fecha_hasta = date("now") WHERE socio_id = ? AND actividad_id = ? AND fecha_hasta IS NULL').run(id, actividad_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getDashboard, buscarSocios, obtenerSocio, crearSocio, editarSocio,
  asignarActividad, desasignarActividad
};
```

- [ ] **Step 2: Crear modulo-socios/routes/socios.routes.js**

```js
const router = require('express').Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const ctrl = require('../controllers/socios.controller');

router.get('/', requireAuth, requireRole('admin', 'recepcion', 'tesoreria'), (req, res) => {
  res.render('modulo-socios/views/socios', { usuario: req.session.usuario });
});

router.get('/legajo/:id', requireAuth, requireRole('admin', 'recepcion', 'tesoreria'), (req, res) => {
  res.render('modulo-socios/views/legajo', { usuario: req.session.usuario, socios_id: req.params.id });
});

router.get('/api/dashboard', requireAuth, requireRole('admin', 'recepcion', 'tesoreria'), ctrl.getDashboard);
router.post('/api/buscar', requireAuth, requireRole('admin', 'recepcion', 'tesoreria'), ctrl.buscarSocios);
router.get('/api/:id', requireAuth, requireRole('admin', 'recepcion', 'tesoreria'), ctrl.obtenerSocio);
router.post('/api', requireAuth, requireRole('admin', 'recepcion'), ctrl.crearSocio);
router.put('/api/:id', requireAuth, requireRole('admin', 'recepcion'), ctrl.editarSocio);
router.post('/api/:id/actividades', requireAuth, requireRole('admin', 'recepcion'), ctrl.asignarActividad);
router.delete('/api/:id/actividades/:actividad_id', requireAuth, requireRole('admin', 'recepcion'), ctrl.desasignarActividad);

module.exports = router;
```

- [ ] **Step 3: Verificar que las rutas están registradas**

En `servidor.js` ya está:
```js
app.use('/socios', require('./modulo-socios/routes/socios.routes'));
```

- [ ] **Step 4: Commit**

```bash
git add modulo-socios/routes/ modulo-socios/controllers/
git commit -m "feat: modulo socios backend - CRUD socios y asignacion de actividades"
```

---

### Task 10: Módulo Socios — Frontend (vistas)

**Files:**
- Create: `modulo-socios/views/socios.ejs`
- Create: `modulo-socios/views/legajo.ejs`

- [ ] **Step 1: Crear modulo-socios/views/socios.ejs**

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Socios — Club Médanos Verdes</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:'DM Sans',sans-serif; }
        body { background:#f1f5f9; color:#1e293b; min-height:100vh; }
        .header { background:linear-gradient(135deg,#2d6219 0%,#4a8c2a 100%); padding:20px 0; box-shadow:0 4px 20px rgba(45,98,25,0.3); }
        .header-container { max-width:1400px; margin:0 auto; padding:0 24px; display:flex; justify-content:space-between; align-items:center; }
        .header h1 { font-size:22px; color:white; font-weight:700; }
        .header-nav { display:flex; gap:6px; }
        .header-nav a { padding:8px 18px; border-radius:8px; font-size:13px; font-weight:600; text-decoration:none; color:rgba(255,255,255,0.8); transition:all .2s; }
        .header-nav a:hover,.header-nav a.active { background:rgba(255,255,255,0.2); color:white; }
        .container { max-width:1400px; margin:0 auto; padding:24px; }
        .card { background:white; border-radius:12px; padding:20px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.06); margin-bottom:20px; }
        .search-bar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:20px; }
        .search-bar input,.search-bar select { padding:10px 14px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; font-family:inherit; }
        .search-bar input { flex:1; min-width:200px; }
        .btn { padding:10px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all .2s; }
        .btn-primary { background:#2d6219; color:white; }
        .btn-primary:hover { background:#1a4d12; }
        .btn-secondary { background:#4aabd8; color:white; }
        .btn-secondary:hover { background:#368fa8; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th { background:#f8fafc; padding:10px 12px; text-align:left; font-weight:600; color:#475569; border-bottom:2px solid #e2e8f0; }
        td { padding:8px 12px; border-bottom:1px solid #f1f5f9; }
        tr:hover td { background:#f8fafc; }
        .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; }
        .badge-activo { background:#f0fdf4; color:#059669; }
        .badge-inactivo { background:#f5f5f5; color:#6b7280; }
        .empty { text-align:center; padding:40px; color:#94a3b8; }
        .link { color:#2d6219; text-decoration:none; font-weight:600; cursor:pointer; }
        .link:hover { text-decoration:underline; }
        .modal-overlay { display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center; }
        .modal-overlay.active { display:flex; }
        .modal { background:white; border-radius:16px; padding:30px; width:90%; max-width:700px; max-height:85vh; overflow-y:auto; }
        .modal h2 { font-size:20px; margin-bottom:20px; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .form-group { display:flex; flex-direction:column; gap:4px; }
        .form-group label { font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; }
        .form-group input,.form-group select { padding:8px 12px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; font-family:inherit; }
        .form-full { grid-column:1/-1; }
        .form-actions { display:flex; gap:12px; justify-content:flex-end; margin-top:20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-container">
            <h1>👥 Socios</h1>
            <div class="header-nav">
                <a href="/socios" class="active">Socios</a>
                <a href="/dashboard">← Sistema</a>
                <a href="#" onclick="logout()" style="background:rgba(239,68,68,0.25); color:#fca5a5;">🚪 Salir</a>
            </div>
        </div>
    </div>
    <div class="container">
        <div class="card">
            <div class="search-bar">
                <input type="text" id="busqueda" placeholder="Buscar por número de socio, DNI, apellido o nombre...">
                <select id="estado">
                    <option value="">Todos los estados</option>
                    <option value="ACTIVO">Activos</option>
                    <option value="INACTIVO">Inactivos</option>
                    <option value="SUSPENDIDO">Suspendidos</option>
                </select>
                <button class="btn btn-secondary" onclick="buscar()">🔍 Buscar</button>
                <button class="btn btn-primary" onclick="abrirModalNuevo()">+ Nuevo socio</button>
            </div>
            <div id="tablaContainer"><div class="empty">Escribí un criterio de búsqueda o hacé click en Buscar</div></div>
        </div>
    </div>

    <!-- Modal: Crear/Editar Socio -->
    <div class="modal-overlay" id="modalSocio" onclick="if(event.target===this)cerrarModal()">
        <div class="modal">
            <h2 id="modalTitulo">Nuevo socio</h2>
            <div class="form-grid">
                <div class="form-group"><label>Apellido</label><input type="text" id="f_apellido"></div>
                <div class="form-group"><label>Nombre</label><input type="text" id="f_nombre"></div>
                <div class="form-group"><label>DNI</label><input type="text" id="f_dni"></div>
                <div class="form-group"><label>Teléfono</label><input type="text" id="f_telefono"></div>
                <div class="form-group"><label>Email</label><input type="email" id="f_email"></div>
                <div class="form-group form-full"><label>Domicilio</label><input type="text" id="f_domicilio"></div>
                <div class="form-group form-full"><label>Estado</label>
                    <select id="f_estado">
                        <option value="ACTIVO">Activo</option>
                        <option value="INACTIVO">Inactivo</option>
                        <option value="SUSPENDIDO">Suspendido</option>
                    </select>
                </div>
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarSocio()">Guardar</button>
            </div>
        </div>
    </div>

    <script>
        let socioEnEdicion = null;

        async function buscar() {
            const texto = document.getElementById('busqueda').value;
            const estado = document.getElementById('estado').value;
            try {
                const r = await fetch('/socios/api/buscar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ texto, estado })
                });
                const d = await r.json();
                if (!d.success) throw new Error(d.error);
                if (d.socios.length === 0) {
                    document.getElementById('tablaContainer').innerHTML = '<div class="empty">No se encontraron socios</div>';
                    return;
                }
                document.getElementById('tablaContainer').innerHTML = `
                    <table>
                        <thead><tr><th>Número</th><th>Apellido, Nombre</th><th>DNI</th><th>Estado</th><th>Actividades</th><th></th></tr></thead>
                        <tbody>
                            ${d.socios.map(s => `<tr>
                                <td><a class="link" href="/socios/legajo/${s.id}">${s.numero_socio}</a></td>
                                <td><a class="link" href="/socios/legajo/${s.id}">${s.apellido}, ${s.nombre}</a></td>
                                <td>${s.dni || '-'}</td>
                                <td><span class="badge ${s.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'}">${s.estado}</span></td>
                                <td>${s.actividades}</td>
                                <td><a class="link" onclick="editarSocio(${s.id})">Editar</a></td>
                            </tr>`).join('')}
                        </tbody>
                    </table>`;
            } catch (e) {
                document.getElementById('tablaContainer').innerHTML = '<div class="empty">Error: '+e.message+'</div>';
            }
        }

        function abrirModalNuevo() {
            socioEnEdicion = null;
            document.getElementById('modalTitulo').textContent = 'Nuevo socio';
            document.getElementById('f_apellido').value = '';
            document.getElementById('f_nombre').value = '';
            document.getElementById('f_dni').value = '';
            document.getElementById('f_telefono').value = '';
            document.getElementById('f_email').value = '';
            document.getElementById('f_domicilio').value = '';
            document.getElementById('f_estado').value = 'ACTIVO';
            document.getElementById('modalSocio').classList.add('active');
        }

        async function editarSocio(id) {
            socioEnEdicion = id;
            try {
                const r = await fetch(`/socios/api/${id}`, { credentials: 'include' });
                const d = await r.json();
                if (!d.success) throw new Error(d.error);
                const s = d.socio;
                document.getElementById('modalTitulo').textContent = 'Editar socio';
                document.getElementById('f_apellido').value = s.apellido;
                document.getElementById('f_nombre').value = s.nombre;
                document.getElementById('f_dni').value = s.dni || '';
                document.getElementById('f_telefono').value = s.telefono || '';
                document.getElementById('f_email').value = s.email || '';
                document.getElementById('f_domicilio').value = s.domicilio || '';
                document.getElementById('f_estado').value = s.estado;
                document.getElementById('modalSocio').classList.add('active');
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        async function guardarSocio() {
            const apellido = document.getElementById('f_apellido').value.trim();
            const nombre = document.getElementById('f_nombre').value.trim();
            const dni = document.getElementById('f_dni').value.trim() || null;
            const telefono = document.getElementById('f_telefono').value.trim() || null;
            const email = document.getElementById('f_email').value.trim() || null;
            const domicilio = document.getElementById('f_domicilio').value.trim() || null;
            const estado = document.getElementById('f_estado').value;
            if (!apellido || !nombre) {
                alert('Apellido y nombre son requeridos');
                return;
            }
            try {
                const url = socioEnEdicion ? `/socios/api/${socioEnEdicion}` : '/socios/api';
                const method = socioEnEdicion ? 'PUT' : 'POST';
                const body = { apellido, nombre, dni, telefono, email, domicilio };
                if (socioEnEdicion) body.estado = estado;
                const r = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(body)
                });
                const d = await r.json();
                if (d.success) {
                    cerrarModal();
                    buscar();
                } else {
                    alert('Error: '+d.error);
                }
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        function cerrarModal() {
            document.getElementById('modalSocio').classList.remove('active');
        }

        async function logout() {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/login';
        }

        buscar();
    </script>
</body>
</html>
```

- [ ] **Step 2: Crear modulo-socios/views/legajo.ejs**

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Legajo — Club Médanos Verdes</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:'DM Sans',sans-serif; }
        body { background:#f1f5f9; color:#1e293b; min-height:100vh; }
        .header { background:linear-gradient(135deg,#2d6219 0%,#4a8c2a 100%); padding:20px 0; box-shadow:0 4px 20px rgba(45,98,25,0.3); }
        .header-container { max-width:1400px; margin:0 auto; padding:0 24px; display:flex; justify-content:space-between; align-items:center; }
        .header h1 { font-size:22px; color:white; font-weight:700; }
        .header-nav a { padding:8px 18px; border-radius:8px; font-size:13px; font-weight:600; text-decoration:none; color:rgba(255,255,255,0.8); transition:all .2s; }
        .header-nav a:hover { background:rgba(255,255,255,0.2); color:white; }
        .container { max-width:1400px; margin:0 auto; padding:24px; }
        .card { background:white; border-radius:12px; padding:20px; border:1px solid #e2e8f0; margin-bottom:20px; }
        .card h2 { font-size:18px; margin-bottom:16px; color:#0f172a; }
        .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .info-item label { display:block; font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; margin-bottom:4px; }
        .info-item { font-size:14px; color:#1e293b; }
        .badge { display:inline-block; padding:3px 10px; border-radius:6px; font-size:11px; font-weight:600; background:#f0fdf4; color:#059669; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th { background:#f8fafc; padding:10px 12px; text-align:left; font-weight:600; color:#475569; border-bottom:2px solid #e2e8f0; }
        td { padding:8px 12px; border-bottom:1px solid #f1f5f9; }
        tr:hover td { background:#f8fafc; }
        .empty { text-align:center; padding:20px; color:#94a3b8; }
        .btn { padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all .2s; }
        .btn-primary { background:#2d6219; color:white; }
        .btn-primary:hover { background:#1a4d12; }
        .btn-danger { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
        .btn-small { padding:4px 12px; font-size:12px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-container">
            <h1>📄 Legajo</h1>
            <div class="header-nav">
                <a href="/socios">← Socios</a>
                <a href="#" onclick="logout()" style="background:rgba(239,68,68,0.25); color:#fca5a5;">🚪 Salir</a>
            </div>
        </div>
    </div>
    <div class="container" id="content">Cargando legajo...</div>

    <script>
        const socioId = <%= socios_id %>;

        async function init() {
            try {
                const r = await fetch(`/socios/api/${socioId}`, { credentials: 'include' });
                const d = await r.json();
                if (!d.success) throw new Error(d.error);
                const s = d.socio;
                const html = `
                    <div class="card">
                        <h2>${s.numero_socio} — ${s.apellido}, ${s.nombre}</h2>
                        <div class="info-grid">
                            <div class="info-item"><label>DNI</label>${s.dni || '—'}</div>
                            <div class="info-item"><label>Teléfono</label>${s.telefono || '—'}</div>
                            <div class="info-item"><label>Email</label>${s.email || '—'}</div>
                            <div class="info-item"><label>Estado</label><span class="badge">${s.estado}</span></div>
                            <div class="info-item"><label>Domicilio</label>${s.domicilio || '—'}</div>
                            <div class="info-item"><label>Fecha alta</label>${s.fecha_alta}</div>
                        </div>
                    </div>
                    <div class="card">
                        <h2>Actividades</h2>
                        ${d.actividades.length > 0 ? `
                            <table>
                                <thead><tr><th>Actividad</th><th></th></tr></thead>
                                <tbody>
                                    ${d.actividades.map(a => `<tr>
                                        <td>${a.nombre}</td>
                                        <td><button class="btn btn-danger btn-small" onclick="desasignarActividad(${a.id})">Quitar</button></td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                        ` : '<div class="empty">Sin actividades asignadas</div>'}
                    </div>
                    <div class="card">
                        <h2>Historial de pagos</h2>
                        ${d.pagos.length > 0 ? `
                            <table>
                                <thead><tr><th>Período</th><th>Fecha de pago</th><th>Importe</th></tr></thead>
                                <tbody>
                                    ${d.pagos.map(p => `<tr><td>${p.periodo}</td><td>${p.fecha_pago}</td><td>$${p.importe}</td></tr>`).join('')}
                                </tbody>
                            </table>
                        ` : '<div class="empty">Sin pagos registrados</div>'}
                    </div>
                `;
                document.getElementById('content').innerHTML = html;
            } catch (e) {
                document.getElementById('content').innerHTML = '<div style="padding:40px; text-align:center; color:#e74c3c;">Error: '+e.message+'</div>';
            }
        }

        async function desasignarActividad(actividadId) {
            if (!confirm('¿Desasignar esta actividad?')) return;
            try {
                const r = await fetch(`/socios/api/${socioId}/actividades/${actividadId}`, { method: 'DELETE', credentials: 'include' });
                const d = await r.json();
                if (d.success) {
                    init();
                } else {
                    alert('Error: '+d.error);
                }
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        async function logout() {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/login';
        }

        init();
    </script>
</body>
</html>
```

- [ ] **Step 3: Probar en el navegador**

```bash
node servidor.js
```

1. Login → Dashboard → Socios
2. Buscar o crear nuevo socio
3. Click en número de socio → ver legajo con datos, actividades e historial de pagos

- [ ] **Step 4: Commit**

```bash
git add modulo-socios/views/
git commit -m "feat: modulo socios frontend - vista socios y legajo"
```

---

---

## Fase 4: Módulo Actividades

---

### Task 11: Módulo Actividades — Backend (rutas y controlador)

**Files:**
- Create: `modulo-actividades/routes/actividades.routes.js`
- Create: `modulo-actividades/controllers/actividades.controller.js`

- [ ] **Step 1: Crear modulo-actividades/controllers/actividades.controller.js**

```js
const db = require('../../database/db');

async function obtenerActividades(req, res) {
  try {
    const actividades = db.prepare('SELECT * FROM actividades WHERE activo = 1 ORDER BY nombre').all();
    res.json({ success: true, actividades });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function obtenerActividad(req, res) {
  const { id } = req.params;
  try {
    const actividad = db.prepare('SELECT * FROM actividades WHERE id = ?').get(id);
    if (!actividad) return res.status(404).json({ success: false, error: 'Actividad no encontrada' });
    const instructores = db.prepare('SELECT i.id, i.apellido, i.nombre FROM instructores i JOIN instructor_actividades ia ON i.id = ia.instructor_id WHERE ia.actividad_id = ?').all(id);
    const socios = db.prepare('SELECT COUNT(*) as count FROM socio_actividades WHERE actividad_id = ? AND fecha_hasta IS NULL').get(id).count;
    res.json({ success: true, actividad, instructores, socios });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function crearActividad(req, res) {
  const { nombre, descripcion, dias_horario, precio_base } = req.body;
  if (!nombre) {
    return res.json({ success: false, error: 'El nombre es requerido' });
  }
  try {
    const result = db.prepare('INSERT INTO actividades (nombre, descripcion, dias_horario, precio_base, activo) VALUES (?, ?, ?, ?, 1)').run(
      nombre, descripcion || null, dias_horario || null, precio_base || 0
    );
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function editarActividad(req, res) {
  const { id } = req.params;
  const { nombre, descripcion, dias_horario, precio_base, activo } = req.body;
  if (!nombre) {
    return res.json({ success: false, error: 'El nombre es requerido' });
  }
  try {
    db.prepare('UPDATE actividades SET nombre = ?, descripcion = ?, dias_horario = ?, precio_base = ?, activo = ? WHERE id = ?').run(
      nombre, descripcion || null, dias_horario || null, precio_base || 0, activo ? 1 : 0, id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function asignarInstructor(req, res) {
  const { id } = req.params;
  const { instructor_id } = req.body;
  if (!instructor_id) {
    return res.json({ success: false, error: 'Falta instructor_id' });
  }
  try {
    db.prepare('INSERT OR IGNORE INTO instructor_actividades (instructor_id, actividad_id) VALUES (?, ?)').run(instructor_id, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function desasignarInstructor(req, res) {
  const { id, instructor_id } = req.params;
  try {
    db.prepare('DELETE FROM instructor_actividades WHERE instructor_id = ? AND actividad_id = ?').run(instructor_id, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerActividades, obtenerActividad, crearActividad, editarActividad,
  asignarInstructor, desasignarInstructor
};
```

- [ ] **Step 2: Crear modulo-actividades/routes/actividades.routes.js**

```js
const router = require('express').Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const ctrl = require('../controllers/actividades.controller');

router.get('/', requireAuth, requireRole('admin', 'recepcion', 'instructor'), (req, res) => {
  res.render('modulo-actividades/views/actividades', { usuario: req.session.usuario });
});

router.get('/api', requireAuth, requireRole('admin', 'recepcion', 'instructor'), ctrl.obtenerActividades);
router.get('/api/:id', requireAuth, requireRole('admin', 'recepcion', 'instructor'), ctrl.obtenerActividad);
router.post('/api', requireAuth, requireRole('admin'), ctrl.crearActividad);
router.put('/api/:id', requireAuth, requireRole('admin'), ctrl.editarActividad);
router.post('/api/:id/instructores', requireAuth, requireRole('admin'), ctrl.asignarInstructor);
router.delete('/api/:id/instructores/:instructor_id', requireAuth, requireRole('admin'), ctrl.desasignarInstructor);

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add modulo-actividades/routes/ modulo-actividades/controllers/
git commit -m "feat: modulo actividades backend - CRUD actividades e asignacion de instructores"
```

---

### Task 12: Módulo Actividades — Frontend (vista)

**Files:**
- Create: `modulo-actividades/views/actividades.ejs`

- [ ] **Step 1: Crear modulo-actividades/views/actividades.ejs**

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Actividades — Club Médanos Verdes</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:'DM Sans',sans-serif; }
        body { background:#f1f5f9; color:#1e293b; min-height:100vh; }
        .header { background:linear-gradient(135deg,#0891b2 0%,#06b6d4 100%); padding:20px 0; box-shadow:0 4px 20px rgba(8,145,178,0.3); }
        .header-container { max-width:1400px; margin:0 auto; padding:0 24px; display:flex; justify-content:space-between; align-items:center; }
        .header h1 { font-size:22px; color:white; font-weight:700; }
        .header-nav { display:flex; gap:6px; }
        .header-nav a { padding:8px 18px; border-radius:8px; font-size:13px; font-weight:600; text-decoration:none; color:rgba(255,255,255,0.8); transition:all .2s; }
        .header-nav a:hover,.header-nav a.active { background:rgba(255,255,255,0.2); color:white; }
        .container { max-width:1400px; margin:0 auto; padding:24px; }
        .card { background:white; border-radius:12px; padding:20px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.06); margin-bottom:20px; }
        .toolbar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:20px; }
        .toolbar input { flex:1; min-width:200px; padding:10px 14px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; }
        .btn { padding:10px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all .2s; }
        .btn-primary { background:#0891b2; color:white; }
        .btn-primary:hover { background:#0e7490; }
        .btn-secondary { background:#4aabd8; color:white; }
        .grid-actividades { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; margin-bottom:20px; }
        .activity-card { background:white; border:1.5px solid #e2e8f0; border-radius:12px; padding:16px; cursor:pointer; transition:all .2s; position:relative; overflow:hidden; }
        .activity-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#0891b2,#22d3ee); }
        .activity-card:hover { transform:translateY(-4px); box-shadow:0 8px 24px rgba(0,0,0,0.1); border-color:rgba(8,145,178,0.4); }
        .activity-name { font-size:16px; font-weight:700; color:#0f172a; margin-bottom:6px; }
        .activity-info { font-size:12px; color:#64748b; line-height:1.4; margin-bottom:10px; }
        .activity-stats { display:flex; gap:12px; font-size:12px; margin-bottom:12px; }
        .stat { display:flex; flex-direction:column; }
        .stat-label { color:#94a3b8; font-size:11px; }
        .stat-value { font-weight:600; color:#0f172a; }
        .activity-actions { display:flex; gap:8px; }
        .btn-small { padding:6px 12px; font-size:12px; }
        .btn-edit { background:#0891b2; color:white; }
        .btn-edit:hover { background:#0e7490; }
        .btn-danger { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
        .empty { text-align:center; padding:40px; color:#94a3b8; }
        .modal-overlay { display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center; }
        .modal-overlay.active { display:flex; }
        .modal { background:white; border-radius:16px; padding:30px; width:90%; max-width:700px; max-height:85vh; overflow-y:auto; }
        .modal h2 { font-size:20px; margin-bottom:20px; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .form-group { display:flex; flex-direction:column; gap:4px; }
        .form-group label { font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; }
        .form-group input,.form-group textarea,.form-group select { padding:8px 12px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; font-family:inherit; }
        .form-full { grid-column:1/-1; }
        .form-actions { display:flex; gap:12px; justify-content:flex-end; margin-top:20px; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th { background:#f8fafc; padding:10px 12px; text-align:left; font-weight:600; color:#475569; border-bottom:2px solid #e2e8f0; }
        td { padding:8px 12px; border-bottom:1px solid #f1f5f9; }
        tr:hover td { background:#f8fafc; }
        .link { color:#0891b2; text-decoration:none; font-weight:600; cursor:pointer; }
        .link:hover { text-decoration:underline; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-container">
            <h1>🏊 Actividades</h1>
            <div class="header-nav">
                <a href="/actividades" class="active">Actividades</a>
                <a href="/dashboard">← Sistema</a>
                <a href="#" onclick="logout()" style="background:rgba(239,68,68,0.25); color:#fca5a5;">🚪 Salir</a>
            </div>
        </div>
    </div>
    <div class="container">
        <div class="card">
            <div class="toolbar">
                <input type="text" id="busqueda" placeholder="Buscar actividades..." onkeydown="if(event.key==='Enter')buscar()">
                <button class="btn btn-secondary" onclick="buscar()">🔍 Buscar</button>
                <% if (usuario.rol === 'admin') { %>
                    <button class="btn btn-primary" onclick="abrirModalNuevo()">+ Nueva actividad</button>
                <% } %>
            </div>
            <div id="grid-container" class="grid-actividades"></div>
        </div>
    </div>

    <!-- Modal: Crear/Editar Actividad -->
    <div class="modal-overlay" id="modalActividad" onclick="if(event.target===this)cerrarModal()">
        <div class="modal">
            <h2 id="modalTitulo">Nueva actividad</h2>
            <div class="form-grid">
                <div class="form-group form-full"><label>Nombre</label><input type="text" id="f_nombre"></div>
                <div class="form-group form-full"><label>Descripción</label><textarea id="f_descripcion" rows="3"></textarea></div>
                <div class="form-group"><label>Días y horarios</label><input type="text" id="f_dias_horario" placeholder="Ej: Lunes, miércoles y viernes 19-20hs"></div>
                <div class="form-group"><label>Precio base ($)</label><input type="number" id="f_precio_base" min="0" step="0.01"></div>
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarActividad()">Guardar</button>
            </div>
        </div>
    </div>

    <script>
        let actividadEnEdicion = null;

        async function buscar() {
            const texto = document.getElementById('busqueda').value.toLowerCase();
            try {
                const r = await fetch('/actividades/api', { credentials: 'include' });
                const d = await r.json();
                if (!d.success) throw new Error(d.error);
                const filtradas = d.actividades.filter(a => a.nombre.toLowerCase().includes(texto));
                if (filtradas.length === 0) {
                    document.getElementById('grid-container').innerHTML = '<div class="empty" style="grid-column:1/-1;">No se encontraron actividades</div>';
                    return;
                }
                const html = filtradas.map(a => `
                    <div class="activity-card">
                        <div class="activity-name">${a.nombre}</div>
                        <div class="activity-info">${a.descripcion || 'Sin descripción'}</div>
                        <div class="activity-stats">
                            <div class="stat"><span class="stat-label">Horarios</span><span class="stat-value">${a.dias_horario || '—'}</span></div>
                            <div class="stat"><span class="stat-label">Precio</span><span class="stat-value">$${a.precio_base || '—'}</span></div>
                        </div>
                        <div class="activity-actions">
                            <a class="btn btn-edit btn-small" onclick="abrirDetalle(${a.id})">Ver</a>
                            <% if (usuario.rol === 'admin') { %>
                                <a class="btn btn-edit btn-small" onclick="editarActividad(${a.id})">Editar</a>
                            <% } %>
                        </div>
                    </div>
                `).join('');
                document.getElementById('grid-container').innerHTML = html;
            } catch (e) {
                document.getElementById('grid-container').innerHTML = '<div class="empty" style="grid-column:1/-1;">Error: '+e.message+'</div>';
            }
        }

        function abrirModalNuevo() {
            actividadEnEdicion = null;
            document.getElementById('modalTitulo').textContent = 'Nueva actividad';
            document.getElementById('f_nombre').value = '';
            document.getElementById('f_descripcion').value = '';
            document.getElementById('f_dias_horario').value = '';
            document.getElementById('f_precio_base').value = '';
            document.getElementById('modalActividad').classList.add('active');
        }

        async function editarActividad(id) {
            actividadEnEdicion = id;
            try {
                const r = await fetch(`/actividades/api/${id}`, { credentials: 'include' });
                const d = await r.json();
                if (!d.success) throw new Error(d.error);
                const a = d.actividad;
                document.getElementById('modalTitulo').textContent = 'Editar actividad';
                document.getElementById('f_nombre').value = a.nombre;
                document.getElementById('f_descripcion').value = a.descripcion || '';
                document.getElementById('f_dias_horario').value = a.dias_horario || '';
                document.getElementById('f_precio_base').value = a.precio_base || 0;
                document.getElementById('modalActividad').classList.add('active');
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        async function guardarActividad() {
            const nombre = document.getElementById('f_nombre').value.trim();
            const descripcion = document.getElementById('f_descripcion').value.trim() || null;
            const dias_horario = document.getElementById('f_dias_horario').value.trim() || null;
            const precio_base = parseFloat(document.getElementById('f_precio_base').value) || 0;
            if (!nombre) {
                alert('El nombre es requerido');
                return;
            }
            try {
                const url = actividadEnEdicion ? `/actividades/api/${actividadEnEdicion}` : '/actividades/api';
                const method = actividadEnEdicion ? 'PUT' : 'POST';
                const r = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ nombre, descripcion, dias_horario, precio_base })
                });
                const d = await r.json();
                if (d.success) {
                    cerrarModal();
                    buscar();
                } else {
                    alert('Error: '+d.error);
                }
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        function cerrarModal() {
            document.getElementById('modalActividad').classList.remove('active');
        }

        async function abrirDetalle(id) {
            try {
                const r = await fetch(`/actividades/api/${id}`, { credentials: 'include' });
                const d = await r.json();
                if (!d.success) throw new Error(d.error);
                const a = d.actividad;
                alert(`${a.nombre}\n\n${a.descripcion || '—'}\n\nHorarios: ${a.dias_horario || '—'}\nPrecio: $${a.precio_base}\n\nInstructores: ${d.instructores.length > 0 ? d.instructores.map(i => i.apellido + ', ' + i.nombre).join('; ') : 'Sin asignar'}\nSocios: ${d.socios}`);
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        async function logout() {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/login';
        }

        buscar();
    </script>
</body>
</html>
```

- [ ] **Step 2: Probar en el navegador**

```bash
node servidor.js
```

1. Login con `admin` / `admin123`
2. Dashboard → Actividades
3. Ver grid de actividades (vacío inicialmente)
4. Click "+ Nueva actividad" → crear actividad
5. Buscar actividad creada
6. Click "Ver" → mostrar detalles

- [ ] **Step 3: Commit**

```bash
git add modulo-actividades/views/
git commit -m "feat: modulo actividades frontend - grid de actividades con modal"
```

---

---

## Fase 5: Módulo Instructores + Liquidaciones

---

### Task 13: Lógica de liquidaciones + tests

**Files:**
- Create: `modulo-instructores/services/liquidacion.js`
- Create: `tests/liquidacion.test.js`

- [ ] **Step 1: Escribir tests que fallan**

Crear `tests/liquidacion.test.js`:

```js
const { calcularLiquidacion } = require('../modulo-instructores/services/liquidacion');

describe('calcularLiquidacion', () => {
  test('contrato FIJO: devuelve monto_fijo', () => {
    const instructor = { tipo_contrato: 'fijo', monto_fijo: 5000 };
    const result = calcularLiquidacion(instructor, {});
    expect(result).toBe(5000);
  });

  test('contrato POR_HORA: calcula horas * tarifa', () => {
    const instructor = { tipo_contrato: 'por_hora', valor_hora: 500 };
    const extras = { horas: 10 };
    const result = calcularLiquidacion(instructor, extras);
    expect(result).toBe(5000);
  });

  test('contrato POR_ALUMNO: calcula alumnos * tarifa', () => {
    const instructor = { tipo_contrato: 'por_alumno', valor_por_alumno: 100 };
    const extras = { alumnos: 25 };
    const result = calcularLiquidacion(instructor, extras);
    expect(result).toBe(2500);
  });

  test('contrato COMBINADO: fijo + (horas * valor_hora) + (alumnos * valor_por_alumno)', () => {
    const instructor = {
      tipo_contrato: 'combinado',
      monto_fijo: 2000,
      valor_hora: 300,
      valor_por_alumno: 50
    };
    const extras = { horas: 5, alumnos: 30 };
    const result = calcularLiquidacion(instructor, extras);
    // 2000 + (5 * 300) + (30 * 50) = 2000 + 1500 + 1500 = 5000
    expect(result).toBe(5000);
  });

  test('por_hora sin horas: devuelve 0', () => {
    const instructor = { tipo_contrato: 'por_hora', valor_hora: 500 };
    const result = calcularLiquidacion(instructor, {});
    expect(result).toBe(0);
  });

  test('por_alumno sin alumnos: devuelve 0', () => {
    const instructor = { tipo_contrato: 'por_alumno', valor_por_alumno: 100 };
    const result = calcularLiquidacion(instructor, {});
    expect(result).toBe(0);
  });
});
```

- [ ] **Step 2: Correr tests — verificar que fallan**

```bash
npx jest tests/liquidacion.test.js
```

Esperado: FAIL — `Cannot find module '../modulo-instructores/services/liquidacion'`

- [ ] **Step 3: Crear modulo-instructores/services/liquidacion.js**

```js
function calcularLiquidacion(instructor, extras = {}) {
  const { tipo_contrato, monto_fijo = 0, valor_hora = 0, valor_por_alumno = 0 } = instructor;
  const { horas = 0, alumnos = 0 } = extras;

  switch (tipo_contrato) {
    case 'fijo':
      return monto_fijo;
    case 'por_hora':
      return horas * valor_hora;
    case 'por_alumno':
      return alumnos * valor_por_alumno;
    case 'combinado':
      return monto_fijo + (horas * valor_hora) + (alumnos * valor_por_alumno);
    default:
      return 0;
  }
}

module.exports = { calcularLiquidacion };
```

- [ ] **Step 4: Correr tests — verificar que pasan**

```bash
npx jest tests/liquidacion.test.js
```

Esperado: PASS — 7 tests en verde.

- [ ] **Step 5: Commit**

```bash
git add modulo-instructores/services/ tests/liquidacion.test.js
git commit -m "feat: logica de calculo de liquidaciones con tests"
```

---

### Task 14: Módulo Instructores — Backend (rutas y controlador)

**Files:**
- Create: `modulo-instructores/routes/instructores.routes.js`
- Create: `modulo-instructores/controllers/instructores.controller.js`

- [ ] **Step 1: Crear modulo-instructores/controllers/instructores.controller.js**

```js
const db = require('../../database/db');
const { calcularLiquidacion } = require('../services/liquidacion');

async function obtenerInstructores(req, res) {
  try {
    const instructores = db.prepare('SELECT * FROM instructores WHERE activo = 1 ORDER BY apellido').all();
    res.json({ success: true, instructores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function obtenerInstructor(req, res) {
  const { id } = req.params;
  try {
    const instructor = db.prepare('SELECT * FROM instructores WHERE id = ?').get(id);
    if (!instructor) return res.status(404).json({ success: false, error: 'Instructor no encontrado' });
    const actividades = db.prepare('SELECT a.id, a.nombre FROM actividades a JOIN instructor_actividades ia ON a.id = ia.actividad_id WHERE ia.instructor_id = ?').all(id);
    res.json({ success: true, instructor, actividades });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function crearInstructor(req, res) {
  const { apellido, nombre, tipo_contrato, monto_fijo, valor_hora, valor_por_alumno, telefono, email } = req.body;
  if (!apellido || !nombre || !tipo_contrato) {
    return res.json({ success: false, error: 'Faltam campos requeridos' });
  }
  try {
    const result = db.prepare(`
      INSERT INTO instructores (apellido, nombre, tipo_contrato, monto_fijo, valor_hora, valor_por_alumno, telefono, email, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(apellido, nombre, tipo_contrato, monto_fijo || 0, valor_hora || 0, valor_por_alumno || 0, telefono || null, email || null);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function editarInstructor(req, res) {
  const { id } = req.params;
  const { apellido, nombre, tipo_contrato, monto_fijo, valor_hora, valor_por_alumno, telefono, email, activo } = req.body;
  if (!apellido || !nombre || !tipo_contrato) {
    return res.json({ success: false, error: 'Faltam campos requeridos' });
  }
  try {
    db.prepare(`
      UPDATE instructores 
      SET apellido = ?, nombre = ?, tipo_contrato = ?, monto_fijo = ?, valor_hora = ?, valor_por_alumno = ?, telefono = ?, email = ?, activo = ?
      WHERE id = ?
    `).run(apellido, nombre, tipo_contrato, monto_fijo || 0, valor_hora || 0, valor_por_alumno || 0, telefono || null, email || null, activo ? 1 : 0, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function asignarActividad(req, res) {
  const { id } = req.params;
  const { actividad_id } = req.body;
  if (!actividad_id) {
    return res.json({ success: false, error: 'Falta actividad_id' });
  }
  try {
    db.prepare('INSERT OR IGNORE INTO instructor_actividades (instructor_id, actividad_id) VALUES (?, ?)').run(id, actividad_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function desasignarActividad(req, res) {
  const { id, actividad_id } = req.params;
  try {
    db.prepare('DELETE FROM instructor_actividades WHERE instructor_id = ? AND actividad_id = ?').run(id, actividad_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function obtenerLiquidaciones(req, res) {
  try {
    const liquidaciones = db.prepare(`
      SELECT l.*, i.apellido, i.nombre FROM liquidaciones l
      JOIN instructores i ON l.instructor_id = i.id
      ORDER BY l.periodo DESC
      LIMIT 50
    `).all();
    res.json({ success: true, liquidaciones });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function calcularLiquidacionesDelMes(req, res) {
  const { periodo } = req.body;
  if (!periodo) {
    return res.json({ success: false, error: 'Falta periodo (formato: YYYY-MM)' });
  }
  try {
    const instructores = db.prepare('SELECT * FROM instructores WHERE activo = 1').all();
    let generadas = 0;
    instructores.forEach(i => {
      const extras = {};
      if (i.tipo_contrato === 'por_hora' || i.tipo_contrato === 'combinado') {
        extras.horas = 20; // Simplificado: asumir 20 horas por mes
      }
      if (i.tipo_contrato === 'por_alumno' || i.tipo_contrato === 'combinado') {
        const alumnos = db.prepare(`
          SELECT COUNT(DISTINCT socio_id) as count FROM socio_actividades sa
          JOIN instructor_actividades ia ON sa.actividad_id = ia.actividad_id
          WHERE ia.instructor_id = ?
        `).get(i.id).count;
        extras.alumnos = alumnos;
      }
      const monto = calcularLiquidacion(i, extras);
      const detalle = JSON.stringify(extras);
      db.prepare(`
        INSERT OR REPLACE INTO liquidaciones (instructor_id, periodo, monto_calculado, estado, detalle_json)
        VALUES (?, ?, ?, 'BORRADOR', ?)
      `).run(i.id, periodo, monto, detalle);
      generadas++;
    });
    res.json({ success: true, generadas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function aprobarLiquidacion(req, res) {
  const { id } = req.params;
  try {
    db.prepare('UPDATE liquidaciones SET estado = ? WHERE id = ?').run('APROBADA', id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function pagarLiquidacion(req, res) {
  const { id } = req.params;
  try {
    const liq = db.prepare('SELECT * FROM liquidaciones WHERE id = ?').get(id);
    if (!liq) return res.status(404).json({ success: false, error: 'Liquidacion no encontrada' });
    db.prepare('UPDATE liquidaciones SET estado = ?, monto_pagado = ?, fecha_pago = date("now") WHERE id = ?').run('PAGADA', liq.monto_calculado, id);
    db.prepare('INSERT INTO movimientos_caja (tipo, concepto, importe, referencia_id, referencia_tipo) VALUES (?, ?, ?, ?, ?)').run(
      'egreso',
      'Pago liquidacion ' + liq.periodo,
      liq.monto_calculado,
      id,
      'liquidacion'
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerInstructores, obtenerInstructor, crearInstructor, editarInstructor,
  asignarActividad, desasignarActividad,
  obtenerLiquidaciones, calcularLiquidacionesDelMes, aprobarLiquidacion, pagarLiquidacion
};
```

- [ ] **Step 2: Crear modulo-instructores/routes/instructores.routes.js**

```js
const router = require('express').Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const ctrl = require('../controllers/instructores.controller');

router.get('/', requireAuth, requireRole('admin', 'recepcion', 'tesoreria', 'instructor'), (req, res) => {
  res.render('modulo-instructores/views/instructores', { usuario: req.session.usuario });
});

router.get('/liquidaciones', requireAuth, requireRole('admin', 'tesoreria'), (req, res) => {
  res.render('modulo-instructores/views/liquidaciones', { usuario: req.session.usuario });
});

router.get('/api', requireAuth, requireRole('admin', 'recepcion', 'tesoreria', 'instructor'), ctrl.obtenerInstructores);
router.get('/api/:id', requireAuth, requireRole('admin', 'recepcion', 'tesoreria', 'instructor'), ctrl.obtenerInstructor);
router.post('/api', requireAuth, requireRole('admin'), ctrl.crearInstructor);
router.put('/api/:id', requireAuth, requireRole('admin'), ctrl.editarInstructor);
router.post('/api/:id/actividades', requireAuth, requireRole('admin'), ctrl.asignarActividad);
router.delete('/api/:id/actividades/:actividad_id', requireAuth, requireRole('admin'), ctrl.desasignarActividad);

router.get('/api/liquidaciones/list', requireAuth, requireRole('admin', 'tesoreria'), ctrl.obtenerLiquidaciones);
router.post('/api/liquidaciones/calcular', requireAuth, requireRole('admin'), ctrl.calcularLiquidacionesDelMes);
router.post('/api/liquidaciones/:id/aprobar', requireAuth, requireRole('admin'), ctrl.aprobarLiquidacion);
router.post('/api/liquidaciones/:id/pagar', requireAuth, requireRole('admin', 'tesoreria'), ctrl.pagarLiquidacion);

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add modulo-instructores/routes/ modulo-instructores/controllers/
git commit -m "feat: modulo instructores backend - CRUD y liquidaciones"
```

---

### Task 15: Módulo Instructores — Frontend (vistas)

**Files:**
- Create: `modulo-instructores/views/instructores.ejs`
- Create: `modulo-instructores/views/liquidaciones.ejs`

- [ ] **Step 1: Crear modulo-instructores/views/instructores.ejs**

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instructores — Club Médanos Verdes</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:'DM Sans',sans-serif; }
        body { background:#f1f5f9; color:#1e293b; min-height:100vh; }
        .header { background:linear-gradient(135deg,#7a8c2e 0%,#a3b542 100%); padding:20px 0; box-shadow:0 4px 20px rgba(122,140,46,0.3); }
        .header-container { max-width:1400px; margin:0 auto; padding:0 24px; display:flex; justify-content:space-between; align-items:center; }
        .header h1 { font-size:22px; color:white; font-weight:700; }
        .header-nav { display:flex; gap:6px; }
        .header-nav a { padding:8px 18px; border-radius:8px; font-size:13px; font-weight:600; text-decoration:none; color:rgba(255,255,255,0.8); transition:all .2s; }
        .header-nav a:hover,.header-nav a.active { background:rgba(255,255,255,0.2); color:white; }
        .container { max-width:1400px; margin:0 auto; padding:24px; }
        .card { background:white; border-radius:12px; padding:20px; border:1px solid #e2e8f0; margin-bottom:20px; }
        .toolbar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:20px; }
        .toolbar input { flex:1; min-width:200px; padding:10px 14px; border:1px solid #e2e8f0; border-radius:8px; }
        .btn { padding:10px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all .2s; }
        .btn-primary { background:#7a8c2e; color:white; }
        .btn-primary:hover { background:#5f6f24; }
        .btn-secondary { background:#a3b542; color:white; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th { background:#f8fafc; padding:10px 12px; text-align:left; font-weight:600; border-bottom:2px solid #e2e8f0; }
        td { padding:8px 12px; border-bottom:1px solid #f1f5f9; }
        tr:hover td { background:#f8fafc; }
        .badge { display:inline-block; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:600; background:#fef3c7; color:#92400e; }
        .empty { text-align:center; padding:40px; color:#94a3b8; }
        .link { color:#7a8c2e; text-decoration:none; font-weight:600; cursor:pointer; }
        .link:hover { text-decoration:underline; }
        .modal-overlay { display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center; }
        .modal-overlay.active { display:flex; }
        .modal { background:white; border-radius:16px; padding:30px; width:90%; max-width:700px; max-height:85vh; overflow-y:auto; }
        .modal h2 { font-size:20px; margin-bottom:20px; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .form-group { display:flex; flex-direction:column; gap:4px; }
        .form-group label { font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; }
        .form-group input,.form-group select { padding:8px 12px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; font-family:inherit; }
        .form-full { grid-column:1/-1; }
        .form-actions { display:flex; gap:12px; justify-content:flex-end; margin-top:20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-container">
            <h1>🏋️ Instructores</h1>
            <div class="header-nav">
                <a href="/instructores" class="active">Instructores</a>
                <% if (usuario.rol === 'admin' || usuario.rol === 'tesoreria') { %>
                    <a href="/instructores/liquidaciones">Liquidaciones</a>
                <% } %>
                <a href="/dashboard">← Sistema</a>
                <a href="#" onclick="logout()" style="background:rgba(239,68,68,0.25); color:#fca5a5;">🚪 Salir</a>
            </div>
        </div>
    </div>
    <div class="container">
        <div class="card">
            <div class="toolbar">
                <input type="text" id="busqueda" placeholder="Buscar por apellido o nombre..." onkeydown="if(event.key==='Enter')buscar()">
                <button class="btn btn-secondary" onclick="buscar()">🔍 Buscar</button>
                <% if (usuario.rol === 'admin') { %>
                    <button class="btn btn-primary" onclick="abrirModalNuevo()">+ Nuevo instructor</button>
                <% } %>
            </div>
            <div id="tablaContainer"><div class="empty">Cargando instructores...</div></div>
        </div>
    </div>

    <!-- Modal: Crear/Editar Instructor -->
    <div class="modal-overlay" id="modalInstructor" onclick="if(event.target===this)cerrarModal()">
        <div class="modal">
            <h2 id="modalTitulo">Nuevo instructor</h2>
            <div class="form-grid">
                <div class="form-group"><label>Apellido</label><input type="text" id="f_apellido"></div>
                <div class="form-group"><label>Nombre</label><input type="text" id="f_nombre"></div>
                <div class="form-group form-full"><label>Tipo de contrato</label>
                    <select id="f_tipo_contrato" onchange="mostrarCamposContrato()">
                        <option value="fijo">Fijo mensual</option>
                        <option value="por_hora">Por hora</option>
                        <option value="por_alumno">Por alumno</option>
                        <option value="combinado">Combinado</option>
                    </select>
                </div>
                <div class="form-group" id="campo_monto_fijo" style="display:block;"><label>Monto fijo ($)</label><input type="number" id="f_monto_fijo" step="0.01"></div>
                <div class="form-group" id="campo_valor_hora" style="display:none;"><label>Valor/hora ($)</label><input type="number" id="f_valor_hora" step="0.01"></div>
                <div class="form-group" id="campo_valor_alumno" style="display:none;"><label>Valor/alumno ($)</label><input type="number" id="f_valor_por_alumno" step="0.01"></div>
                <div class="form-group"><label>Teléfono</label><input type="text" id="f_telefono"></div>
                <div class="form-group"><label>Email</label><input type="email" id="f_email"></div>
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarInstructor()">Guardar</button>
            </div>
        </div>
    </div>

    <script>
        let instructorEnEdicion = null;

        async function buscar() {
            const texto = document.getElementById('busqueda').value.toLowerCase();
            try {
                const r = await fetch('/instructores/api', { credentials: 'include' });
                const d = await r.json();
                if (!d.success) throw new Error(d.error);
                const filtrados = d.instructores.filter(i => i.apellido.toLowerCase().includes(texto) || i.nombre.toLowerCase().includes(texto));
                if (filtrados.length === 0) {
                    document.getElementById('tablaContainer').innerHTML = '<div class="empty">No se encontraron instructores</div>';
                    return;
                }
                const TIPOS = { fijo:'Fijo', por_hora:'Por hora', por_alumno:'Por alumno', combinado:'Combinado' };
                document.getElementById('tablaContainer').innerHTML = `
                    <table>
                        <thead><tr><th>Apellido, Nombre</th><th>Tipo contrato</th><th>Montos</th><th>Contacto</th><th></th></tr></thead>
                        <tbody>
                            ${filtrados.map(i => `<tr>
                                <td>${i.apellido}, ${i.nombre}</td>
                                <td><span class="badge">${TIPOS[i.tipo_contrato]}</span></td>
                                <td style="font-size:11px;">Fijo: $${i.monto_fijo || '—'}<br>Hora: $${i.valor_hora || '—'}<br>Alumno: $${i.valor_por_alumno || '—'}</td>
                                <td>${i.email || i.telefono || '—'}</td>
                                <td><a class="link" onclick="editarInstructor(${i.id})">Editar</a></td>
                            </tr>`).join('')}
                        </tbody>
                    </table>`;
            } catch (e) {
                document.getElementById('tablaContainer').innerHTML = '<div class="empty">Error: '+e.message+'</div>';
            }
        }

        function mostrarCamposContrato() {
            const tipo = document.getElementById('f_tipo_contrato').value;
            document.getElementById('campo_monto_fijo').style.display = (tipo === 'fijo' || tipo === 'combinado') ? 'block' : 'none';
            document.getElementById('campo_valor_hora').style.display = (tipo === 'por_hora' || tipo === 'combinado') ? 'block' : 'none';
            document.getElementById('campo_valor_alumno').style.display = (tipo === 'por_alumno' || tipo === 'combinado') ? 'block' : 'none';
        }

        function abrirModalNuevo() {
            instructorEnEdicion = null;
            document.getElementById('modalTitulo').textContent = 'Nuevo instructor';
            document.getElementById('f_apellido').value = '';
            document.getElementById('f_nombre').value = '';
            document.getElementById('f_tipo_contrato').value = 'fijo';
            document.getElementById('f_monto_fijo').value = '';
            document.getElementById('f_valor_hora').value = '';
            document.getElementById('f_valor_por_alumno').value = '';
            document.getElementById('f_telefono').value = '';
            document.getElementById('f_email').value = '';
            mostrarCamposContrato();
            document.getElementById('modalInstructor').classList.add('active');
        }

        async function editarInstructor(id) {
            instructorEnEdicion = id;
            try {
                const r = await fetch(`/instructores/api/${id}`, { credentials: 'include' });
                const d = await r.json();
                if (!d.success) throw new Error(d.error);
                const i = d.instructor;
                document.getElementById('modalTitulo').textContent = 'Editar instructor';
                document.getElementById('f_apellido').value = i.apellido;
                document.getElementById('f_nombre').value = i.nombre;
                document.getElementById('f_tipo_contrato').value = i.tipo_contrato;
                document.getElementById('f_monto_fijo').value = i.monto_fijo || '';
                document.getElementById('f_valor_hora').value = i.valor_hora || '';
                document.getElementById('f_valor_por_alumno').value = i.valor_por_alumno || '';
                document.getElementById('f_telefono').value = i.telefono || '';
                document.getElementById('f_email').value = i.email || '';
                mostrarCamposContrato();
                document.getElementById('modalInstructor').classList.add('active');
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        async function guardarInstructor() {
            const apellido = document.getElementById('f_apellido').value.trim();
            const nombre = document.getElementById('f_nombre').value.trim();
            const tipo_contrato = document.getElementById('f_tipo_contrato').value;
            const monto_fijo = parseFloat(document.getElementById('f_monto_fijo').value) || 0;
            const valor_hora = parseFloat(document.getElementById('f_valor_hora').value) || 0;
            const valor_por_alumno = parseFloat(document.getElementById('f_valor_por_alumno').value) || 0;
            const telefono = document.getElementById('f_telefono').value.trim() || null;
            const email = document.getElementById('f_email').value.trim() || null;
            if (!apellido || !nombre) {
                alert('Apellido y nombre son requeridos');
                return;
            }
            try {
                const url = instructorEnEdicion ? `/instructores/api/${instructorEnEdicion}` : '/instructores/api';
                const method = instructorEnEdicion ? 'PUT' : 'POST';
                const r = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ apellido, nombre, tipo_contrato, monto_fijo, valor_hora, valor_por_alumno, telefono, email })
                });
                const d = await r.json();
                if (d.success) {
                    cerrarModal();
                    buscar();
                } else {
                    alert('Error: '+d.error);
                }
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        function cerrarModal() {
            document.getElementById('modalInstructor').classList.remove('active');
        }

        async function logout() {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/login';
        }

        buscar();
    </script>
</body>
</html>
```

- [ ] **Step 2: Crear modulo-instructores/views/liquidaciones.ejs**

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liquidaciones — Club Médanos Verdes</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:'DM Sans',sans-serif; }
        body { background:#f1f5f9; color:#1e293b; min-height:100vh; }
        .header { background:linear-gradient(135deg,#7a8c2e 0%,#a3b542 100%); padding:20px 0; }
        .header-container { max-width:1400px; margin:0 auto; padding:0 24px; display:flex; justify-content:space-between; align-items:center; }
        .header h1 { font-size:22px; color:white; font-weight:700; }
        .header-nav { display:flex; gap:6px; }
        .header-nav a { padding:8px 18px; border-radius:8px; font-size:13px; font-weight:600; text-decoration:none; color:rgba(255,255,255,0.8); }
        .header-nav a:hover { background:rgba(255,255,255,0.2); color:white; }
        .container { max-width:1400px; margin:0 auto; padding:24px; }
        .card { background:white; border-radius:12px; padding:20px; border:1px solid #e2e8f0; margin-bottom:20px; }
        .btn { padding:10px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; }
        .btn-primary { background:#7a8c2e; color:white; }
        .btn-primary:hover { background:#5f6f24; }
        .btn-danger { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
        .btn-small { padding:6px 12px; font-size:12px; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th { background:#f8fafc; padding:10px 12px; text-align:left; font-weight:600; border-bottom:2px solid #e2e8f0; }
        td { padding:8px 12px; border-bottom:1px solid #f1f5f9; }
        tr:hover td { background:#f8fafc; }
        .badge { display:inline-block; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:600; }
        .badge-borrador { background:#fef3c7; color:#92400e; }
        .badge-aprobada { background:#f0fdf4; color:#059669; }
        .badge-pagada { background:#eff6ff; color:#2563eb; }
        .link { color:#7a8c2e; text-decoration:none; font-weight:600; cursor:pointer; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-container">
            <h1>💰 Liquidaciones</h1>
            <div class="header-nav">
                <a href="/instructores">Instructores</a>
                <a href="/dashboard">← Sistema</a>
                <a href="#" onclick="logout()" style="background:rgba(239,68,68,0.25); color:#fca5a5;">Salir</a>
            </div>
        </div>
    </div>
    <div class="container">
        <div class="card">
            <% if (usuario.rol === 'admin') { %>
                <div style="margin-bottom:20px; padding:12px; background:#fef3c7; border-radius:8px;">
                    <label>Generar liquidaciones para: <input type="month" id="periodo_nuevo" value="<%= new Date().toISOString().slice(0, 7) %>"></label>
                    <button class="btn btn-primary" onclick="generarLiquidaciones()" style="margin-left:12px;">Calcular</button>
                </div>
            <% } %>
            <div id="tablaContainer">Cargando liquidaciones...</div>
        </div>
    </div>

    <script>
        async function cargar() {
            try {
                const r = await fetch('/instructores/api/liquidaciones/list', { credentials: 'include' });
                const d = await r.json();
                if (!d.success) throw new Error(d.error);
                const ESTADOS = { BORRADOR:'Borrador', APROBADA:'Aprobada', PAGADA:'Pagada' };
                const html = `
                    <table>
                        <thead><tr><th>Período</th><th>Instructor</th><th>Monto</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            ${d.liquidaciones.map(l => `<tr>
                                <td>${l.periodo}</td>
                                <td>${l.apellido}, ${l.nombre}</td>
                                <td>$${l.monto_calculado}</td>
                                <td><span class="badge badge-${l.estado.toLowerCase()}">${ESTADOS[l.estado]}</span></td>
                                <td>
                                    <% if (usuario.rol === 'admin') { %>
                                        ${l.estado === 'BORRADOR' ? '<a class="link" onclick="aprobar('+l.id+')">Aprobar</a> ' : ''}
                                    <% } %>
                                    <% if ((usuario.rol === 'admin' || usuario.rol === 'tesoreria') && l.estado !== 'PAGADA') { %>
                                        <a class="link" onclick="pagar('+l.id+')">Pagar</a>
                                    <% } %>
                                </td>
                            </tr>`).join('')}
                        </tbody>
                    </table>`;
                document.getElementById('tablaContainer').innerHTML = html;
            } catch (e) {
                document.getElementById('tablaContainer').innerHTML = 'Error: '+e.message;
            }
        }

        async function generarLiquidaciones() {
            const periodo = document.getElementById('periodo_nuevo').value;
            if (!confirm('¿Generar liquidaciones para '+periodo+'?')) return;
            try {
                const r = await fetch('/instructores/api/liquidaciones/calcular', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ periodo })
                });
                const d = await r.json();
                if (d.success) {
                    alert('✓ '+d.generadas+' liquidaciones generadas');
                    cargar();
                } else {
                    alert('Error: '+d.error);
                }
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        async function aprobar(id) {
            try {
                const r = await fetch(`/instructores/api/liquidaciones/${id}/aprobar`, { method: 'POST', credentials: 'include' });
                const d = await r.json();
                if (d.success) {
                    cargar();
                } else {
                    alert('Error: '+d.error);
                }
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        async function pagar(id) {
            if (!confirm('¿Pagar esta liquidación?')) return;
            try {
                const r = await fetch(`/instructores/api/liquidaciones/${id}/pagar`, { method: 'POST', credentials: 'include' });
                const d = await r.json();
                if (d.success) {
                    alert('✓ Liquidación pagada');
                    cargar();
                } else {
                    alert('Error: '+d.error);
                }
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        async function logout() {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/login';
        }

        cargar();
    </script>
</body>
</html>
```

- [ ] **Step 3: Probar en navegador**

```bash
node servidor.js
```

1. Login con `admin`
2. Dashboard → Instructores
3. Crear instructor con distintos tipos de contrato
4. Ir a Liquidaciones
5. Click "Calcular" con un período (ej: 2026-04)
6. Ver liquidaciones generadas, aprobar y pagar

- [ ] **Step 4: Commit**

```bash
git add modulo-instructores/views/
git commit -m "feat: modulo instructores frontend - instructores y liquidaciones"
```

---

---

## Fase 6: Módulo Cuotas y Pagos

---

### Task 16: Lógica de cuotas + tests

**Files:**
- Create: `modulo-cuotas/services/cuotas.logic.js`
- Create: `tests/cuotas.test.js`

- [ ] **Step 1: Escribir tests que fallan**

Crear `tests/cuotas.test.js`:

```js
const { calcularMontoCuota, validarEstadoDeuda } = require('../modulo-cuotas/services/cuotas.logic');

describe('calcularMontoCuota', () => {
  test('devuelve monto del plan', () => {
    const plan = { monto: 5000 };
    const result = calcularMontoCuota(plan);
    expect(result).toBe(5000);
  });

  test('plan null devuelve 0', () => {
    const result = calcularMontoCuota(null);
    expect(result).toBe(0);
  });

  test('plan con monto 0 devuelve 0', () => {
    const plan = { monto: 0 };
    const result = calcularMontoCuota(plan);
    expect(result).toBe(0);
  });
});

describe('validarEstadoDeuda', () => {
  test('sin cuotas pendientes: PAGADO', () => {
    const cuotas = [];
    const result = validarEstadoDeuda(cuotas);
    expect(result).toBe('PAGADO');
  });

  test('con cuotas pendientes: DEBE', () => {
    const cuotas = [{ estado: 'PENDIENTE' }];
    const result = validarEstadoDeuda(cuotas);
    expect(result).toBe('DEBE');
  });

  test('con cuotas vencidas: VENCIDO', () => {
    const cuotas = [{ estado: 'VENCIDA' }];
    const result = validarEstadoDeuda(cuotas);
    expect(result).toBe('VENCIDO');
  });

  test('con pendientes Y vencidas: VENCIDO (prioridad)', () => {
    const cuotas = [{ estado: 'PENDIENTE' }, { estado: 'VENCIDA' }];
    const result = validarEstadoDeuda(cuotas);
    expect(result).toBe('VENCIDO');
  });
});
```

- [ ] **Step 2: Correr tests — verificar que fallan**

```bash
npx jest tests/cuotas.test.js
```

Esperado: FAIL

- [ ] **Step 3: Crear modulo-cuotas/services/cuotas.logic.js**

```js
function calcularMontoCuota(plan) {
  if (!plan) return 0;
  return plan.monto || 0;
}

function validarEstadoDeuda(cuotas) {
  if (cuotas.length === 0) return 'PAGADO';
  if (cuotas.some(c => c.estado === 'VENCIDA')) return 'VENCIDO';
  if (cuotas.some(c => c.estado === 'PENDIENTE')) return 'DEBE';
  return 'PAGADO';
}

module.exports = { calcularMontoCuota, validarEstadoDeuda };
```

- [ ] **Step 4: Correr tests — verificar que pasan**

```bash
npx jest tests/cuotas.test.js
```

Esperado: PASS — 5 tests en verde.

- [ ] **Step 5: Commit**

```bash
git add modulo-cuotas/services/ tests/cuotas.test.js
git commit -m "feat: logica de cuotas con tests"
```

---

### Task 17: Módulo Cuotas — Backend (rutas y controlador)

**Files:**
- Create: `modulo-cuotas/routes/cuotas.routes.js`
- Create: `modulo-cuotas/controllers/cuotas.controller.js`

- [ ] **Step 1: Crear modulo-cuotas/controllers/cuotas.controller.js**

```js
const db = require('../../database/db');
const { calcularMontoCuota, validarEstadoDeuda } = require('../services/cuotas.logic');

async function obtenerPlanes(req, res) {
  try {
    const planes = db.prepare('SELECT * FROM planes_cuota ORDER BY nombre').all();
    res.json({ success: true, planes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function crearPlan(req, res) {
  const { nombre, descripcion, monto, tipo } = req.body;
  if (!nombre || monto === undefined) {
    return res.json({ success: false, error: 'Faltam nombre y monto' });
  }
  try {
    const result = db.prepare('INSERT INTO planes_cuota (nombre, descripcion, monto, tipo) VALUES (?, ?, ?, ?)').run(
      nombre, descripcion || null, monto, tipo || null
    );
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function editarPlan(req, res) {
  const { id } = req.params;
  const { nombre, descripcion, monto, tipo } = req.body;
  if (!nombre || monto === undefined) {
    return res.json({ success: false, error: 'Faltam nombre y monto' });
  }
  try {
    db.prepare('UPDATE planes_cuota SET nombre = ?, descripcion = ?, monto = ?, tipo = ? WHERE id = ?').run(
      nombre, descripcion || null, monto, tipo || null, id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function obtenerCuotas(req, res) {
  const { estado, socio_id } = req.query;
  try {
    let query = 'SELECT c.*, s.apellido, s.nombre FROM cuotas c JOIN socios s ON c.socio_id = s.id WHERE 1=1';
    const params = [];
    if (estado) {
      query += ' AND c.estado = ?';
      params.push(estado);
    }
    if (socio_id) {
      query += ' AND c.socio_id = ?';
      params.push(socio_id);
    }
    query += ' ORDER BY c.periodo DESC';
    const cuotas = db.prepare(query).all(...params);
    res.json({ success: true, cuotas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function generarCuotasDelMes(req, res) {
  const { periodo } = req.body;
  if (!periodo) {
    return res.json({ success: false, error: 'Falta periodo (formato: YYYY-MM)' });
  }
  try {
    const socios = db.prepare('SELECT s.id, s.numero_socio FROM socios s WHERE s.estado = "ACTIVO"').all();
    let generadas = 0;
    socios.forEach(s => {
      const plan = db.prepare(`
        SELECT pc.* FROM planes_cuota pc
        JOIN socio_planes sp ON pc.id = sp.plan_id
        WHERE sp.socio_id = ? AND sp.fecha_desde <= date('now') AND (sp.fecha_hasta IS NULL OR sp.fecha_hasta >= date('now'))
      `).get(s.id);
      if (plan) {
        const monto = calcularMontoCuota(plan);
        const vencimiento = periodo.split('-')[0] + '-' + String(parseInt(periodo.split('-')[1]) + 1).padStart(2, '0') + '-01';
        db.prepare(`
          INSERT OR REPLACE INTO cuotas (socio_id, periodo, monto_total, estado, fecha_vencimiento)
          VALUES (?, ?, ?, 'PENDIENTE', ?)
        `).run(s.id, periodo, monto, vencimiento);
        generadas++;
      }
    });
    res.json({ success: true, generadas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function registrarPago(req, res) {
  const { cuota_id, importe, medio_pago } = req.body;
  if (!cuota_id || !importe) {
    return res.json({ success: false, error: 'Faltam cuota_id e importe' });
  }
  try {
    const cuota = db.prepare('SELECT * FROM cuotas WHERE id = ?').get(cuota_id);
    if (!cuota) return res.status(404).json({ success: false, error: 'Cuota no encontrada' });
    const result = db.prepare(`
      INSERT INTO pagos (cuota_id, socio_id, importe, medio_pago, usuario_id, fecha_pago)
      VALUES (?, ?, ?, ?, ?, date('now'))
    `).run(cuota_id, cuota.socio_id, importe, medio_pago || 'efectivo', req.session.usuario.id);
    db.prepare('UPDATE cuotas SET estado = ? WHERE id = ?').run('PAGADA', cuota_id);
    db.prepare('INSERT INTO movimientos_caja (tipo, concepto, importe, referencia_id, referencia_tipo, usuario_id) VALUES (?, ?, ?, ?, ?, ?)').run(
      'ingreso', 'Pago cuota ' + cuota.periodo, importe, result.lastInsertRowid, 'pago', req.session.usuario.id
    );
    res.json({ success: true, pago_id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function obtenerDeudaBySocio(req, res) {
  const { socio_id } = req.params;
  try {
    const cuotas = db.prepare('SELECT * FROM cuotas WHERE socio_id = ?').all(socio_id);
    const estado = validarEstadoDeuda(cuotas);
    const deuda = cuotas.filter(c => c.estado !== 'PAGADA').reduce((sum, c) => sum + c.monto_total, 0);
    res.json({ success: true, estado, deuda, cuotas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerPlanes, crearPlan, editarPlan,
  obtenerCuotas, generarCuotasDelMes, registrarPago, obtenerDeudaBySocio
};
```

- [ ] **Step 2: Crear modulo-cuotas/routes/cuotas.routes.js**

```js
const router = require('express').Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const ctrl = require('../controllers/cuotas.controller');

router.get('/', requireAuth, requireRole('admin', 'recepcion', 'tesoreria'), (req, res) => {
  res.render('modulo-cuotas/views/cuotas', { usuario: req.session.usuario });
});

router.get('/planes', requireAuth, requireRole('admin', 'recepcion', 'tesoreria'), (req, res) => {
  res.render('modulo-cuotas/views/planes', { usuario: req.session.usuario });
});

router.get('/api/planes', requireAuth, requireRole('admin', 'recepcion', 'tesoreria'), ctrl.obtenerPlanes);
router.post('/api/planes', requireAuth, requireRole('admin'), ctrl.crearPlan);
router.put('/api/planes/:id', requireAuth, requireRole('admin'), ctrl.editarPlan);

router.get('/api/cuotas', requireAuth, requireRole('admin', 'recepcion', 'tesoreria'), ctrl.obtenerCuotas);
router.post('/api/cuotas/generar', requireAuth, requireRole('admin'), ctrl.generarCuotasDelMes);
router.post('/api/cuotas/pagar', requireAuth, requireRole('admin', 'recepcion'), ctrl.registrarPago);
router.get('/api/deuda/:socio_id', requireAuth, requireRole('admin', 'recepcion', 'tesoreria'), ctrl.obtenerDeudaBySocio);

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add modulo-cuotas/routes/ modulo-cuotas/controllers/
git commit -m "feat: modulo cuotas backend - CRUD planes y registro de pagos"
```

---

### Task 18: Módulo Cuotas — Frontend (vistas)

**Files:**
- Create: `modulo-cuotas/views/cuotas.ejs`
- Create: `modulo-cuotas/views/planes.ejs`

- [ ] **Step 1: Crear modulo-cuotas/views/cuotas.ejs**

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cuotas y Pagos — Club Médanos Verdes</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:'DM Sans',sans-serif; }
        body { background:#f1f5f9; color:#1e293b; min-height:100vh; }
        .header { background:linear-gradient(135deg,#059669 0%,#34d399 100%); padding:20px 0; box-shadow:0 4px 20px rgba(5,150,105,0.3); }
        .header-container { max-width:1400px; margin:0 auto; padding:0 24px; display:flex; justify-content:space-between; align-items:center; }
        .header h1 { font-size:22px; color:white; font-weight:700; }
        .header-nav { display:flex; gap:6px; }
        .header-nav a { padding:8px 18px; border-radius:8px; font-size:13px; font-weight:600; text-decoration:none; color:rgba(255,255,255,0.8); transition:all .2s; }
        .header-nav a:hover,.header-nav a.active { background:rgba(255,255,255,0.2); color:white; }
        .container { max-width:1400px; margin:0 auto; padding:24px; }
        .card { background:white; border-radius:12px; padding:20px; border:1px solid #e2e8f0; margin-bottom:20px; }
        .toolbar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:20px; }
        .toolbar input,.toolbar select { padding:10px 14px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; }
        .toolbar input { flex:1; min-width:200px; }
        .btn { padding:10px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all .2s; }
        .btn-primary { background:#059669; color:white; }
        .btn-primary:hover { background:#047857; }
        .btn-secondary { background:#34d399; color:white; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th { background:#f8fafc; padding:10px 12px; text-align:left; font-weight:600; border-bottom:2px solid #e2e8f0; }
        td { padding:8px 12px; border-bottom:1px solid #f1f5f9; }
        tr:hover td { background:#f8fafc; }
        .badge { display:inline-block; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:600; }
        .badge-pendiente { background:#fef3c7; color:#92400e; }
        .badge-pagada { background:#f0fdf4; color:#059669; }
        .badge-vencida { background:#fee2e2; color:#dc2626; }
        .empty { text-align:center; padding:40px; color:#94a3b8; }
        .link { color:#059669; text-decoration:none; font-weight:600; cursor:pointer; }
        .link:hover { text-decoration:underline; }
        .modal-overlay { display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center; }
        .modal-overlay.active { display:flex; }
        .modal { background:white; border-radius:16px; padding:30px; width:90%; max-width:600px; }
        .modal h2 { font-size:20px; margin-bottom:20px; }
        .form-group { margin-bottom:16px; display:flex; flex-direction:column; gap:4px; }
        .form-group label { font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; }
        .form-group input,.form-group select { padding:8px 12px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; font-family:inherit; }
        .form-actions { display:flex; gap:12px; justify-content:flex-end; margin-top:20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-container">
            <h1>💳 Cuotas y Pagos</h1>
            <div class="header-nav">
                <a href="/cuotas" class="active">Cuotas</a>
                <% if (usuario.rol === 'admin') { %>
                    <a href="/cuotas/planes">Planes</a>
                <% } %>
                <a href="/dashboard">← Sistema</a>
                <a href="#" onclick="logout()" style="background:rgba(239,68,68,0.25); color:#fca5a5;">🚪 Salir</a>
            </div>
        </div>
    </div>
    <div class="container">
        <div class="card">
            <div class="toolbar">
                <select id="estado" onchange="cargar()">
                    <option value="">Todos los estados</option>
                    <option value="PENDIENTE">Pendientes</option>
                    <option value="PAGADA">Pagadas</option>
                    <option value="VENCIDA">Vencidas</option>
                </select>
                <button class="btn btn-secondary" onclick="cargar()">🔍 Filtrar</button>
                <% if (usuario.rol === 'admin') { %>
                    <button class="btn btn-primary" onclick="abrirModalGenerar()">📅 Generar cuotas</button>
                <% } %>
            </div>
            <div id="tablaContainer"><div class="empty">Cargando cuotas...</div></div>
        </div>
    </div>

    <!-- Modal: Generar Cuotas -->
    <div class="modal-overlay" id="modalGenerar" onclick="if(event.target===this)cerrarModalGenerar()">
        <div class="modal">
            <h2>Generar cuotas del mes</h2>
            <div class="form-group">
                <label>Período</label>
                <input type="month" id="periodo_generar" value="<%= new Date().toISOString().slice(0, 7) %>">
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="cerrarModalGenerar()">Cancelar</button>
                <button class="btn btn-primary" onclick="generarCuotas()">Generar</button>
            </div>
        </div>
    </div>

    <!-- Modal: Registrar Pago -->
    <div class="modal-overlay" id="modalPago" onclick="if(event.target===this)cerrarModalPago()">
        <div class="modal">
            <h2>Registrar pago</h2>
            <div class="form-group">
                <label>Cuota</label>
                <input type="text" id="pago_cuota" disabled>
            </div>
            <div class="form-group">
                <label>Importe</label>
                <input type="number" id="pago_importe" step="0.01">
            </div>
            <div class="form-group">
                <label>Medio de pago</label>
                <select id="pago_medio">
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="debito">Débito</option>
                    <option value="otro">Otro</option>
                </select>
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="cerrarModalPago()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarPago()">Registrar pago</button>
            </div>
        </div>
    </div>

    <script>
        let cuotaEnPago = null;

        async function cargar() {
            const estado = document.getElementById('estado').value;
            try {
                const url = `/cuotas/api/cuotas${estado ? '?estado=' + estado : ''}`;
                const r = await fetch(url, { credentials: 'include' });
                const d = await r.json();
                if (!d.success) throw new Error(d.error);
                if (d.cuotas.length === 0) {
                    document.getElementById('tablaContainer').innerHTML = '<div class="empty">No hay cuotas</div>';
                    return;
                }
                const ESTADOS = { PENDIENTE:'Pendiente', PAGADA:'Pagada', VENCIDA:'Vencida' };
                const html = `
                    <table>
                        <thead><tr><th>Período</th><th>Socio</th><th>Monto</th><th>Estado</th><th>Vencimiento</th><th></th></tr></thead>
                        <tbody>
                            ${d.cuotas.map(c => `<tr>
                                <td>${c.periodo}</td>
                                <td>${c.apellido}, ${c.nombre}</td>
                                <td>$${c.monto_total}</td>
                                <td><span class="badge badge-${c.estado.toLowerCase()}">${ESTADOS[c.estado]}</span></td>
                                <td>${c.fecha_vencimiento}</td>
                                <td>
                                    <% if ((usuario.rol === 'admin' || usuario.rol === 'recepcion') && c.estado !== 'PAGADA') { %>
                                        <a class="link" onclick="abrirModalPago(${c.id}, '${c.periodo}', ${c.monto_total})">Pagar</a>
                                    <% } %>
                                </td>
                            </tr>`).join('')}
                        </tbody>
                    </table>`;
                document.getElementById('tablaContainer').innerHTML = html;
            } catch (e) {
                document.getElementById('tablaContainer').innerHTML = '<div class="empty">Error: '+e.message+'</div>';
            }
        }

        function abrirModalGenerar() {
            document.getElementById('modalGenerar').classList.add('active');
        }

        async function generarCuotas() {
            const periodo = document.getElementById('periodo_generar').value;
            if (!confirm('¿Generar cuotas para '+periodo+'?')) return;
            try {
                const r = await fetch('/cuotas/api/cuotas/generar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ periodo })
                });
                const d = await r.json();
                if (d.success) {
                    alert('✓ '+d.generadas+' cuotas generadas');
                    cerrarModalGenerar();
                    cargar();
                } else {
                    alert('Error: '+d.error);
                }
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        function cerrarModalGenerar() {
            document.getElementById('modalGenerar').classList.remove('active');
        }

        function abrirModalPago(cuotaId, periodo, monto) {
            cuotaEnPago = cuotaId;
            document.getElementById('pago_cuota').value = periodo;
            document.getElementById('pago_importe').value = monto;
            document.getElementById('modalPago').classList.add('active');
        }

        async function guardarPago() {
            const importe = parseFloat(document.getElementById('pago_importe').value);
            const medio_pago = document.getElementById('pago_medio').value;
            if (!importe) {
                alert('Ingresá un importe');
                return;
            }
            try {
                const r = await fetch('/cuotas/api/cuotas/pagar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ cuota_id: cuotaEnPago, importe, medio_pago })
                });
                const d = await r.json();
                if (d.success) {
                    alert('✓ Pago registrado');
                    cerrarModalPago();
                    cargar();
                } else {
                    alert('Error: '+d.error);
                }
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        function cerrarModalPago() {
            document.getElementById('modalPago').classList.remove('active');
        }

        async function logout() {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/login';
        }

        cargar();
    </script>
</body>
</html>
```

- [ ] **Step 2: Crear modulo-cuotas/views/planes.ejs**

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Planes de Cuota — Club Médanos Verdes</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:'DM Sans',sans-serif; }
        body { background:#f1f5f9; color:#1e293b; min-height:100vh; }
        .header { background:linear-gradient(135deg,#059669 0%,#34d399 100%); padding:20px 0; }
        .header-container { max-width:1400px; margin:0 auto; padding:0 24px; display:flex; justify-content:space-between; align-items:center; }
        .header h1 { font-size:22px; color:white; font-weight:700; }
        .header-nav a { padding:8px 18px; border-radius:8px; font-size:13px; font-weight:600; text-decoration:none; color:rgba(255,255,255,0.8); }
        .header-nav a:hover { background:rgba(255,255,255,0.2); color:white; }
        .container { max-width:1400px; margin:0 auto; padding:24px; }
        .card { background:white; border-radius:12px; padding:20px; border:1px solid #e2e8f0; margin-bottom:20px; }
        .btn { padding:10px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; }
        .btn-primary { background:#059669; color:white; }
        .grid-planes { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
        .plan-card { background:white; border:1.5px solid #e2e8f0; border-radius:12px; padding:16px; cursor:pointer; transition:all .2s; }
        .plan-card:hover { transform:translateY(-4px); box-shadow:0 8px 24px rgba(0,0,0,0.1); border-color:rgba(5,150,105,0.4); }
        .plan-name { font-size:16px; font-weight:700; color:#0f172a; margin-bottom:6px; }
        .plan-info { font-size:13px; color:#64748b; line-height:1.4; margin-bottom:12px; }
        .plan-monto { font-size:18px; font-weight:700; color:#059669; }
        .plan-actions { display:flex; gap:8px; margin-top:12px; }
        .btn-small { padding:6px 12px; font-size:12px; background:#059669; color:white; border-radius:6px; cursor:pointer; border:none; }
        .empty { text-align:center; padding:40px; color:#94a3b8; }
        .modal-overlay { display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center; }
        .modal-overlay.active { display:flex; }
        .modal { background:white; border-radius:16px; padding:30px; width:90%; max-width:600px; }
        .form-group { margin-bottom:16px; display:flex; flex-direction:column; gap:4px; }
        .form-group label { font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; }
        .form-group input,.form-group textarea,.form-group select { padding:8px 12px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; font-family:inherit; }
        .form-actions { display:flex; gap:12px; justify-content:flex-end; margin-top:20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-container">
            <h1>📋 Planes de Cuota</h1>
            <div class="header-nav">
                <a href="/cuotas">Cuotas</a>
                <a href="/cuotas/planes">Planes</a>
                <a href="/dashboard">← Sistema</a>
                <a href="#" onclick="logout()" style="background:rgba(239,68,68,0.25); color:#fca5a5;">Salir</a>
            </div>
        </div>
    </div>
    <div class="container">
        <div class="card">
            <button class="btn btn-primary" onclick="abrirModalNuevo()" style="margin-bottom:20px;">+ Nuevo plan</button>
            <div id="grid-container" class="grid-planes"></div>
        </div>
    </div>

    <!-- Modal: Crear/Editar Plan -->
    <div class="modal-overlay" id="modalPlan" onclick="if(event.target===this)cerrarModal()">
        <div class="modal">
            <h2 id="modalTitulo">Nuevo plan</h2>
            <div class="form-group">
                <label>Nombre</label>
                <input type="text" id="f_nombre" placeholder="Ej: Plan Individual">
            </div>
            <div class="form-group">
                <label>Descripción</label>
                <textarea id="f_descripcion" rows="2" placeholder="Opcional"></textarea>
            </div>
            <div class="form-group">
                <label>Monto ($)</label>
                <input type="number" id="f_monto" step="0.01" placeholder="0.00">
            </div>
            <div class="form-group">
                <label>Tipo</label>
                <select id="f_tipo">
                    <option value="">Sin categoría</option>
                    <option value="individual">Individual</option>
                    <option value="familiar">Familiar</option>
                    <option value="actividad">Por actividad</option>
                    <option value="combo">Combo</option>
                </select>
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarPlan()">Guardar</button>
            </div>
        </div>
    </div>

    <script>
        let planEnEdicion = null;

        async function cargar() {
            try {
                const r = await fetch('/cuotas/api/planes', { credentials: 'include' });
                const d = await r.json();
                if (!d.success) throw new Error(d.error);
                if (d.planes.length === 0) {
                    document.getElementById('grid-container').innerHTML = '<div class="empty" style="grid-column:1/-1;">No hay planes configurados</div>';
                    return;
                }
                const TIPOS = { individual:'Individual', familiar:'Familiar', actividad:'Por actividad', combo:'Combo' };
                const html = d.planes.map(p => `
                    <div class="plan-card">
                        <div class="plan-name">${p.nombre}</div>
                        <div class="plan-info">${p.descripcion || 'Sin descripción'}</div>
                        <div class="plan-monto">$${p.monto}</div>
                        <% if (p.tipo) { %>
                            <div style="font-size:11px; color:#94a3b8; margin-top:6px;">${TIPOS[p.tipo] || p.tipo}</div>
                        <% } %>
                        <div class="plan-actions">
                            <button class="btn-small" onclick="editarPlan(${p.id})">Editar</button>
                        </div>
                    </div>
                `).join('');
                document.getElementById('grid-container').innerHTML = html;
            } catch (e) {
                document.getElementById('grid-container').innerHTML = '<div class="empty">Error: '+e.message+'</div>';
            }
        }

        function abrirModalNuevo() {
            planEnEdicion = null;
            document.getElementById('modalTitulo').textContent = 'Nuevo plan';
            document.getElementById('f_nombre').value = '';
            document.getElementById('f_descripcion').value = '';
            document.getElementById('f_monto').value = '';
            document.getElementById('f_tipo').value = '';
            document.getElementById('modalPlan').classList.add('active');
        }

        async function editarPlan(id) {
            planEnEdicion = id;
            try {
                const r = await fetch(`/cuotas/api/planes?id=${id}`, { credentials: 'include' });
                const d = await r.json();
                if (!d.success) throw new Error('No se pudo cargar el plan');
                const p = d.planes.find(x => x.id === id);
                if (!p) throw new Error('Plan no encontrado');
                document.getElementById('modalTitulo').textContent = 'Editar plan';
                document.getElementById('f_nombre').value = p.nombre;
                document.getElementById('f_descripcion').value = p.descripcion || '';
                document.getElementById('f_monto').value = p.monto;
                document.getElementById('f_tipo').value = p.tipo || '';
                document.getElementById('modalPlan').classList.add('active');
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        async function guardarPlan() {
            const nombre = document.getElementById('f_nombre').value.trim();
            const descripcion = document.getElementById('f_descripcion').value.trim() || null;
            const monto = parseFloat(document.getElementById('f_monto').value);
            const tipo = document.getElementById('f_tipo').value || null;
            if (!nombre || !monto) {
                alert('Nombre y monto son requeridos');
                return;
            }
            try {
                const url = planEnEdicion ? `/cuotas/api/planes/${planEnEdicion}` : '/cuotas/api/planes';
                const method = planEnEdicion ? 'PUT' : 'POST';
                const r = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ nombre, descripcion, monto, tipo })
                });
                const d = await r.json();
                if (d.success) {
                    cerrarModal();
                    cargar();
                } else {
                    alert('Error: '+d.error);
                }
            } catch (e) {
                alert('Error: '+e.message);
            }
        }

        function cerrarModal() {
            document.getElementById('modalPlan').classList.remove('active');
        }

        async function logout() {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/login';
        }

        cargar();
    </script>
</body>
</html>
```

- [ ] **Step 3: Probar en navegador**

```bash
node servidor.js
```

1. Login con `admin`
2. Dashboard → Cuotas y Pagos
3. Click "Generar cuotas" con período actual
4. Ver cuotas generadas
5. Click en "Pagar" → registrar pago
6. Ir a Planes → crear/editar planes

- [ ] **Step 4: Commit**

```bash
git add modulo-cuotas/views/
git commit -m "feat: modulo cuotas frontend - gestion de cuotas, pagos y planes"
```

---

## Fase 1: Fundación

---

### Task 1: Inicializar proyecto

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Crear package.json**

```json
{
  "name": "medanos-verdes",
  "version": "1.0.0",
  "main": "servidor.js",
  "scripts": {
    "start": "node servidor.js",
    "dev": "nodemon servidor.js",
    "test": "jest"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^9.4.3",
    "ejs": "^3.1.10",
    "express": "^4.18.3",
    "express-session": "^1.18.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.1.0"
  }
}
```

- [ ] **Step 2: Crear .gitignore**

```
node_modules/
database/medanos.db
database/medanos.db-shm
database/medanos.db-wal
.env
*.log
```

- [ ] **Step 3: Instalar dependencias**

```bash
npm install
```

Esperado: carpeta `node_modules/` creada, sin errores.

- [ ] **Step 4: Commit**

```bash
git init
git add package.json .gitignore
git commit -m "feat: inicializar proyecto medanos-verdes"
```

---

### Task 2: Schema SQL y conexión a la base de datos

**Files:**
- Create: `database/schema.sql`
- Create: `database/db.js`

- [ ] **Step 1: Crear database/schema.sql**

```sql
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT,
  rol TEXT NOT NULL CHECK(rol IN ('admin','recepcion','tesoreria','instructor')),
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS socios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_socio TEXT UNIQUE NOT NULL,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT UNIQUE,
  fecha_nacimiento TEXT,
  telefono TEXT,
  email TEXT,
  domicilio TEXT,
  fecha_alta TEXT NOT NULL DEFAULT (date('now')),
  estado TEXT DEFAULT 'ACTIVO' CHECK(estado IN ('ACTIVO','INACTIVO','SUSPENDIDO')),
  observaciones TEXT
);

CREATE TABLE IF NOT EXISTS actividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  dias_horario TEXT,
  precio_base REAL DEFAULT 0,
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS socio_actividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER NOT NULL REFERENCES socios(id),
  actividad_id INTEGER NOT NULL REFERENCES actividades(id),
  fecha_desde TEXT NOT NULL,
  fecha_hasta TEXT
);

CREATE TABLE IF NOT EXISTS instructores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT,
  cuil TEXT,
  telefono TEXT,
  email TEXT,
  tipo_contrato TEXT NOT NULL CHECK(tipo_contrato IN ('fijo','por_hora','por_alumno','combinado')),
  monto_fijo REAL DEFAULT 0,
  valor_hora REAL DEFAULT 0,
  valor_por_alumno REAL DEFAULT 0,
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS instructor_actividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instructor_id INTEGER NOT NULL REFERENCES instructores(id),
  actividad_id INTEGER NOT NULL REFERENCES actividades(id)
);

CREATE TABLE IF NOT EXISTS planes_cuota (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  monto REAL NOT NULL,
  tipo TEXT CHECK(tipo IN ('individual','familiar','actividad','combo','descuento'))
);

CREATE TABLE IF NOT EXISTS socio_planes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER NOT NULL REFERENCES socios(id),
  plan_id INTEGER NOT NULL REFERENCES planes_cuota(id),
  fecha_desde TEXT NOT NULL,
  fecha_hasta TEXT
);

CREATE TABLE IF NOT EXISTS cuotas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER NOT NULL REFERENCES socios(id),
  periodo TEXT NOT NULL,
  monto_total REAL NOT NULL,
  estado TEXT DEFAULT 'PENDIENTE' CHECK(estado IN ('PENDIENTE','PAGADA','VENCIDA')),
  fecha_vencimiento TEXT
);

CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cuota_id INTEGER NOT NULL REFERENCES cuotas(id),
  socio_id INTEGER NOT NULL REFERENCES socios(id),
  fecha_pago TEXT NOT NULL DEFAULT (date('now')),
  importe REAL NOT NULL,
  medio_pago TEXT CHECK(medio_pago IN ('efectivo','transferencia','debito','otro')),
  usuario_id INTEGER REFERENCES usuarios(id),
  observaciones TEXT
);

CREATE TABLE IF NOT EXISTS liquidaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instructor_id INTEGER NOT NULL REFERENCES instructores(id),
  periodo TEXT NOT NULL,
  monto_calculado REAL NOT NULL,
  monto_pagado REAL DEFAULT 0,
  estado TEXT DEFAULT 'BORRADOR' CHECK(estado IN ('BORRADOR','APROBADA','PAGADA')),
  fecha_pago TEXT,
  detalle_json TEXT
);

CREATE TABLE IF NOT EXISTS movimientos_caja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL DEFAULT (date('now')),
  tipo TEXT NOT NULL CHECK(tipo IN ('ingreso','egreso')),
  concepto TEXT NOT NULL,
  importe REAL NOT NULL,
  referencia_id INTEGER,
  referencia_tipo TEXT,
  usuario_id INTEGER REFERENCES usuarios(id)
);
```

- [ ] **Step 2: Crear database/db.js**

```js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'medanos.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

module.exports = db;
```

- [ ] **Step 3: Verificar que la DB se crea correctamente**

```bash
node -e "const db = require('./database/db'); console.log(db.prepare('SELECT name FROM sqlite_master WHERE type=\\'table\\'').all())"
```

Esperado: lista con todas las tablas (`usuarios`, `socios`, `actividades`, etc.)

- [ ] **Step 4: Commit**

```bash
git add database/
git commit -m "feat: schema SQL y conexión SQLite"
```

---

### Task 3: Middleware de autenticación + tests

**Files:**
- Create: `middleware/auth.js`
- Create: `tests/auth.test.js`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/auth.test.js`:

```js
const { requireAuth, requireRole } = require('../middleware/auth');

function mockReq(usuario = null) {
  return { session: { usuario } };
}

function mockRes() {
  const res = {};
  res.redirectUrl = null;
  res.statusCode = null;
  res.body = null;
  res.redirect = (url) => { res.redirectUrl = url; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; };
  return res;
}

describe('requireAuth', () => {
  test('redirige a /login si no hay sesion', () => {
    const req = mockReq(null);
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.redirectUrl).toBe('/login');
    expect(next).not.toHaveBeenCalled();
  });

  test('llama next() si hay sesion', () => {
    const req = mockReq({ id: 1, rol: 'admin' });
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  test('bloquea con 403 si el rol no coincide', () => {
    const req = mockReq({ id: 1, rol: 'recepcion' });
    const res = mockRes();
    const next = jest.fn();
    requireRole('admin')(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  test('llama next() si el rol coincide', () => {
    const req = mockReq({ id: 1, rol: 'admin' });
    const res = mockRes();
    const next = jest.fn();
    requireRole('admin', 'tesoreria')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('redirige a /login si no hay sesion', () => {
    const req = mockReq(null);
    const res = mockRes();
    const next = jest.fn();
    requireRole('admin')(req, res, next);
    expect(res.redirectUrl).toBe('/login');
  });
});
```

- [ ] **Step 2: Correr test — verificar que falla**

```bash
npx jest tests/auth.test.js
```

Esperado: FAIL — `Cannot find module '../middleware/auth'`

- [ ] **Step 3: Crear middleware/auth.js**

```js
function requireAuth(req, res, next) {
  if (!req.session.usuario) return res.redirect('/login');
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.usuario) return res.redirect('/login');
    if (!roles.includes(req.session.usuario.rol)) {
      return res.status(403).json({ success: false, error: 'Sin permiso' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
```

- [ ] **Step 4: Correr test — verificar que pasa**

```bash
npx jest tests/auth.test.js
```

Esperado: PASS — 5 tests en verde.

- [ ] **Step 5: Commit**

```bash
git add middleware/auth.js tests/auth.test.js
git commit -m "feat: middleware de autenticacion y tests"
```

---

### Task 4: Servidor principal

**Files:**
- Create: `servidor.js`

- [ ] **Step 1: Crear servidor.js**

```js
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', __dirname);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'mv-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 8 * 60 * 60 * 1000 }
}));

app.get('/', (req, res) => {
  if (req.session.usuario) return res.redirect('/dashboard');
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.usuario) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const usuario = db.prepare('SELECT * FROM usuarios WHERE username = ? AND activo = 1').get(username);
  if (!usuario || !bcrypt.compareSync(password, usuario.password_hash)) {
    return res.json({ success: false, error: 'Usuario o contraseña incorrectos' });
  }
  req.session.usuario = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, username: usuario.username };
  res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/session', (req, res) => {
  res.json({ logged_in: !!req.session.usuario, usuario: req.session.usuario || null });
});

app.get('/dashboard', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.use('/admin', require('./modulo-admin/routes/admin.routes'));
app.use('/socios', require('./modulo-socios/routes/socios.routes'));
app.use('/actividades', require('./modulo-actividades/routes/actividades.routes'));
app.use('/instructores', require('./modulo-instructores/routes/instructores.routes'));
app.use('/cuotas', require('./modulo-cuotas/routes/cuotas.routes'));
app.use('/caja', require('./modulo-caja/routes/caja.routes'));

// Crear usuario admin por defecto si no existe ninguno
const userCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
if (userCount.count === 0) {
  db.prepare('INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES (?, ?, ?, ?)').run(
    'admin',
    bcrypt.hashSync('admin123', 10),
    'Administrador',
    'admin'
  );
  console.log('Usuario admin creado → usuario: admin / contraseña: admin123');
}

app.listen(PORT, () => console.log(`Médanos Verdes corriendo en http://localhost:${PORT}`));
```

- [ ] **Step 2: Crear módulos vacíos (stubs) para que el servidor arranque**

Crear `modulo-admin/routes/admin.routes.js`:
```js
const router = require('express').Router();
module.exports = router;
```

Repetir el mismo contenido para:
- `modulo-socios/routes/socios.routes.js`
- `modulo-actividades/routes/actividades.routes.js`
- `modulo-instructores/routes/instructores.routes.js`
- `modulo-cuotas/routes/cuotas.routes.js`
- `modulo-caja/routes/caja.routes.js`

- [ ] **Step 3: Verificar que el servidor arranca**

```bash
node servidor.js
```

Esperado: `Médanos Verdes corriendo en http://localhost:3000` y `Usuario admin creado → usuario: admin / contraseña: admin123`

Detener con Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add servidor.js modulo-admin/ modulo-socios/ modulo-actividades/ modulo-instructores/ modulo-cuotas/ modulo-caja/
git commit -m "feat: servidor principal con rutas stub y usuario admin por defecto"
```

---

### Task 5: Página de login

**Files:**
- Create: `public/login.html`

- [ ] **Step 1: Crear public/login.html**

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Club Médanos Verdes — Iniciar Sesión</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:'DM Sans',sans-serif; }
        body { min-height:100vh; display:flex; overflow:hidden; }

        .brand-panel {
            flex:1;
            background: linear-gradient(160deg, #0f2d0a 0%, #1a4d12 35%, #2d6219 70%, #3d7a22 100%);
            display:flex; flex-direction:column; justify-content:center;
            align-items:center; padding:60px; position:relative; overflow:hidden;
        }
        .brand-panel::before {
            content:''; position:absolute; inset:0;
            background-image:
                radial-gradient(circle at 20% 50%, rgba(255,255,255,0.06) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 40%),
                radial-gradient(circle at 60% 80%, rgba(255,255,255,0.05) 0%, transparent 45%);
        }
        .grid-pattern {
            position:absolute; inset:0;
            background-image:
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
            background-size:60px 60px;
        }
        .floating-shape { position:absolute; border-radius:50%; border:1px solid rgba(255,255,255,0.1); animation:float 20s ease-in-out infinite; }
        .floating-shape:nth-child(2) { width:300px; height:300px; top:-80px; left:-60px; animation-delay:0s; }
        .floating-shape:nth-child(3) { width:200px; height:200px; bottom:-40px; right:-30px; animation-delay:-7s; }
        .floating-shape:nth-child(4) { width:150px; height:150px; top:40%; right:10%; border:1px solid rgba(255,255,255,0.06); animation-delay:-14s; }
        @keyframes float {
            0%,100% { transform:translate(0,0) rotate(0deg); }
            25% { transform:translate(15px,-20px) rotate(5deg); }
            50% { transform:translate(-10px,15px) rotate(-3deg); }
            75% { transform:translate(20px,10px) rotate(4deg); }
        }
        .brand-content { position:relative; z-index:2; text-align:center; max-width:420px; }
        .brand-logo { width:120px; height:auto; margin:0 auto 24px; display:block; filter:drop-shadow(0 4px 20px rgba(0,0,0,0.4)) brightness(1.1); }
        .brand-title { font-size:38px; font-weight:700; color:white; letter-spacing:-1px; margin-bottom:6px; }
        .brand-subtitle { font-size:15px; color:rgba(255,255,255,0.75); line-height:1.6; margin-bottom:48px; }
        .brand-features { display:grid; grid-template-columns:1fr 1fr; gap:10px; text-align:left; width:100%; }
        .brand-feature { display:flex; align-items:center; gap:10px; padding:11px 14px; background:rgba(255,255,255,0.08); border-radius:12px; border:1px solid rgba(255,255,255,0.1); backdrop-filter:blur(8px); transition:all 0.3s ease; }
        .brand-feature:hover { background:rgba(255,255,255,0.13); transform:translateY(-2px); }
        .feature-icon { width:34px; height:34px; background:rgba(255,255,255,0.15); border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
        .feature-text { color:rgba(255,255,255,0.9); font-size:13px; font-weight:600; line-height:1.2; }
        .feature-text span { display:block; font-size:11px; color:rgba(255,255,255,0.45); font-weight:400; margin-top:2px; }

        .login-panel { width:520px; min-width:420px; background:#0f172a; display:flex; flex-direction:column; justify-content:center; padding:60px; position:relative; }
        .login-panel::before { content:''; position:absolute; inset:0; background: radial-gradient(circle at 80% 20%, rgba(45,98,25,0.15) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(74,171,216,0.08) 0%, transparent 45%); pointer-events:none; }
        .login-header { margin-bottom:40px; position:relative; z-index:1; }
        .login-header h2 { font-size:28px; font-weight:700; color:#f1f5f9; margin-bottom:8px; }
        .login-header p { color:#64748b; font-size:15px; }
        .form-group { margin-bottom:24px; position:relative; z-index:1; }
        .form-label { display:block; font-weight:600; color:#94a3b8; margin-bottom:8px; font-size:13px; text-transform:uppercase; letter-spacing:0.5px; }
        .input-wrapper { position:relative; }
        .input-icon-left { position:absolute; left:16px; top:50%; transform:translateY(-50%); color:#475569; font-size:18px; pointer-events:none; }
        .form-input { width:100%; padding:16px 16px 16px 50px; border:1.5px solid rgba(255,255,255,0.08); border-radius:14px; font-size:15px; color:#f1f5f9; background:rgba(255,255,255,0.05); transition:all 0.3s ease; font-family:'DM Sans',sans-serif; }
        .form-input:focus { outline:none; border-color:#2d6219; background:rgba(45,98,25,0.1); box-shadow:0 0 0 4px rgba(45,98,25,0.2); }
        .form-input::placeholder { color:#334155; }
        .toggle-password { position:absolute; right:16px; top:50%; transform:translateY(-50%); background:none; border:none; color:#475569; cursor:pointer; font-size:18px; padding:4px; }
        .toggle-password:hover { color:#2d6219; }
        .login-btn { width:100%; padding:16px; background:linear-gradient(135deg,#1a4d12,#2d6219); border:none; border-radius:14px; color:white; font-size:16px; font-weight:600; cursor:pointer; transition:all 0.3s ease; font-family:'DM Sans',sans-serif; position:relative; overflow:hidden; margin-top:8px; box-shadow:0 4px 20px rgba(45,98,25,0.4); z-index:1; }
        .login-btn::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent); transition:left 0.5s ease; }
        .login-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(45,98,25,0.45); }
        .login-btn:hover::before { left:100%; }
        .login-btn:active { transform:translateY(0); }
        .login-btn:disabled { background:#94a3b8; cursor:not-allowed; transform:none; box-shadow:none; }
        .btn-loading { display:inline-block; width:18px; height:18px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:spin 0.6s linear infinite; vertical-align:middle; margin-right:8px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .error-message { background:rgba(220,38,38,0.12); border:1px solid rgba(220,38,38,0.3); color:#fca5a5; padding:14px 18px; border-radius:12px; margin-bottom:24px; font-size:14px; display:flex; align-items:center; gap:10px; animation:shake 0.4s ease; position:relative; z-index:1; }
        .error-message.hidden { display:none; }
        @keyframes shake { 0%,100% { transform:translateX(0); } 20% { transform:translateX(-8px); } 40% { transform:translateX(8px); } 60% { transform:translateX(-4px); } 80% { transform:translateX(4px); } }
        .footer-text { text-align:center; margin-top:40px; padding-top:24px; border-top:1px solid rgba(255,255,255,0.06); color:#334155; font-size:13px; line-height:1.6; position:relative; z-index:1; }
        @media (max-width:900px) { body { flex-direction:column; overflow:auto; } .brand-panel { padding:40px 24px; min-height:auto; } .brand-features { display:none; } .brand-subtitle { margin-bottom:0; } .login-panel { width:100%; min-width:auto; padding:40px 24px; flex:1; } }
        .slide-up { animation:slideUp 0.6s ease-out both; }
        .slide-up-delay-1 { animation-delay:0.1s; }
        .slide-up-delay-2 { animation-delay:0.2s; }
        .slide-up-delay-3 { animation-delay:0.3s; }
        .slide-up-delay-4 { animation-delay:0.4s; }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    </style>
</head>
<body>
    <div class="brand-panel">
        <div class="grid-pattern"></div>
        <div class="floating-shape"></div>
        <div class="floating-shape"></div>
        <div class="floating-shape"></div>
        <div class="brand-content">
            <img src="images/logo.png" alt="Club Médanos Verdes" class="brand-logo slide-up">
            <h1 class="brand-title slide-up slide-up-delay-1">Club Médanos Verdes</h1>
            <p class="brand-subtitle slide-up slide-up-delay-2">Para todas las edades · Santa Rosa, La Pampa<br>Sistema de Gestión del Club</p>
            <div class="brand-features slide-up slide-up-delay-3">
                <div class="brand-feature"><div class="feature-icon">👥</div><div class="feature-text">Socios<span>Alta, legajo y estado de cuenta</span></div></div>
                <div class="brand-feature"><div class="feature-icon">🏊</div><div class="feature-text">Actividades<span>Natación, tenis, gimnasia y más</span></div></div>
                <div class="brand-feature"><div class="feature-icon">🏋️</div><div class="feature-text">Instructores<span>Contratos y liquidaciones</span></div></div>
                <div class="brand-feature"><div class="feature-icon">💳</div><div class="feature-text">Cuotas<span>Planes y registro de pagos</span></div></div>
                <div class="brand-feature"><div class="feature-icon">💰</div><div class="feature-text">Caja<span>Ingresos, egresos y reportes</span></div></div>
                <div class="brand-feature"><div class="feature-icon">⚙️</div><div class="feature-text">Admin<span>Usuarios y configuración</span></div></div>
            </div>
        </div>
    </div>
    <div class="login-panel">
        <div class="login-header slide-up">
            <h2>Bienvenido</h2>
            <p>Ingresá tus credenciales para acceder al sistema</p>
        </div>
        <div id="errorMsg" class="error-message hidden">
            <span style="font-size:20px;">⚠️</span>
            <span id="errorText">Error de autenticación</span>
        </div>
        <form onsubmit="login(event)">
            <div class="form-group slide-up slide-up-delay-1">
                <label class="form-label">Usuario</label>
                <div class="input-wrapper">
                    <input type="text" id="username" class="form-input" placeholder="Ingresá tu usuario" required autocomplete="username">
                    <span class="input-icon-left">👤</span>
                </div>
            </div>
            <div class="form-group slide-up slide-up-delay-2">
                <label class="form-label">Contraseña</label>
                <div class="input-wrapper">
                    <input type="password" id="password" class="form-input" style="padding-right:50px;" placeholder="Ingresá tu contraseña" required autocomplete="current-password">
                    <span class="input-icon-left">🔒</span>
                    <button type="button" class="toggle-password" onclick="togglePwd()"><span id="eyeIcon">👁️</span></button>
                </div>
            </div>
            <div class="slide-up slide-up-delay-3">
                <button type="submit" class="login-btn" id="loginBtn">Iniciar Sesión</button>
            </div>
        </form>
        <p class="footer-text slide-up slide-up-delay-4">
            Santa Rosa, La Pampa<br>
            <span style="font-size:11px;color:#1e293b;">v1.0 — Sistema de Gestión del Club</span>
        </p>
    </div>
    <script>
        fetch('/api/session', { credentials:'include' })
            .then(r => r.json())
            .then(d => { if (d.logged_in) window.location.href = '/dashboard'; })
            .catch(() => {});

        function togglePwd() {
            const p = document.getElementById('password');
            const e = document.getElementById('eyeIcon');
            p.type = p.type === 'password' ? 'text' : 'password';
            e.textContent = p.type === 'password' ? '👁️' : '🔓';
        }

        async function login(ev) {
            ev.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const btn = document.getElementById('loginBtn');
            const err = document.getElementById('errorMsg');
            err.classList.add('hidden');
            btn.disabled = true;
            btn.innerHTML = '<span class="btn-loading"></span> Ingresando...';
            try {
                const r = await fetch('/api/login', {
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    credentials:'include',
                    body: JSON.stringify({ username, password })
                });
                const d = await r.json();
                if (d.success) {
                    btn.innerHTML = '✓ Bienvenido!';
                    btn.style.background = '#059669';
                    setTimeout(() => window.location.href = '/dashboard', 500);
                } else {
                    document.getElementById('errorText').textContent = d.error || 'Usuario o contraseña incorrectos';
                    err.classList.remove('hidden');
                    btn.disabled = false;
                    btn.innerHTML = 'Iniciar Sesión';
                }
            } catch(e) {
                document.getElementById('errorText').textContent = 'Error de conexión con el servidor';
                err.classList.remove('hidden');
                btn.disabled = false;
                btn.innerHTML = 'Iniciar Sesión';
            }
        }
        document.getElementById('username').focus();
    </script>
</body>
</html>
```

- [ ] **Step 2: Copiar logo del club**

Descargar `https://www.medanosverdes.com.ar/images/logo.png` y guardar en `public/images/logo.png`.

- [ ] **Step 3: Verificar login en el navegador**

```bash
node servidor.js
```

Abrir `http://localhost:3000` — debe mostrar la página de login con panel verde a la izquierda y formulario oscuro a la derecha. Intentar login con `admin` / `admin123` — debe redirigir (por ahora a dashboard.html que aún no existe, va a dar 404).

- [ ] **Step 4: Commit**

```bash
git add public/
git commit -m "feat: pagina de login con identidad visual Club Medanos Verdes"
```

---

### Task 6: Dashboard

**Files:**
- Create: `public/dashboard.html`

- [ ] **Step 1: Crear public/dashboard.html**

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Club Médanos Verdes — Inicio</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f1f5f9; min-height:100vh; color:#1e293b; }
        body::before { content:''; position:fixed; inset:0; background: radial-gradient(ellipse 80% 60% at 20% 20%, rgba(45,98,25,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(74,171,216,0.05) 0%, transparent 60%); pointer-events:none; z-index:0; }
        .header { position:relative; z-index:10; background:white; border-bottom:1px solid #e2e8f0; padding:0 32px; height:64px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
        .header-brand { display:flex; align-items:center; gap:12px; }
        .header-logo { height:40px; width:auto; }
        .header-text .title { font-size:17px; font-weight:800; color:#0f172a; }
        .header-text .subtitle { font-size:11px; color:#94a3b8; }
        .header-user { display:flex; align-items:center; gap:12px; }
        .user-avatar { width:36px; height:36px; background:linear-gradient(135deg,#2d6219,#4a8c2a); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:800; font-size:14px; }
        .user-info { text-align:right; }
        .user-name { font-size:14px; font-weight:700; color:#0f172a; }
        .user-role { font-size:11px; color:#94a3b8; }
        .btn-logout { padding:7px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:12px; font-weight:700; color:#64748b; cursor:pointer; transition:all .15s; }
        .btn-logout:hover { background:#fef2f2; border-color:#fecaca; color:#dc2626; }
        .main { position:relative; z-index:1; max-width:1100px; margin:0 auto; padding:40px 24px 60px; min-height:calc(100vh - 64px); display:flex; flex-direction:column; }
        .welcome { margin-bottom:40px; }
        .welcome-greeting { font-size:13px; font-weight:600; color:#2d6219; text-transform:uppercase; letter-spacing:.1em; margin-bottom:6px; }
        .welcome-title { font-size:32px; font-weight:800; color:#0f172a; line-height:1.2; }
        .welcome-title span { color:#2d6219; }
        .welcome-sub { font-size:15px; color:#94a3b8; margin-top:8px; }
        .section-title { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.1em; margin:0 0 16px; display:flex; align-items:center; gap:10px; }
        .section-title::after { content:''; flex:1; height:1px; background:#e2e8f0; }
        .modules-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:16px; }
        .module-card { background:white; border:1.5px solid #e2e8f0; border-radius:18px; padding:28px 24px 22px; cursor:pointer; text-decoration:none; display:flex; flex-direction:column; gap:14px; position:relative; overflow:hidden; transition:transform .2s,box-shadow .2s,border-color .2s; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
        .module-card::after { content:''; position:absolute; inset:0; background:radial-gradient(circle at 70% 0%, var(--glow), transparent 65%); opacity:0; transition:opacity .3s; pointer-events:none; }
        .module-card:hover { transform:translateY(-4px); box-shadow:0 8px 30px rgba(0,0,0,0.1); border-color:var(--border-hover); }
        .module-card:hover::after { opacity:1; }
        .module-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--accent); border-radius:18px 18px 0 0; }
        .module-icon { width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:26px; background:var(--icon-bg); border:1px solid var(--icon-border); }
        .module-name { font-size:17px; font-weight:800; color:#0f172a; }
        .module-desc { font-size:13px; color:#64748b; line-height:1.55; }
        .module-arrow { margin-top:auto; font-size:12px; font-weight:700; color:var(--accent-text); display:flex; align-items:center; gap:5px; opacity:.8; transition:opacity .2s,gap .2s; }
        .module-card:hover .module-arrow { opacity:1; gap:8px; }
        .mod-socios       { --accent:linear-gradient(90deg,#2d6219,#4a8c2a); --glow:rgba(45,98,25,0.15);    --border-hover:rgba(45,98,25,0.35);   --icon-bg:rgba(45,98,25,0.1);   --icon-border:rgba(45,98,25,0.2);   --accent-text:#4a8c2a; }
        .mod-actividades  { --accent:linear-gradient(90deg,#0891b2,#22d3ee); --glow:rgba(8,145,178,0.15);   --border-hover:rgba(8,145,178,0.35);  --icon-bg:rgba(8,145,178,0.1);  --icon-border:rgba(8,145,178,0.2);  --accent-text:#22d3ee; }
        .mod-instructores { --accent:linear-gradient(90deg,#7a8c2e,#a3b542); --glow:rgba(122,140,46,0.15);  --border-hover:rgba(122,140,46,0.35); --icon-bg:rgba(122,140,46,0.1); --icon-border:rgba(122,140,46,0.2); --accent-text:#a3b542; }
        .mod-cuotas       { --accent:linear-gradient(90deg,#059669,#34d399); --glow:rgba(5,150,105,0.15);   --border-hover:rgba(5,150,105,0.35);  --icon-bg:rgba(5,150,105,0.1);  --icon-border:rgba(5,150,105,0.2);  --accent-text:#34d399; }
        .mod-caja         { --accent:linear-gradient(90deg,#d97706,#fbbf24); --glow:rgba(217,119,6,0.15);   --border-hover:rgba(217,119,6,0.35);  --icon-bg:rgba(217,119,6,0.1);  --icon-border:rgba(217,119,6,0.2);  --accent-text:#fbbf24; }
        .mod-admin        { --accent:linear-gradient(90deg,#dc2626,#f87171); --glow:rgba(220,38,38,0.15);   --border-hover:rgba(220,38,38,0.35);  --icon-bg:rgba(220,38,38,0.1);  --icon-border:rgba(220,38,38,0.2);  --accent-text:#f87171; }
        .bottom-bar { margin-top:auto; padding-top:40px; display:flex; align-items:center; justify-content:space-between; border-top:1px solid #e2e8f0; flex-wrap:wrap; gap:12px; }
        .bottom-date { font-size:13px; color:#94a3b8; }
        .bottom-brand { font-size:12px; color:#2d6219; font-weight:700; letter-spacing:.05em; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-brand">
            <img src="images/logo.png" alt="Club Médanos Verdes" class="header-logo">
            <div class="header-text">
                <div class="title">Club Médanos Verdes</div>
                <div class="subtitle">Para todas las edades</div>
            </div>
        </div>
        <div class="header-user">
            <div class="user-info">
                <div class="user-name" id="userName">—</div>
                <div class="user-role" id="userRole">—</div>
            </div>
            <div class="user-avatar" id="userAvatar">?</div>
            <button class="btn-logout" onclick="logout()">Salir</button>
        </div>
    </div>
    <div class="main">
        <div class="welcome">
            <div class="welcome-greeting" id="greeting">Bienvenido</div>
            <h1 class="welcome-title">Hola, <span id="welcomeName">—</span></h1>
            <p class="welcome-sub">¿Qué vas a gestionar hoy?</p>
        </div>
        <div class="section-title">Módulos del sistema</div>
        <div class="modules-grid" id="modulesGrid"></div>
        <div class="bottom-bar">
            <div class="bottom-date">Hoy es <strong id="fechaHoy">—</strong></div>
            <div class="bottom-brand">CLUB MÉDANOS VERDES</div>
        </div>
    </div>
    <script>
        const MODULES = [
            { key:'socios',       href:'/socios',       icon:'👥',  name:'Socios',          desc:'Alta, legajo y estado de cuenta de socios',       css:'mod-socios',       roles:['admin','recepcion','tesoreria'] },
            { key:'actividades',  href:'/actividades',  icon:'🏊',  name:'Actividades',     desc:'Natación, tenis, gimnasia y más',                  css:'mod-actividades',  roles:['admin','recepcion','instructor'] },
            { key:'instructores', href:'/instructores', icon:'🏋️', name:'Instructores',    desc:'Contratos, clases y liquidaciones mensuales',      css:'mod-instructores', roles:['admin','recepcion','tesoreria','instructor'] },
            { key:'cuotas',       href:'/cuotas',       icon:'💳',  name:'Cuotas y Pagos',  desc:'Planes, cobros y estado de deuda por socio',       css:'mod-cuotas',       roles:['admin','recepcion','tesoreria'] },
            { key:'caja',         href:'/caja',         icon:'💰',  name:'Caja',            desc:'Ingresos, egresos y reportes de tesorería',        css:'mod-caja',         roles:['admin','tesoreria'] },
            { key:'admin',        href:'/admin',        icon:'⚙️',  name:'Admin',           desc:'Usuarios y configuración del sistema',             css:'mod-admin',        roles:['admin'] },
        ];
        const ROLE_LABELS = { admin:'Administrador', recepcion:'Recepción', tesoreria:'Tesorería', instructor:'Instructor' };

        async function init() {
            const r = await fetch('/api/session', { credentials:'include' });
            const d = await r.json();
            if (!d.logged_in) { window.location.href = '/login'; return; }
            const u = d.usuario;
            document.getElementById('userName').textContent = u.nombre;
            document.getElementById('userRole').textContent = ROLE_LABELS[u.rol] || u.rol;
            document.getElementById('userAvatar').textContent = (u.nombre || 'U')[0].toUpperCase();
            document.getElementById('welcomeName').textContent = u.nombre.split(' ')[0];
            const h = new Date().getHours();
            document.getElementById('greeting').textContent = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
            document.getElementById('fechaHoy').textContent = new Date().toLocaleDateString('es-AR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
            const grid = document.getElementById('modulesGrid');
            MODULES.filter(m => m.roles.includes(u.rol)).forEach(m => {
                grid.innerHTML += `<a href="${m.href}" class="module-card ${m.css}">
                    <div class="module-icon">${m.icon}</div>
                    <div class="module-name">${m.name}</div>
                    <div class="module-desc">${m.desc}</div>
                    <div class="module-arrow">Abrir módulo →</div>
                </a>`;
            });
        }

        async function logout() {
            await fetch('/api/logout', { method:'POST', credentials:'include' });
            window.location.href = '/login';
        }

        init();
    </script>
</body>
</html>
```

- [ ] **Step 2: Probar el flujo completo**

```bash
node servidor.js
```

1. Abrir `http://localhost:3000` → redirige a `/login`
2. Login con `admin` / `admin123` → redirige a `/dashboard`
3. Dashboard muestra 6 tarjetas con colores del club
4. Click en "Salir" → vuelve al login

- [ ] **Step 3: Commit**

```bash
git add public/dashboard.html
git commit -m "feat: dashboard con tarjetas de modulos y control de roles"
```

---

## Fase 7: Módulo Caja / Tesorería (Tasks 19-20)

### Task 19: Módulo Caja — Backend (rutas y controlador)

**Files:**
- Create: `modulo-caja/routes/caja.routes.js`
- Create: `modulo-caja/controllers/caja.controller.js`

- [ ] **Step 1: Crear modulo-caja/controllers/caja.controller.js**

```js
const db = require('../../database/db');

async function obtenerMovimientos(req, res) {
  try {
    const movimientos = db.prepare(`
      SELECT mc.*, u.nombre as usuario_nombre
      FROM movimientos_caja mc
      LEFT JOIN usuarios u ON mc.usuario_id = u.id
      ORDER BY mc.fecha DESC
    `).all();
    res.json({ success: true, movimientos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function registrarMovimiento(req, res) {
  const { tipo, concepto, importe, referencia_id, referencia_tipo } = req.body;
  const usuario_id = req.session.usuario?.id;

  if (!tipo || !concepto || !importe) {
    return res.json({ success: false, error: 'Faltam campos requeridos' });
  }
  if (!['ingreso', 'egreso'].includes(tipo)) {
    return res.json({ success: false, error: 'Tipo debe ser ingreso o egreso' });
  }

  try {
    const fecha = new Date().toISOString().split('T')[0];
    const result = db.prepare(`
      INSERT INTO movimientos_caja (fecha, tipo, concepto, importe, referencia_id, referencia_tipo, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(fecha, tipo, concepto, importe, referencia_id || null, referencia_tipo || null, usuario_id);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function obtenerReporteDelMes(req, res) {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const mesAnio = `${año}-${mes}`;
  const mesAnioSiguiente = fecha.getMonth() === 11 
    ? `${año + 1}-01`
    : `${año}-${String(fecha.getMonth() + 2).padStart(2, '0')}`;

  try {
    const ingresos = db.prepare(`
      SELECT COALESCE(SUM(importe), 0) as total
      FROM movimientos_caja
      WHERE tipo = 'ingreso' AND fecha >= ? AND fecha < ?
    `).get(mesAnio + '-01', mesAnioSiguiente + '-01');

    const egresos = db.prepare(`
      SELECT COALESCE(SUM(importe), 0) as total
      FROM movimientos_caja
      WHERE tipo = 'egreso' AND fecha >= ? AND fecha < ?
    `).get(mesAnio + '-01', mesAnioSiguiente + '-01');

    const saldo = ingresos.total - egresos.total;

    res.json({
      success: true,
      mes: mesAnio,
      ingresos: ingresos.total,
      egresos: egresos.total,
      saldo: saldo
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function obtenerResumenPorConcepto(req, res) {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');

  try {
    const resumen = db.prepare(`
      SELECT concepto, tipo, COUNT(*) as cantidad, SUM(importe) as total
      FROM movimientos_caja
      WHERE fecha >= ? AND fecha < ?
      GROUP BY concepto, tipo
      ORDER BY concepto
    `).all(`${año}-${mes}-01`, `${año}-${String(parseInt(mes) + 1).padStart(2, '0')}-01`);

    res.json({ success: true, resumen });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerMovimientos,
  registrarMovimiento,
  obtenerReporteDelMes,
  obtenerResumenPorConcepto
};
```

- [ ] **Step 2: Crear modulo-caja/routes/caja.routes.js**

```js
const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');
const {
  obtenerMovimientos,
  registrarMovimiento,
  obtenerReporteDelMes,
  obtenerResumenPorConcepto
} = require('../controllers/caja.controller');

// GET movimientos — solo tesorería y admin
router.get('/api/caja/movimientos', requireRole(['admin', 'tesoreria']), obtenerMovimientos);

// POST nuevo movimiento — solo tesorería y admin
router.post('/api/caja/movimiento', requireRole(['admin', 'tesoreria']), registrarMovimiento);

// GET reporte del mes — solo tesorería y admin
router.get('/api/caja/reporte', requireRole(['admin', 'tesoreria']), obtenerReporteDelMes);

// GET resumen por concepto — solo tesorería y admin
router.get('/api/caja/resumen', requireRole(['admin', 'tesoreria']), obtenerResumenPorConcepto);

// GET página principal del módulo
router.get('/caja', requireRole(['admin', 'tesoreria']), (req, res) => {
  res.render('caja', { usuario: req.session.usuario });
});

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add modulo-caja/
git commit -m "feat: modulo caja con endpoints de movimientos y reportes"
```

---

### Task 20: Módulo Caja — Frontend (vistas)

**Files:**
- Create: `modulo-caja/views/caja.ejs`

- [ ] **Step 1: Crear modulo-caja/views/caja.ejs**

```ejs
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Caja — Club Médanos Verdes</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; background: #f1f5f9; color: #1e293b; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }

        .header { background: linear-gradient(90deg, #2d6219, #4a8c2a); color: white; padding: 30px 20px; margin: -20px -20px 30px -20px; }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header p { opacity: 0.9; }

        .top-bar { display: flex; gap: 15px; margin-bottom: 30px; flex-wrap: wrap; }
        .btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s; font-family: 'DM Sans'; }
        .btn-primary { background: #2d6219; color: white; }
        .btn-primary:hover { background: #1f4511; transform: translateY(-2px); }
        .btn-secondary { background: #e2e8f0; color: #334155; }
        .btn-secondary:hover { background: #cbd5e1; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #2d6219; }
        .stat-label { font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 8px; }
        .stat-value { font-size: 24px; font-weight: 700; color: #2d6219; }
        .stat-card.egreso { border-left-color: #dc2626; }
        .stat-card.egreso .stat-value { color: #dc2626; }
        .stat-card.saldo { border-left-color: #059669; }
        .stat-card.saldo .stat-value { color: #059669; }

        .section-title { font-size: 18px; font-weight: 700; margin-bottom: 15px; color: #1e293b; }
        .content-card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 20px; margin-bottom: 30px; }

        .search-bar { display: flex; gap: 10px; margin-bottom: 20px; }
        .search-bar input { flex: 1; padding: 10px 15px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'DM Sans'; }
        .search-bar select { padding: 10px 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; font-family: 'DM Sans'; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f8fafc; padding: 12px; text-align: left; font-weight: 600; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
        tr:hover { background: #f8fafc; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-ingreso { background: #d1fae5; color: #065f46; }
        .badge-egreso { background: #fee2e2; color: #7f1d1d; }
        .empty-state { text-align: center; padding: 40px; color: #94a3b8; }

        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
        .modal.active { display: flex; }
        .modal-content { background: white; border-radius: 12px; padding: 30px; max-width: 500px; width: 90%; }
        .modal-header { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
        .modal-close { position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; font-weight: 500; margin-bottom: 5px; }
        .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'DM Sans'; }
        .form-actions { display: flex; gap: 10px; margin-top: 20px; }
        .form-actions button { flex: 1; padding: 10px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-family: 'DM Sans'; }
        .form-actions .btn-submit { background: #2d6219; color: white; }
        .form-actions .btn-cancel { background: #e2e8f0; color: #334155; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💰 Caja / Tesorería</h1>
            <p>Movimientos de ingresos, egresos y reportes financieros</p>
        </div>

        <!-- Stats Cards -->
        <div class="stats-grid" id="statsGrid">
            <div class="stat-card">
                <div class="stat-label">Ingresos del mes</div>
                <div class="stat-value" id="statIngresos">$0</div>
            </div>
            <div class="stat-card egreso">
                <div class="stat-label">Egresos del mes</div>
                <div class="stat-value" id="statEgresos">$0</div>
            </div>
            <div class="stat-card saldo">
                <div class="stat-label">Saldo disponible</div>
                <div class="stat-value" id="statSaldo">$0</div>
            </div>
        </div>

        <!-- Top Actions -->
        <div class="top-bar">
            <button class="btn btn-primary" onclick="abrirModalMovimiento()">+ Registrar movimiento</button>
            <button class="btn btn-secondary" onclick="descargarReporte()">↓ Descargar reporte</button>
        </div>

        <!-- Movimientos Table -->
        <div class="content-card">
            <div class="section-title">Movimientos recientes</div>
            <div class="search-bar">
                <input type="text" id="filterConcepto" placeholder="Buscar por concepto..." onkeyup="filtrarMovimientos()">
                <select id="filterTipo" onchange="filtrarMovimientos()">
                    <option value="">Todos los tipos</option>
                    <option value="ingreso">Ingresos</option>
                    <option value="egreso">Egresos</option>
                </select>
            </div>
            <table id="movimientosTable">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Concepto</th>
                        <th>Importe</th>
                        <th>Usuario</th>
                    </tr>
                </thead>
                <tbody id="movimientosBody">
                    <tr><td colspan="5" class="empty-state">Cargando movimientos...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- Resumen por Concepto -->
        <div class="content-card">
            <div class="section-title">Resumen por concepto</div>
            <table id="resumenTable">
                <thead>
                    <tr>
                        <th>Concepto</th>
                        <th>Tipo</th>
                        <th>Cantidad de movimientos</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody id="resumenBody">
                    <tr><td colspan="4" class="empty-state">Cargando resumen...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Modal Movimiento -->
    <div class="modal" id="modalMovimiento">
        <div style="position: relative;">
            <button class="modal-close" onclick="cerrarModal('modalMovimiento')">✕</button>
            <div class="modal-content">
                <div class="modal-header">Registrar movimiento</div>
                <form onsubmit="guardarMovimiento(event)">
                    <div class="form-group">
                        <label>Tipo *</label>
                        <select id="nuevoTipo" required>
                            <option value="">Seleccionar...</option>
                            <option value="ingreso">Ingreso</option>
                            <option value="egreso">Egreso</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Concepto *</label>
                        <input type="text" id="nuevoConcepto" placeholder="ej: Pago de cuota, Liquidación instructor..." required>
                    </div>
                    <div class="form-group">
                        <label>Importe *</label>
                        <input type="number" id="nuevoImporte" placeholder="0.00" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>Referencia (opcional)</label>
                        <select id="nuevoTipoRef">
                            <option value="">Ninguna</option>
                            <option value="pago">Pago de socio</option>
                            <option value="liquidacion">Liquidación instructor</option>
                            <option value="manual">Movimiento manual</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-submit">Guardar</button>
                        <button type="button" class="btn-cancel" onclick="cerrarModal('modalMovimiento')">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        let allMovimientos = [];
        let allResumen = [];

        async function cargarMovimientos() {
            try {
                const r = await fetch('/api/caja/movimientos', { credentials: 'include' });
                const d = await r.json();
                if (d.success) {
                    allMovimientos = d.movimientos || [];
                    renderMovimientos();
                }
            } catch (err) {
                console.error(err);
            }
        }

        async function cargarReporte() {
            try {
                const r = await fetch('/api/caja/reporte', { credentials: 'include' });
                const d = await r.json();
                if (d.success) {
                    document.getElementById('statIngresos').textContent = '$' + d.ingresos.toFixed(2);
                    document.getElementById('statEgresos').textContent = '$' + d.egresos.toFixed(2);
                    document.getElementById('statSaldo').textContent = '$' + d.saldo.toFixed(2);
                }
            } catch (err) {
                console.error(err);
            }
        }

        async function cargarResumen() {
            try {
                const r = await fetch('/api/caja/resumen', { credentials: 'include' });
                const d = await r.json();
                if (d.success) {
                    allResumen = d.resumen || [];
                    renderResumen();
                }
            } catch (err) {
                console.error(err);
            }
        }

        function renderMovimientos() {
            const body = document.getElementById('movimientosBody');
            if (allMovimientos.length === 0) {
                body.innerHTML = '<tr><td colspan="5" class="empty-state">No hay movimientos registrados</td></tr>';
                return;
            }
            body.innerHTML = allMovimientos.map(m => `
                <tr>
                    <td>${m.fecha}</td>
                    <td><span class="badge badge-${m.tipo}">${m.tipo.toUpperCase()}</span></td>
                    <td>${m.concepto}</td>
                    <td>$${m.importe.toFixed(2)}</td>
                    <td>${m.usuario_nombre || '—'}</td>
                </tr>
            `).join('');
        }

        function renderResumen() {
            const body = document.getElementById('resumenBody');
            if (allResumen.length === 0) {
                body.innerHTML = '<tr><td colspan="4" class="empty-state">No hay resumen disponible</td></tr>';
                return;
            }
            body.innerHTML = allResumen.map(r => `
                <tr>
                    <td>${r.concepto}</td>
                    <td><span class="badge badge-${r.tipo}">${r.tipo.toUpperCase()}</span></td>
                    <td>${r.cantidad}</td>
                    <td>$${r.total.toFixed(2)}</td>
                </tr>
            `).join('');
        }

        function filtrarMovimientos() {
            const concepto = document.getElementById('filterConcepto').value.toLowerCase();
            const tipo = document.getElementById('filterTipo').value;
            const filtered = allMovimientos.filter(m => {
                const matchConcepto = m.concepto.toLowerCase().includes(concepto);
                const matchTipo = !tipo || m.tipo === tipo;
                return matchConcepto && matchTipo;
            });
            const body = document.getElementById('movimientosBody');
            if (filtered.length === 0) {
                body.innerHTML = '<tr><td colspan="5" class="empty-state">No hay movimientos que coincidan</td></tr>';
                return;
            }
            body.innerHTML = filtered.map(m => `
                <tr>
                    <td>${m.fecha}</td>
                    <td><span class="badge badge-${m.tipo}">${m.tipo.toUpperCase()}</span></td>
                    <td>${m.concepto}</td>
                    <td>$${m.importe.toFixed(2)}</td>
                    <td>${m.usuario_nombre || '—'}</td>
                </tr>
            `).join('');
        }

        async function guardarMovimiento(e) {
            e.preventDefault();
            const tipo = document.getElementById('nuevoTipo').value;
            const concepto = document.getElementById('nuevoConcepto').value;
            const importe = parseFloat(document.getElementById('nuevoImporte').value);
            const tipoRef = document.getElementById('nuevoTipoRef').value;

            if (!tipo || !concepto || !importe) {
                alert('Por favor completa los campos requeridos');
                return;
            }

            try {
                const r = await fetch('/api/caja/movimiento', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ tipo, concepto, importe, referencia_tipo: tipoRef })
                });
                const d = await r.json();
                if (d.success) {
                    cerrarModal('modalMovimiento');
                    cargarMovimientos();
                    cargarReporte();
                    cargarResumen();
                    e.target.reset();
                } else {
                    alert('Error: ' + d.error);
                }
            } catch (err) {
                alert('Error al guardar: ' + err.message);
            }
        }

        function abrirModalMovimiento() {
            document.getElementById('modalMovimiento').classList.add('active');
        }

        function cerrarModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        function descargarReporte() {
            const csv = 'Fecha,Tipo,Concepto,Importe,Usuario\n' + allMovimientos.map(m =>
                `${m.fecha},"${m.tipo}","${m.concepto}",${m.importe},"${m.usuario_nombre || ''}"`
            ).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `caja-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
        }

        // Cargar datos al abrir la página
        cargarMovimientos();
        cargarReporte();
        cargarResumen();

        // Actualizar cada 30 segundos
        setInterval(() => {
            cargarMovimientos();
            cargarReporte();
            cargarResumen();
        }, 30000);
    </script>
</body>
</html>
```

- [ ] **Step 2: Agregar ruta al servidor.js**

En `servidor.js`, antes del `servidor.listen()`:

```js
// Módulo Caja
const cajaRoutes = require('./modulo-caja/routes/caja.routes');
servidor.use(cajaRoutes);
```

- [ ] **Step 3: Probar el módulo**

```bash
node servidor.js
```

1. Abrir `http://localhost:3000/dashboard`
2. Si tu rol es **Tesorería** o **Admin**, se muestra la tarjeta "Caja"
3. Click en "Caja" → abre el módulo
4. Ver movimientos existentes, registrar uno nuevo, ver reporte mensual

- [ ] **Step 4: Commit**

```bash
git add modulo-caja/
git commit -m "feat: modulo caja con movimientos, reportes y descarga CSV"
```

---

## Próximos pasos (fuera de alcance v1)

1. **Módulo de asistencia** — registrar asistencia de socios a actividades
2. **Integración de pagos online** — Mercado Pago, Stripe
3. **Notificaciones** — email/WhatsApp para vencimientos de cuota
4. **App móvil** — React Native / Flutter
5. **Inteligencia de negocios** — reportes avanzados, dashboard analítico

