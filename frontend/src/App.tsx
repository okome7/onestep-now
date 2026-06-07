import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'
import { signup } from './signupApi'
import type { SignupForm } from './signupApi'
import userIcon from './assets/icons/user.svg'
import mailIcon from './assets/icons/mail.svg'
import passwordIcon from './assets/icons/password.svg'
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
import avatarNine from './assets/avatars/avatar-9.svg'

const initialForm: SignupForm = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
}

const passwordPattern = '[A-Za-z0-9]{8,}'
type FieldErrors = Partial<Record<keyof SignupForm, string>>
type Screen = 'signup' | 'icon'

const avatarOptions = [
  { id: 'avatar-1', src: avatarOne, label: 'アイコン1' },
  { id: 'avatar-2', src: avatarTwo, label: 'アイコン2' },
  { id: 'avatar-3', src: avatarThree, label: 'アイコン3' },
  { id: 'avatar-4', src: avatarFour, label: 'アイコン4' },
  { id: 'avatar-5', src: avatarFive, label: 'アイコン5' },
  { id: 'avatar-6', src: avatarSix, label: 'アイコン6' },
  { id: 'avatar-7', src: avatarSeven, label: 'アイコン7' },
  { id: 'avatar-8', src: avatarEight, label: 'アイコン8' },
  { id: 'avatar-9', src: avatarNine, label: 'アイコン9' },
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
    nextErrors.name = '名前を入力してください'
  }

  if (!form.email.trim()) {
    nextErrors.email = 'メールアドレスを入力してください'
  } else if (!isValidEmail(form.email)) {
    nextErrors.email = '@を含む正しいメールアドレスを入力してください'
  }

  if (!form.password) {
    nextErrors.password = 'パスワードを入力してください'
  } else if (form.password.length < 8) {
    nextErrors.password = '8文字以上の英数字を入力してください'
  } else if (!new RegExp(`^${passwordPattern}$`).test(form.password)) {
    nextErrors.password = '英数字で入力してください'
  }

  if (!form.passwordConfirmation) {
    nextErrors.passwordConfirmation = 'パスワード確認を入力してください'
  } else if (form.password !== form.passwordConfirmation) {
    nextErrors.passwordConfirmation = 'パスワード確認が一致していません'
  }

  return nextErrors
}

function hasErrors(errors: FieldErrors) {
  return Object.keys(errors).length > 0
}

function firstFieldError(errors: FieldErrors) {
  return (
    errors.name ??
    errors.email ??
    errors.password ??
    errors.passwordConfirmation ??
    ''
  )
}

function errorFieldClass(error: string | undefined) {
  return error ? 'field-error' : undefined
}

function App() {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [screen, setScreen] = useState<Screen>('signup')
  const [form, setForm] = useState<SignupForm>(initialForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedIconId, setSelectedIconId] = useState(avatarOptions[0].id)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] =
    useState(false)
  const firstError = firstFieldError(fieldErrors)
  const noticeText = message || error

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    const nextValue =
      name === 'password' || name === 'passwordConfirmation'
        ? formatPasswordInput(value)
        : value

    setForm((current) => ({ ...current, [name]: nextValue }))
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
      await signup(form)
      setForm(initialForm)
      setFieldErrors({})
      setScreen('icon')
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : '登録に失敗しました。',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleBack() {
    if (screen === 'icon') {
      setScreen('signup')
      return
    }

    window.history.back()
  }

  function handleIconSubmit() {
    setMessage('アイコンを設定しました。')
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.[0]) {
      setMessage('写真を選択しました。')
    }
  }

  return (
    <main className="signup-page">
      <header className="signup-header">
        <button
          className="back-button"
          type="button"
          aria-label="戻る"
          onClick={handleBack}
        >
          &lt;
        </button>
        <h1>新規登録</h1>
      </header>

      {screen === 'icon' ? (
        <section className="icon-content" aria-labelledby="icon-title">
          <h2 id="icon-title">アイコンを選ぼう！</h2>
          <p className="icon-description">
            気に入ったアイコンを選んでください。
            <br />
            後からでも変更できます。
          </p>

          <div className="avatar-grid" role="radiogroup" aria-label="アイコン">
            {avatarOptions.map((avatar) => (
              <button
                key={avatar.id}
                className={`avatar-option ${
                  selectedIconId === avatar.id ? 'selected' : ''
                }`}
                type="button"
                role="radio"
                aria-checked={selectedIconId === avatar.id}
                aria-label={avatar.label}
                onClick={() => setSelectedIconId(avatar.id)}
              >
                <img src={avatar.src} alt="" aria-hidden="true" />
              </button>
            ))}
          </div>

          <div className="photo-actions">
            <button
              className="photo-button"
              type="button"
              onClick={() => cameraInputRef.current?.click()}
            >
              <span
                className="photo-button-icon camera-icon"
                aria-hidden="true"
              />
              写真を撮る
            </button>
            <button
              className="photo-button"
              type="button"
              onClick={() => photoInputRef.current?.click()}
            >
              <span
                className="photo-button-icon folder-icon"
                aria-hidden="true"
              />
              写真を選ぶ
            </button>
          </div>

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
            onClick={handleIconSubmit}
          >
            アイコンを設定する
          </button>

          <p className="notice success" aria-live="polite">
            {message}
          </p>
        </section>
      ) : (
        <section className="signup-content">
          <form className="signup-form" onSubmit={handleSubmit} noValidate>
            <div className="input-group">
              <label className={errorFieldClass(fieldErrors.name)}>
                <span className="input-icon">
                  <img src={userIcon} alt="" aria-hidden="true" />
                </span>
                <input
                  name="name"
                  type="text"
                  aria-label="名前"
                  autoComplete="name"
                  placeholder="名前を入力"
                  value={form.name}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={
                    fieldErrors.name ? 'field-error-message' : undefined
                  }
                  required
                />
              </label>

              <label className={errorFieldClass(fieldErrors.email)}>
                <span className="input-icon">
                  <img src={mailIcon} alt="" aria-hidden="true" />
                </span>
                <input
                  name="email"
                  type="email"
                  aria-label="メールアドレス"
                  autoComplete="email"
                  placeholder="メールアドレスを入力"
                  value={form.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email ? 'field-error-message' : undefined
                  }
                  required
                />
              </label>

              <label className={errorFieldClass(fieldErrors.password)}>
                <span className="input-icon">
                  <img src={passwordIcon} alt="" aria-hidden="true" />
                </span>
                <input
                  name="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  aria-label="パスワード"
                  autoComplete="new-password"
                  inputMode="text"
                  placeholder="パスワードを入力"
                  pattern={passwordPattern}
                  title="8文字以上の英数字で入力してください"
                  value={form.password}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={
                    fieldErrors.password ? 'field-error-message' : undefined
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
              </label>

              <label
                className={errorFieldClass(fieldErrors.passwordConfirmation)}
              >
                <span className="input-icon">
                  <img src={passwordIcon} alt="" aria-hidden="true" />
                </span>
                <input
                  name="passwordConfirmation"
                  type={isPasswordConfirmationVisible ? 'text' : 'password'}
                  aria-label="パスワード確認"
                  autoComplete="new-password"
                  inputMode="text"
                  placeholder="パスワード確認を入力"
                  pattern={passwordPattern}
                  title="8文字以上の英数字で入力してください"
                  value={form.passwordConfirmation}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
                  aria-describedby={
                    fieldErrors.passwordConfirmation
                      ? 'field-error-message'
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
              </label>
            </div>

            <p className="password-note">*パスワードは8文字以上の英数字</p>

            <p
              id="field-error-message"
              className="field-error-message"
              role="alert"
            >
              {firstError}
            </p>

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
            <a href="/login">ログイン</a>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
