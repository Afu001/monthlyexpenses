const KEY = 'monthfinance.auth'

type AuthState = {
  ok: boolean
}

export function isLoggedIn(): boolean {
  const raw = localStorage.getItem(KEY)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as Partial<AuthState>
    return parsed.ok === true
  } catch {
    return false
  }
}

export function loginWithPassword(password: string): boolean {
  if (password !== 'kohejiandaswad') return false
  localStorage.setItem(KEY, JSON.stringify({ ok: true } satisfies AuthState))
  return true
}

export function logout() {
  localStorage.removeItem(KEY)
}
