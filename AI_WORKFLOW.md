# AI Processing Pipeline — BiztelAI

This document describes the end-to-end AI processing pipeline used to extract structured operational data from uploaded documents.

## Pipeline Overview

```
┌─────────────┐
│   Upload    │  User uploads JPEG / PNG / WebP / PDF (max 20 MB)
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  pdf2pic (if PDF)   │  Converts each PDF page to a PNG image
│                     │  density: 150 DPI, format: png
└──────┬──────────────┘
       │ array of image paths
       ▼
┌─────────────────────┐
│  OCR — Tesseract.js │  Processes each image sequentially
│                     │  Language: English ('eng')
│                     │  Pages joined with '--- PAGE BREAK ---'
└──────┬──────────────┘
       │ raw OCR text string
       ▼
┌──────────────────────────┐
│  AI Extraction — Gemini  │  Sends OCR text to gemini-1.5-flash
│  (gemini-1.5-flash)      │  Returns structured JSON with 8 fields
│                          │  + confidence scores per field
└──────┬───────────────────┘
       │ { extractedData, confidenceScores }
       ▼
┌─────────────────────┐
│  Confidence Scoring │  Per-field score 0–1
│                     │  ≥ 0.8 → green
│                     │  0.5–0.8 → yellow
│                     │  < 0.5 → red
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Validation         │  Business rules applied:
│                     │  • All 8 fields required
│                     │  • shift ∈ {A, B, C}
│                     │  • machineNumber matches MC-\d{3}
│                     │  • quantityProduced ≤ 10000
│                     │  • workOrderNumber not duplicate
└──────┬──────────────┘
       │ validationErrors[], reviewRequired
       ▼
┌─────────────────────┐
│  Review Page        │  User inspects, edits fields, sees
│                     │  confidence badges + validation errors
└──────┬──────────────┘
       │ User clicks Confirm
       ▼
┌─────────────────────┐
│  Save to MongoDB    │  PUT /api/records/:id upserts the Record
│                     │  Record persisted only after confirmation
└─────────────────────┘
```

## Stage Details

### Stage 1: Upload

- **Route**: `POST /api/upload` (multipart/form-data, field: `file`)
- **Accepted types**: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- **Size limit**: 20 MB (enforced by Multer)
- **Storage**: Multer saves file to `server/uploads/` temporarily

### Stage 2: PDF Conversion (conditional)

- **Library**: `pdf2pic`
- **Triggered**: only when `mimetype === 'application/pdf'`
- **Output**: array of PNG image paths, one per page
- **Settings**: 150 DPI, 1240×1754px

### Stage 3: OCR Extraction

- **Library**: `tesseract.js` v7
- **Function**: `ocrService.extractText(imagePaths[])`
- **Process**: iterates pages sequentially, calls `Tesseract.recognize(path, 'eng')`
- **Output**: concatenated text with `\n\n--- PAGE BREAK ---\n\n` between pages

**Example input** (single image of a handwritten form):
```
Handwritten text on paper with fields like:
Date: 15/01/2024  Shift: A  Employee: EMP-042
Machine: MC-003   Op Code: OP-7  Work Order: WO-2024-001
Qty: 850  Time: 8h
```

**Example output**:
```
Date: 15/01/2024 Shift: A Employee: EMP-042
Machine: MC-003 Op Code: OP-7 Work Order: WO-2024-001
Qty: 850 Time: 8h
```

### Stage 4: AI Extraction

- **Model**: `gemini-2.0-flash` (Google Gemini API)
- **Library**: `@google/generative-ai`
- **Function**: `aiService.extractData(ocrText)`

**System prompt instructs the model to**:
- Extract exactly 8 fields from the OCR text
- Return `null` for any field not found
- Score confidence 0–1 per field
- Return valid JSON only (no markdown fences)

**Fields extracted**:

| Field | Type | Description |
|-------|------|-------------|
| `date` | String | Production date |
| `shift` | String | Work shift (A, B, or C) |
| `employeeNumber` | String | Employee ID |
| `machineNumber` | String | Machine ID (format: MC-XXX) |
| `operationCode` | String | Operation/process code |
| `workOrderNumber` | String | Work order identifier |
| `quantityProduced` | Number | Units produced |
| `timeTaken` | String | Duration of operation |

**Example AI response**:
```json
{
  "extractedData": {
    "date": "2024-01-15",
    "shift": "A",
    "employeeNumber": "EMP-042",
    "machineNumber": "MC-003",
    "operationCode": "OP-7",
    "workOrderNumber": "WO-2024-001",
    "quantityProduced": 850,
    "timeTaken": "8h"
  },
  "confidenceScores": {
    "date": 0.92,
    "shift": 0.98,
    "employeeNumber": 0.85,
    "machineNumber": 0.95,
    "operationCode": 0.78,
    "workOrderNumber": 0.91,
    "quantityProduced": 0.88,
    "timeTaken": 0.82
  }
}
```

### Stage 5: Confidence Scoring

Confidence scores are returned by the AI model and displayed on the Review Page:

| Score Range | Color | Meaning |
|-------------|-------|---------|
| ≥ 0.8 | 🟢 Green | High confidence |
| 0.5 – 0.79 | 🟡 Yellow | Medium confidence — verify |
| < 0.5 | 🔴 Red | Low confidence — manual entry needed |

### Stage 6: Validation

The `validationService.validate(extractedData, existingWorkOrders)` function applies these rules:

| Rule | Error message |
|------|--------------|
| Missing required field | `Missing required field: {field}` |
| Invalid shift value | `Invalid shift value: "{value}". Must be A, B, or C.` |
| Invalid machine number | `Invalid machine number format: "{value}". Expected MC-XXX.` |
| Quantity > 10,000 | `Quantity produced ({n}) exceeds expected threshold of 10000.` |
| Duplicate work order | `Duplicate work order number: "{value}" already exists.` |

If any errors are returned, `reviewRequired` is set to `true`.

### Stage 7: Review

The frontend Review Page (`/review`) receives the unsaved extraction result via React Router state. The record is **not saved to the database** at this point.

The user can:
- Edit any of the 8 fields
- See confidence badges and validation errors per field
- Click **Confirm & Save** → sends `PUT /api/records/:id`
- Click **Discard** → navigates back to Upload without saving

### Stage 8: Save

On confirm, the backend upserts the Record to MongoDB Atlas using the pre-generated `_id` from the upload response. The record is only persisted after explicit user confirmation.

## Error Handling

| Scenario | HTTP Status | Code |
|----------|-------------|------|
| Unsupported file type | 400 | `UNSUPPORTED_FILE_TYPE` |
| File > 20 MB | 413 | `FILE_TOO_LARGE` |
| OCR failure | 500 | `OCR_FAILURE` |
| Gemini API key missing | 500 | `OPENAI_KEY_MISSING` |
| Gemini API error | 502 | `OPENAI_API_ERROR` |
| AI response parse failure | 500 | `AI_PARSE_ERROR` |
| MongoDB connection failure | 500 | `DB_CONNECTION_ERROR` |
| Record not found | 404 | `RECORD_NOT_FOUND` |
