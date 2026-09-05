import {
  apiFetch,
  buildApiUrl,
  defaultApiBaseUrl,
  readJsonResponse,
} from './apiClient'

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

export async function fetchSession(apiBaseUrl = defaultApiBaseUrl) {
  const response = await apiFetch(buildApiUrl(apiBaseUrl, '/session'))
  if (!response.ok) {
    throw new Error('セッションの確認に失敗しました。')
  }

  const result = await readJsonResponse<SessionResponse>(response)
  return result.data
}

export async function logoutSession(apiBaseUrl = defaultApiBaseUrl) {
  const response = await apiFetch(buildApiUrl(apiBaseUrl, '/logout'), {
    method: 'DELETE',
  })

  if (!response.ok && response.status !== 401) {
    throw new Error('ログアウトに失敗しました。')
  }
}

export async function fetchCableToken(apiBaseUrl = defaultApiBaseUrl) {
  const response = await apiFetch(buildApiUrl(apiBaseUrl, '/cable_token'), {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error('リアルタイム接続の認証に失敗しました。')
  }

  const result = await readJsonResponse<{
    status: 'success'
    data: { token: string }
  }>(response)
  return result.data.token
}
