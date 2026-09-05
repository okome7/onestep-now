import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  apiMessageToPasswordResetFieldErrors,
  formatPasswordInput,
  hasErrors,
  validatePasswordResetCode,
  validatePasswordResetEmail,
  validatePasswordResetPassword,
} from '../appHelpers'
import type {
  PasswordResetFieldErrors,
  PasswordResetStep,
} from '../appTypes'
import { PasswordResetForm } from '../components/password-reset'
import {
  resetPassword,
  sendPasswordResetCode,
  verifyPasswordResetCode,
} from '../passwordResetApi'
import type {
  PasswordResetForm as PasswordResetFormValues,
} from '../passwordResetApi'
import { SignupHeader } from '../sharedComponents'

export function PasswordResetPage() {
  const [step, setStep] = useState<PasswordResetStep>('email')
  const [form, setForm] = useState<PasswordResetFormValues>({
    email: '',
    code: '',
    password: '',
    passwordConfirmation: '',
  })
  const [fieldErrors, setFieldErrors] = useState<PasswordResetFieldErrors>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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
        <PasswordResetForm
          step={step}
          form={form}
          fieldErrors={fieldErrors}
          isSubmitting={isSubmitting}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />

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

