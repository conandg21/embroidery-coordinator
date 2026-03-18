const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

const router = express.Router();
router.use(authenticate);

// GET /api/users — admin sees all, staff sees only themselves
router.get('/', async (req, res) => {
  try {
    const query = req.user.role === 'admin'
      ? 'SELECT id, name, email, role, is_active, created_at, last_login FROM users ORDER BY name'
      : 'SELECT id, name, email, role FROM users WHERE is_active = true ORDER BY name';
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users — admin only
router.post('/', requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  const validRoles = ['admin', 'staff', 'digitizer', 'production'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, is_active, created_at`,
      [name, email.toLowerCase(), hash, role || 'staff']
    );
    req.logActivity('CREATE_USER', 'user', result.rows[0].id, { name, email, role });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id — admin only
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, email, role, is_active } = req.body;
  try {
    const result = await db.query(
      `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email),
       role = COALESCE($3, role), is_active = COALESCE($4, is_active)
       WHERE id = $5 RETURNING id, name, email, role, is_active`,
      [name, email ? email.toLowerCase() : null, role, is_active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    req.logActivity('UPDATE_USER', 'user', parseInt(req.params.id), req.body);
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id/reset-password — admin only
router.put('/:id/reset-password', requireAdmin, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    req.logActivity('RESET_PASSWORD', 'user', parseInt(req.params.id));
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
