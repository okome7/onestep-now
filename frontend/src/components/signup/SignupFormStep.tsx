import type { ChangeEvent, FormEvent } from 'react'
import { passwordPattern } from '../../appConstants'
import { errorFieldClass, isPasswordGuidanceError } from '../../appHelpers'
import type { FieldErrors } from '../../appTypes'
import passwordHideIcon from '../../assets/icons/password_hide.svg'
import passwordShowIcon from '../../assets/icons/password_show.svg'
import type { SignupForm } from '../../signupApi'

type SignupFormStepProps = {
  form: SignupForm
  fieldErrors: FieldErrors
  isSubmitting: boolean
  message: string
  error: string
  isPasswordVisible: boolean
  isPasswordConfirmationVisible: boolean
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTogglePassword: () => void
  onTogglePasswordConfirmation: () => void
}

export function SignupFormStep({
  form,
  fieldErrors,
  isSubmitting,
  message,
  error,
  isPasswordVisible,
  isPasswordConfirmationVisible,
  onChange,
  onSubmit,
  onTogglePassword,
  onTogglePasswordConfirmation,
}: SignupFormStepProps) {
  const showPasswordGuidanceError = isPasswordGuidanceError(
    fieldErrors.password,
  )

  return (
    <section className="signup-content">
      <form className="signup-form" onSubmit={onSubmit} noValidate>
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
              onChange={onChange}
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
              onChange={onChange}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              required
            />
            {fieldErrors.email && (
              <p id="email-error" className="field-error-message" role="alert">
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
                onChange={onChange}
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
                onClick={onTogglePassword}
              >
                <img
                  src={isPasswordVisible ? passwordShowIcon : passwordHideIcon}
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
                onChange={onChange}
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
                onClick={onTogglePasswordConfirmation}
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
        {message || error}
      </p>

      <div className="login-link-area">
        <p>すでにアカウントをお持ちですか？</p>
        <a className="login-action-link" href="/login">
          ログイン
        </a>
      </div>
    </section>
  )
}
