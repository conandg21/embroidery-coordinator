const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { blockDigitizer } = require('../middleware/roles');

const router = express.Router();
router.use(authenticate);
router.use(blockDigitizer); // Digitizers cannot access customers

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT c.*, u.name as created_by_name,
      (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as order_count
      FROM customers c LEFT JOIN users u ON c.created_by = u.id`;
    const params = [];
    if (search) {
      query += ` WHERE c.name ILIKE $1 OR c.company ILIKE $1 OR c.email ILIKE $1`;
      params.push(`%${search}%`);
    }
    query += ' ORDER BY c.name';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  const { name, email, phone, company, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Customer name is required' });
  try {
    const result = await db.query(
      `INSERT INTO customers (name, email, phone, company, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, email || null, phone || null, company || null, notes || null, req.user.id]
    );
    req.logActivity('CREATE_CUSTOMER', 'customer', result.rows[0].id, { name });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  const { name, email, phone, company, notes } = req.body;
  try {
    const result = await db.query(
      `UPDATE customers SET name = COALESCE($1, name), email = COALESCE($2, email),
       phone = COALESCE($3, phone), company = COALESCE($4, company),
       notes = COALESCE($5, notes) WHERE id = $6 RETURNING *`,
      [name, email, phone, company, notes, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Customer not found' });
    req.logActivity('UPDATE_CUSTOMER', 'customer', parseInt(req.params.id), { name });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
