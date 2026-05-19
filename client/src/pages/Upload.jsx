import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, RefreshCw, FileText, Settings, Bell, Trash2, RotateCcw } from 'lucide-react'
import UploadBox from '../components/UploadBox'
import ValidationBadge from '../components/ValidationBadge'
import ConfirmModal from '../components/ConfirmModal'
import Toast from '../components/Toast'
import { uploadFile, getRecords, deleteRecord } from '../services/api'

function fmt(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(dt) ? d : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Upload() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [retryingId, setRetryingId] = useState(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, fileName }
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null) // { message, type }

  const loadHistory = () => getRecords().then(r => setHistory(r.data)).catch(() => {})
  useEffect(() => { loadHistory() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true); setError(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await uploadFile(fd)
      navigate('/review', { state: res.data })
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Upload failed'
      const isQuota = err.response?.status === 429 || msg.toLowerCase().includes('quota')
      setError(isQuota ? 'AI quota exceeded. Please wait a minute and try again.' : msg)
    } finally { setUploading(false) }
  }

  // ── Delete handlers ──────────────────────────────────────────────────────
  function handleDeleteRequest(id, fileName) {
    setDeleteTarget({ id, fileName })
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteRecord(deleteTarget.id)
      setHistory(prev => prev.filter(r => r._id !== deleteTarget.id))
      setToast({ message: `"${deleteTarget.fileName || 'Record'}" deleted successfully.`, type: 'success' })
    } catch (err) {
      setToast({ message: err.response?.data?.error || err.message || 'Delete failed.', type: 'error' })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  // ── Retry extraction for a failed/review record ───────────────────────
  async function handleRetry(record) {
    if (!record.filePath && !record.fileName) return
    setRetryingId(record._id)
    try {
      // Re-upload the original file by fetching it from the server uploads path
      // Since we store filePath on the record, we ask the server to re-process it
      // by uploading a placeholder — simplest approach: navigate to upload page
      // with a toast hint. Full re-process requires the original file bytes.
      setToast({ message: 'To retry, re-upload the original file from the Upload page.', type: 'error' })
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Uploads</h1>
          <p className="text-xs text-gray-500 mt-0.5">Upload handwritten or printed manufacturing sheets for AI extraction</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><Bell size={17} /></button>
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><Settings size={17} /></button>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">A</div>
            <span className="text-sm font-medium text-gray-700">Admin</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main upload area */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-2xl space-y-5">
            {/* Upload card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">Upload Document</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <UploadBox onFileSelect={setFile} uploading={uploading} />

                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3.5 text-red-700">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Upload failed</p>
                      <p className="text-xs mt-0.5 text-red-600">{error}</p>
                    </div>
                    <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                  </div>
                )}

                <button type="submit" disabled={!file || uploading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
                  {uploading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing Document…</>
                    : 'Process Document'}
                </button>
              </form>
            </div>

            {/* Info card */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">How it works</h3>
              <ol className="space-y-1.5 text-xs text-blue-700">
                <li className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-xs">1</span>Upload a JPG, PNG, or PDF of your manufacturing sheet</li>
                <li className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-xs">2</span>AI extracts all table rows automatically</li>
                <li className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-xs">3</span>Review and edit extracted data before saving</li>
                <li className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-xs">4</span>Records are saved to the database for analytics</li>
              </ol>
            </div>
          </div>
        </div>

        {/* History sidebar */}
        <aside className="w-72 border-l border-gray-200 bg-white flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Upload History</h2>
            <div className="flex items-center gap-2">
              <button onClick={loadHistory} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Refresh history">
                <RefreshCw size={13} />
              </button>
              <button className="text-xs text-blue-600 hover:underline">View All</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {history.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={32} className="mx-auto text-gray-200 mb-3" />
                <p className="text-xs text-gray-400">No uploads yet</p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {history.slice(0, 20).map(r => (
                  <li
                    key={r._id}
                    className="group flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${r.fileName?.endsWith('.pdf') ? 'bg-red-100' : 'bg-blue-100'}`}>
                      <FileText size={14} className={r.fileName?.endsWith('.pdf') ? 'text-red-500' : 'text-blue-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{r.fileName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmt(r.createdAt)}</p>
                      <div className="mt-1.5">
                        <ValidationBadge
                          status={r.processingStatus}
                          reviewRequired={r.reviewRequired}
                        />
                      </div>
                      {/* Error reason for failed records */}
                      {r.processingStatus === 'failed' && r.errorReason && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={10} className="flex-shrink-0" />
                          <span className="truncate">{r.errorReason}</span>
                        </p>
                      )}
                      {/* Validation issue count for review_required */}
                      {r.processingStatus === 'review_required' && r.validationErrors?.length > 0 && (
                        <p className="text-xs text-amber-500 mt-1">
                          {r.validationErrors.length} validation issue{r.validationErrors.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    {/* Action buttons — visible on hover */}
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      {/* Retry button for failed or review_required */}
                      {(r.processingStatus === 'failed' || r.processingStatus === 'review_required') && (
                        <button
                          onClick={() => handleRetry(r)}
                          disabled={retryingId === r._id}
                          className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                          aria-label={`Retry extraction for ${r.fileName}`}
                          title="Retry extraction"
                        >
                          {retryingId === r._id
                            ? <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                            : <RotateCcw size={13} />
                          }
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteRequest(r._id, r.fileName)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        aria-label={`Delete ${r.fileName}`}
                        title="Delete record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Confirmation modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete record?"
        message={`"${deleteTarget?.fileName || 'This record'}" will be permanently removed from the database and the uploaded file will be deleted. This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Toast notification */}
      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
    </div>
  )
}
