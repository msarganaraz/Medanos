const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }
  next();
};

const requireRole = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({ success: false, error: 'No autorizado' });
    }
    if (!rolesPermitidos.includes(req.session.usuario.rol)) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }
    next();
  };
};

module.exports = { requireAuth, requireRole };
