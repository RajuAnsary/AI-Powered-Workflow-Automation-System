const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { fromPath } = require('pdf2pic');
const ocrService = require('../services/ocrService');
const { extractAllRows } = require('../services/aiService');
const validationService = require('../services/validationService');
const Record = require('../models/Record');

// ─── Status helper ────────────────────────────────────────────────────────────
/**
 * Derive processingStatus from extraction results.
 *
 * 'processed'       — all 8 fields present AND avg confidence ≥ 0.75 AND no validation errors
 * 'review_required' — some fields extracted OR OCR text exists (user can edit)
 * 'failed'          — no OCR text AND no fields extracted (nothing usable)
 */
const REQUIRED_FIELDS = ['date','shift','employeeNumber','machineNumber','operationCode','workOrderNumber','quantityProduced','timeTaken'];

function computeProcessingStatus({ extractedData = {}, confidenceScores = {}, validationErrors = [], originalText = '' }) {
  const presentFields = REQUIRED_FIELDS.filter(f => {
    const v = extractedData[f];
    return v !== null && v !== undefined && v !== '';
  });
  const allPresent = presentFields.length === REQUIRED_FIELDS.length;

  const scores = Object.values(confidenceScores).filter(v => typeof v === 'number');
  const avgConf = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;

  const hasUsableData = presentFields.length > 0 || (originalText && originalText.trim().length > 0);

  if (!hasUsableData) return 'failed';
  if (allPresent && avgConf >= 0.75 && validationErrors.length === 0) return 'processed';
  return 'review_required';
}

/**
 * POST /api/upload
 * Process uploaded file → OCR → AI (all rows) → validation per row
 * Returns array of unsaved row results.
 */
async function uploadAndProcess(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded'); err.status = 400; err.code = 'NO_FILE';
      return next(err);
    }

    const { path: filePath, mimetype, originalname } = req.file;
    let imagePaths = [];

    if (mimetype === 'application/pdf') {
      const outputDir = path.dirname(filePath);
      const converter = fromPath(filePath, {
        density: 150,
        saveFilename: path.basename(filePath, path.extname(filePath)),
        savePath: outputDir,
        format: 'png',
        width: 1240,
        height: 1754,
      });
      const pageCount = await getPdfPageCount(filePath);
      for (let i = 1; i <= pageCount; i++) {
        const page = await converter(i);
        imagePaths.push(page.path);
      }
    } else {
      imagePaths = [filePath];
    }

    // OCR
    let originalText;
    try {
      originalText = await ocrService.extractText(imagePaths);
    } catch (ocrErr) {
      const err = new Error(`OCR extraction failed: ${ocrErr.message}`);
      err.status = 500; err.code = 'OCR_FAILURE';
      return next(err);
    }

    // AI extraction — returns array of rows
    let rows;
    try {
      rows = await extractAllRows(originalText);
    } catch (aiErr) {
      return next(aiErr);
    }

    // Get existing work orders for duplicate check
    const existingRecords = await Record.find({}, 'extractedData.workOrderNumber').lean();
    const existingWorkOrders = existingRecords
      .map(r => r.extractedData?.workOrderNumber)
      .filter(Boolean);

    // Validate each row and assign temp IDs
    const results = rows.map((row, i) => {
      const validationErrors = validationService.validate(row.extractedData, existingWorkOrders);
      const reviewRequired = validationErrors.length > 0;
      const processingStatus = computeProcessingStatus({
        extractedData: row.extractedData,
        confidenceScores: row.confidenceScores,
        validationErrors,
        originalText,
      });
      return {
        _id: new mongoose.Types.ObjectId(),
        rowNumber: row.rowNumber || i + 1,
        fileName: originalname,
        filePath,          // stored so confirm can persist it
        originalText,
        extractedData: row.extractedData,
        confidenceScores: row.confidenceScores,
        validationErrors,
        reviewRequired,
        processingStatus,
        processingStage: 'complete',
        errorReason: null,
      };
    });

    return res.status(200).json({
      fileName: originalname,
      originalText,
      totalRows: results.length,
      // imageUrl lets the Review page show the uploaded image preview
      imageUrl: `/uploads/${path.basename(filePath)}`,
      rows: results,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/records/confirm-batch
 * Confirm and save multiple rows to MongoDB.
 */
async function confirmBatch(req, res, next) {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      const err = new Error('No rows provided'); err.status = 400; err.code = 'NO_ROWS';
      return next(err);
    }

    const saved = [];
    for (const row of rows) {
      const { _id, fileName, filePath, originalText, extractedData, confidenceScores, validationErrors, reviewRequired } = row;
      if (!mongoose.Types.ObjectId.isValid(_id)) continue;

      const processingStatus = computeProcessingStatus({ extractedData, confidenceScores, validationErrors, originalText });

      const doc = await Record.findByIdAndUpdate(
        _id,
        { $set: {
          fileName: fileName || 'unknown',
          filePath: filePath || '',
          originalText: originalText || '',
          extractedData: extractedData || {},
          confidenceScores: confidenceScores || {},
          validationErrors: validationErrors || [],
          reviewRequired: reviewRequired || false,
          processingStatus,
          processingStage: 'complete',
          errorReason: null,
        }},
        { upsert: true, new: true, runValidators: true }
      );
      saved.push(doc);
    }

    return res.status(200).json({ saved: saved.length, records: saved });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/records/:id — confirm single record (backward compat)
 */
async function confirmRecord(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid record ID'); err.status = 400; err.code = 'INVALID_ID';
      return next(err);
    }
    const { fileName, filePath, originalText, extractedData, confidenceScores, validationErrors, reviewRequired } = req.body;
    const processingStatus = computeProcessingStatus({ extractedData, confidenceScores, validationErrors, originalText });
    const saved = await Record.findByIdAndUpdate(
      id,
      { $set: {
        fileName: fileName || 'unknown',
        filePath: filePath || '',
        originalText: originalText || '',
        extractedData: extractedData || {},
        confidenceScores: confidenceScores || {},
        validationErrors: validationErrors || [],
        reviewRequired: reviewRequired || false,
        processingStatus,
        processingStage: 'complete',
        errorReason: null,
      }},
      { upsert: true, new: true, runValidators: true }
    );
    return res.status(200).json(saved);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/records
 */
async function getRecords(req, res, next) {
  try {
    const { machineNumber, shift, startDate, endDate, workOrderNumber } = req.query;
    const query = {};
    if (machineNumber) query['extractedData.machineNumber'] = { $regex: machineNumber, $options: 'i' };
    if (shift) query['extractedData.shift'] = shift;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (workOrderNumber) query['extractedData.workOrderNumber'] = { $regex: workOrderNumber, $options: 'i' };
    const records = await Record.find(query).sort({ createdAt: -1 }).lean();
    return res.status(200).json(records);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/dashboard
 */
async function getDashboard(req, res, next) {
  try {
    const totalRecords = await Record.countDocuments();
    const reviewRequiredCount = await Record.countDocuments({ reviewRequired: true });

    const shiftAgg = await Record.aggregate([{ $group: { _id: '$extractedData.shift', count: { $sum: 1 } } }]);
    const byShift = {};
    shiftAgg.forEach(s => { if (s._id) byShift[s._id] = s.count; });

    const machineAgg = await Record.aggregate([{ $group: { _id: '$extractedData.machineNumber', count: { $sum: 1 } } }]);
    const byMachine = {};
    machineAgg.forEach(m => { if (m._id) byMachine[m._id] = m.count; });

    const quantityAgg = await Record.aggregate([{ $group: { _id: null, total: { $sum: '$extractedData.quantityProduced' } } }]);
    const totalQuantityProduced = quantityAgg.length > 0 ? (quantityAgg[0].total || 0) : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyAgg = await Record.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const dailyCounts = dailyAgg.map(d => ({ date: d._id, count: d.count }));

    return res.status(200).json({ totalRecords, reviewRequiredCount, byShift, byMachine, totalQuantityProduced, dailyCounts });
  } catch (err) {
    return next(err);
  }
}

async function getPdfPageCount(pdfPath) {
  try {
    const { default: pdfParse } = await import('pdf-parse').catch(() => ({ default: null }));
    if (pdfParse) {
      const fs = require('fs');
      const data = await pdfParse(fs.readFileSync(pdfPath));
      return data.numpages || 1;
    }
  } catch { /* fallback */ }
  return 1;
}

/**
 * DELETE /api/records/:id
 */
async function deleteRecord(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid record ID', code: 'INVALID_ID' });
    }
    const deleted = await Record.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Record not found', code: 'RECORD_NOT_FOUND' });

    // Best-effort: delete the uploaded file from disk
    if (deleted.filePath) {
      fs.unlink(deleted.filePath, () => {}); // ignore errors (file may already be gone)
    }

    return res.status(200).json({ message: 'Record deleted successfully', id });
  } catch (err) {
    return next(err);
  }
}

module.exports = { uploadAndProcess, confirmRecord, confirmBatch, deleteRecord, getRecords, getDashboard };
