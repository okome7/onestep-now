import { apiFetch } from './apiClient'

export type SessionUser = {
  id: number
  name: string
  email: string
  avatar_key?: string
}

type SessionResponse = {
  status: 'success'
  data: SessionUser | null
}

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

function apiUrl(path: string, apiBaseUrl = defaultApiBaseUrl) {
  return `${apiBaseUrl.trim().replace(/\/$/, '') || '/api'}${path}`
}

export async function fetchSession(apiBaseUrl = defaultApiBaseUrl) {
  const response = await apiFetch(apiUrl('/session', apiBaseUrl))
  if (!response.ok) {
    throw new Error('セッションの確認に失敗しました。')
  }

  const result = (await response.json()) as SessionResponse
  return result.data
}

export async function logoutSession(apiBaseUrl = defaultApiBaseUrl) {
  const response = await apiFetch(apiUrl('/logout', apiBaseUrl), {
    method: 'DELETE',
  })

  if (!response.ok && response.status !== 401) {
    throw new Error('ログアウトに失敗しました。')
  }
}

export async function fetchCableToken(apiBaseUrl = defaultApiBaseUrl) {
  const response = await apiFetch(apiUrl('/cable_token', apiBaseUrl), {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error('リアルタイム接続の認証に失敗しました。')
  }

  const result = (await response.json()) as {
    status: 'success'
    data: { token: string }
  }
  return result.data.token
}
