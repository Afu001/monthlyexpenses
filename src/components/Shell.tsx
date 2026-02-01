import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Inbox, LogOut, Mail, PlusCircle, ReceiptText, Settings } from 'lucide-react'
import { MonthPicker } from './MonthPicker'
import type { ReactNode } from 'react'
import { logout } from '../lib/auth'

type Props = {
  monthKey: string
  onMonthChange: (mk: string) => void
}

export function Shell({ monthKey, onMonthChange }: Props) {
  const navigate = useNavigate()

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-0 md:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-white md:min-h-screen md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <ReceiptText className="h-5 w-5" />
              <span>Koheji's Finances</span>
            </Link>
          </div>
          <nav className="px-3 pb-4 md:block">
            <div className="flex gap-2 overflow-x-auto pb-2 md:block md:overflow-visible md:pb-0">
            <NavItem to="/" icon={<BarChart3 className="h-4 w-4" />} label="Dashboard" />
            <NavItem to="/expenses" icon={<PlusCircle className="h-4 w-4" />} label="Expenses" />
            <NavItem to="/receipts" icon={<Inbox className="h-4 w-4" />} label="Receipts" />
            <NavItem to="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
            </div>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-600">
                <Mail className="h-4 w-4" />
                Receipt inbox
              </div>
              <div className="text-xs text-slate-600">
                Connect Gmail (OAuth) and Zoho (IMAP) to sync receipts and import them as expenses.
              </div>
            </div>
          </nav>
        </aside>

        <main className="p-4 md:p-8">
          <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Monthly expense estimator</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Expenses overview</h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <MonthPicker value={monthKey} onChange={onMonthChange} />
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NavItem({
  to,
  label,
  icon,
}: {
  to: string
  label: string
  icon: ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        [
          'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
          isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
        ].join(' ')
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}
