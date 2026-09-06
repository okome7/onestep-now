const csrfCookieName = 'onestep_csrf'

export const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

export type ApiErrorResponse = {
  status: 'error'
  errors?: string[]
  error?: string
  message?: string
}

type ApiUrlOptions = {
  ensureApiPath?: boolean
}

export function buildApiUrl(
  apiBaseUrl: string,
  path: string,
  { ensureApiPath = false }: ApiUrlOptions = {},
) {
  const normalizedBaseUrl = (apiBaseUrl.trim() || '/api').replace(/\/$/, '')
  const apiBasePath =
    ensureApiPath && !normalizedBaseUrl.endsWith('/api')
      ? `${normalizedBaseUrl}/api`
      : normalizedBaseUrl

  return `${apiBasePath}${path}`
}

export function apiErrorMessage(
  result: ApiErrorResponse,
  fallback: string,
  translate: (message: string) => string = (message) => message,
) {
  const messages = [result.error, result.message].filter(
    (message): message is string => Boolean(message),
  )
  const errors = result.errors ?? messages

  return errors.length ? errors.map(translate).join('\n') : fallback
}

export async function readJsonResponse<T>(
  response: Response,
  unexpectedResponseMessage = 'APIから想定外の応答が返りました。',
): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    throw new Error(unexpectedResponseMessage)
  }

  return (await response.json()) as T
}

function csrfToken() {
  if (typeof document === 'undefined') {
    return undefined
  }

  const prefix = `${csrfCookieName}=`
  const cookie = document.cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined
}

function isSafeMethod(method: string) {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const method = init.method ?? 'GET'
  const token = csrfToken()
  let headers = init.headers

  if (!isSafeMethod(method) && token) {
    headers = new Headers(init.headers)
    headers.set('X-CSRF-Token', token)
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (response.status === 401 && typeof window !== 'undefined') {
    window.localStorage.removeItem('onestep-auth-session')
    window.localStorage.removeItem('onestep-signup-complete')
    window.dispatchEvent(new Event('onestep:unauthorized'))
  }

  return response
}
