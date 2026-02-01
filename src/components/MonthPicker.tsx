type Props = {
  value: string
  onChange: (value: string) => void
}

export function MonthPicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-600">Month</label>
      <input
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-900/10"
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
