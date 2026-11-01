export const inputClass =
  "w-full border border-stone-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
export const labelClass = "block text-sm font-semibold text-stone-700 mb-1"
export const primaryButtonClass =
  "bg-wine text-white px-6 py-2.5 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
export const secondaryButtonClass =
  "border border-stone-300 text-stone-700 px-4 py-2.5 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"

export type GrowerDraft = { name: string; phone: string; notes: string }

// The three text fields of a grower, shared by the create form and the grower cards.
export function GrowerFields({
  draft,
  onChange,
}: {
  draft: GrowerDraft
  onChange: (next: GrowerDraft) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelClass}>שם הכורם *</label>
        <input className={inputClass} value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} />
      </div>
      <div>
        <label className={labelClass}>טלפון</label>
        <input
          className={inputClass}
          dir="ltr"
          inputMode="tel"
          value={draft.phone}
          onChange={(e) => onChange({ ...draft, phone: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>הערות</label>
        <input className={inputClass} value={draft.notes} onChange={(e) => onChange({ ...draft, notes: e.target.value })} />
      </div>
    </div>
  )
}

export function toNullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}
