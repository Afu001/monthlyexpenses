import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Expense } from '../lib/types'
import { formatMoney, sumExpenses } from '../lib/utils'
import { StatCard } from '../components/StatCard'
import { Banknote, Briefcase, Download, Megaphone, Repeat } from 'lucide-react'

type Props = {
  monthKey: string
  expenses: Expense[]
}

export function Dashboard({ monthKey, expenses }: Props) {
  const total = sumExpenses(expenses)

  const palette = ['#0f172a', '#2563eb', '#16a34a', '#f97316', '#a855f7', '#0ea5e9', '#db2777', '#eab308']

  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount
      return acc
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const byVendor = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.vendor] = (acc[e.vendor] ?? 0) + e.amount
      return acc
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const subscriptionsTotal = sumExpenses(expenses.filter((e) => e.category === 'SUBSCRIPTIONS'))
  const adsTotal = sumExpenses(expenses.filter((e) => e.category === 'ADS'))
  const salariesTotal = sumExpenses(expenses.filter((e) => e.category === 'SALARIES'))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{monthKey}</div>
          <div className="mt-1 text-sm text-slate-600">Summary and breakdown</div>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
          onClick={() => window.print()}
        >
          <Download className="h-4 w-4" />
          Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total spend"
          value={formatMoney(total, 'USD')}
          hint={monthKey}
          icon={<Banknote className="h-5 w-5" />}
        />
        <StatCard
          label="Subscriptions"
          value={formatMoney(subscriptionsTotal, 'USD')}
          icon={<Repeat className="h-5 w-5" />}
        />
        <StatCard label="Ads" value={formatMoney(adsTotal, 'USD')} icon={<Megaphone className="h-5 w-5" />} />
        <StatCard
          label="Salaries"
          value={formatMoney(salariesTotal, 'USD')}
          icon={<Briefcase className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Spend by category">
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={110} innerRadius={55} paddingAngle={2}>
                  {byCategory.map((entry, idx) => (
                    <Cell key={entry.name} fill={palette[idx % palette.length]} stroke="rgba(15, 23, 42, 0.08)" />
                  ))}
                </Pie>
                <Tooltip content={<MoneyTooltip />} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top vendors">
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVendor} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
                <XAxis dataKey="name" hide />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
                <Tooltip content={<MoneyTooltip />} />
                <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600">
            {byVendor.map((v) => (
              <div key={v.name} className="flex items-center justify-between">
                <span className="truncate pr-4">{v.name}</span>
                <span className="font-medium text-slate-900">{formatMoney(v.value, 'USD')}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-slate-900">{title}</div>
      {children}
    </section>
  )
}

function MoneyTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  const p = payload[0]
  const name = (p?.name ?? label ?? '').toString()
  const value = Number(p?.value ?? 0)
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-slate-900">{name}</div>
      <div className="mt-1 text-slate-600">{formatMoney(value, 'USD')}</div>
    </div>
  )
}
