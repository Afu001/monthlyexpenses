# Improvements & Next Features

This document lists high-value improvements you can add to make the project more client-ready, scalable, and accurate.

## 1) Receipt ingestion (Email)

### Gmail
- **Better receipt detection**: expand query patterns per vendor (Stripe, Paddle, PayPal, Google Workspace, AWS, Meta, etc.).
- **Attachment handling**: download and store PDF invoices/receipts and show them in UI.
- **Thread handling**: group receipts by thread and dedupe by `Message-Id`/invoice number.
- **Pagination + rate limits**: add retry/backoff and caching to avoid re-fetching the same messages.

### Zoho (when you enable IMAP)
- **IMAP folder selection**: choose INBOX vs “Receipts” label/folder.
- **Secure credential storage**: encrypt stored credentials (or use OAuth if required).

### General
- **“Review queue” flow**: sync produces candidates → you approve/edit → then import.
- **De-duplication**: prevent double-import by hashing `(provider, messageId, amount, date)`.
- **Vendor rules**: map common senders to a clean vendor name and default category.

## 2) Parsing accuracy (turn receipts into clean expenses)
- **Robust amount extraction**: parse multiple currency formats (`$`, `USD`, commas, locales).
- **Tax vs total**: detect “Subtotal”, “Tax”, “Total” and store both if needed.
- **Date detection**: prefer invoice date over email received date where available.
- **Category inference**: basic NLP/rules, e.g. “Adobe” → SUBSCRIPTIONS, “Meta” → ADS.
- **Confidence scoring**: show a score so you know which entries need manual review.

## 3) Data model upgrades
- **Multi-currency support**:
  - store `currency` per expense
  - optionally store `fxRate` and `amountUSD` for unified reporting
- **Recurring subscriptions**:
  - mark recurring expenses
  - show MRR/ARR and upcoming renewals
- **Employees & salaries**:
  - per-employee salary entries
  - departments / cost centers
- **Projects / clients**:
  - tag expenses by client/project
  - report profitability

## 4) UX improvements for “panel to add expenses”
- **Edit expense**: currently remove-only; add edit modal.
- **Bulk import**: paste CSV / upload CSV.
- **Keyboard-first entry**: fast form entry for operators.
- **Templates**: quick-add common vendors.
- **Better month navigation**: previous/next month buttons and quick jump.

## 5) Dashboard & visualization (client-ready)
- **Trends**:
  - daily/weekly spend line chart
  - month-over-month comparison
- **Breakdowns**:
  - stacked bar by category
  - vendor concentration (% top 5 vendors)
- **Forecasting**:
  - predict end-of-month spend based on current pace
- **Budgeting**:
  - per-category budgets
  - burn-down indicators
- **Exportable reports**:
  - “Client Report PDF” view
  - CSV export of the month

## 6) Permissions / audit (if client will use it)
- **Login**: admin vs viewer.
- **Audit log**: who imported/edited/deleted expenses.
- **Readonly share link**: client can view dashboard without edit permissions.

## 7) Persistence & backend
Right now the app is fine for local use, but for production:
- **Database**: Postgres (recommended) or SQLite for simple single-user use.
- **API structure**: versioned routes, validation, error handling.
- **Background jobs**: schedule nightly receipt sync.
- **Webhooks (optional)**: some providers support invoice webhooks.

## 8) Quality & reliability
- **Tests**:
  - parsing unit tests
  - API integration tests
- **Observability**:
  - structured logs
  - error reporting
- **Performance**:
  - caching fetched Gmail message ids
  - incremental sync (only new emails)

## 9) Security notes (even if not hosting)
- **Never hardcode secrets in frontend**.
- **Prefer OAuth** wherever possible.
- **Revoke/rotate secrets** if they were exposed.

## Suggested next implementation order
1. Review queue + de-duplication
2. Better parsing rules + vendor mapping
3. Edit expense + CSV export
4. Trend charts + forecasting
5. Zoho IMAP integration + attachment storage

## 10) Supabase sync architecture (Hosted frontend + local backend + offline mode)

Goal:
- Host the frontend on **Vercel/Netlify**
- Run the receipt-fetching backend on your **local machine**
- Store everything in **Supabase** (source of truth)
- If Supabase is unreachable, the app should **work locally** and **sync later**

How it works in this project:
- **Expenses**:
  - When you add/edit/delete an expense, it is applied locally instantly.
  - The change is appended to an **outbox queue** (stored locally).
  - A background loop keeps retrying:
    - flush outbox → push to Supabase
    - pull remote updates → merge back into local state
- **Deletions are tombstoned**:
  - Instead of hard-deleting rows, we mark `deleted=true`.
  - This prevents “deleted items coming back” during conflict/merge.

Important note about “local backend + hosted frontend”:
- A hosted site cannot call your local machine by default.
- If you want your hosted frontend to trigger Gmail/Zoho sync from your PC, you must expose the local backend via a tunnel URL (ngrok / cloudflared) and paste it into **Settings → Local backend URL**.

## 11) Supabase setup steps (so everything syncs perfectly)

### A) Create a Supabase project
1. Go to https://supabase.com
2. Create a **New Project**
3. Wait for provisioning

### B) Create tables (SQL)
1. Open **SQL Editor** in Supabase
2. Create a new query
3. Paste and run:

```sql
-- EXPENSES
create table if not exists public.expenses (
  id text primary key,
  month_key text not null,
  date date not null,
  vendor text not null,
  amount numeric not null,
  currency text not null default 'USD',
  category text not null,
  source text not null,
  deleted boolean not null default false,
  notes text,
  receipt jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists expenses_month_key_idx on public.expenses (month_key);
create index if not exists expenses_updated_at_idx on public.expenses (updated_at);

-- RECEIPT CANDIDATES (review queue)
create table if not exists public.receipt_candidates (
  id text primary key,
  month_key text not null,
  provider text not null,
  message_id text not null,
  vendor text not null,
  amount_guess numeric not null,
  currency_guess text not null default 'USD',
  date date not null,
  subject text,
  "from" text,
  status text not null default 'new',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists receipt_candidates_month_key_idx on public.receipt_candidates (month_key);
create index if not exists receipt_candidates_status_idx on public.receipt_candidates (status);
create index if not exists receipt_candidates_updated_at_idx on public.receipt_candidates (updated_at);
```

### C) Disable RLS for quick setup
If you do not want to deal with auth/policies right now:
1. Go to **Database → Tables → expenses → RLS**
2. Turn **RLS OFF**
3. Repeat for `receipt_candidates`

### D) Get Supabase URL + anon key
1. Go to **Project Settings → API**
2. Copy:
   - Project URL
   - anon public key

### E) Configure the app
1. Open the app
2. Go to **Settings**
3. Paste:
   - Supabase URL
   - Supabase anon key
4. Click **Test connection**

### F) Configure local backend access (only if frontend is hosted)
If you are running frontend locally in dev, you can keep it empty.

If you deploy frontend to Netlify/Vercel and still want to run Gmail sync from your PC:
1. Start your local receipt server:
   - `npm run dev:server`
2. Create a tunnel to your local server (pick one):
   - ngrok: expose port `5174`
   - cloudflared tunnel: expose port `5174`
3. Copy the tunnel URL (https://...)
4. Paste it into **Settings → Local backend URL**

### G) How to verify syncing works
- With Supabase configured:
  - Add an expense → refresh page → it should still be there.
  - Open Supabase table editor → row should appear.
- With internet/Supabase temporarily unreachable:
  - Add expenses → they should appear locally.
  - When internet comes back → they should upload automatically.

