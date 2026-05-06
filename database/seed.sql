-- Seed data para planes y actividades

-- Planes de cuota base
INSERT OR IGNORE INTO planes_cuota (id, nombre, descripcion, monto, tipo) VALUES
(1, 'Plan Básico', 'Acceso a actividades básicas', 50.00, 'BASICO'),
(2, 'Plan Premium', 'Acceso a todas las actividades', 100.00, 'PREMIUM');

-- Actividades disponibles
INSERT OR IGNORE INTO actividades (id, nombre, descripcion, precio_base, activo) VALUES
(1, 'Gimnasio', 'Acceso libre lunes a viernes 7am-21h', 20.00, 1),
(2, 'Natación', 'Clases de natación con instructor', 30.00, 1),
(3, 'Pilates', 'Clases de pilates avanzado', 35.00, 1),
(4, 'Yoga', 'Yoga para relajación y flexibilidad', 25.00, 1),
(5, 'Fútbol', 'Fútbol de salón competitivo', 40.00, 1);
