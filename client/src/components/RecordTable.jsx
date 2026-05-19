import { Eye, Pencil, Trash2, AlertCircle } from 'lucide-react'
import ValidationBadge from './ValidationBadge'

function fmt(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(dt) ? d : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * RecordTable
 *
 * Props:
 *   records   array    — list of record objects from the API
 *   onDelete  fn(id)   — optional; called with the record _id when the delete button is clicked
 */
export default function RecordTable({ records = [], onDelete }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-14">
        <p className="text-sm text-gray-400">No records found.</p>
      </div>
    )
  }

  const headers = ['ID', 'Date', 'Shift', 'Employee No', 'Machine No', 'Operation Code', 'Work Order No', 'Quantity', 'Time Taken', 'Status', 'Actions']

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            {headers.map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={r._id} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-gray-400">REC-{String(i + 1).padStart(5, '0')}</td>
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.extractedData?.date || fmt(r.createdAt)}</td>
              <td className="px-4 py-3 text-gray-700">{r.extractedData?.shift || '—'}</td>
              <td className="px-4 py-3 text-gray-700 font-medium">{r.extractedData?.employeeNumber || '—'}</td>
              <td className="px-4 py-3 text-gray-700">{r.extractedData?.machineNumber || '—'}</td>
              <td className="px-4 py-3 text-gray-700">{r.extractedData?.operationCode || '—'}</td>
              <td className="px-4 py-3 text-gray-700">{r.extractedData?.workOrderNumber || '—'}</td>
              <td className="px-4 py-3 text-gray-700">{r.extractedData?.quantityProduced ?? '—'}</td>
              <td className="px-4 py-3 text-gray-700">{r.extractedData?.timeTaken || '—'}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <ValidationBadge
                    status={r.processingStatus}
                    reviewRequired={r.reviewRequired}
                  />
                  {/* Show error reason inline for failed records */}
                  {r.processingStatus === 'failed' && r.errorReason && (
                    <span
                      className="flex items-center gap-1 text-xs text-red-500 max-w-[140px]"
                      title={r.errorReason}
                    >
                      <AlertCircle size={10} className="flex-shrink-0" />
                      <span className="truncate">{r.errorReason}</span>
                    </span>
                  )}
                  {/* Show validation error count for review_required */}
                  {r.processingStatus === 'review_required' && r.validationErrors?.length > 0 && (
                    <span className="text-xs text-amber-500">
                      {r.validationErrors.length} issue{r.validationErrors.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label="View record"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label="Edit record"
                  >
                    <Pencil size={13} />
                  </button>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(r._id, r.fileName)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label={`Delete record ${r.fileName || r._id}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
