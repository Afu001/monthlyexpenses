type Props = {
  value: string
  onChange: (value: string) => void
}

export function MonthPicker({ value, onChange }: Props) {
  const [yearStr, monthStr] = value.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  const now = new Date()
  const currentYear = now.getFullYear()
  const years = Array.from({ length: 7 }, (_, i) => String(currentYear - 3 + i))

  function update(nextYear: number, nextMonth: number) {
    const y = String(nextYear)
    const m = String(nextMonth).padStart(2, '0')
    onChange(`${y}-${m}`)
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-600">Month</label>
      <div className="flex items-center gap-2">
        <select
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-900/10"
          value={Number.isFinite(year) ? String(year) : String(currentYear)}
          onChange={(e) => update(Number(e.target.value), Number.isFinite(month) ? month : now.getMonth() + 1)}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-900/10"
          value={Number.isFinite(month) ? String(month) : String(now.getMonth() + 1)}
          onChange={(e) => update(Number.isFinite(year) ? year : currentYear, Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => {
            const m = i + 1
            return (
              <option key={m} value={m}>
                {String(m).padStart(2, '0')}
              </option>
            )
          })}
        </select>
      </div>
    </div>
  )
}
