import { useEffect } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

/**
 * Toast — auto-dismissing notification.
 *
 * Props:
 *   message   string              — text to display
 *   type      'success' | 'error' — controls colour and icon
 *   onClose   fn                  — called when dismissed (auto or manual)
 *   duration  number              — ms before auto-dismiss (default 3500)
 */
export default function Toast({ message, type = 'success', onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [message, duration, onClose])

  if (!message) return null

  const isSuccess = type === 'success'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-fade-in
        ${isSuccess
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'
        }`}
    >
      {isSuccess
        ? <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
        : <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
      }
      <span>{message}</span>
      <button
        onClick={onClose}
        className={`ml-1 transition-colors ${isSuccess ? 'text-green-500 hover:text-green-700' : 'text-red-400 hover:text-red-600'}`}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
