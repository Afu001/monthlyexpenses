import type { AppState, Expense, MonthData } from './types'

const STORAGE_KEY = 'monthfinance.appState'

const defaultState: AppState = {
  version: 1,
  months: {},
}

function safeParse(json: string | null): AppState | null {
  if (!json) return null
  try {
    const parsed = JSON.parse(json) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const state = parsed as Partial<AppState>
    if (state.version !== 1) return null
    if (!state.months || typeof state.months !== 'object') return null
    return state as AppState
  } catch {
    return null
  }
}

export function loadState(): AppState {
  return safeParse(localStorage.getItem(STORAGE_KEY)) ?? defaultState
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function ensureMonth(state: AppState, monthKey: string): MonthData {
  const existing = state.months[monthKey]
  if (existing) return existing
  const created: MonthData = { monthKey, expenses: [] }
  state.months[monthKey] = created
  return created
}

export function upsertExpense(state: AppState, expense: Expense) {
  const month = ensureMonth(state, expense.monthKey)
  const idx = month.expenses.findIndex((e) => e.id === expense.id)
  if (idx >= 0) month.expenses[idx] = expense
  else month.expenses.unshift(expense)
}

export function deleteExpense(state: AppState, monthKey: string, expenseId: string) {
  const month = ensureMonth(state, monthKey)
  month.expenses = month.expenses.filter((e) => e.id !== expenseId)
}
