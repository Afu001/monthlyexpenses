export type BackendConfig = {
  baseUrl: string
}

const KEY = 'monthfinance.backendConfig'

export function getBackendConfig(): BackendConfig {
  const raw = localStorage.getItem(KEY)
  if (!raw) return { baseUrl: '' }
  try {
    const parsed = JSON.parse(raw) as Partial<BackendConfig>
    return { baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '' }
  } catch {
    return { baseUrl: '' }
  }
}

export function setBackendConfig(cfg: BackendConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}
