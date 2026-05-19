import { useState, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle, CheckCircle, Save, X, RotateCcw,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2,
  Copy, Check, Eye, Pencil, Trash2, FileText,
} from 'lucide-react'
import { confirmBatch, confirmRecord, uploadFile } from '../services/api'
import ValidationBadge from '../components/ValidationBadge'

// ─── Confidence helpers ───────────────────────────────────────────────────────

export function getConfidenceColor(score) {
  if (score >= 0.8) return 'green'
  if (score >= 0.5) return 'yellow'
  return 'red'
}

const CONF_BAR = { green: 'bg-green-500', yellow: 'bg-amber-400', red: 'bg-red-400' }

// ─── Field definitions ────────────────────────────────────────────────────────

const FIELDS = [
  { key: 'date',             label: 'Date',              type: 'text'   },
  { key: 'shift',            label: 'Shift',             type: 'text'   },
  { key: 'employeeNumber',   label: 'Employee Number',   type: 'text'   },
  { key: 'machineNumber',    label: 'Machine Number',    type: 'text'   },
  { key: 'operationCode',    label: 'Operation Code',    type: 'text'   },
  { key: 'workOrderNumber',  label: 'Work Order Number', type: 'text'   },
  { key: 'quantityProduced', label: 'Quantity Produced', type: 'number' },
  { key: 'timeTaken',        label: 'Time Taken (H:mm)', type: 'text'   },
]

const TABLE_COLS = ['Date','Shift','Emp. No.','Opn Code','Machine No.','Work Order No.','Qty. Prod.','Time taken\n(in hrs)']
const TABLE_KEYS = ['date','shift','employeeNumber','operationCode','machineNumber','workOrderNumber','quantityProduced','timeTaken']

// ─── Normalise state ──────────────────────────────────────────────────────────

function normaliseState(state) {
  if (!state) return null
  if (Array.isArray(state.rows) && state.rows.length > 0) {
    return {
      fileName: state.fileName,
      originalText: state.originalText || '',
      imageUrl: state.imageUrl || null,
      rows: state.rows.map((r, i) => ({
        _id: r._id, rowNumber: r.rowNumber || i + 1,
        fileName: r.fileName || state.fileName, filePath: r.filePath,
        originalText: r.originalText || state.originalText || '',
        extractedData: { ...r.extractedData },
        confidenceScores: r.confidenceScores || {},
        validationErrors: r.validationErrors || [],
        reviewRequired: r.reviewRequired || false,
        processingStatus: r.processingStatus,
        processingStage: r.processingStage,
        errorReason: r.errorReason,
      })),
    }
  }
  if (state.extractedData) {
    return {
      fileName: state.fileName,
      originalText: state.originalText || '',
      imageUrl: state.imageUrl || null,
      rows: [{
        _id: state._id, rowNumber: 1,
        fileName: state.fileName, filePath: state.filePath,
        originalText: state.originalText || '',
        extractedData: { ...state.extractedData },
        confidenceScores: state.confidenceScores || {},
        validationErrors: state.validationErrors || [],
        reviewRequired: state.reviewRequired || false,
        processingStatus: state.processingStatus,
        processingStage: state.processingStage,
        errorReason: state.errorReason,
      }],
    }
  }
  return null
}

// ─── ConfidenceBar ────────────────────────────────────────────────────────────

function ConfidenceBar({ score }) {
  const pct = Math.round((score || 0) * 100)
  const color = getConfidenceColor(score || 0)
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${CONF_BAR[color]}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-7 text-right">{pct}%</span>
    </div>
  )
}

// ─── StatusChip ───────────────────────────────────────────────────────────────

function StatusChip({ score, errors }) {
  if (errors?.length)
    return <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap"><AlertCircle size={9} />Review</span>
  if ((score || 0) >= 0.8)
    return <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 whitespace-nowrap"><CheckCircle size={9} />Valid</span>
  if ((score || 0) >= 0.5)
    return <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap"><AlertCircle size={9} />Review</span>
  return <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 whitespace-nowrap"><X size={9} />Failed</span>
}

// ─── OCR Preview Panel ────────────────────────────────────────────────────────

function OcrPreviewPanel({ originalText, imageUrl, fileName, rows }) {
  const [tab, setTab] = useState('structured')
  const [zoom, setZoom] = useState(1)
  const [copied, setCopied] = useState(false)
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  function handleCopy() {
    navigator.clipboard.writeText(originalText || '').then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const tabs = [
    { id: 'structured', label: 'Structured View' },
    { id: 'raw',        label: 'Raw Text' },
    { id: 'compare',    label: 'Compare' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">OCR Preview</span>
        </div>
        {fileName && <span className="text-xs text-gray-400 truncate max-w-[120px]" title={fileName}>{fileName}</span>}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pb-2 flex-shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}>
            {t.label}
          </button>
        ))}
        {tab === 'structured' && (
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1 text-gray-400 hover:text-gray-600 rounded"><ZoomOut size={12} /></button>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.25))} className="p-1 text-gray-400 hover:text-gray-600 rounded"><ZoomIn size={12} /></button>
            <button onClick={() => setZoom(1)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><Maximize2 size={12} /></button>
          </div>
        )}
        {tab === 'raw' && (
          <button onClick={handleCopy} className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">
            {copied ? <><Check size={11} className="text-green-500" />Copied</> : <><Copy size={11} />Copy</>}
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {tab === 'structured' && <StructuredView rows={rows} zoom={zoom} />}
        {tab === 'raw' && <RawTextView text={originalText} />}
        {tab === 'compare' && <CompareView imageUrl={imageUrl ? `${apiBase}${imageUrl}` : null} text={originalText} />}
      </div>

      {/* Preprocessing info */}
      <div className="px-4 pb-3 flex-shrink-0 border-t border-gray-100 pt-3">
        <p className="text-xs font-semibold text-gray-600 mb-2">Preprocessing Info</p>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {['Grayscale','Denoise','Auto Contrast','Sharpened','Threshold'].map(s => (
            <span key={s} className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              <Check size={9} />{s}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Scale: 2x</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Engine: Tesseract OCR v5</span>
        </div>
      </div>
    </div>
  )
}

// ─── Structured View ──────────────────────────────────────────────────────────

function StructuredView({ rows, zoom }) {
  if (!rows || rows.length === 0)
    return <div className="text-xs text-gray-400 text-center py-8">No structured data available</div>

  return (
    <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.15s' }}>
      <p className="text-xs font-semibold text-gray-600 text-center mb-2">Machine shop data</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50">
              {TABLE_COLS.map(h => (
                <th key={h} className="px-2 py-1.5 text-center font-semibold text-gray-600 border border-gray-200 whitespace-pre-line text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-blue-50/30">
                {TABLE_KEYS.map(k => {
                  const val = row.extractedData?.[k]
                  const score = row.confidenceScores?.[k] || 0
                  const color = getConfidenceColor(score)
                  const uncertain = score < 0.6
                  return (
                    <td key={k} className={`px-2 py-1.5 text-center border border-gray-100 font-mono ${uncertain ? 'bg-amber-50 text-amber-700' : 'text-gray-700'}`}>
                      {val ?? <span className="text-gray-300">—</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Raw Text View ────────────────────────────────────────────────────────────

function RawTextView({ text }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-auto h-full min-h-[120px]">
      {text ? (
        <pre className="text-[11px] text-gray-600 p-3 font-mono leading-relaxed whitespace-pre-wrap break-words"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}>
          {text}
        </pre>
      ) : (
        <div className="flex items-center justify-center h-full text-xs text-gray-400 p-4">No OCR text available</div>
      )}
    </div>
  )
}

// ─── Compare View ─────────────────────────────────────────────────────────────

function CompareView({ imageUrl, text }) {
  const [imgZoom, setImgZoom] = useState(1)
  return (
    <div className="flex gap-3 h-full min-h-[200px]">
      <div className="flex-1 flex flex-col gap-1">
        <p className="text-xs font-semibold text-gray-500">Uploaded Image</p>
        <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 overflow-auto flex items-start justify-center p-2">
          {imageUrl ? (
            <img src={imageUrl} alt="Uploaded document"
              style={{ transform: `scale(${imgZoom})`, transformOrigin: 'top center', transition: 'transform 0.15s', maxWidth: '100%' }} />
          ) : (
            <div className="text-xs text-gray-400 text-center py-8">No image preview available</div>
          )}
        </div>
        <div className="flex items-center gap-1 justify-center">
          <button onClick={() => setImgZoom(z => Math.max(0.3, z - 0.2))} className="p-1 text-gray-400 hover:text-gray-600 rounded border border-gray-200"><ZoomOut size={11} /></button>
          <span className="text-xs text-gray-400 w-10 text-center">{Math.round(imgZoom * 100)}%</span>
          <button onClick={() => setImgZoom(z => Math.min(3, z + 0.2))} className="p-1 text-gray-400 hover:text-gray-600 rounded border border-gray-200"><ZoomIn size={11} /></button>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <p className="text-xs font-semibold text-gray-500">OCR Text</p>
        <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 overflow-auto">
          <pre className="text-[10px] text-gray-600 p-2 font-mono leading-relaxed whitespace-pre-wrap break-words"
            style={{ fontFamily: "'Courier New', Courier, monospace" }}>
            {text || 'No OCR text'}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ─── Upload History Panel ─────────────────────────────────────────────────────

function UploadHistoryPanel({ rows, fileName }) {
  function fmt(d) {
    if (!d) return '—'
    const dt = new Date(d)
    return isNaN(dt) ? d : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // Synthesise a history entry from the current upload
  const entry = {
    fileName: fileName || 'Unknown file',
    uploadedOn: new Date(),
    status: rows[0]?.processingStatus || 'review_required',
    rowCount: rows.length,
  }

  return (
    <div className="px-4 py-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">Upload History</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              {['File Name','Uploaded On','Status','Extracted Rows','Action'].map(h => (
                <th key={h} className="pb-1.5 text-left font-semibold text-gray-500 pr-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-50">
              <td className="py-2 pr-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                    <FileText size={11} className="text-gray-500" />
                  </div>
                  <span className="font-medium text-gray-700 truncate max-w-[100px]" title={entry.fileName}>{entry.fileName}</span>
                </div>
              </td>
              <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{fmt(entry.uploadedOn)}</td>
              <td className="py-2 pr-3">
                <ValidationBadge status={entry.status} reviewRequired={entry.status === 'review_required'} />
              </td>
              <td className="py-2 pr-3 text-gray-600 font-medium">{entry.rowCount} Row{entry.rowCount !== 1 ? 's' : ''}</td>
              <td className="py-2">
                <div className="flex items-center gap-1">
                  <button className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors" aria-label="View"><Eye size={12} /></button>
                  <button className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors" aria-label="Edit"><Pencil size={12} /></button>
                  <button className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" aria-label="Delete"><Trash2 size={12} /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Review() {
  const location = useLocation()
  const navigate = useNavigate()
  const normalised = normaliseState(location.state)

  const [rows, setRows] = useState(() => normalised?.rows || [])
  const [selectedRow, setSelectedRow] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const { fileName, originalText, imageUrl } = normalised || {}
  const currentRow = rows[selectedRow] || {}

  function handleFieldChange(rowIdx, field, value) {
    setRows(prev => prev.map((r, i) =>
      i === rowIdx ? { ...r, extractedData: { ...r.extractedData, [field]: value } } : r
    ))
  }

  function handleReset(rowIdx, field) {
    const original = normalised?.rows?.[rowIdx]?.extractedData?.[field]
    if (original !== undefined) handleFieldChange(rowIdx, field, original)
  }

  async function handleSaveAll() {
    setSaving(true); setError(null)
    try {
      if (rows.length === 1) {
        const row = rows[0]
        await confirmRecord(row._id, {
          fileName: row.fileName || fileName, filePath: row.filePath,
          originalText: row.originalText || originalText,
          extractedData: row.extractedData, confidenceScores: row.confidenceScores,
          validationErrors: row.validationErrors, reviewRequired: row.reviewRequired,
        })
      } else {
        await confirmBatch(rows.map(r => ({
          _id: r._id, fileName: r.fileName || fileName, filePath: r.filePath,
          originalText: r.originalText || originalText,
          extractedData: r.extractedData, confidenceScores: r.confidenceScores,
          validationErrors: r.validationErrors, reviewRequired: r.reviewRequired,
        })))
      }
      navigate('/history')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  if (!normalised || rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-yellow-700 text-sm max-w-md text-center">
          <AlertCircle size={24} className="mx-auto mb-2 text-yellow-500" />
          No extraction result found.{' '}
          <button onClick={() => navigate('/upload')} className="underline font-semibold hover:text-yellow-900">Upload a document</button> first.
        </div>
      </div>
    )
  }

  // Compute summary stats for the header banner
  const reviewCount = rows.filter(r => r.validationErrors?.length > 0).length
  const dupCount = rows.filter(r => r.validationErrors?.some(e => e.toLowerCase().includes('duplicate'))).length
  const allErrors = currentRow.validationErrors || []

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Review &amp; Edit</h1>
          <p className="text-xs text-gray-500">Validate and edit extracted data before saving</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/upload')} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Discard
          </button>
          <button onClick={handleSaveAll} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
              : <><Save size={14} />Confirm &amp; Save</>}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel ── */}
        <div className="w-[440px] bg-white border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0">

          {/* OCR Preview with tabs */}
          <div className="flex-1 overflow-hidden flex flex-col border-b border-gray-100" style={{ minHeight: 0 }}>
            <OcrPreviewPanel
              originalText={originalText}
              imageUrl={imageUrl}
              fileName={fileName}
              rows={rows}
            />
          </div>

          {/* Upload History */}
          <div className="flex-shrink-0 border-t border-gray-100 overflow-auto max-h-40">
            <UploadHistoryPanel rows={rows} fileName={fileName} />
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 overflow-auto p-5 space-y-4">

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              <AlertCircle size={15} />{error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={14} /></button>
            </div>
          )}

          {/* ── Field Validation & Confidence card ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Field Validation &amp; Confidence
                  {rows.length > 1 && <span className="ml-2 text-gray-400 font-normal text-xs">— Row {currentRow.rowNumber}</span>}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Click any field to edit. Changes are reflected immediately.</p>
              </div>
              <ValidationBadge status={currentRow.processingStatus} reviewRequired={currentRow.reviewRequired} />
            </div>

            {/* Validation summary banners */}
            {reviewCount > 0 && (
              <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex flex-wrap gap-4">
                <span className="flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertCircle size={11} />{reviewCount} field{reviewCount !== 1 ? 's' : ''} need review
                </span>
                {dupCount > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-700">
                    <AlertCircle size={11} />{dupCount} potential duplicate{dupCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
            {allErrors.length > 0 && (
              <div className="px-5 py-2 bg-orange-50 border-b border-orange-100 flex flex-wrap gap-3">
                {allErrors.map((e, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs text-orange-600"><AlertCircle size={10} />{e}</span>
                ))}
              </div>
            )}

            {/* Fields table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Field','Value','Confidence','Status','Action'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FIELDS.map(({ key, label, type }) => {
                    const score = currentRow.confidenceScores?.[key]
                    const fieldErrors = allErrors.filter(e => e.toLowerCase().includes(key.toLowerCase()))
                    return (
                      <tr key={key} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-700 whitespace-nowrap">{label}</td>
                        <td className="px-4 py-2.5 w-52">
                          <input type={type}
                            value={currentRow.extractedData?.[key] ?? ''}
                            onChange={e => handleFieldChange(selectedRow, key, e.target.value)}
                            aria-label={label}
                            className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${
                              fieldErrors.length ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white hover:border-gray-300'
                            }`} />
                        </td>
                        <td className="px-4 py-2.5 w-36"><ConfidenceBar score={score} /></td>
                        <td className="px-4 py-2.5"><StatusChip score={score} errors={fieldErrors} /></td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => handleReset(selectedRow, key)}
                            className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            aria-label={`Reset ${label}`} title="Reset to original">
                            <RotateCcw size={12} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend + actions */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Valid (All Good)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Review (Needs Check)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Failed (Action Required)</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/upload')} disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Discard
                </button>
                <button onClick={handleSaveAll} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors">
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
                    : <><Save size={14} />Confirm &amp; Save</>}
                </button>
              </div>
            </div>
          </div>

          {/* Row selector for multi-row */}
          {rows.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">All Extracted Rows</h2>
                <p className="text-xs text-gray-500 mt-0.5">{rows.length} rows detected — click to edit</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Row','Date','Shift','Emp No','Machine No','Opn Code','Work Order','Qty','Time','Conf.','Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const scores = Object.values(row.confidenceScores || {}).filter(v => typeof v === 'number')
                      const avgConf = scores.length ? Math.round(scores.reduce((s,v)=>s+v,0)/scores.length*100) : 0
                      const d = row.extractedData || {}
                      return (
                        <tr key={i} onClick={() => setSelectedRow(i)}
                          className={`border-b border-gray-50 cursor-pointer transition-colors ${selectedRow === i ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}>
                          <td className="px-3 py-2 font-mono text-gray-500">{row.rowNumber}</td>
                          <td className="px-3 py-2 text-gray-700">{d.date||'—'}</td>
                          <td className="px-3 py-2 text-gray-700">{d.shift||'—'}</td>
                          <td className="px-3 py-2 text-gray-700">{d.employeeNumber||'—'}</td>
                          <td className="px-3 py-2 text-gray-700">{d.machineNumber||'—'}</td>
                          <td className="px-3 py-2 text-gray-700">{d.operationCode||'—'}</td>
                          <td className="px-3 py-2 text-gray-700">{d.workOrderNumber||'—'}</td>
                          <td className="px-3 py-2 text-gray-700">{d.quantityProduced??'—'}</td>
                          <td className="px-3 py-2 text-gray-700">{d.timeTaken||'—'}</td>
                          <td className="px-3 py-2 font-semibold text-gray-700">{avgConf}%</td>
                          <td className="px-3 py-2">
                            <ValidationBadge status={row.processingStatus} reviewRequired={row.reviewRequired} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Info banner */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
            <AlertCircle size={13} className="flex-shrink-0" />
            Review all extracted data carefully. Edit any field directly, then click <strong>Confirm &amp; Save</strong>.
          </div>
        </div>
      </div>
    </div>
  )
}
