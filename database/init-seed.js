const db = require('./db');
const bcrypt = require('bcryptjs');

function parseDiasHorario(diasHorarioStr) {
  // Example: "Lun-Mié-Vie 18:00 a 19:00" → { dias: [0, 2, 4], hora_inicio: 18, hora_fin: 19 }
  const diasMap = { 'Lun': 0, 'Mar': 1, 'Mié': 2, 'Jue': 3, 'Vie': 4, 'Sab': 5, 'Dom': 6 };

  // Split by whitespace to separate dias from horarios
  const parts = diasHorarioStr.split(' ');
  const diasStr = parts[0]; // "Lun-Mié-Vie"
  const horaInicio = parseInt(parts[1]); // "18:00" → 18
  const horaFin = parseInt(parts[3]); // "19:00" → 19

  const dias = diasStr.split('-').map(d => diasMap[d]);

  return { dias, hora_inicio: horaInicio, hora_fin: horaFin };
}

async function initSeed() {
  try {
    // Verificar si la tabla usuarios tiene datos
    const usuariosCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();

    if (usuariosCount.count > 0) {
      console.log('✓ Base de datos ya inicializada');
      return;
    }

    console.log('⚠ Inicializando base de datos con datos de prueba...');

    // Admin user
    const adminHash = bcrypt.hashSync('admin', 10);
    db.prepare(`
      INSERT INTO usuarios (username, password_hash, nombre, rol, activo)
      VALUES (?, ?, ?, ?, 1)
    `).run('admin', adminHash, 'Administrador', 'admin');

    // Socios
    const socios = [
      ['S001', 'García', 'Juan Carlos', '35123456', '1985-03-15', '2235551234', 'jgarcia@email.com', 'Calle 1 #123, CABA', '2024-01-10', 'ACTIVO'],
      ['S002', 'López', 'María Fernanda', '32987654', '1990-07-22', '2235559876', 'mlopez@email.com', 'Av. Principal #456, CABA', '2024-02-05', 'ACTIVO'],
      ['S003', 'Rodríguez', 'Carlos Alberto', '30111222', '1988-11-08', '2235552222', 'crodriguez@email.com', 'Calle 2 #789, PBA', '2024-01-20', 'ACTIVO'],
      ['S004', 'Martínez', 'Ana Laura', '33445566', '1992-05-30', '2235553333', 'amartinez@email.com', 'Calle 3 #321, CABA', '2024-03-01', 'ACTIVO'],
      ['S005', 'González', 'Roberto Miguel', '34556677', '1987-09-14', '2235554444', 'rgonzalez@email.com', 'Av. Secundaria #654, PBA', '2024-02-15', 'ACTIVO'],
      ['S006', 'Pérez', 'Sofía Valentina', '35667788', '1995-12-25', '2235555555', 'sperez@email.com', 'Calle 4 #987, CABA', '2023-11-10', 'ACTIVO'],
      ['S007', 'Fernández', 'Diego Javier', '31778899', '1991-01-19', '2235556666', 'dfernandez@email.com', 'Calle 5 #135, PBA', '2024-02-28', 'SUSPENDIDO'],
      ['S008', 'Silva', 'Mariana Cecilia', '32889900', '1989-08-03', '2235557777', 'msilva@email.com', 'Av. Tercera #246, CABA', '2023-12-05', 'ACTIVO'],
      ['S009', 'Torres', 'Gabriel Andrés', '36990011', '1993-04-11', '2235558888', 'gtorres@email.com', 'Calle 6 #369, PBA', '2024-03-10', 'ACTIVO'],
      ['S010', 'Moreno', 'Lucía Patricia', '33001122', '1986-06-07', '2235559999', 'lmoreno@email.com', 'Av. Cuarta #147, CABA', '2024-01-25', 'ACTIVO']
    ];

    socios.forEach(s => {
      db.prepare(`
        INSERT INTO socios (numero_socio, apellido, nombre, dni, fecha_nacimiento, telefono, email, domicilio, fecha_alta, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(...s);
    });

    // Actividades
    const actividades = [
      ['Natación', 'Clases de natación para todas las edades', 'Lun-Mié-Vie 18:00 a 19:00', 1500.00, 1],
      ['Tenis', 'Clases de tenis nivel inicial e intermedio', 'Mar-Jue 17:00 a 18:30', 2000.00, 1],
      ['Gimnasia Artística', 'Gimnasia artística para niños y adolescentes', 'Mar-Jue 16:00 a 17:30', 1800.00, 1],
      ['Pilates', 'Clases de pilates para adultos', 'Lun-Mié-Vie 10:00 a 11:00', 1200.00, 1],
      ['Fútbol', 'Entrenamientos de fútbol mixto', 'Mar-Jue 19:00 a 20:30', 1600.00, 1],
      ['Yoga', 'Yoga hatha y vinyasa', 'Lun-Mié 19:30 a 20:30, Dom 10:00 a 11:30', 1000.00, 1]
    ];

    actividades.forEach(a => {
      db.prepare(`
        INSERT INTO actividades (nombre, descripcion, dias_horario, precio_base, activo)
        VALUES (?, ?, ?, ?, ?)
      `).run(...a);
    });

    // Create franjas_horarias for each activity
    const actividades_list = [
      { id: 1, dias_horario: 'Lun-Mié-Vie 7:00 a 8:00' },
      { id: 2, dias_horario: 'Mar-Jue 17:00 a 18:30' },
      { id: 3, dias_horario: 'Mar-Jue 16:00 a 17:30' },
      { id: 4, dias_horario: 'Lun-Mié-Vie 10:00 a 11:00' },
      { id: 5, dias_horario: 'Mar-Jue 19:00 a 20:30' },
      { id: 6, dias_horario: 'Lun-Mié 19:30 a 20:30, Dom 10:00 a 11:30' }
    ];

    const insertFranja = db.prepare(`
      INSERT INTO franjas_horarias (actividad_id, dia_semana, hora_inicio, hora_fin)
      VALUES (?, ?, ?, ?)
    `);

    actividades_list.forEach(act => {
      const parsed = parseDiasHorario(act.dias_horario.split(',')[0]);
      parsed.dias.forEach(day => {
        insertFranja.run(act.id, day, parsed.hora_inicio, parsed.hora_fin);
      });
    });

    // Mark Yoga as flexible (no fixed horarios)
    db.prepare('UPDATE actividades SET tiene_horarios_flexibles = 1 WHERE nombre = ?').run('Yoga');

    // Instructores
    const instructores = [
      ['Sánchez', 'Pablo Javier', '28123456', '20281234567', '2235551111', 'pablo.sanchez@email.com', 'fijo', 35000.00, 0, 0],
      ['Ríos', 'Marina Alessandra', '29234567', '27292345672', '2235552222', 'marina.rios@email.com', 'por_hora', 0, 800.00, 0],
      ['Domínguez', 'Lucas Mateo', '30345678', '20303456789', '2235553333', 'lucas.dominguez@email.com', 'combinado', 15000.00, 500.00, 0],
      ['Castillo', 'Andrea Beatriz', '31456789', '27314567899', '2235554444', 'andrea.castillo@email.com', 'por_alumno', 0, 0, 150.00],
      ['Ruiz', 'Fernando Miguel', '32567890', '20325678900', '2235555555', 'fernando.ruiz@email.com', 'fijo', 40000.00, 0, 0]
    ];

    instructores.forEach(i => {
      db.prepare(`
        INSERT INTO instructores (apellido, nombre, dni, cuil, telefono, email, tipo_contrato, monto_fijo, valor_hora, valor_por_alumno)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(...i);
    });

    // Add sample socio_franjas assignments (first 5 socios to first 6 franjas)
    const today = new Date().toISOString().split('T')[0];
    // Assign socios 1-5 to franjas 1-6 in a round-robin pattern
    for (let socio_id = 1; socio_id <= 5; socio_id++) {
      for (let franja_id = 1; franja_id <= 6; franja_id++) {
        if ((socio_id + franja_id) % 2 === 0) { // Assign every other combo
          db.prepare(`
            INSERT INTO socio_franjas (socio_id, franja_id, fecha_desde)
            VALUES (?, ?, ?)
          `).run(socio_id, franja_id, today);
        }
      }
    }

    // Add sample instructor_franjas assignments
    // Assign instructores 1-3 to franjas 1-6
    for (let instr_id = 1; instr_id <= 3; instr_id++) {
      for (let franja_id = 1; franja_id <= 6; franja_id++) {
        if ((instr_id + franja_id) % 3 === 0) { // Assign every 3rd combo
          db.prepare(`
            INSERT INTO instructor_franjas (instructor_id, franja_id)
            VALUES (?, ?)
          `).run(instr_id, franja_id);
        }
      }
    }

    console.log('✓ Base de datos inicializada con franjas horarias');
  } catch (err) {
    console.error('✗ Error al inicializar la base de datos:', err.message);
  }
}

module.exports = initSeed;
