const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  filePath: { type: String },   // absolute path to the uploaded file on disk
  originalText: { type: String },
  extractedData: {
    date:             { type: String },
    shift:            { type: String },
    employeeNumber:   { type: String },
    machineNumber:    { type: String },
    operationCode:    { type: String },
    workOrderNumber:  { type: String },
    quantityProduced: { type: Number },
    timeTaken:        { type: String },
  },
  confidenceScores:  { type: mongoose.Schema.Types.Mixed },
  validationErrors:  [{ type: String }],
  reviewRequired:    { type: Boolean, default: false },
  // ── Processing status ──────────────────────────────────────────────────
  // 'processed'       — extraction succeeded, all fields present, high confidence
  // 'review_required' — partial extraction or validation issues; user can edit
  // 'failed'          — OCR/AI completely failed, no usable data
  processingStatus:  { type: String, enum: ['processed', 'review_required', 'failed'], default: 'review_required' },
  processingStage:   { type: String },   // last stage reached: 'ocr' | 'ai' | 'validation' | 'complete'
  errorReason:       { type: String },   // human-readable reason when status is 'failed'
  createdAt:         { type: Date, default: Date.now },
});

module.exports = mongoose.model('Record', RecordSchema);
