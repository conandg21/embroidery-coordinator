const db = require('../db');

// Log an activity to the database
const logActivity = async ({ userId, userName, action, entityType, entityId, details, ipAddress }) => {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, userName, action, entityType || null, entityId || null,
       details ? JSON.stringify(details) : null, ipAddress || null]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};

// Express middleware helper — attaches logActivity to req
const activityLogger = (req, res, next) => {
  req.logActivity = (action, entityType, entityId, details) => {
    if (req.user) {
      logActivity({
        userId: req.user.id,
        userName: req.user.name,
        action,
        entityType,
        entityId,
        details,
        ipAddress: req.ip,
      });
    }
  };
  next();
};

module.exports = { logActivity, activityLogger };
