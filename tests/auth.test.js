const { requireAuth, requireRole } = require('../middleware/auth');

describe('Middleware de autenticación', () => {
  let req, res, next;

  beforeEach(() => {
    req = { session: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('requireAuth', () => {
    test('debería rechazar sin sesión activa', () => {
      req.session = null;
      requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'No autorizado' });
      expect(next).not.toHaveBeenCalled();
    });

    test('debería rechazar sin usuario en sesión', () => {
      requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('debería permitir con usuario en sesión', () => {
      req.session.usuario = { id: 1, nombre: 'Admin', rol: 'admin' };
      requireAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    test('debería rechazar sin sesión', () => {
      req.session = null;
      const middleware = requireRole(['admin']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('debería rechazar rol no permitido', () => {
      req.session.usuario = { id: 1, nombre: 'Instructor', rol: 'instructor' };
      const middleware = requireRole(['admin', 'tesoreria']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Acceso denegado' });
      expect(next).not.toHaveBeenCalled();
    });

    test('debería permitir rol autorizado', () => {
      req.session.usuario = { id: 1, nombre: 'Admin', rol: 'admin' };
      const middleware = requireRole(['admin', 'tesoreria']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('debería permitir cualquiera de los roles en lista', () => {
      req.session.usuario = { id: 2, nombre: 'Tesorería', rol: 'tesoreria' };
      const middleware = requireRole(['admin', 'tesoreria', 'recepcion']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
