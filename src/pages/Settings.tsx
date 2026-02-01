import { useMemo, useState } from 'react'
import { clearSupabaseConfig, getSupabaseConfig, setSupabaseConfig } from '../lib/supabaseConfig'
import { getSupabaseClient } from '../lib/supabaseClient'
import { getBackendConfig, normalizeBaseUrl, setBackendConfig } from '../lib/backendConfig'

type TestResult = { ok: boolean; message: string } | null

export function Settings() {
  const existing = useMemo(() => getSupabaseConfig(), [])
  const existingBackend = useMemo(() => getBackendConfig(), [])
  const [url, setUrl] = useState(existing?.url ?? '')
  const [anonKey, setAnonKey] = useState(existing?.anonKey ?? '')
  const [backendBaseUrl, setBackendBaseUrl] = useState(existingBackend.baseUrl ?? '')
  const [test, setTest] = useState<TestResult>(null)

  async function testConnection() {
    setTest({ ok: true, message: 'Testing connection...' })

    setSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() })
    const client = getSupabaseClient()
    if (!client) {
      setTest({ ok: false, message: 'Missing Supabase URL or anon key.' })
      return
    }

    const { error } = await client.from('expenses').select('id', { head: true, count: 'exact' }).limit(1)

    if (error) {
      setTest({ ok: false, message: `Supabase error: ${error.message}` })
      return
    }

    setTest({ ok: true, message: 'Connected to Supabase successfully.' })
  }

  function save() {
    setSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() })
    setBackendConfig({ baseUrl: normalizeBaseUrl(backendBaseUrl) })
    setTest({ ok: true, message: 'Saved.' })
  }

  function clear() {
    clearSupabaseConfig()
    setUrl('')
    setAnonKey('')
    setBackendConfig({ baseUrl: '' })
    setBackendBaseUrl('')
    setTest({ ok: true, message: 'Cleared local Supabase config.' })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Supabase settings</div>
        <div className="mt-1 text-xs text-slate-600">
          This app can sync to Supabase. If Supabase is offline/unreachable, changes stay local and will sync later.
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <label className="text-xs font-medium text-slate-600">
            Supabase URL
            <input
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxxxx.supabase.co"
            />
          </label>

          <label className="text-xs font-medium text-slate-600">
            Supabase anon key
            <input
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="anon key"
            />
          </label>

          <label className="text-xs font-medium text-slate-600">
            Local backend URL (optional)
            <input
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              value={backendBaseUrl}
              onChange={(e) => setBackendBaseUrl(e.target.value)}
              placeholder="http://localhost:5174 or https://xxxx.ngrok-free.app"
            />
            <div className="mt-1 text-xs font-normal text-slate-600">
              Use this if your frontend is hosted (Netlify/Vercel) and you want it to reach your local receipt server.
            </div>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
              onClick={save}
            >
              Save
            </button>
            <button
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
              onClick={testConnection}
            >
              Test connection
            </button>
            <button
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
              onClick={clear}
            >
              Clear
            </button>
          </div>

          {test ? (
            <div
              className={[
                'rounded-xl border p-3 text-sm',
                test.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900',
              ].join(' ')}
            >
              {test.message}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
