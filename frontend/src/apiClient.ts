const csrfCookieName = 'onestep_csrf'

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

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
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
