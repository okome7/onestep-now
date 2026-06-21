import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  apiMessageToPasswordResetFieldErrors,
  errorFieldClass,
  formatPasswordInput,
  hasErrors,
  isPasswordGuidanceError,
  validatePasswordResetCode,
  validatePasswordResetEmail,
  validatePasswordResetPassword,
} from '../appHelpers'
import type {
  PasswordResetFieldErrors,
  PasswordResetStep,
} from '../appTypes'
import {
  resetPassword,
  sendPasswordResetCode,
  verifyPasswordResetCode,
} from '../passwordResetApi'
import type { PasswordResetForm } from '../passwordResetApi'
import { SignupHeader } from '../sharedComponents'

export function PasswordResetPage() {
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

