import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, Expense, ExpenseCategory } from './types'
import { deleteExpense, ensureMonth, loadState, saveState, upsertExpense } from './storage'
import { monthKeyFromDate, newId, todayIso } from './utils'
import { enqueueDeleteExpense, enqueueUpsertExpense } from './outbox'
import { getSupabaseClient } from './supabaseClient'
import { flushOutbox, mergeRemoteExpenses, pullRemoteExpenses } from './supabaseSync'

export type UseAppState = {
  state: AppState
  selectedMonthKey: string
  setSelectedMonthKey: (mk: string) => void
  monthExpenses: Expense[]
  addExpense: (input: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateExpense: (expense: Expense) => void
  removeExpense: (expenseId: string) => void
  upsertMonthlyQuick: (category: ExpenseCategory, amount: number) => void
}

export function useAppState(): UseAppState {
  const [state, setState] = useState<AppState>(() => loadState())
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => monthKeyFromDate(new Date()))
  const syncTimer = useRef<number | null>(null)

  useEffect(() => {
    saveState(state)
  }, [state])

  const monthExpenses = useMemo(() => {
    return (state.months[selectedMonthKey]?.expenses ?? []).filter((e) => !e.deleted)
  }, [state, selectedMonthKey])

  useEffect(() => {
    async function tick() {
      const client = getSupabaseClient()
      if (!client) return

      try {
        await flushOutbox(client)
      } catch {
        // ignore; we'll retry
      }

      try {
        await pullRemoteExpenses(client, (incoming) => {
          setState((prev) => mergeRemoteExpenses(prev, incoming))
        })
      } catch {
        // ignore; we'll retry
      }
    }

    void tick()

    if (syncTimer.current) window.clearInterval(syncTimer.current)
    syncTimer.current = window.setInterval(() => {
      void tick()
    }, 8000)

    window.addEventListener('online', tick)
    return () => {
      window.removeEventListener('online', tick)
      if (syncTimer.current) window.clearInterval(syncTimer.current)
      syncTimer.current = null
    }
  }, [])

  function addExpense(input: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    const created: Expense = {
      ...input,
      id: newId(),
      createdAt: now,
      updatedAt: now,
    }

    void enqueueUpsertExpense(created)

    setState((prev) => {
      const next: AppState = {
        ...prev,
        months: { ...prev.months },
      }
      upsertExpense(next, created)
      return next
    })
  }

  function updateExpense(expense: Expense) {
    const now = new Date().toISOString()
    const updated: Expense = { ...expense, updatedAt: now }

    void enqueueUpsertExpense(updated)

    setState((prev) => {
      const next: AppState = {
        ...prev,
        months: { ...prev.months },
      }
      upsertExpense(next, updated)
      return next
    })
  }

  function removeExpense(expenseId: string) {
    const now = new Date().toISOString()
    let tombstone: Expense | null = null

    setState((prev) => {
      const next: AppState = {
        ...prev,
        months: { ...prev.months },
      }

      const month = ensureMonth(next, selectedMonthKey)
      const existing = month.expenses.find((e) => e.id === expenseId)

      if (existing) {
        tombstone = { ...existing, deleted: true, updatedAt: now }
        upsertExpense(next, tombstone)
      } else {
        deleteExpense(next, selectedMonthKey, expenseId)
      }

      return next
    })

    void enqueueDeleteExpense(selectedMonthKey, expenseId)
    if (tombstone) void enqueueUpsertExpense(tombstone)
  }

  function upsertMonthlyQuick(category: ExpenseCategory, amount: number) {
    setState((prev) => {
      const next: AppState = {
        ...prev,
        months: { ...prev.months },
      }

      const month = ensureMonth(next, selectedMonthKey)
      const existing = month.expenses.find((e) => e.category === category && e.vendor === category)
      const now = new Date().toISOString()

      const base: Omit<Expense, 'id'> = {
        monthKey: selectedMonthKey,
        date: todayIso(),
        vendor: category,
        amount,
        currency: 'USD',
        category,
        source: 'MANUAL',
        notes: '',
        createdAt: now,
        updatedAt: now,
      }

      if (existing) {
        upsertExpense(next, { ...existing, ...base, id: existing.id, createdAt: existing.createdAt })
        void enqueueUpsertExpense({ ...existing, ...base, id: existing.id, createdAt: existing.createdAt })
      } else {
        const created = { ...base, id: newId() }
        upsertExpense(next, created)
        void enqueueUpsertExpense(created)
      }

      return next
    })
  }

  return {
    state,
    selectedMonthKey,
    setSelectedMonthKey,
    monthExpenses,
    addExpense,
    updateExpense,
    removeExpense,
    upsertMonthlyQuick,
  }
}
