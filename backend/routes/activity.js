const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireAdminOrManager } = require('../middleware/roles');

const router = express.Router();
router.use(authenticate);
router.use(requireAdminOrManager); // Only admin and manager can see the activity log

// GET /api/activity
router.get('/', async (req, res) => {
  const { userId, action, entityType, page = 1, limit = 100 } = req.query;
  try {
    const params = [];
    const conditions = [];
    let paramIdx = 1;

    if (userId) { conditions.push(`a.user_id = $${paramIdx++}`); params.push(parseInt(userId)); }
    if (action) { conditions.push(`a.action = $${paramIdx++}`); params.push(action); }
    if (entityType) { conditions.push(`a.entity_type = $${paramIdx++}`); params.push(entityType); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const result = await db.query(
      `SELECT
         a.*,
         u.name as user_name,
         -- Join order info when the action relates to an order
         o.order_number,
         o.title as order_title
       FROM activity_logs a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN orders o ON (a.entity_type = 'order' AND a.entity_id = o.id)
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM activity_logs a ${where}`,
      params.slice(0, -2)
    );

    res.json({ logs: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
