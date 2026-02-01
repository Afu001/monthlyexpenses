import { useEffect, useMemo, useRef, useState } from 'react'
import type { Expense, ExpenseCategory } from '../lib/types'
import { formatMoney, todayIso } from '../lib/utils'

type Props = {
  monthKey: string
  expenses: Expense[]
  onAdd: (input: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void
  onRemove: (id: string) => void
  onQuickSet: (category: ExpenseCategory, amount: number) => void
}

const categories: ExpenseCategory[] = [
  'SUBSCRIPTIONS',
  'ADS',
  'SALARIES',
  'TOOLS',
  'TRAVEL',
  'OFFICE',
  'OTHER',
]

export function Expenses({ monthKey, expenses, onAdd, onRemove, onQuickSet }: Props) {
  const [vendor, setVendor] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [category, setCategory] = useState<ExpenseCategory>('OTHER')
  const [notes, setNotes] = useState('')

  const promptedForMonth = useRef<string | null>(null)

  const total = useMemo(() => expenses.reduce((a, e) => a + e.amount, 0), [expenses])

  function submit() {
    const parsed = Number(amount)
    if (!vendor.trim()) return
    if (!Number.isFinite(parsed) || parsed <= 0) return

    onAdd({
      monthKey,
      date: todayIso(),
      vendor: vendor.trim(),
      amount: parsed,
      currency: 'USD',
      category,
      source: 'MANUAL',
      notes: notes.trim() ? notes.trim() : undefined,
    })

    setVendor('')
    setAmount('')
    setNotes('')
    setCategory('OTHER')
  }

  function askQuick(category: ExpenseCategory, label: string) {
    const current = expenses.find((e) => e.category === category && e.vendor === category)
    const val = window.prompt(`Enter ${label} for ${monthKey}`, current ? String(current.amount) : '')
    if (val == null) return
    const parsed = Number(val)
    if (!Number.isFinite(parsed) || parsed < 0) return
    onQuickSet(category, parsed)
  }

  const adsMissing = !expenses.some((e) => e.category === 'ADS')
  const salariesMissing = !expenses.some((e) => e.category === 'SALARIES')

  useEffect(() => {
    if (promptedForMonth.current === monthKey) return
    promptedForMonth.current = monthKey

    if (adsMissing) askQuick('ADS', 'ads spend')
    if (salariesMissing) askQuick('SALARIES', 'salaries')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Add expense</div>
            <div className="text-xs text-slate-600">Manual inputs are included in the monthly total.</div>
          </div>
          <div className="text-sm font-semibold text-slate-900">Total: {formatMoney(total, 'USD')}</div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-600">Vendor</label>
            <input
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Netflix, AWS, Office rent..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Amount</label>
            <input
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Category</label>
            <select
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              className="h-10 w-full rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
              onClick={submit}
            >
              Add
            </button>
          </div>
        </div>

        <div className="mt-3">
          <label className="text-xs font-medium text-slate-600">Notes (optional)</label>
          <input
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any details for the client..."
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <button
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
            onClick={() => askQuick('ADS', 'ads spend')}
          >
            {adsMissing ? 'Add ads spend (required)' : 'Update ads spend'}
          </button>
          <button
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
            onClick={() => askQuick('SALARIES', 'salaries')}
          >
            {salariesMissing ? 'Add salaries (required)' : 'Update salaries'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-slate-900">This month’s items</div>
        {expenses.length === 0 ? (
          <div className="text-sm text-slate-600">No expenses added yet for this month.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {expenses.map((e) => (
              <Row key={e.id} expense={e} onRemove={() => onRemove(e.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Row({ expense, onRemove }: { expense: Expense; onRemove: () => void }) {
  return (
    <div className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-900">{expense.vendor}</div>
        <div className="text-xs text-slate-600">
          {expense.category} · {expense.source} · {expense.date}
        </div>
        {expense.notes ? <div className="text-xs text-slate-500">{expense.notes}</div> : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 md:mt-0 md:justify-end">
        <div className="text-sm font-semibold text-slate-900">{formatMoney(expense.amount, expense.currency)}</div>
        <button
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
    </div>
  )
}
