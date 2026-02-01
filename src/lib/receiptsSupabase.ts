import type { SupabaseClient } from '@supabase/supabase-js'

export type ReceiptCandidate = {
  id: string
  monthKey: string
  provider: 'GMAIL' | 'ZOHO'
  messageId: string
  vendor: string
  amount: number
  currency: string
  date: string
  subject?: string
  from?: string
  status: 'new' | 'imported' | 'ignored'
  createdAt: string
  updatedAt: string
}

function normalizeRow(row: any): ReceiptCandidate {
  return {
    id: String(row.id),
    monthKey: String(row.month_key),
    provider: row.provider,
    messageId: String(row.message_id),
    vendor: String(row.vendor),
    amount: Number(row.amount_guess),
    currency: String(row.currency_guess ?? 'USD'),
    date: String(row.date),
    subject: row.subject ?? undefined,
    from: row.from ?? undefined,
    status: (row.status ?? 'new') as ReceiptCandidate['status'],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function upsertReceiptCandidates(
  client: SupabaseClient,
  monthKey: string,
  candidates: Array<{
    id: string
    provider: 'GMAIL' | 'ZOHO'
    messageId: string
    vendor: string
    amount: number
    currency: string
    date: string
    subject?: string
    from?: string
  }>,
): Promise<void> {
  if (candidates.length === 0) return

  const now = new Date().toISOString()
  const payload = candidates.map((c) => ({
    id: c.id,
    month_key: monthKey,
    provider: c.provider,
    message_id: c.messageId,
    vendor: c.vendor,
    amount_guess: c.amount,
    currency_guess: c.currency,
    date: c.date,
    subject: c.subject ?? null,
    from: c.from ?? null,
    status: 'new',
    created_at: now,
    updated_at: now,
  }))

  const { error } = await client.from('receipt_candidates').upsert(payload, { onConflict: 'id' })
  if (error) throw error
}

export async function fetchReceiptCandidates(
  client: SupabaseClient,
  monthKey: string,
): Promise<ReceiptCandidate[]> {
  const { data, error } = await client
    .from('receipt_candidates')
    .select('*')
    .eq('month_key', monthKey)
    .eq('status', 'new')
    .order('date', { ascending: false })
    .limit(500)

  if (error) throw error
  return (data ?? []).map(normalizeRow)
}

export async function markReceiptImported(client: SupabaseClient, id: string): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await client
    .from('receipt_candidates')
    .update({ status: 'imported', updated_at: now })
    .eq('id', id)

  if (error) throw error
}
