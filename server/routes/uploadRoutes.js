const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadAndProcess, confirmRecord, confirmBatch, deleteRecord, getRecords, getDashboard } = require('../controllers/uploadController');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error(`Unsupported file type: ${file.mimetype}`);
      err.status = 400; err.code = 'UNSUPPORTED_FILE_TYPE';
      cb(err);
    }
  },
});

function multerErrorHandler(err, req, res, next) {
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File exceeds 20 MB limit', code: 'FILE_TOO_LARGE' });
  if (err?.code === 'UNSUPPORTED_FILE_TYPE') return res.status(400).json({ error: err.message, code: 'UNSUPPORTED_FILE_TYPE' });
  return next(err);
}

router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return multerErrorHandler(err, req, res, next);
    next();
  });
}, uploadAndProcess);

// Specific routes before parameterised ones to avoid :id swallowing them
router.post('/records/confirm-batch', confirmBatch);
router.get('/records', getRecords);
router.get('/dashboard', getDashboard);
router.put('/records/:id', confirmRecord);
router.delete('/records/:id', deleteRecord);

module.exports = router;
