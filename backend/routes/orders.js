const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const VALID_STATUSES = ['intake', 'digitization', 'production', 'qa', 'completed', 'cancelled'];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

// Generate order number: EMB-YYYYMMDD-XXXX
function generateOrderNumber() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EMB-${date}-${rand}`;
}

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const { status, assigned_to, priority, search, page = 1, limit = 50 } = req.query;
    const params = [];
    const conditions = [];
    let paramIdx = 1;

    if (status) { conditions.push(`o.status = $${paramIdx++}`); params.push(status); }
    if (assigned_to) { conditions.push(`o.assigned_to = $${paramIdx++}`); params.push(assigned_to); }
    if (priority) { conditions.push(`o.priority = $${paramIdx++}`); params.push(priority); }
    if (search) {
      conditions.push(`(o.title ILIKE $${paramIdx} OR o.order_number ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx})`);
      params.push(`%${search}%`); paramIdx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const query = `
      SELECT o.*,
        c.name as customer_name, c.company as customer_company,
        u1.name as assigned_to_name, u2.name as created_by_name,
        (SELECT COUNT(*) FROM files WHERE order_id = o.id) as file_count,
        (SELECT COUNT(*) FROM messages WHERE order_id = o.id) as message_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u1 ON o.assigned_to = u1.id
      LEFT JOIN users u2 ON o.created_by = u2.id
      ${where}
      ORDER BY
        CASE o.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
        o.due_date ASC NULLS LAST, o.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(parseInt(limit), offset);

    const countQuery = `SELECT COUNT(*) FROM orders o LEFT JOIN customers c ON o.customer_id = c.id ${where}`;
    const [orders, count] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, -2)),
    ]);

    res.json({ orders: orders.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/stats/summary — dashboard stats (must come BEFORE /:id)
router.get('/stats/summary', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'intake') as intake,
        COUNT(*) FILTER (WHERE status = 'digitization') as digitization,
        COUNT(*) FILTER (WHERE status = 'production') as production,
        COUNT(*) FILTER (WHERE status = 'qa') as qa,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled')) as active,
        COUNT(*) FILTER (WHERE priority = 'urgent' AND status NOT IN ('completed','cancelled')) as urgent,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed','cancelled')) as overdue
      FROM orders
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.*,
        c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.company as customer_company,
        u1.name as assigned_to_name, u2.name as created_by_name
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN users u1 ON o.assigned_to = u1.id
       LEFT JOIN users u2 ON o.created_by = u2.id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });

    const filesResult = await db.query(
      `SELECT f.*, u.name as uploaded_by_name
       FROM files f LEFT JOIN users u ON f.uploaded_by = u.id
       WHERE f.order_id = $1 ORDER BY f.uploaded_at DESC`,
      [req.params.id]
    );
    const historyResult = await db.query(
      `SELECT h.*, u.name as changed_by_name
       FROM order_history h LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.order_id = $1 ORDER BY h.changed_at DESC`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      files: filesResult.rows,
      history: historyResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/orders
router.post('/', async (req, res) => {
  const {
    customer_id, title, description, priority, due_date, assigned_to,
    notes, garment_type, thread_colors, stitch_count, width_mm, height_mm, quantity,
  } = req.body;
  if (!title) return res.status(400).json({ error: 'Order title is required' });

  try {
    let orderNumber;
    let attempts = 0;
    do {
      orderNumber = generateOrderNumber();
      const existing = await db.query('SELECT id FROM orders WHERE order_number = $1', [orderNumber]);
      if (!existing.rows[0]) break;
    } while (++attempts < 5);

    const result = await db.query(
      `INSERT INTO orders (order_number, customer_id, title, description, priority, due_date,
        assigned_to, created_by, notes, garment_type, thread_colors, stitch_count,
        width_mm, height_mm, quantity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [orderNumber, customer_id || null, title, description || null,
       priority || 'normal', due_date || null, assigned_to || null, req.user.id,
       notes || null, garment_type || null, thread_colors || null,
       stitch_count || null, width_mm || null, height_mm || null, quantity || 1]
    );

    // Log initial stage
    await db.query(
      `INSERT INTO order_history (order_id, from_status, to_status, changed_by)
       VALUES ($1, NULL, 'intake', $2)`,
      [result.rows[0].id, req.user.id]
    );

    req.logActivity('CREATE_ORDER', 'order', result.rows[0].id, { title, orderNumber });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
  const {
    customer_id, title, description, priority, due_date, assigned_to,
    notes, garment_type, thread_colors, stitch_count, width_mm, height_mm, quantity,
  } = req.body;
  try {
    const result = await db.query(
      `UPDATE orders SET
        customer_id = COALESCE($1, customer_id),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        priority = COALESCE($4, priority),
        due_date = COALESCE($5, due_date),
        assigned_to = COALESCE($6, assigned_to),
        notes = COALESCE($7, notes),
        garment_type = COALESCE($8, garment_type),
        thread_colors = COALESCE($9, thread_colors),
        stitch_count = COALESCE($10, stitch_count),
        width_mm = COALESCE($11, width_mm),
        height_mm = COALESCE($12, height_mm),
        quantity = COALESCE($13, quantity),
        updated_at = NOW()
       WHERE id = $14 RETURNING *`,
      [customer_id, title, description, priority, due_date, assigned_to,
       notes, garment_type, thread_colors, stitch_count, width_mm, height_mm, quantity,
       req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });
    req.logActivity('UPDATE_ORDER', 'order', parseInt(req.params.id), { title });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/orders/:id/status — move order through stages
router.patch('/:id/status', async (req, res) => {
  const { status, notes } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  // Digitizers cannot cancel orders
  if (status === 'cancelled' && req.user.role === 'digitizer') {
    return res.status(403).json({ error: 'Digitizers cannot cancel orders' });
  }
  try {
    const current = await db.query('SELECT status FROM orders WHERE id = $1', [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Order not found' });
    const fromStatus = current.rows[0].status;

    await db.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, req.params.id]
    );
    await db.query(
      `INSERT INTO order_history (order_id, from_status, to_status, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, fromStatus, status, req.user.id, notes || null]
    );
    req.logActivity('CHANGE_ORDER_STATUS', 'order', parseInt(req.params.id),
      { from: fromStatus, to: status });
    res.json({ message: 'Status updated', from: fromStatus, to: status });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/orders/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM orders WHERE id = $1 RETURNING id, title', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });
    req.logActivity('DELETE_ORDER', 'order', parseInt(req.params.id), { title: result.rows[0].title });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
