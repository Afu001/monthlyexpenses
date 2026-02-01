import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './supabaseConfig'

let cached: SupabaseClient | null = null
let cachedKey: string | null = null

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig()
  if (!cfg) return null

  const key = `${cfg.url}::${cfg.anonKey}`
  if (cached && cachedKey === key) return cached

  cached = createClient(cfg.url, cfg.anonKey)
  cachedKey = key
  return cached
}
