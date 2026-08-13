"use client"

export function WithdrawForm({
  quantity,
  onQuantityChange,
  onConfirm,
  onCancel,
  submitting,
}: {
  quantity: string
  onQuantityChange: (value: string) => void
  onConfirm: () => void
  onCancel?: () => void
  submitting: boolean
}) {
  return (
    <div className="flex items-end gap-3">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">כמות שנמשכה</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          min="1"
          className="w-24 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
        />
      </div>
      <button
        onClick={onConfirm}
        disabled={submitting}
        className="bg-wine text-white px-6 py-2 rounded-lg hover:bg-wine-dark transition-colors text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "מעדכן..." : "אשר משיכה"}
      </button>
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-sm px-4 py-2 border border-stone-300 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors"
        >
          ביטול
        </button>
      )}
    </div>
  )
}
