export type SupabaseConfig = {
  url: string
  anonKey: string
}

const KEY = 'monthfinance.supabaseConfig'

const FORCED: SupabaseConfig = {
  url: 'https://xlpwsbavtwpbsoxsmzzt.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhscHdzYmF2dHdwYnNveHNtenp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDk4MTksImV4cCI6MjA4NTUyNTgxOX0.95qfdA7B1uUwJIiVlq4oWW2vaOsGpK7mat1Mo523mN0',
}

export function getSupabaseConfig(): SupabaseConfig | null {
  return FORCED
}

export function setSupabaseConfig(cfg: SupabaseConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function clearSupabaseConfig() {
  localStorage.removeItem(KEY)
}
