import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppState, Expense } from './types'
import { loadOutbox, saveOutbox, getLastPullAt, setLastPullAt } from './outbox'
import { deleteExpense, upsertExpense } from './storage'

function isNewer(a: string, b: string): boolean {
  return new Date(a).getTime() > new Date(b).getTime()
}

function normalizeExpense(row: any): Expense {
  return {
    id: String(row.id),
    monthKey: String(row.month_key),
    date: String(row.date),
    vendor: String(row.vendor),
    amount: Number(row.amount),
    currency: String(row.currency ?? 'USD'),
    category: row.category,
    source: row.source,
    deleted: Boolean(row.deleted ?? false),
    notes: row.notes ?? undefined,
    receipt: row.receipt ?? undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function flushOutbox(client: SupabaseClient): Promise<{ flushed: number; remaining: number }> {
  const outbox = await loadOutbox()
  if (outbox.length === 0) return { flushed: 0, remaining: 0 }

  let flushed = 0
  const remaining = []

  for (const op of outbox) {
    try {
      if (op.type === 'upsert_expense') {
        const e = op.expense
        const payload = {
          id: e.id,
          month_key: e.monthKey,
          date: e.date,
          vendor: e.vendor,
          amount: e.amount,
          currency: e.currency,
          category: e.category,
          source: e.source,
          deleted: e.deleted ?? false,
          notes: e.notes ?? null,
          receipt: e.receipt ?? null,
          created_at: e.createdAt,
          updated_at: e.updatedAt,
        }

        const { error } = await client.from('expenses').upsert(payload, { onConflict: 'id' })
        if (error) throw error
      }

      if (op.type === 'delete_expense') {
        const { error } = await client
          .from('expenses')
          .update({ deleted: true, updated_at: new Date().toISOString() })
          .eq('id', op.expenseId)
        if (error) throw error
      }

      flushed += 1
    } catch {
      remaining.push(op)
    }
  }

  await saveOutbox(remaining)
  return { flushed, remaining: remaining.length }
}

export async function pullRemoteExpenses(
  client: SupabaseClient,
  apply: (expenses: Expense[]) => void,
): Promise<{ pulled: number }>
{
  const last = (await getLastPullAt()) ?? '1970-01-01T00:00:00.000Z'

  const { data, error } = await client
    .from('expenses')
    .select('*')
    .gte('updated_at', last)
    .order('updated_at', { ascending: true })
    .limit(2000)

  if (error) throw error

  const expenses = (data ?? []).map(normalizeExpense)
  apply(expenses)

  const newest = expenses.reduce<string>((acc, e) => (isNewer(e.updatedAt, acc) ? e.updatedAt : acc), last)
  await setLastPullAt(newest)

  return { pulled: expenses.length }
}

export function mergeRemoteExpenses(prev: AppState, incoming: Expense[]): AppState {
  const next: AppState = { ...prev, months: { ...prev.months } }

  for (const e of incoming) {
    const existing = next.months[e.monthKey]?.expenses?.find((x) => x.id === e.id)
    if (existing && !isNewer(e.updatedAt, existing.updatedAt)) continue

    if (e.deleted) {
      deleteExpense(next, e.monthKey, e.id)
      continue
    }

    upsertExpense(next, e)
  }

  return next
}
