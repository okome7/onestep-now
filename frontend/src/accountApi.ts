import {
  apiErrorMessage,
  apiFetch,
  buildApiUrl,
  defaultApiBaseUrl,
  readJsonResponse,
  type ApiErrorResponse,
} from './apiClient'

type DeleteAccountSuccessResponse = {
  status: 'success'
}

type DeleteAccountErrorResponse = ApiErrorResponse

type DeleteAccountResponse =
  | DeleteAccountSuccessResponse
  | DeleteAccountErrorResponse

export async function deleteAccount(apiBaseUrl = defaultApiBaseUrl) {
  let response: Response

  try {
    response = await apiFetch(buildApiUrl(apiBaseUrl, '/account'), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch {
    throw new Error(
      'APIに接続できませんでした。時間をおいて再度お試しください。',
    )
  }

  const result = await readJsonResponse<DeleteAccountResponse>(
    response,
    'APIから想定外の応答が返りました。時間をおいて再度お試しください。',
  )

  if (!response.ok || result.status === 'error') {
    throw new Error(
      apiErrorMessage(
        result as DeleteAccountErrorResponse,
        'アカウント削除に失敗しました。',
      ),
    )
  }
}
