import dotenv from 'dotenv'
import cors from 'cors'
import express from 'express'
import { google } from 'googleapis'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '.env')
const envExamplePath = path.join(__dirname, '.env.example')

dotenv.config({ path: envPath })
if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REDIRECT_URI) {
  dotenv.config({ path: envExamplePath })
}

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))

const PORT = Number(process.env.PORT ?? 5174)

// In-memory dev storage (replace with DB later)
const store = {
  gmail: {
    oauthClient: null,
    tokens: null,
  },
  zoho: {
    config: null,
  },
}

function getGmailOAuthClient() {
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const redirectUri = process.env.GMAIL_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) return null

  const oauthClient = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  return oauthClient
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/gmail/auth-url', (_req, res) => {
  const oauthClient = getGmailOAuthClient()
  if (!oauthClient) {
    res.status(400).json({
      ok: false,
      error: 'Missing Gmail OAuth env vars: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI',
    })
    return
  }

  store.gmail.oauthClient = oauthClient

  const url = oauthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  })

  res.json({ ok: true, url })
})

app.get('/api/gmail/oauth2callback', async (req, res) => {
  const code = req.query.code
  const oauthClient = store.gmail.oauthClient ?? getGmailOAuthClient()

  if (!oauthClient) {
    res.status(400).send('Gmail OAuth is not configured (missing env vars).')
    return
  }

  if (!code || typeof code !== 'string') {
    res.status(400).send('Missing code')
    return
  }

  try {
    const { tokens } = await oauthClient.getToken(code)
    store.gmail.tokens = tokens
    res.send('Gmail connected. You can close this tab and return to the app.')
  } catch (err) {
    res.status(500).send(String(err))
  }
})

app.post('/api/zoho/connect', (req, res) => {
  const { host, port, secure, user, password } = req.body ?? {}
  if (!host || !user || !password) {
    res.status(400).json({ ok: false, error: 'host, user, password are required' })
    return
  }
  store.zoho.config = {
    host,
    port: Number(port ?? 993),
    secure: secure !== false,
    user,
    password,
  }
  res.json({ ok: true })
})

function monthToDateRange(monthKey) {
  const [y, m] = monthKey.split('-').map((v) => Number(v))
  if (!y || !m) return null
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0))
  return { start, end }
}

function formatGmailQueryDate(d) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

function pickHeader(headers, name) {
  const h = headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase())
  return h?.value ?? ''
}

function vendorFromFromHeader(fromHeader) {
  if (!fromHeader) return ''
  const cleaned = fromHeader.replace(/<[^>]+>/g, '').trim()
  return cleaned || fromHeader
}

async function listGmailMessageIds(gmail, q, limit) {
  const ids = []
  let pageToken = undefined

  while (ids.length < limit) {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q,
      maxResults: Math.min(500, limit - ids.length),
      pageToken,
    })

    const batch = res.data.messages ?? []
    for (const m of batch) {
      if (m.id) ids.push(m.id)
      if (ids.length >= limit) break
    }

    pageToken = res.data.nextPageToken
    if (!pageToken || batch.length === 0) break
  }

  return ids
}

async function mapConcurrent(items, concurrency, fn) {
  const results = []
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency)
    const batch = await Promise.all(slice.map(fn))
    results.push(...batch)
  }
  return results
}

function guessAmountAndCurrency(text) {
  // Simple heuristic: matches $12.34 or USD 12.34
  const usd1 = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/)
  if (usd1) return { currency: 'USD', amount: Number(usd1[1]) }
  const usd2 = text.match(/\bUSD\s*(\d+(?:\.\d{1,2})?)/i)
  if (usd2) return { currency: 'USD', amount: Number(usd2[1]) }
  return { currency: 'USD', amount: null }
}

async function syncZoho(monthKey) {
  if (!store.zoho.config) {
    return { ok: false, error: 'Zoho not connected. Configure IMAP first.' }
  }

  const range = monthToDateRange(monthKey)
  if (!range) return { ok: false, error: 'Invalid monthKey' }

  const client = new ImapFlow({
    host: store.zoho.config.host,
    port: store.zoho.config.port,
    secure: store.zoho.config.secure,
    auth: {
      user: store.zoho.config.user,
      pass: store.zoho.config.password,
    },
  })

  const results = []

  await client.connect()
  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
      const since = range.start
      const before = range.end

      const uids = await client.search({ since, before })
      const limited = uids.slice(-50)

      for await (const msg of client.fetch(limited, { envelope: true, source: true })) {
        const parsed = await simpleParser(msg.source)
        const subject = parsed.subject ?? msg.envelope?.subject ?? ''
        const from = parsed.from?.text ?? ''

        const guess = guessAmountAndCurrency(`${subject}\n${parsed.text ?? ''}`)

        if (!guess.amount) continue

        results.push({
          id: `zoho-${msg.uid}`,
          provider: 'ZOHO',
          vendor: (from || subject || 'Zoho Receipt').slice(0, 80),
          amount: guess.amount,
          currency: guess.currency,
          date: (parsed.date ? parsed.date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
          subject,
          from,
        })
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => {})
  }

  return { ok: true, receipts: results }
}

async function syncGmail(_monthKey) {
  const range = monthToDateRange(_monthKey)
  if (!range) return { ok: false, error: 'Invalid monthKey' }

  const oauthClient = store.gmail.oauthClient ?? getGmailOAuthClient()
  if (!oauthClient || !store.gmail.tokens) {
    return { ok: false, error: 'Gmail not connected. Click “Connect Gmail” and complete OAuth.' }
  }

  oauthClient.setCredentials(store.gmail.tokens)
  const gmail = google.gmail({ version: 'v1', auth: oauthClient })

  const after = formatGmailQueryDate(range.start)
  const before = formatGmailQueryDate(range.end)
  const q = `after:${after} before:${before} (receipt OR invoice OR paid OR payment OR subscription)`

  const messageIds = await listGmailMessageIds(gmail, q, 300)

  const parsed = await mapConcurrent(
    messageIds,
    10,
    async (id) => {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      })

      const headers = msg.data.payload?.headers ?? []
      const subject = pickHeader(headers, 'Subject')
      const fromHeader = pickHeader(headers, 'From')
      const dateHeader = pickHeader(headers, 'Date')
      const snippet = msg.data.snippet ?? ''

      const guess = guessAmountAndCurrency(`${subject}\n${snippet}`)
      if (!guess.amount) return null

      const parsedDate = dateHeader ? new Date(dateHeader) : null
      const isoDate =
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)

      return {
        id: `gmail-${id}`,
        provider: 'GMAIL',
        vendor: (vendorFromFromHeader(fromHeader) || subject || 'Gmail Receipt').slice(0, 80),
        amount: guess.amount,
        currency: guess.currency,
        date: isoDate,
        subject,
        from: fromHeader,
      }
    },
  )

  const results = parsed.filter(Boolean)
  return { ok: true, receipts: results }
}

app.get('/api/receipts/sync', async (req, res) => {
  const monthKey = String(req.query.monthKey ?? '')
  const provider = String(req.query.provider ?? 'all').toLowerCase()

  const jobs = []
  if (provider === 'zoho' || provider === 'all') jobs.push(syncZoho(monthKey))
  if (provider === 'gmail' || provider === 'all') jobs.push(syncGmail(monthKey))

  try {
    const settled = await Promise.all(jobs)

    const receipts = settled
      .filter((r) => r.ok)
      .flatMap((r) => r.receipts)

    const errors = settled.filter((r) => !r.ok).map((r) => r.error)

    res.json({ ok: errors.length === 0, receipts, errors })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Receipt server listening on http://localhost:${PORT}`)
})
