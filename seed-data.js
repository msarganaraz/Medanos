const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'medanos.db');

async function seedData() {
  const SQL = await initSqlJs();
  const data = fs.readFileSync(dbPath);
  const db = new SQL.Database(data);

  // Limpiar datos existentes
  db.run('DELETE FROM actividades');
  db.run('DELETE FROM socios');
  db.run('DELETE FROM instructores');

  // Insertar socios
  const insertSocio = db.prepare(`
    INSERT INTO socios (numero_socio, apellido, nombre, dni, fecha_nacimiento, telefono, email, domicilio, fecha_alta, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

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

  socios.forEach(socio => {
    insertSocio.bind(socio);
    insertSocio.step();
  });
  insertSocio.free();

  // Insertar actividades
  const insertActividad = db.prepare(`
    INSERT INTO actividades (nombre, descripcion, dias_horario, precio_base, activo)
    VALUES (?, ?, ?, ?, ?)
  `);

  const actividades = [
    ['Natación', 'Clases de natación para todas las edades', 'Lun-Mié-Vie 18:00 a 19:00', 1500.00, 1],
    ['Tenis', 'Clases de tenis nivel inicial e intermedio', 'Mar-Jue 17:00 a 18:30', 2000.00, 1],
    ['Gimnasia Artística', 'Gimnasia artística para niños y adolescentes', 'Mar-Jue 16:00 a 17:30', 1800.00, 1],
    ['Pilates', 'Clases de pilates para adultos', 'Lun-Mié-Vie 10:00 a 11:00', 1200.00, 1],
    ['Fútbol', 'Entrenamientos de fútbol mixto', 'Mar-Jue 19:00 a 20:30', 1600.00, 1],
    ['Yoga', 'Yoga hatha y vinyasa', 'Lun-Mié 19:30 a 20:30, Dom 10:00 a 11:30', 1000.00, 1]
  ];

  actividades.forEach(actividad => {
    insertActividad.bind(actividad);
    insertActividad.step();
  });
  insertActividad.free();

  // Insertar instructores
  const insertInstructor = db.prepare(`
    INSERT INTO instructores (apellido, nombre, dni, cuil, telefono, email, tipo_contrato, monto_fijo, valor_hora, valor_por_alumno)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const instructores = [
    ['Sánchez', 'Pablo Javier', '28123456', '20281234567', '2235551111', 'pablo.sanchez@email.com', 'fijo', 35000.00, 0, 0],
    ['Ríos', 'Marina Alessandra', '29234567', '27292345672', '2235552222', 'marina.rios@email.com', 'por_hora', 0, 800.00, 0],
    ['Domínguez', 'Lucas Mateo', '30345678', '20303456789', '2235553333', 'lucas.dominguez@email.com', 'combinado', 15000.00, 500.00, 0],
    ['Castillo', 'Andrea Beatriz', '31456789', '27314567899', '2235554444', 'andrea.castillo@email.com', 'por_alumno', 0, 0, 150.00],
    ['Ruiz', 'Fernando Miguel', '32567890', '20325678900', '2235555555', 'fernando.ruiz@email.com', 'fijo', 40000.00, 0, 0]
  ];

  instructores.forEach(instructor => {
    insertInstructor.bind(instructor);
    insertInstructor.step();
  });
  insertInstructor.free();

  // Guardar cambios
  const output = db.export();
  const buffer = Buffer.from(output);
  fs.writeFileSync(dbPath, buffer);

  console.log('✓ Datos de prueba insertados correctamente');
  console.log('  - 10 socios');
  console.log('  - 6 actividades');
  console.log('  - 5 instructores');
}

seedData().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
