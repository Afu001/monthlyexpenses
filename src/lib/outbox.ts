import { get, set } from 'idb-keyval'
import type { Expense } from './types'
import { newId } from './utils'

export type OutboxOp =
  | {
      id: string
      ts: string
      type: 'upsert_expense'
      expense: Expense
    }
  | {
      id: string
      ts: string
      type: 'delete_expense'
      expenseId: string
      monthKey: string
    }

const OUTBOX_KEY = 'monthfinance.outbox'
const LAST_PULL_KEY = 'monthfinance.lastPullAt'

export async function loadOutbox(): Promise<OutboxOp[]> {
  return (await get(OUTBOX_KEY)) ?? []
}

export async function saveOutbox(outbox: OutboxOp[]): Promise<void> {
  await set(OUTBOX_KEY, outbox)
}

export async function enqueueUpsertExpense(expense: Expense): Promise<void> {
  const outbox = await loadOutbox()
  outbox.push({ id: newId(), ts: new Date().toISOString(), type: 'upsert_expense', expense })
  await saveOutbox(outbox)
}

export async function enqueueDeleteExpense(monthKey: string, expenseId: string): Promise<void> {
  const outbox = await loadOutbox()
  outbox.push({ id: newId(), ts: new Date().toISOString(), type: 'delete_expense', expenseId, monthKey })
  await saveOutbox(outbox)
}

export async function getLastPullAt(): Promise<string | null> {
  return (await get(LAST_PULL_KEY)) ?? null
}

export async function setLastPullAt(ts: string): Promise<void> {
  await set(LAST_PULL_KEY, ts)
}
