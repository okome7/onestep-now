import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'
import { signup } from './signupApi'
import type { SignupForm } from './signupApi'
import passwordShowIcon from './assets/icons/password_show.svg'
import passwordHideIcon from './assets/icons/password_hide.svg'

const initialForm: SignupForm = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
}

const passwordPattern = '[A-Za-z0-9]{8,}'
type FieldErrors = Partial<Record<keyof SignupForm, string>>

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

function errorFieldClass(error: string | undefined) {
  return error ? 'field-error' : undefined
}

function App() {
  const [form, setForm] = useState<SignupForm>(initialForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] =
    useState(false)
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
      const user = await signup(form)
      setMessage(`${user.name} さんの登録が完了しました。`)
      setForm(initialForm)
      setFieldErrors({})
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

  return (
    <main className="signup-page">
      <header className="signup-header">
        <button className="back-button" type="button" aria-label="戻る">
          &lt;
        </button>
        <h1>新規登録</h1>
      </header>

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
                <p id="name-error" className="field-error-message" role="alert">
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
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
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
                  title="8文字以上の英数字で入力してください"
                  value={form.password}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={
                    fieldErrors.password
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
              <p id="password-description" className="field-note">
                ※8文字以上で英字と数字を含めてください
              </p>
              {fieldErrors.password && (
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
                  title="8文字以上の英数字で入力してください"
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
          <a href="/login">ログイン</a>
        </div>
      </section>
    </main>
  )
}

export default App
