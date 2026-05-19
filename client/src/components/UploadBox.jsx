import { useRef, useState } from 'react'
import { CloudUpload, FileText, X } from 'lucide-react'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export default function UploadBox({ onFileSelect, uploading = false }) {
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)

  function handleFile(file) {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) { alert('Unsupported file type. Use JPG, PNG, WebP or PDF.'); return }
    setPreview({ name: file.name, type: file.type, size: (file.size / 1024).toFixed(1) })
    onFileSelect?.(file)
  }

  function clearFile(e) {
    e.stopPropagation()
    setPreview(null)
    onFileSelect?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/50'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <CloudUpload className="text-blue-500" size={22} />
        </div>
        <p className="text-sm font-semibold text-gray-700">Drag &amp; drop files here</p>
        <p className="text-xs text-gray-400 mt-1">or <span className="text-blue-600 underline cursor-pointer">click to browse</span></p>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
          className="mt-4 px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          Choose Files
        </button>
        <p className="text-xs text-gray-400 mt-2">Supports: JPG, PNG, PDF</p>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden" onChange={e => handleFile(e.target.files[0])} disabled={uploading} aria-label="File input" />
      </div>

      {preview && (
        <div className="flex items-center gap-3 p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
          <div className="w-9 h-9 bg-white border border-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText size={16} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{preview.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{preview.type === 'application/pdf' ? 'PDF Document' : 'Image'} · {preview.size} KB</p>
          </div>
          {uploading
            ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            : <button onClick={clearFile} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={14} /></button>
          }
        </div>
      )}
    </div>
  )
}
