import { apiFetch } from './apiClient'
import type { SessionUser } from './sessionApi'

type ProfileUpdate = {
  name?: string
  avatarKey?: string
}

type ProfileResponse = {
  status: 'success' | 'error'
  data?: SessionUser
  errors?: string[]
}

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

export async function updateProfile(
  update: ProfileUpdate,
  apiBaseUrl = defaultApiBaseUrl,
) {
  const baseUrl = apiBaseUrl.trim().replace(/\/$/, '') || '/api'
  const response = await apiFetch(`${baseUrl}/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: {
        ...(update.name !== undefined ? { name: update.name } : {}),
        ...(update.avatarKey !== undefined
          ? { avatar_key: update.avatarKey }
          : {}),
      },
    }),
  })
  const result = (await response.json()) as ProfileResponse

  if (!response.ok || !result.data) {
    throw new Error(result.errors?.[0] ?? 'プロフィールの保存に失敗しました。')
  }

  return result.data
}
