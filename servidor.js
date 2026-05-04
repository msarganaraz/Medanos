const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const { initDB } = require('./database/db');
const { requireAuth } = require('./middleware/auth');

let db;
const servidor = express();

// Configurar vistas en múltiples directorios
servidor.set('view engine', 'ejs');
servidor.set('views', [
  path.join(__dirname, 'views'),
  path.join(__dirname, 'modulo-admin/views'),
  path.join(__dirname, 'modulo-socios/views'),
  path.join(__dirname, 'modulo-actividades/views'),
  path.join(__dirname, 'modulo-instructores/views'),
  path.join(__dirname, 'modulo-cuotas/views'),
  path.join(__dirname, 'modulo-caja/views')
]);

// Middleware
servidor.use(express.json());
servidor.use(express.urlencoded({ extended: true }));
servidor.use(express.static(path.join(__dirname, 'public')));

// Sesiones
servidor.use(session({
  secret: 'medanos-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// Rutas públicas
servidor.get('/', (req, res) => {
  if (req.session.usuario) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

servidor.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// API de login
servidor.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ success: false, error: 'Username y password requeridos' });
  }

  try {
    const usuario = db.prepare('SELECT * FROM usuarios WHERE username = ?').get(username);

    if (!usuario || !bcrypt.compareSync(password, usuario.password_hash)) {
      return res.json({ success: false, error: 'Credenciales inválidas' });
    }

    if (!usuario.activo) {
      return res.json({ success: false, error: 'Usuario inactivo' });
    }

    req.session.usuario = {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      rol: usuario.rol
    };

    res.json({ success: true, usuario: req.session.usuario });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API de logout
servidor.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true });
  });
});

// API de sesión
servidor.get('/api/session', (req, res) => {
  if (req.session.usuario) {
    res.json({ logged_in: true, usuario: req.session.usuario });
  } else {
    res.json({ logged_in: false });
  }
});

// Dashboard
servidor.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Iniciar servidor
(async () => {
  db = require('./database/db');
  await initDB();

  // Inicializar usuario admin por defecto
  try {
    const admin = db.prepare('SELECT * FROM usuarios WHERE username = ?').get('admin');
    if (!admin) {
      const passwordHash = bcrypt.hashSync('admin123', 10);
      db.prepare(`
        INSERT INTO usuarios (username, password_hash, nombre, rol, activo)
        VALUES (?, ?, ?, ?, ?)
      `).run('admin', passwordHash, 'Administrador', 'admin', 1);
      console.log('✓ Usuario admin creado (admin / admin123)');
    }
  } catch (err) {
    console.error('Error inicializando admin:', err.message);
  }

  // Mountar módulos
  servidor.use(require('./modulo-admin/routes/admin.routes'));
  servidor.use(require('./modulo-socios/routes/socios.routes'));
  servidor.use(require('./modulo-actividades/routes/actividades.routes'));
  servidor.use(require('./modulo-instructores/routes/instructores.routes'));
  servidor.use(require('./modulo-cuotas/routes/cuotas.routes'));
  servidor.use(require('./modulo-caja/routes/caja.routes'));

  const PORT = process.env.PORT || 3000;
  servidor.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
    console.log('📁 Base de datos: database/medanos.db');
  });
})();

module.exports = servidor;
