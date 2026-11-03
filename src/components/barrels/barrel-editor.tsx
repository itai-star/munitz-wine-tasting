"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  createBarrel,
  deleteBarrel,
  removeBarrelFromStock,
  restoreBarrelToStock,
  updateBarrel,
} from "@/server/actions/barrel-actions"
import { BarrelTestsDialog } from "@/components/barrels/barrel-tests-dialog"
import { BarrelWineDialog } from "@/components/barrels/barrel-wine-dialog"
import type { BarrelRow, BarrelYearRow, BlockSupply } from "@/lib/barrel-room"
import type { Result } from "@/types"

type EditorState = { mode: "create" } | { mode: "edit"; barrel: BarrelRow } | { mode: "wine"; barrelId: string } | { mode: "tests"; barrelId: string }

type EditorApi = {
  openCreate: () => void
  openEdit: (barrel: BarrelRow) => void
  openWine: (barrelId: string) => void
  openTests: (barrelId: string) => void
}

const EditorContext = createContext<EditorApi | null>(null)

export function useBarrelEditor(): EditorApi {
  const api = useContext(EditorContext)
  if (!api) throw new Error("useBarrelEditor must be used inside BarrelEditorProvider")
  return api
}

const inputClass =
  "w-full min-h-11 border border-stone-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none bg-white"
const labelClass = "block text-sm font-bold text-stone-800 mb-1"

export function BarrelEditorProvider({
  knownTypes,
  supply,
  year,
  rows,
  children,
}: {
  knownTypes: string[]
  supply: BlockSupply[]
  year: number
  rows: BarrelYearRow[]
  children: React.ReactNode
}) {
  const [state, setState] = useState<EditorState | null>(null)
  const openCreate = useCallback(() => setState({ mode: "create" }), [])
  const openEdit = useCallback((barrel: BarrelRow) => setState({ mode: "edit", barrel }), [])
  const openWine = useCallback((barrelId: string) => setState({ mode: "wine", barrelId }), [])
  const openTests = useCallback((barrelId: string) => setState({ mode: "tests", barrelId }), [])
  const close = useCallback(() => setState(null), [])

  // The dialogs for the wine and the tests read the barrel from the page, so they show what was just saved.
  const row = state && (state.mode === "wine" || state.mode === "tests") ? rows.find((candidate) => candidate.id === state.barrelId) : undefined

  return (
    <EditorContext.Provider value={{ openCreate, openEdit, openWine, openTests }}>
      {children}
      {state && (state.mode === "create" || state.mode === "edit") && (
        <BarrelDialog key={state.mode === "edit" ? state.barrel.id : "new"} state={state} knownTypes={knownTypes} onClose={close} />
      )}
      {state?.mode === "wine" && row && <BarrelWineDialog key={row.id} row={row} year={year} supply={supply} onClose={close} />}
      {state?.mode === "tests" && row && <BarrelTestsDialog key={row.id} row={row} year={year} onClose={close} />}
    </EditorContext.Provider>
  )
}

function BarrelDialog({ state, knownTypes, onClose }: { state: EditorState & { mode: "create" | "edit" }; knownTypes: string[]; onClose: () => void }) {
  const router = useRouter()
  const existing = state.mode === "edit" ? state.barrel : null
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const [number, setNumber] = useState(existing?.number ?? "")
  const [type, setType] = useState(existing?.type ?? "")
  const [year, setYear] = useState(existing ? String(existing.year) : "")
  const [removing, setRemoving] = useState(false)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    firstFieldRef.current?.focus()
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function run(action: () => Promise<Result<unknown>>): Promise<void> {
    setBusy(true)
    setError("")
    const result = await action()
    setBusy(false)
    if (result.success) {
      onClose()
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  function save(event: React.FormEvent): void {
    event.preventDefault()
    const fields = { number, type, year: Number(year) }
    void run(() => (existing ? updateBarrel({ id: existing.id, ...fields }) : createBarrel(fields)))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={existing ? "עריכת חבית" : "חבית חדשה"}
        onSubmit={save}
        onClick={(event) => event.stopPropagation()}
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-extrabold text-stone-900">{existing ? `חבית ${existing.number}` : "חבית חדשה"}</h2>
          <button type="button" onClick={onClose} aria-label="סגירה" className="h-10 w-10 rounded-full text-2xl leading-none text-stone-500 hover:bg-stone-100">
            ×
          </button>
        </div>

        {existing?.removed && (
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-bold text-amber-900">
            החבית הוצאה מהמלאי{existing.removedOn ? ` ב-${existing.removedOn.split("-").reverse().join(".")}` : ""}
            {existing.removalNote ? `: ${existing.removalNote}` : ""}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        <div>
          <label className={labelClass} htmlFor="barrel-number">
            מספר חבית *
          </label>
          <input ref={firstFieldRef} id="barrel-number" className={inputClass} value={number} maxLength={20} onChange={(event) => setNumber(event.target.value)} required />
        </div>
        <div>
          <label className={labelClass} htmlFor="barrel-type">
            סוג *
          </label>
          <input id="barrel-type" list="barrel-types" className={inputClass} value={type} maxLength={60} onChange={(event) => setType(event.target.value)} required />
          <datalist id="barrel-types">
            {knownTypes.map((known) => (
              <option key={known} value={known} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelClass} htmlFor="barrel-year">
            שנה *
          </label>
          <input id="barrel-year" type="number" inputMode="numeric" className={inputClass} value={year} onChange={(event) => setYear(event.target.value)} required />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-lg bg-wine px-6 text-base font-bold text-white hover:bg-wine-dark transition-colors disabled:opacity-50"
          >
            {busy ? "שומר..." : "שמירה"}
          </button>
          <button type="button" onClick={onClose} className="min-h-11 px-3 text-base font-bold text-stone-600 hover:underline">
            סגירה
          </button>
        </div>

        {existing && (
          <div className="space-y-3 border-t border-stone-200 pt-4">
            {existing.removed ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => restoreBarrelToStock(existing.id))}
                className="min-h-11 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
              >
                החזרה למלאי
              </button>
            ) : removing ? (
              <div className="space-y-2">
                <label className={labelClass} htmlFor="barrel-note">
                  סיבה להוצאה מהמלאי (לא חובה)
                </label>
                <input id="barrel-note" className={inputClass} value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => removeBarrelFromStock({ id: existing.id, note }))}
                    className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
                  >
                    אישור הוצאה מהמלאי
                  </button>
                  <button type="button" onClick={() => setRemoving(false)} className="min-h-11 px-3 text-sm font-bold text-stone-600 hover:underline">
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setRemoving(true)}
                className="min-h-11 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
              >
                הוצאה מהמלאי
              </button>
            )}
            <div>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (confirm("למחוק את החבית לצמיתות? חבית שפשוט יצאה מהמלאי עדיף להוציא מהמלאי, כך שהיא נשארת ברשומות.")) void run(() => deleteBarrel(existing.id))
                }}
                className="min-h-10 px-1 text-sm font-bold text-red-700 hover:underline disabled:opacity-50"
              >
                מחיקה לצמיתות
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export function AddBarrelButton() {
  const { openCreate } = useBarrelEditor()
  return (
    <button
      type="button"
      onClick={openCreate}
      className="inline-flex min-h-10 items-center justify-center rounded-lg bg-wine px-4 text-sm font-bold text-white hover:bg-wine-dark transition-colors"
    >
      + הוספת חבית
    </button>
  )
}
