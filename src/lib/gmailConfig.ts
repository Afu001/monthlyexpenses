export type GmailConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

const KEY = 'monthfinance.gmailConfig'

export function getGmailConfig(): GmailConfig | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<GmailConfig>
    if (!parsed.clientId || !parsed.clientSecret || !parsed.redirectUri) return null
    return {
      clientId: String(parsed.clientId),
      clientSecret: String(parsed.clientSecret),
      redirectUri: String(parsed.redirectUri),
    }
  } catch {
    return null
  }
}

export function setGmailConfig(cfg: GmailConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function clearGmailConfig() {
  localStorage.removeItem(KEY)
}
