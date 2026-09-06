import {
  apiFetch,
  buildApiUrl,
  defaultApiBaseUrl,
  readJsonResponse,
} from './apiClient'
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

export async function updateProfile(
  update: ProfileUpdate,
  apiBaseUrl = defaultApiBaseUrl,
) {
  const response = await apiFetch(buildApiUrl(apiBaseUrl, '/profile'), {
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
  const result = await readJsonResponse<ProfileResponse>(response)

  if (!response.ok || !result.data) {
    throw new Error(result.errors?.[0] ?? 'プロフィールの保存に失敗しました。')
  }

  return result.data
}
