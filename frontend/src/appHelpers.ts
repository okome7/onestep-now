import {
  authSessionStorageKey,
  avatarImageQuality,
  avatarImageSize,
  avatarOptions,
  passwordGuidance,
  passwordPattern,
  signupCompleteStorageKey,
  signupDraftStorageKey,
} from './appConstants'
import type {
  CompleteProfile,
  FieldErrors,
  LoginFieldErrors,
  PasswordResetFieldErrors,
  SignupScreen,
} from './appTypes'
import type { LoginForm } from './loginApi'
import type { PasswordResetForm } from './passwordResetApi'
import type { SignupForm } from './signupApi'

export const currentPathname = () =>
  window.location.pathname.replace(/\/+$/, '') || '/'

export function hasActiveAuthSession() {
  if (window.localStorage.getItem(authSessionStorageKey) !== 'active') {
    return false
  }

  try {
    const savedProfile = window.localStorage.getItem(signupCompleteStorageKey)
    const parsedProfile = savedProfile
      ? (JSON.parse(savedProfile) as Partial<CompleteProfile>)
      : null

    return typeof parsedProfile?.id === 'number'
  } catch {
    return false
  }
}

export function saveAuthSession() {
  window.localStorage.setItem(authSessionStorageKey, 'active')
}

export function clearAuthSession() {
  window.localStorage.removeItem(authSessionStorageKey)
}

export function formatPasswordInput(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, '')
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function formatElapsedTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatFeedRemainingTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatFeedPostAge(createdAt: number, now: number) {
  const elapsedMinutes = Math.max(1, Math.floor((now - createdAt) / 60000))

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}分前`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) {
    return `${elapsedHours}時間前`
  }

  if (elapsedHours < 24 * 7) {
    return `${Math.floor(elapsedHours / 24)}日前`
  }

  const date = new Date(createdAt)

  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function validateForm(form: SignupForm) {
  const nextErrors: FieldErrors = {}

  if (!form.name.trim()) {
    nextErrors.name = '表示名を入力してください'
  }

  if (!form.email.trim()) {
    nextErrors.email = 'メールアドレスを入力してください'
  } else if (!isValidEmail(form.email)) {
    nextErrors.email = '@を含む正しいメールアドレスを入力してください'
  }

  if (!form.password) {
    nextErrors.password = 'パスワードを入力してください'
  } else if (form.password.length < 8) {
    nextErrors.password = passwordGuidance
  } else if (!new RegExp(`^${passwordPattern}$`).test(form.password)) {
    nextErrors.password = passwordGuidance
  }

  if (!form.passwordConfirmation) {
    nextErrors.passwordConfirmation = 'パスワード確認を入力してください'
  } else if (form.password !== form.passwordConfirmation) {
    nextErrors.passwordConfirmation = 'パスワード確認が一致していません'
  }

  return nextErrors
}

export function validateLoginForm(form: LoginForm) {
  const nextErrors: LoginFieldErrors = {}

  if (!form.email.trim()) {
    nextErrors.email = 'メールアドレスを入力してください'
  } else if (!isValidEmail(form.email)) {
    nextErrors.email = '@を含む正しいメールアドレスを入力してください'
  }

  if (!form.password) {
    nextErrors.password = 'パスワードを入力してください'
  }

  return nextErrors
}

export function validatePasswordResetEmail(
  form: Pick<PasswordResetForm, 'email'>,
) {
  const nextErrors: PasswordResetFieldErrors = {}

  if (!form.email.trim()) {
    nextErrors.email = 'メールアドレスを入力してください'
  } else if (!isValidEmail(form.email)) {
    nextErrors.email = '@を含む正しいメールアドレスを入力してください'
  }

  return nextErrors
}

export function validatePasswordResetCode(
  form: Pick<PasswordResetForm, 'code'>,
) {
  const nextErrors: PasswordResetFieldErrors = {}

  if (!form.code.trim()) {
    nextErrors.code = '認証コードを入力してください'
  } else if (!/^\d{6}$/.test(form.code.trim())) {
    nextErrors.code = '6桁の認証コードを入力してください'
  }

  return nextErrors
}

export function validatePasswordResetPassword(
  form: Pick<PasswordResetForm, 'password' | 'passwordConfirmation'>,
) {
  const nextErrors: PasswordResetFieldErrors = {}

  if (!form.password) {
    nextErrors.password = 'パスワードを入力してください'
  } else if (form.password.length < 8) {
    nextErrors.password = passwordGuidance
  } else if (!new RegExp(`^${passwordPattern}$`).test(form.password)) {
    nextErrors.password = passwordGuidance
  }

  if (!form.passwordConfirmation) {
    nextErrors.passwordConfirmation = 'パスワード確認を入力してください'
  } else if (form.password !== form.passwordConfirmation) {
    nextErrors.passwordConfirmation = 'パスワード確認が一致していません'
  }

  return nextErrors
}

export function hasErrors(errors: object) {
  return Object.keys(errors).length > 0
}

export function errorFieldClass(error: string | undefined) {
  return error ? 'field-error' : undefined
}

export function isPasswordGuidanceError(error: string | undefined) {
  return Boolean(
    error &&
      (error.includes('8文字以上') ||
        error.includes('英数字') ||
        error.includes('英字と数字') ||
        error === passwordGuidance),
  )
}

export function apiMessageToFieldErrors(message: string): FieldErrors {
  const nextErrors: FieldErrors = {}

  for (const line of message.split('\n')) {
    if (line.includes('メールアドレス')) {
      nextErrors.email = line
    } else if (line.includes('パスワード確認')) {
      nextErrors.passwordConfirmation = line
    } else if (
      line.includes('パスワード') ||
      line.startsWith('Password')
    ) {
      nextErrors.password = passwordGuidance
    } else if (line.includes('表示名') || line.includes('名前')) {
      nextErrors.name = line
    }
  }

  return nextErrors
}

export function apiMessageToLoginFieldErrors(
  message: string,
): LoginFieldErrors {
  if (message.includes('メールアドレスまたはパスワード')) {
    return { password: message }
  }

  if (message.includes('メールアドレス')) {
    return { email: message }
  }

  if (message.includes('パスワード')) {
    return { password: message }
  }

  return {}
}

export function apiMessageToPasswordResetFieldErrors(
  message: string,
): PasswordResetFieldErrors {
  const nextErrors: PasswordResetFieldErrors = {}

  for (const line of message.split('\n')) {
    if (line.includes('メールアドレス')) {
      nextErrors.email = line
    } else if (line.includes('認証コード')) {
      nextErrors.code = line
    } else if (line.includes('パスワード確認')) {
      nextErrors.passwordConfirmation = line
    } else if (line.includes('パスワード') || line.startsWith('Password')) {
      nextErrors.password = passwordGuidance
    }
  }

  return nextErrors
}

export function isAvatarImageDataUrl(value: string | undefined) {
  return Boolean(value?.startsWith('data:image/'))
}

export function getAvatarSrc(avatarId: string) {
  if (isAvatarImageDataUrl(avatarId)) {
    return avatarId
  }

  return (
    avatarOptions.find((avatar) => avatar.id === avatarId)?.src ??
    avatarOptions[0].src
  )
}

export function getInitialForm(screen: SignupScreen): SignupForm {
  const savedForm = window.sessionStorage.getItem(signupDraftStorageKey)

  if (!savedForm) {
    return {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    }
  }

  try {
    const parsedForm = JSON.parse(savedForm) as Partial<SignupForm>

    return {
      name: parsedForm.name ?? '',
      email: parsedForm.email ?? '',
      password: screen === 'icon' ? (parsedForm.password ?? '') : '',
      passwordConfirmation:
        screen === 'icon' ? (parsedForm.passwordConfirmation ?? '') : '',
    }
  } catch {
    return {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    }
  }
}

export function saveSignupDraft(form: SignupForm, includePassword = false) {
  window.sessionStorage.setItem(
    signupDraftStorageKey,
    JSON.stringify({
      name: form.name,
      email: form.email,
      ...(includePassword
        ? {
            password: form.password,
            passwordConfirmation: form.passwordConfirmation,
          }
        : {}),
    }),
  )
}

export function getInitialCompleteProfile(): CompleteProfile {
  const savedProfile = window.localStorage.getItem(signupCompleteStorageKey)

  if (!savedProfile) {
    return { name: '', avatarId: avatarOptions[0].id }
  }

  try {
    const parsedProfile = JSON.parse(savedProfile) as Partial<CompleteProfile>

    return {
      id: parsedProfile.id,
      name: parsedProfile.name ?? '',
      email: parsedProfile.email ?? '',
      avatarId: parsedProfile.avatarId ?? avatarOptions[0].id,
      cableToken: parsedProfile.cableToken,
    }
  } catch {
    return { name: '', avatarId: avatarOptions[0].id }
  }
}

export function saveCompleteProfile(profile: CompleteProfile) {
  window.localStorage.setItem(signupCompleteStorageKey, JSON.stringify(profile))
  saveAuthSession()
}

export function getCompleteAvatarSrc(profile: CompleteProfile) {
  return getAvatarSrc(profile.avatarId)
}

export function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () =>
      reject(
        new Error('写真の読み込みに失敗しました。もう一度選択してください。'),
      )
    reader.readAsDataURL(blob)
  })
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () =>
      reject(new Error('写真の読み込みに失敗しました。もう一度選択してください。'))
    image.src = src
  })
}

export async function createAvatarImageDataUrl(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください。')
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(objectUrl)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('写真の変換に失敗しました。もう一度選択してください。')
    }

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
    const sourceX = (image.naturalWidth - sourceSize) / 2
    const sourceY = (image.naturalHeight - sourceSize) / 2

    canvas.width = avatarImageSize
    canvas.height = avatarImageSize
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, avatarImageSize, avatarImageSize)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      avatarImageSize,
      avatarImageSize,
    )

    const avatarBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(
              new Error('写真の変換に失敗しました。もう一度選択してください。'),
            )
          }
        },
        'image/jpeg',
        avatarImageQuality,
      )
    })

    return readBlobAsDataUrl(avatarBlob)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
