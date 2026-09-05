import type { ChangeEvent, FormEvent } from 'react'
import { errorFieldClass, isPasswordGuidanceError } from '../../appHelpers'
import type {
  PasswordResetFieldErrors,
  PasswordResetStep,
} from '../../appTypes'
import type { PasswordResetForm as PasswordResetFormValues } from '../../passwordResetApi'

type PasswordResetFormProps = {
  step: PasswordResetStep
  form: PasswordResetFormValues
  fieldErrors: PasswordResetFieldErrors
  isSubmitting: boolean
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

const submitLabels: Record<PasswordResetStep, string> = {
  email: 'コードを送信',
  code: 'コードを確認',
  password: '再設定',
}

export function PasswordResetForm({
  step,
  form,
  fieldErrors,
  isSubmitting,
  onChange,
  onSubmit,
}: PasswordResetFormProps) {
  const showPasswordGuidanceError = isPasswordGuidanceError(
    fieldErrors.password,
  )

  return (
    <form className="signup-form" onSubmit={onSubmit} noValidate>
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
              onChange={onChange}
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
              onChange={onChange}
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
                onChange={onChange}
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
                className={errorFieldClass(fieldErrors.passwordConfirmation)}
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                inputMode="text"
                placeholder="新しいパスワードを再入力"
                value={form.passwordConfirmation}
                onChange={onChange}
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
        {submitLabels[step]}
      </button>
    </form>
  )
}
