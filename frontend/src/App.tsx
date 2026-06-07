import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'
import { signup } from './signupApi'
import type { SignupForm } from './signupApi'
import userIcon from './assets/icons/user.svg'
import mailIcon from './assets/icons/mail.svg'
import passwordIcon from './assets/icons/password.svg'
import passwordShowIcon from './assets/icons/password_show.svg'
import passwordHideIcon from './assets/icons/password_hide.svg'

const initialForm: SignupForm = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
}

function App() {
  const [form, setForm] = useState<SignupForm>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] =
    useState(false)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setError('')

    try {
      const user = await signup(form)
      setMessage(`${user.name} さんの登録が完了しました。`)
      setForm(initialForm)
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
        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>
              <span className="input-icon">
                <img src={userIcon} alt="" aria-hidden="true" />
              </span>
              <input
                name="name"
                type="text"
                autoComplete="name"
                placeholder="名前を入力"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              <span className="input-icon">
                <img src={mailIcon} alt="" aria-hidden="true" />
              </span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="メールアドレスを入力"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              <span className="input-icon">
                <img src={passwordIcon} alt="" aria-hidden="true" />
              </span>
              <input
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="パスワードを入力"
                value={form.password}
                onChange={handleChange}
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
                  src={isPasswordVisible ? passwordShowIcon : passwordHideIcon}
                  alt=""
                  aria-hidden="true"
                />
              </button>
            </label>

            <label>
              <span className="input-icon">
                <img src={passwordIcon} alt="" aria-hidden="true" />
              </span>
              <input
                name="passwordConfirmation"
                type={isPasswordConfirmationVisible ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="パスワード確認を入力"
                value={form.passwordConfirmation}
                onChange={handleChange}
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

          <p className="password-note">*8文字以上の英数字を入力してください</p>

          <button
            className="submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? '登録中...' : '登録'}
          </button>
        </form>

        {message && <p className="notice success">{message}</p>}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}

        <div className="login-link-area">
          <p>すでにアカウントをお持ちですか？</p>
          <a href="/login">ログイン</a>
        </div>
      </section>
    </main>
  )
}

export default App
