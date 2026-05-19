/**
 * ValidationBadge
 *
 * Accepts either:
 *   status  'processed' | 'review_required' | 'failed'   (preferred — new field)
 *   reviewRequired  boolean                               (legacy fallback)
 *
 * Status semantics:
 *   processed       — all fields extracted, high confidence, no validation errors  → green
 *   review_required — partial extraction or validation issues; user can edit        → amber
 *   failed          — OCR/AI completely failed, no usable data                     → red
 */
export default function ValidationBadge({ status, reviewRequired }) {
  // Derive display status from whichever prop is provided
  let resolved = status
  if (!resolved) {
    // Legacy: reviewRequired=true → review_required, false → processed
    resolved = reviewRequired ? 'review_required' : 'processed'
  }

  if (resolved === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
        Failed
      </span>
    )
  }

  if (resolved === 'review_required') {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
        Review Required
      </span>
    )
  }

  // 'processed'
  return (
    <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 border border-green-200 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
      Processed
    </span>
  )
}
