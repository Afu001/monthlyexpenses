export type SupabaseConfig = {
  url: string
  anonKey: string
}

const KEY = 'monthfinance.supabaseConfig'

export function getSupabaseConfig(): SupabaseConfig | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<SupabaseConfig>
    if (!parsed.url || !parsed.anonKey) return null
    return { url: parsed.url, anonKey: parsed.anonKey }
  } catch {
    return null
  }
}

export function setSupabaseConfig(cfg: SupabaseConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function clearSupabaseConfig() {
  localStorage.removeItem(KEY)
}
