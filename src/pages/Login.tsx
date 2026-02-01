import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithPassword } from '../lib/auth'

export function Login() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    const ok = loginWithPassword(password)
    if (!ok) {
      setError('Wrong password')
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold tracking-tight">Sign in</div>
          <div className="mt-1 text-sm text-slate-600">Enter the password to access the dashboard.</div>

          <label className="mt-4 block text-xs font-medium text-slate-600">
            Password
            <input
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />
          </label>

          <button
            className="mt-4 h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            onClick={submit}
          >
            Login
          </button>

          {error ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
