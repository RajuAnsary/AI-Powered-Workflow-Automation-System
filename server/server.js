require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// CORS — must be registered before all routes
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Handle OPTIONS preflight for all routes
app.options('*', cors());

console.log('Allowed origins:', allowedOrigins);

// JSON body parser
app.use(express.json());

// Multer configuration (exported for use in routes/tests)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        Object.assign(new Error('Unsupported file type'), {
          status: 400,
          code: 'UNSUPPORTED_FILE_TYPE',
        })
      );
    }
  },
});

// Routes
app.use('/api', uploadRoutes);

// Serve uploaded files so the Review page can show the image preview
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler (4-arg signature required by Express)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.message,
    code: err.code || 'INTERNAL_ERROR',
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
module.exports.upload = upload;
