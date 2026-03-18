const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/chat/messages?orderId=&since=&limit=
// orderId=null for general chat, orderId=ID for order chat
router.get('/messages', async (req, res) => {
  const { orderId, since, limit = 50 } = req.query;
  try {
    const params = [];
    let conditions = [];
    let paramIdx = 1;

    if (orderId && orderId !== 'null') {
      conditions.push(`m.order_id = $${paramIdx++}`);
      params.push(parseInt(orderId));
    } else {
      conditions.push(`m.order_id IS NULL`);
    }

    if (since) {
      conditions.push(`m.created_at > $${paramIdx++}`);
      params.push(since);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limit));

    const result = await db.query(
      `SELECT m.id, m.content, m.created_at, m.order_id,
              u.id as user_id, u.name as user_name, u.role as user_role
       FROM messages m
       JOIN users u ON m.user_id = u.id
       ${where}
       ORDER BY m.created_at DESC
       LIMIT $${paramIdx}`,
      params
    );
    // Return in chronological order
    res.json(result.rows.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chat/messages
router.post('/messages', async (req, res) => {
  const { content, orderId } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }
  try {
    const result = await db.query(
      `INSERT INTO messages (user_id, order_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at, order_id`,
      [req.user.id, orderId || null, content.trim()]
    );
    const msg = {
      ...result.rows[0],
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
    };
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/chat/messages/:id — own messages or admin
router.delete('/messages/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM messages WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Message not found' });
    if (result.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await db.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
