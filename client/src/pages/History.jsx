import { useState, useEffect, useCallback } from 'react'
import { Search, SlidersHorizontal, Bell, Settings } from 'lucide-react'
import RecordTable from '../components/RecordTable'
import ConfirmModal from '../components/ConfirmModal'
import Toast from '../components/Toast'
import { getRecords, deleteRecord } from '../services/api'

export default function History() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ machineNumber: '', shift: '', startDate: '', endDate: '', workOrderNumber: '' })

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, fileName }
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null) // { message, type }

  const fetchRecords = useCallback(async (f) => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (f.machineNumber) params.machineNumber = f.machineNumber
      if (f.shift) params.shift = f.shift
      if (f.startDate) params.startDate = f.startDate
      if (f.endDate) params.endDate = f.endDate
      if (f.workOrderNumber) params.workOrderNumber = f.workOrderNumber
      const res = await getRecords(params)
      setRecords(res.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRecords(filters) }, []) // eslint-disable-line

  function handleChange(e) {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  function handleApply(e) { e.preventDefault(); fetchRecords(filters) }

  function handleClear() {
    const cleared = { machineNumber: '', shift: '', startDate: '', endDate: '', workOrderNumber: '' }
    setFilters(cleared); fetchRecords(cleared)
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
      setRecords(prev => prev.filter(r => r._id !== deleteTarget.id))
      setToast({ message: `"${deleteTarget.fileName || 'Record'}" deleted successfully.`, type: 'success' })
    } catch (err) {
      setToast({ message: err.response?.data?.error || err.message || 'Delete failed.', type: 'error' })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Records</h1>
          <p className="text-xs text-gray-500 mt-0.5">Search and filter all saved operational records</p>
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

      <div className="flex-1 overflow-auto p-6 space-y-5">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal size={15} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">Filter Records</h2>
          </div>
          <form onSubmit={handleApply}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { name: 'machineNumber', label: 'Machine Number', placeholder: 'e.g. MC-001', type: 'text' },
                { name: 'workOrderNumber', label: 'Work Order', placeholder: 'Work order #', type: 'text' },
                { name: 'startDate', label: 'Start Date', placeholder: '', type: 'date' },
                { name: 'endDate', label: 'End Date', placeholder: '', type: 'date' },
              ].map(({ name, label, placeholder, type }) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
                  <input name={name} type={type} value={filters[name]} onChange={handleChange} placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Shift</label>
                <select name="shift" value={filters.shift} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                  <option value="">All Shifts</option>
                  <option value="I">Shift I</option>
                  <option value="II">Shift II</option>
                  <option value="III">Shift III</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg px-5 py-2 transition-colors shadow-sm">
                <Search size={14} />Search Records
              </button>
              <button type="button" onClick={handleClear}
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                Clear Filters
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">All Records</h2>
              {!loading && <p className="text-xs text-gray-400 mt-0.5">{records.length} record{records.length !== 1 ? 's' : ''} found</p>}
            </div>
          </div>
          {loading ? (
            <div className="p-10 text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Loading records…</p>
            </div>
          ) : error ? (
            <div className="p-6 text-red-600 text-sm flex items-center gap-2">
              <span className="text-red-500">⚠</span> Error: {error}
            </div>
          ) : (
            <RecordTable records={records} onDelete={handleDeleteRequest} />
          )}
        </div>
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
