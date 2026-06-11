import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'
import { login } from './loginApi'
import type { LoginForm } from './loginApi'
import {
  resetPassword,
  sendPasswordResetCode,
  verifyPasswordResetCode,
} from './passwordResetApi'
import type { PasswordResetForm } from './passwordResetApi'
import { checkSignupEmail, signup } from './signupApi'
import type { SignupForm } from './signupApi'
import passwordShowIcon from './assets/icons/password_show.svg'
import passwordHideIcon from './assets/icons/password_hide.svg'
import avatarOne from './assets/avatars/avatar-1.svg'
import avatarTwo from './assets/avatars/avatar-2.svg'
import avatarThree from './assets/avatars/avatar-3.svg'
import avatarFour from './assets/avatars/avatar-4.svg'
import avatarFive from './assets/avatars/avatar-5.svg'
import avatarSix from './assets/avatars/avatar-6.svg'
import avatarSeven from './assets/avatars/avatar-7.svg'
import avatarEight from './assets/avatars/avatar-8.svg'

const initialForm: SignupForm = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
}

const passwordGuidance = '8文字以上で英字と数字を含めてください'
const passwordPattern = '(?=.*[A-Za-z])(?=.*\\d)[A-Za-z0-9]{8,}'
type FieldErrors = Partial<Record<keyof SignupForm, string>>
type LoginFieldErrors = Partial<Record<keyof LoginForm, string>>
type PasswordResetFieldErrors = Partial<Record<keyof PasswordResetForm, string>>
type PasswordResetStep = 'email' | 'code' | 'password'
type Screen = 'signup' | 'icon' | 'complete'
const customPhotoIconId = 'custom-photo'
const signupScreenStorageKey = 'onestep-signup-screen'
const signupDraftStorageKey = 'onestep-signup-draft'
const signupCompleteStorageKey = 'onestep-signup-complete'
const avatarImageSize = 256
const avatarImageQuality = 0.82

const avatarOptions = [
  { id: 'avatar-1', src: avatarOne, label: 'アイコン1' },
  { id: 'avatar-2', src: avatarTwo, label: 'アイコン2' },
  { id: 'avatar-3', src: avatarThree, label: 'アイコン3' },
  { id: 'avatar-4', src: avatarFour, label: 'アイコン4' },
  { id: 'avatar-5', src: avatarFive, label: 'アイコン5' },
  { id: 'avatar-6', src: avatarSix, label: 'アイコン6' },
  { id: 'avatar-7', src: avatarSeven, label: 'アイコン7' },
  { id: 'avatar-8', src: avatarEight, label: 'アイコン8' },
  { id: customPhotoIconId, src: '', label: '選択した写真' },
]

function formatPasswordInput(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, '')
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validateForm(form: SignupForm) {
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

function validateLoginForm(form: LoginForm) {
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

function validatePasswordResetEmail(form: Pick<PasswordResetForm, 'email'>) {
  const nextErrors: PasswordResetFieldErrors = {}

  if (!form.email.trim()) {
    nextErrors.email = 'メールアドレスを入力してください'
  } else if (!isValidEmail(form.email)) {
    nextErrors.email = '@を含む正しいメールアドレスを入力してください'
  }

  return nextErrors
}

function validatePasswordResetCode(form: Pick<PasswordResetForm, 'code'>) {
  const nextErrors: PasswordResetFieldErrors = {}

  if (!form.code.trim()) {
    nextErrors.code = '認証コードを入力してください'
  } else if (!/^\d{6}$/.test(form.code)) {
    nextErrors.code = '6桁の認証コードを入力してください'
  }

  return nextErrors
}

function validatePasswordResetPassword(
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

function hasErrors(errors: object) {
  return Object.keys(errors).length > 0
}

function errorFieldClass(error: string | undefined) {
  return error ? 'field-error' : undefined
}

function isPasswordGuidanceError(error: string | undefined) {
  return Boolean(
    error &&
    (error.includes('8文字以上') ||
      error.includes('英数字') ||
      error.includes('英字と数字') ||
      error === passwordGuidance),
  )
}

function apiMessageToFieldErrors(message: string): FieldErrors {
  const nextErrors: FieldErrors = {}

  for (const line of message.split('\n')) {
    if (line.includes('メールアドレス')) {
      nextErrors.email = line
    } else if (line.includes('パスワード確認')) {
      nextErrors.passwordConfirmation = line
    } else if (line.includes('パスワード') || line.startsWith('Password')) {
      nextErrors.password = passwordGuidance
    } else if (line.includes('表示名') || line.includes('名前')) {
      nextErrors.name = line
    }
  }

  return nextErrors
}

function apiMessageToLoginFieldErrors(message: string): LoginFieldErrors {
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

function apiMessageToPasswordResetFieldErrors(
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

type CompleteProfile = {
  name: string
  avatarId: string
}

function isAvatarImageDataUrl(value: string | undefined) {
  return Boolean(value?.startsWith('data:image/'))
}

function getAvatarSrc(avatarId: string) {
  if (isAvatarImageDataUrl(avatarId)) {
    return avatarId
  }

  return (
    avatarOptions.find((avatar) => avatar.id === avatarId)?.src ??
    avatarOptions[0].src
  )
}

function getInitialScreen(): Screen {
  const savedScreen = window.sessionStorage.getItem(signupScreenStorageKey)
  const savedCompleteProfile = window.localStorage.getItem(
    signupCompleteStorageKey,
  )

  if (savedScreen === 'complete' || savedScreen === 'icon') {
    return savedScreen
  }

  if (savedCompleteProfile) {
    return 'complete'
  }

  return 'signup'
}

function getInitialForm(screen: Screen): SignupForm {
  const savedForm = window.sessionStorage.getItem(signupDraftStorageKey)

  if (!savedForm) {
    return initialForm
  }

  try {
    const parsedForm = JSON.parse(savedForm) as Partial<SignupForm>

    return {
      ...initialForm,
      name: parsedForm.name ?? '',
      email: parsedForm.email ?? '',
      password: screen === 'icon' ? (parsedForm.password ?? '') : '',
      passwordConfirmation:
        screen === 'icon' ? (parsedForm.passwordConfirmation ?? '') : '',
    }
  } catch {
    return initialForm
  }
}

function saveSignupDraft(form: SignupForm, includePassword = false) {
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

function getInitialCompleteProfile(): CompleteProfile {
  const savedProfile = window.localStorage.getItem(signupCompleteStorageKey)

  if (!savedProfile) {
    return { name: '', avatarId: avatarOptions[0].id }
  }

  try {
    const parsedProfile = JSON.parse(savedProfile) as Partial<CompleteProfile>

    return {
      name: parsedProfile.name ?? '',
      avatarId: parsedProfile.avatarId ?? avatarOptions[0].id,
    }
  } catch {
    return { name: '', avatarId: avatarOptions[0].id }
  }
}

function saveCompleteProfile(profile: CompleteProfile) {
  window.localStorage.setItem(signupCompleteStorageKey, JSON.stringify(profile))
}

function getCompleteAvatarSrc(profile: CompleteProfile) {
  return getAvatarSrc(profile.avatarId)
}

function readBlobAsDataUrl(blob: Blob) {
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

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () =>
      reject(
        new Error('写真の読み込みに失敗しました。もう一度選択してください。'),
      )
    image.src = src
  })
}

async function createAvatarImageDataUrl(file: File) {
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
            return
          }

          reject(
            new Error('写真の変換に失敗しました。もう一度選択してください。'),
          )
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

type SignupHeaderProps = {
  title: string
  onBack: () => void
}

function SignupHeader({ title, onBack }: SignupHeaderProps) {
  return (
    <header className="signup-header">
      <button
        className="back-button"
        type="button"
        aria-label="戻る"
        onClick={onBack}
      >
        &lt;
      </button>
      <h1>{title}</h1>
    </header>
  )
}

function SignupPage() {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [screen, setScreen] = useState<Screen>(getInitialScreen)
  const [form, setForm] = useState<SignupForm>(() =>
    getInitialForm(getInitialScreen()),
  )
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedIconId, setSelectedIconId] = useState(avatarOptions[0].id)
  const [customPhotoUrl, setCustomPhotoUrl] = useState('')
  const [customPhotoDataUrl, setCustomPhotoDataUrl] = useState('')
  const [completedName, setCompletedName] = useState(
    () => getInitialCompleteProfile().name,
  )
  const [completedIconSrc, setCompletedIconSrc] = useState(() =>
    getCompleteAvatarSrc(getInitialCompleteProfile()),
  )
  const [isMobilePhotoMenu, setIsMobilePhotoMenu] = useState(false)
  const [isPhotoChoiceOpen, setIsPhotoChoiceOpen] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] =
    useState(false)
  const showPasswordGuidanceError = isPasswordGuidanceError(
    fieldErrors.password,
  )
  const noticeText = message || error

  useEffect(() => {
    return () => {
      if (customPhotoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(customPhotoUrl)
      }
    }
  }, [customPhotoUrl])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)')
    const updatePhotoMenu = () => {
      setIsMobilePhotoMenu(mediaQuery.matches)
      setIsPhotoChoiceOpen(false)
    }

    updatePhotoMenu()
    mediaQuery.addEventListener('change', updatePhotoMenu)

    return () => mediaQuery.removeEventListener('change', updatePhotoMenu)
  }, [])

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    const nextValue =
      name === 'password' || name === 'passwordConfirmation'
        ? formatPasswordInput(value)
        : value

    setForm((current) => {
      const nextForm = { ...current, [name]: nextValue }

      if (name === 'name' || name === 'email') {
        saveSignupDraft(nextForm)
      }

      return nextForm
    })
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')

    const nextErrors = validateForm(form)
    setFieldErrors(nextErrors)

    if (hasErrors(nextErrors)) {
      return
    }

    setIsSubmitting(true)

    try {
      await checkSignupEmail(form.email)
      saveSignupDraft(form, true)
      window.sessionStorage.setItem(signupScreenStorageKey, 'icon')
      window.localStorage.removeItem(signupCompleteStorageKey)
      setScreen('icon')
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : '登録に失敗しました。'
      const nextFieldErrors = apiMessageToFieldErrors(nextError)

      if (hasErrors(nextFieldErrors)) {
        setFieldErrors((current) => ({ ...current, ...nextFieldErrors }))
        return
      }

      setError(nextError)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleBack() {
    if (screen === 'icon') {
      window.sessionStorage.setItem(signupScreenStorageKey, 'signup')
      setScreen('signup')
      return
    }

    window.history.back()
  }

  async function handleIconSubmit() {
    setMessage('')
    setError('')
    setIsSubmitting(true)

    try {
      const selectedAvatar = avatarOptions.find(
        (avatar) => avatar.id === selectedIconId,
      )
      const isCustomPhotoSelected = selectedIconId === customPhotoIconId

      if (isCustomPhotoSelected && !customPhotoDataUrl) {
        throw new Error('写真をもう一度選択してください。')
      }

      const nextCompletedName = form.name.trim()
      const avatarKeyToSave = isCustomPhotoSelected
        ? customPhotoDataUrl
        : selectedIconId
      const createdUser = await signup({
        ...form,
        avatarKey: avatarKeyToSave,
      })
      const nextCompletedAvatarId = createdUser.avatar_key ?? avatarKeyToSave
      const nextCompletedIconSrc =
        getAvatarSrc(nextCompletedAvatarId) ??
        selectedAvatar?.src ??
        avatarOptions[0].src

      setCompletedName(nextCompletedName)
      setCompletedIconSrc(nextCompletedIconSrc)
      setFieldErrors({})
      window.sessionStorage.removeItem(signupDraftStorageKey)
      window.sessionStorage.setItem(signupScreenStorageKey, 'complete')
      saveCompleteProfile({
        name: nextCompletedName,
        avatarId: nextCompletedAvatarId,
      })
      setScreen('complete')
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : '登録に失敗しました。'
      const nextFieldErrors = apiMessageToFieldErrors(nextError)

      if (hasErrors(nextFieldErrors)) {
        setFieldErrors((current) => ({ ...current, ...nextFieldErrors }))
        window.sessionStorage.setItem(signupScreenStorageKey, 'signup')
        setScreen('signup')
        return
      }

      setError(nextError)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]

    if (selectedFile) {
      try {
        const photoDataUrl = await createAvatarImageDataUrl(selectedFile)
        setCustomPhotoDataUrl(photoDataUrl)
        setCustomPhotoUrl(photoDataUrl)
        setSelectedIconId(customPhotoIconId)
        setIsPhotoChoiceOpen(false)
        setMessage('')
        setError('')
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : '写真の読み込みに失敗しました。',
        )
      }
    }
  }

  function handleAvatarClick(avatarId: string) {
    if (avatarId !== customPhotoIconId || customPhotoUrl) {
      setSelectedIconId(avatarId)
      return
    }
  }

  function handlePhotoButtonClick() {
    if (isMobilePhotoMenu) {
      setIsPhotoChoiceOpen((current) => !current)
      return
    }

    photoInputRef.current?.click()
  }

  function handleStart() {
    window.localStorage.removeItem(signupCompleteStorageKey)
    window.sessionStorage.removeItem(signupScreenStorageKey)
    window.location.href = '/home'
  }

  return (
    <main
      className={`signup-page ${screen === 'complete' ? 'complete-page' : ''}`}
    >
      {screen === 'complete' ? null : (
        <SignupHeader title="新規登録" onBack={handleBack} />
      )}

      {screen === 'complete' ? (
        <section className="complete-content" aria-labelledby="complete-title">
          <h2 id="complete-title">登録が完了しました！</h2>
          <p className="complete-description">早速始めましょう！</p>

          <div className="complete-profile">
            <span className="sparkle sparkle-one" aria-hidden="true" />
            <span className="sparkle sparkle-two" aria-hidden="true" />
            <span className="sparkle sparkle-three" aria-hidden="true" />
            <span className="sparkle sparkle-four" aria-hidden="true" />
            <span className="sparkle sparkle-five" aria-hidden="true" />
            <span className="sparkle sparkle-six" aria-hidden="true" />
            <span className="celebration-dot dot-one" aria-hidden="true" />
            <span className="celebration-dot dot-two" aria-hidden="true" />
            <span className="celebration-dot dot-three" aria-hidden="true" />
            <img
              className="complete-avatar"
              src={completedIconSrc}
              alt=""
              aria-hidden="true"
            />
            <span className="complete-check" aria-hidden="true" />
            <p className="complete-name">{completedName}</p>
          </div>

          <button
            className="submit-button start-button"
            type="button"
            onClick={handleStart}
          >
            最初の一歩を始める
          </button>
        </section>
      ) : screen === 'icon' ? (
        <section className="icon-content" aria-labelledby="icon-title">
          <h2 id="icon-title">アイコンを選ぼう！</h2>
          <p className="icon-description">
            気に入ったアイコンを選んでください。
            <br />
            後からでも変更できます。
          </p>

          <div className="avatar-grid" role="radiogroup" aria-label="アイコン">
            {avatarOptions.map((avatar) => {
              const isCustomPhoto = avatar.id === customPhotoIconId
              const hasCustomPhoto = isCustomPhoto && customPhotoUrl
              const isCameraSlot = isCustomPhoto && !hasCustomPhoto

              return (
                <button
                  key={avatar.id}
                  className={`avatar-option ${
                    selectedIconId === avatar.id ? 'selected' : ''
                  } ${isCameraSlot ? 'photo-slot-empty' : ''}`}
                  type="button"
                  role="radio"
                  aria-checked={selectedIconId === avatar.id}
                  aria-label={isCameraSlot ? '写真未選択' : avatar.label}
                  disabled={isCameraSlot}
                  onClick={() => handleAvatarClick(avatar.id)}
                >
                  {hasCustomPhoto ? (
                    <img src={customPhotoUrl} alt="" aria-hidden="true" />
                  ) : (
                    !isCustomPhoto && (
                      <img src={avatar.src} alt="" aria-hidden="true" />
                    )
                  )}
                </button>
              )
            })}
          </div>

          <div className="photo-actions">
            <button
              className="photo-button"
              type="button"
              aria-expanded={isMobilePhotoMenu ? isPhotoChoiceOpen : undefined}
              onClick={handlePhotoButtonClick}
            >
              <span
                className="photo-button-icon folder-icon"
                aria-hidden="true"
              />
              写真を選ぶ
            </button>
          </div>

          {isMobilePhotoMenu ? (
            <div
              className={`photo-choice-panel ${
                isPhotoChoiceOpen ? 'is-open' : ''
              }`}
            >
              <button
                className="photo-choice-button"
                type="button"
                tabIndex={isPhotoChoiceOpen ? 0 : -1}
                onClick={() => cameraInputRef.current?.click()}
              >
                カメラで撮影
              </button>
              <button
                className="photo-choice-button"
                type="button"
                tabIndex={isPhotoChoiceOpen ? 0 : -1}
                onClick={() => photoInputRef.current?.click()}
              >
                写真を選択
              </button>
            </div>
          ) : null}

          <input
            ref={cameraInputRef}
            className="photo-input"
            type="file"
            accept="image/*"
            capture="user"
            aria-label="撮影する写真"
            onChange={handlePhotoChange}
          />
          <input
            ref={photoInputRef}
            className="photo-input"
            type="file"
            accept="image/*"
            aria-label="選択する写真"
            onChange={handlePhotoChange}
          />

          <button
            className="submit-button icon-submit-button"
            type="button"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            onClick={handleIconSubmit}
          >
            決定
          </button>

          <p
            className={`notice ${message ? 'success' : ''} ${error ? 'error' : ''}`}
            role={error ? 'alert' : undefined}
            aria-live="polite"
          >
            {noticeText}
          </p>
        </section>
      ) : (
        <section className="signup-content">
          <form className="signup-form" onSubmit={handleSubmit} noValidate>
            <div className="form-fields">
              <div className="form-field">
                <label htmlFor="name">表示名</label>
                <input
                  id="name"
                  className={errorFieldClass(fieldErrors.name)}
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="表示名を入力"
                  value={form.name}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={
                    fieldErrors.name ? 'name-error' : 'name-description'
                  }
                  required
                />
                <p id="name-description" className="field-note">
                  ※他のユーザーに公開される名前です
                </p>
                {fieldErrors.name && (
                  <p
                    id="name-error"
                    className="field-error-message"
                    role="alert"
                  >
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="email">メールアドレス</label>
                <input
                  id="email"
                  className={errorFieldClass(fieldErrors.email)}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="メールアドレスを入力"
                  value={form.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email ? 'email-error' : undefined
                  }
                  required
                />
                {fieldErrors.email && (
                  <p
                    id="email-error"
                    className="field-error-message"
                    role="alert"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="password">パスワード</label>
                <div
                  className={`password-field ${errorFieldClass(fieldErrors.password) ?? ''}`}
                >
                  <input
                    id="password"
                    name="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    inputMode="text"
                    placeholder="パスワードを入力"
                    pattern={passwordPattern}
                    title="8文字以上で英字と数字を含めてください"
                    value={form.password}
                    onChange={handleChange}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={
                      fieldErrors.password && !showPasswordGuidanceError
                        ? 'password-error'
                        : 'password-description'
                    }
                    required
                  />
                  <button
                    className="visibility-button"
                    type="button"
                    aria-label={
                      isPasswordVisible
                        ? 'パスワードを非表示にする'
                        : 'パスワードを表示する'
                    }
                    aria-pressed={isPasswordVisible}
                    onClick={() => setIsPasswordVisible((current) => !current)}
                  >
                    <img
                      src={
                        isPasswordVisible ? passwordShowIcon : passwordHideIcon
                      }
                      alt=""
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <p
                  id="password-description"
                  className={`field-note ${
                    showPasswordGuidanceError ? 'field-note-error' : ''
                  }`}
                >
                  ※8文字以上で英字と数字を含めてください
                </p>
                {fieldErrors.password && !showPasswordGuidanceError && (
                  <p
                    id="password-error"
                    className="field-error-message"
                    role="alert"
                  >
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="passwordConfirmation">パスワード確認</label>
                <div
                  className={`password-field ${
                    errorFieldClass(fieldErrors.passwordConfirmation) ?? ''
                  }`}
                >
                  <input
                    id="passwordConfirmation"
                    name="passwordConfirmation"
                    type={isPasswordConfirmationVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    inputMode="text"
                    placeholder="パスワードを再入力"
                    pattern={passwordPattern}
                    title="8文字以上で英字と数字を含めてください"
                    value={form.passwordConfirmation}
                    onChange={handleChange}
                    aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
                    aria-describedby={
                      fieldErrors.passwordConfirmation
                        ? 'password-confirmation-error'
                        : undefined
                    }
                    required
                  />
                  <button
                    className="visibility-button"
                    type="button"
                    aria-label={
                      isPasswordConfirmationVisible
                        ? 'パスワード確認を非表示にする'
                        : 'パスワード確認を表示する'
                    }
                    aria-pressed={isPasswordConfirmationVisible}
                    onClick={() =>
                      setIsPasswordConfirmationVisible((current) => !current)
                    }
                  >
                    <img
                      src={
                        isPasswordConfirmationVisible
                          ? passwordShowIcon
                          : passwordHideIcon
                      }
                      alt=""
                      aria-hidden="true"
                    />
                  </button>
                </div>
                {fieldErrors.passwordConfirmation && (
                  <p
                    id="password-confirmation-error"
                    className="field-error-message"
                    role="alert"
                  >
                    {fieldErrors.passwordConfirmation}
                  </p>
                )}
              </div>
            </div>

            <button
              className="submit-button"
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              登録
            </button>
          </form>

          <p
            className={`notice ${message ? 'success' : ''} ${error ? 'error' : ''}`}
            role={error ? 'alert' : undefined}
            aria-live="polite"
          >
            {noticeText}
          </p>

          <div className="login-link-area">
            <p>すでにアカウントをお持ちですか？</p>
            <a className="login-action-link" href="/login">
              ログイン
            </a>
          </div>
        </section>
      )}
    </main>
  )
}

function LoginPage() {
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleBack = () => {
    window.location.href = '/'
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    const nextValue = name === 'password' ? formatPasswordInput(value) : value

    setForm((current) => ({ ...current, [name]: nextValue }))
    setFieldErrors((current) => ({
      ...current,
      [name]: undefined,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = validateLoginForm(form)
    setFieldErrors(nextErrors)

    if (hasErrors(nextErrors)) {
      return
    }

    setIsSubmitting(true)

    try {
      await login(form)
      window.location.href = '/home'
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : 'メールアドレスまたはパスワードが違います'
      const nextFieldErrors = apiMessageToLoginFieldErrors(nextError)

      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors((current) => ({ ...current, ...nextFieldErrors }))
        return
      }

      setFieldErrors((current) => ({ ...current, password: nextError }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="signup-page login-page">
      <SignupHeader title="ログイン" onBack={handleBack} />

      <section className="signup-content">
        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <div className="form-fields">
            <div className="form-field">
              <label htmlFor="login-email">メールアドレス</label>
              <input
                id="login-email"
                className={errorFieldClass(fieldErrors.email)}
                name="email"
                type="email"
                autoComplete="email"
                placeholder="メールアドレスを入力"
                value={form.email}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={
                  fieldErrors.email ? 'login-email-error' : undefined
                }
                required
              />
              {fieldErrors.email && (
                <p
                  id="login-email-error"
                  className="field-error-message"
                  role="alert"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="login-password">パスワード</label>
              <input
                id="login-password"
                className={errorFieldClass(fieldErrors.password)}
                name="password"
                type="password"
                autoComplete="current-password"
                inputMode="text"
                placeholder="パスワードを入力"
                value={form.password}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? 'login-password-error' : undefined
                }
                required
              />
              {fieldErrors.password && (
                <p
                  id="login-password-error"
                  className="field-error-message"
                  role="alert"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>
          </div>

          <button
            className="submit-button"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            ログイン
          </button>
        </form>

        <div className="forgot-password-area">
          <a href="/password-reset">パスワードを忘れた方はこちら</a>
        </div>

        <div className="login-link-area">
          <p>アカウントをお持ちでないですか？</p>
          <a className="login-action-link" href="/">
            新規登録
          </a>
        </div>
      </section>
    </main>
  )
}

function PasswordResetPage() {
  const [step, setStep] = useState<PasswordResetStep>('email')
  const [form, setForm] = useState<PasswordResetForm>({
    email: '',
    code: '',
    password: '',
    passwordConfirmation: '',
  })
  const [fieldErrors, setFieldErrors] = useState<PasswordResetFieldErrors>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const showPasswordGuidanceError = isPasswordGuidanceError(
    fieldErrors.password,
  )
  const noticeText = message || error

  const handleBack = () => {
    window.location.href = '/login'
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    const nextValue =
      name === 'password' || name === 'passwordConfirmation'
        ? formatPasswordInput(value)
        : name === 'code'
          ? value.replace(/\D/g, '').slice(0, 6)
          : value

    setForm((current) => ({ ...current, [name]: nextValue }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setError('')
  }

  async function submitEmail() {
    const nextErrors = validatePasswordResetEmail(form)
    setFieldErrors(nextErrors)

    if (hasErrors(nextErrors)) {
      return
    }

    const nextMessage = await sendPasswordResetCode({ email: form.email })
    setMessage(nextMessage)
    setStep('code')
  }

  async function submitCode() {
    const nextErrors = validatePasswordResetCode(form)
    setFieldErrors(nextErrors)

    if (hasErrors(nextErrors)) {
      return
    }

    const nextMessage = await verifyPasswordResetCode({
      email: form.email,
      code: form.code,
    })
    setMessage(nextMessage)
    setStep('password')
  }

  async function submitPassword() {
    const nextErrors = validatePasswordResetPassword(form)
    setFieldErrors(nextErrors)

    if (hasErrors(nextErrors)) {
      return
    }

    await resetPassword(form)
    window.location.href = '/login'
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    setIsSubmitting(true)

    try {
      if (step === 'email') {
        await submitEmail()
      } else if (step === 'code') {
        await submitCode()
      } else {
        await submitPassword()
      }
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : 'パスワードの再設定に失敗しました。'
      const nextFieldErrors = apiMessageToPasswordResetFieldErrors(nextError)

      if (hasErrors(nextFieldErrors)) {
        setFieldErrors((current) => ({ ...current, ...nextFieldErrors }))
        return
      }

      setError(nextError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="signup-page login-page">
      <SignupHeader title="パスワード再設定" onBack={handleBack} />

      <section className="signup-content">
        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <div className="form-fields">
            {step === 'email' && (
              <div className="form-field">
                <label htmlFor="reset-email">メールアドレス</label>
                <input
                  id="reset-email"
                  className={errorFieldClass(fieldErrors.email)}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="メールアドレスを入力"
                  value={form.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email ? 'reset-email-error' : undefined
                  }
                  required
                />
                {fieldErrors.email && (
                  <p
                    id="reset-email-error"
                    className="field-error-message"
                    role="alert"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>
            )}

            {step === 'code' && (
              <div className="form-field">
                <label htmlFor="reset-code">認証コード</label>
                <input
                  id="reset-code"
                  className={errorFieldClass(fieldErrors.code)}
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6桁の認証コードを入力"
                  value={form.code}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.code)}
                  aria-describedby={
                    fieldErrors.code ? 'reset-code-error' : undefined
                  }
                  required
                />
                {fieldErrors.code && (
                  <p
                    id="reset-code-error"
                    className="field-error-message"
                    role="alert"
                  >
                    {fieldErrors.code}
                  </p>
                )}
              </div>
            )}

            {step === 'password' && (
              <>
                <div className="form-field">
                  <label htmlFor="reset-password">新しいパスワード</label>
                  <input
                    id="reset-password"
                    className={errorFieldClass(fieldErrors.password)}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    inputMode="text"
                    placeholder="新しいパスワードを入力"
                    value={form.password}
                    onChange={handleChange}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={
                      fieldErrors.password && !showPasswordGuidanceError
                        ? 'reset-password-error'
                        : 'reset-password-description'
                    }
                    required
                  />
                  <p
                    id="reset-password-description"
                    className={`field-note ${
                      showPasswordGuidanceError ? 'field-note-error' : ''
                    }`}
                  >
                    ※8文字以上で英字と数字を含めてください
                  </p>
                  {fieldErrors.password && !showPasswordGuidanceError && (
                    <p
                      id="reset-password-error"
                      className="field-error-message"
                      role="alert"
                    >
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="reset-password-confirmation">
                    新しいパスワード確認
                  </label>
                  <input
                    id="reset-password-confirmation"
                    className={errorFieldClass(
                      fieldErrors.passwordConfirmation,
                    )}
                    name="passwordConfirmation"
                    type="password"
                    autoComplete="new-password"
                    inputMode="text"
                    placeholder="新しいパスワードを再入力"
                    value={form.passwordConfirmation}
                    onChange={handleChange}
                    aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
                    aria-describedby={
                      fieldErrors.passwordConfirmation
                        ? 'reset-password-confirmation-error'
                        : undefined
                    }
                    required
                  />
                  {fieldErrors.passwordConfirmation && (
                    <p
                      id="reset-password-confirmation-error"
                      className="field-error-message"
                      role="alert"
                    >
                      {fieldErrors.passwordConfirmation}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            className="submit-button"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {step === 'email'
              ? 'コードを送信'
              : step === 'code'
                ? 'コードを確認'
                : '再設定'}
          </button>
        </form>

        <p
          className={`notice ${message ? 'success' : ''} ${error ? 'error' : ''}`}
          role={error ? 'alert' : undefined}
          aria-live="polite"
        >
          {noticeText}
        </p>

        <div className="login-link-area">
          <a className="login-action-link" href="/login">
            ログインへ戻る
          </a>
        </div>
      </section>
    </main>
  )
}

function App() {
  if (window.location.pathname === '/login') {
    return <LoginPage />
  }

  if (window.location.pathname === '/password-reset') {
    return <PasswordResetPage />
  }

  return <SignupPage />
}

export default App
