const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Allowed file types for embroidery
const ALLOWED_TYPES = {
  // Adobe Illustrator
  '.ai':   'art',
  '.eps':  'art',
  '.svg':  'art',
  '.pdf':  'art',
  // Stitch files
  '.dst':  'dst',
  '.emb':  'emb',
  '.pes':  'emb',
  '.jef':  'emb',
  '.vp3':  'emb',
  '.hus':  'emb',
  '.exp':  'emb',
  // Image files
  '.png':  'preview',
  '.jpg':  'preview',
  '.jpeg': 'preview',
  '.gif':  'preview',
  '.tif':  'preview',
  '.tiff': 'preview',
  '.psd':  'art',
  '.bmp':  'preview',
};

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_TYPES[ext]) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not allowed`), false);
  }
};

const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '50');
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});

// POST /api/files/upload/:orderId
router.post('/upload/:orderId', upload.array('files', 10), async (req, res) => {
  const { orderId } = req.params;
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  // Verify order exists
  const orderCheck = await db.query('SELECT id FROM orders WHERE id = $1', [orderId]);
  if (!orderCheck.rows[0]) return res.status(404).json({ error: 'Order not found' });

  try {
    const savedFiles = [];
    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const category = ALLOWED_TYPES[ext] || 'other';
      const result = await db.query(
        `INSERT INTO files (order_id, original_name, stored_name, file_category, mime_type, file_size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [orderId, file.originalname, file.filename, category, file.mimetype, file.size, req.user.id]
      );
      savedFiles.push(result.rows[0]);
    }
    await db.query('UPDATE orders SET updated_at = NOW() WHERE id = $1', [orderId]);
    req.logActivity('UPLOAD_FILES', 'order', parseInt(orderId),
      { count: savedFiles.length, files: savedFiles.map(f => f.original_name) });
    res.status(201).json(savedFiles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/files/:orderId
router.get('/:orderId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT f.*, u.name as uploaded_by_name
       FROM files f LEFT JOIN users u ON f.uploaded_by = u.id
       WHERE f.order_id = $1 ORDER BY f.uploaded_at DESC`,
      [req.params.orderId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/files/download/:fileId
router.get('/download/:fileId', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM files WHERE id = $1', [req.params.fileId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'File not found' });
    const file = result.rows[0];
    const filePath = path.join(__dirname, '../uploads', file.stored_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });
    req.logActivity('DOWNLOAD_FILE', 'file', file.id, { name: file.original_name });
    res.download(filePath, file.original_name);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/files/delete/:fileId
router.delete('/delete/:fileId', async (req, res) => {
  // Digitizers can upload but never delete files
  if (req.user.role === 'digitizer') {
    return res.status(403).json({ error: 'Digitizers cannot delete files' });
  }
  try {
    const result = await db.query('SELECT * FROM files WHERE id = $1', [req.params.fileId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'File not found' });
    const file = result.rows[0];
    // Only uploader, manager, or admin can delete
    if (file.uploaded_by !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to delete this file' });
    }
    await db.query('DELETE FROM files WHERE id = $1', [req.params.fileId]);
    const filePath = path.join(__dirname, '../uploads', file.stored_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    req.logActivity('DELETE_FILE', 'file', file.id, { name: file.original_name });
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Error handler for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
});

module.exports = router;
