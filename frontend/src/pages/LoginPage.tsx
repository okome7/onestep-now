import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  avatarOptions,
  signupCompleteStorageKey,
  signupDraftStorageKey,
  signupScreenStorageKey,
} from '../appConstants'
import {
  apiMessageToLoginFieldErrors,
  errorFieldClass,
  formatPasswordInput,
  hasErrors,
  saveCompleteProfile,
  validateLoginForm,
} from '../appHelpers'
import type { LoginFieldErrors } from '../appTypes'
import { login } from '../loginApi'
import type { LoginForm } from '../loginApi'
import { SignupHeader } from '../sharedComponents'

type LoginPageProps = {
  onLoginSuccess: () => void
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    let shouldResetSubmitting = true

    try {
      const user = await login(form)
      saveCompleteProfile({
        id: user.id,
        name: user.name,
        email: user.email,
        avatarId: user.avatar_key ?? avatarOptions[0].id,
      })
      shouldResetSubmitting = false
      onLoginSuccess()
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
      if (shouldResetSubmitting) {
        setIsSubmitting(false)
      }
    }
  }

  function handleSignupLinkClick() {
    window.localStorage.removeItem(signupCompleteStorageKey)
    window.sessionStorage.removeItem(signupScreenStorageKey)
    window.sessionStorage.removeItem(signupDraftStorageKey)
  }

  return (
    <main className="signup-page login-page">
      <SignupHeader title="ログイン" />

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
          <a
            className="login-action-link"
            href="/"
            onClick={handleSignupLinkClick}
          >
            新規登録
          </a>
        </div>
      </section>
    </main>
  )
}

