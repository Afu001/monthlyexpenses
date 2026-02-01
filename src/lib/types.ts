export type ExpenseCategory =
  | 'SUBSCRIPTIONS'
  | 'ADS'
  | 'SALARIES'
  | 'TOOLS'
  | 'TRAVEL'
  | 'OFFICE'
  | 'OTHER'

export type ExpenseSource = 'MANUAL' | 'EMAIL'

export type ReceiptProvider = 'GMAIL' | 'ZOHO'

export type CurrencyCode = 'USD' | 'PKR' | 'AED' | 'EUR' | 'GBP' | 'INR' | string

export type Expense = {
  id: string
  monthKey: string // YYYY-MM
  date: string // ISO date (YYYY-MM-DD)
  vendor: string
  amount: number
  currency: CurrencyCode
  category: ExpenseCategory
  source: ExpenseSource
  deleted?: boolean
  notes?: string
  receipt?: {
    provider: ReceiptProvider
    messageId?: string
    subject?: string
    from?: string
    receivedAt?: string
  }
  createdAt: string
  updatedAt: string
}

export type MonthData = {
  monthKey: string
  expenses: Expense[]
}

export type AppState = {
  version: 1
  months: Record<string, MonthData>
}
