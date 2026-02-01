import { useEffect, useState } from 'react'

const KEY = 'monthfinance.auth'
const EVENT = 'monthfinance.auth.changed'

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

function notifyAuthChanged() {
  window.dispatchEvent(new Event(EVENT))
}

export function loginWithPassword(password: string): boolean {
  if (password !== 'kohejiandaswad') return false
  localStorage.setItem(KEY, JSON.stringify({ ok: true } satisfies AuthState))
  notifyAuthChanged()
  return true
}

export function logout() {
  localStorage.removeItem(KEY)
  notifyAuthChanged()
}

export function useAuth(): { loggedIn: boolean } {
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn())

  useEffect(() => {
    const onChange = () => setLoggedIn(isLoggedIn())
    window.addEventListener(EVENT, onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(EVENT, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  return { loggedIn }
}
