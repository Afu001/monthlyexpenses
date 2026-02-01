import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { Banknote, Briefcase, Megaphone, Repeat } from 'lucide-react'

type Props = {
  monthKey: string
  expenses: Expense[]
}

export function Dashboard({ monthKey, expenses }: Props) {
  const total = sumExpenses(expenses)

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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={110} innerRadius={55} />
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top vendors">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVendor} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0f172a" radius={[8, 8, 0, 0]} />
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
