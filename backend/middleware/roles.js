// Role permission helpers
// Roles: 'admin', 'manager', 'digitizer', 'production_tech'

const ROLES = ['admin', 'manager', 'digitizer', 'production_tech'];

// Admin only
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Admin or Manager
const requireAdminOrManager = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access restricted' });
  }
  next();
};

// Block digitizers from an endpoint
const blockDigitizer = (req, res, next) => {
  if (req.user.role === 'digitizer') {
    return res.status(403).json({ error: 'Digitizers do not have access to this feature' });
  }
  next();
};

module.exports = { requireAdmin, requireAdminOrManager, blockDigitizer, ROLES };
