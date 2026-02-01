import { useEffect, useMemo, useState } from 'react'
import type { Expense } from '../lib/types'
import { todayIso } from '../lib/utils'
import { getBackendConfig } from '../lib/backendConfig'
import { getSupabaseClient } from '../lib/supabaseClient'
import { getGmailConfig } from '../lib/gmailConfig'
import {
  fetchReceiptCandidates,
  markReceiptImported,
  upsertReceiptCandidates,
  type ReceiptCandidate as SupaReceiptCandidate,
} from '../lib/receiptsSupabase'

type Props = {
  monthKey: string
  onImport: (input: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void
}

type BackendReceiptCandidate = {
  id: string
  provider: 'GMAIL' | 'ZOHO'
  vendor: string
  amount: number
  currency: string
  date: string
  subject?: string
  from?: string
}

export function Receipts({ monthKey, onImport }: Props) {
  const [status, setStatus] = useState<string>('')
  const [gmailUrl, setGmailUrl] = useState<string | null>(null)
  const [zohoHost, setZohoHost] = useState('imap.zoho.com')
  const [zohoUser, setZohoUser] = useState('')
  const [zohoPassword, setZohoPassword] = useState('')
  const [candidates, setCandidates] = useState<SupaReceiptCandidate[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const canZohoConnect = useMemo(() => Boolean(zohoHost.trim() && zohoUser.trim() && zohoPassword.trim()), [
    zohoHost,
    zohoUser,
    zohoPassword,
  ])

  async function apiFetch(path: string, init?: RequestInit) {
    const cfg = getBackendConfig()
    const baseUrl = cfg.baseUrl ? cfg.baseUrl : ''
    const gmail = getGmailConfig()
    const headers = new Headers(init?.headers)
    if (gmail?.clientId) headers.set('x-gmail-client-id', gmail.clientId)
    if (gmail?.clientSecret) headers.set('x-gmail-client-secret', gmail.clientSecret)
    if (gmail?.redirectUri) headers.set('x-gmail-redirect-uri', gmail.redirectUri)
    return fetch(`${baseUrl}${path}`, { ...init, headers })
  }

  async function loadFromSupabase() {
    const client = getSupabaseClient()
    if (!client) {
      setErrors(['Supabase not configured. Go to Settings and add Supabase URL + anon key.'])
      return
    }

    setStatus('Loading from Supabase...')
    setErrors([])
    try {
      const list = await fetchReceiptCandidates(client, monthKey)
      setCandidates(list)
      setStatus(list.length ? `Loaded ${list.length} receipt candidates from Supabase.` : 'No receipt candidates found in Supabase for this month.')
    } catch (e) {
      setStatus('')
      setErrors([`Supabase error: ${String((e as any)?.message ?? e)}`])
    }
  }

  useEffect(() => {
    void loadFromSupabase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey])

  async function connectGmail() {
    setStatus('Requesting Gmail auth URL...')
    setErrors([])
    const res = await apiFetch('/api/gmail/auth-url')
    const json = (await res.json()) as { ok: boolean; url?: string; error?: string }
    if (!json.ok || !json.url) {
      setStatus('')
      setErrors([json.error ?? 'Failed to get Gmail auth URL'])
      return
    }
    setGmailUrl(json.url)
    window.open(json.url, '_blank', 'noopener,noreferrer')
    setStatus('Opened Gmail OAuth in a new tab. Complete it, then come back and click Sync.')
  }

  async function connectZoho() {
    setStatus('Connecting Zoho via IMAP...')
    setErrors([])

    const res = await apiFetch('/api/zoho/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: zohoHost,
        port: 993,
        secure: true,
        user: zohoUser,
        password: zohoPassword,
      }),
    })

    const json = (await res.json()) as { ok: boolean; error?: string }
    if (!json.ok) {
      setStatus('')
      setErrors([json.error ?? 'Zoho connect failed'])
      return
    }

    setStatus('Zoho connected. You can now Sync receipts.')
  }

  async function sync(provider: 'all' | 'gmail' | 'zoho') {
    setStatus('Syncing receipts...')
    setErrors([])

    const res = await apiFetch(
      `/api/receipts/sync?monthKey=${encodeURIComponent(monthKey)}&provider=${provider}`,
    )
    const json = (await res.json()) as {
      ok: boolean
      receipts?: BackendReceiptCandidate[]
      errors?: string[]
      error?: string
    }

    const nextErrors = json.errors ?? (json.ok ? [] : [json.error ?? 'Sync failed'])
    setErrors(nextErrors)

    const supa = getSupabaseClient()
    if (supa && json.receipts?.length) {
      try {
        await upsertReceiptCandidates(
          supa,
          monthKey,
          json.receipts.map((r) => ({
            id: r.id,
            provider: r.provider,
            messageId: r.id,
            vendor: r.vendor,
            amount: r.amount,
            currency: r.currency,
            date: r.date,
            subject: r.subject,
            from: r.from,
          })),
        )
      } catch (e) {
        nextErrors.push(`Failed to write receipts to Supabase: ${String(e)}`)
        setErrors([...nextErrors])
      }
    }

    await loadFromSupabase()
    setStatus(nextErrors.length ? 'Sync completed with warnings.' : 'Sync completed.')
  }

  async function importOne(r: SupaReceiptCandidate) {
    onImport({
      monthKey,
      date: r.date || todayIso(),
      vendor: r.vendor,
      amount: r.amount,
      currency: 'USD',
      category: 'SUBSCRIPTIONS',
      source: 'EMAIL',
      notes: r.subject ?? '',
      receipt: {
        provider: r.provider,
        messageId: r.messageId,
        subject: r.subject,
        from: r.from,
        receivedAt: r.date,
      },
    })

    const client = getSupabaseClient()
    if (client) {
      try {
        await markReceiptImported(client, r.id)
      } catch {
        // ignore
      }
    }

    setCandidates((prev) => prev.filter((c) => c.id !== r.id))
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Connect email inboxes</div>
        <div className="mt-1 text-xs text-slate-600">
          Gmail uses OAuth (recommended). Zoho uses IMAP with an app password.
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold">Gmail</div>
            <div className="mt-2 flex flex-col gap-2">
              <button
                className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                onClick={connectGmail}
              >
                Connect Gmail
              </button>
              {gmailUrl ? <div className="text-xs text-slate-600 break-all">Auth URL: {gmailUrl}</div> : null}
              <div className="text-xs text-slate-600">
                After connecting, click Sync. If OAuth isn’t configured yet, set Gmail env vars in the server.
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold">Zoho (IMAP)</div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <label className="text-xs font-medium text-slate-600">
                Host
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={zohoHost}
                  onChange={(e) => setZohoHost(e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Email
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={zohoUser}
                  onChange={(e) => setZohoUser(e.target.value)}
                  placeholder="you@yourdomain.com"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                App password
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={zohoPassword}
                  onChange={(e) => setZohoPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                />
              </label>
              <button
                className="h-10 rounded-xl bg-white px-4 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                onClick={connectZoho}
                disabled={!canZohoConnect}
              >
                Connect Zoho
              </button>
              <div className="text-xs text-slate-600">
                Enable IMAP in Zoho settings and generate an app password.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Sync receipts for {monthKey}</div>
            <div className="text-xs text-slate-600">Sync pulls the latest items and shows candidates to import.</div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
              onClick={() => void loadFromSupabase()}
            >
              Load from Supabase
            </button>
            <button
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
              onClick={() => sync('all')}
            >
              Sync all
            </button>
            <button
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
              onClick={() => sync('gmail')}
            >
              Sync Gmail
            </button>
            <button
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
              onClick={() => sync('zoho')}
            >
              Sync Zoho
            </button>
          </div>
        </div>

        {status ? <div className="mt-3 text-sm text-slate-700">{status}</div> : null}
        {errors.length ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {errors.map((e, idx) => (
              <div key={idx}>{e}</div>
            ))}
          </div>
        ) : null}

        <div className="mt-4">
          {candidates.length === 0 ? (
            <div className="text-sm text-slate-600">No receipt candidates loaded yet.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {candidates.map((r) => (
                <div key={r.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{r.vendor}</div>
                    <div className="text-xs text-slate-600">
                      {r.provider} · {r.date} · {r.subject ? r.subject : 'Receipt'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:justify-end">
                    <div className="text-sm font-semibold text-slate-900">${r.amount.toFixed(2)}</div>
                    <button
                      className="h-9 rounded-xl bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
                      onClick={() => void importOne(r)}
                    >
                      Import
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
