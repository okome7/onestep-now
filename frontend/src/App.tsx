import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'
import { signup } from './signupApi'
import type { SignupForm } from './signupApi'
import userIcon from './assets/icons/user.svg'
import mailIcon from './assets/icons/mail.svg'
import passwordIcon from './assets/icons/password.svg'

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
                type="password"
                autoComplete="new-password"
                placeholder="パスワードを入力"
                value={form.password}
                onChange={handleChange}
                required
              />
              <span className="input-icon right">×</span>
            </label>

            <label>
              <span className="input-icon">
                <img src={passwordIcon} alt="" aria-hidden="true" />
              </span>
              <input
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                placeholder="パスワード確認を入力"
                value={form.passwordConfirmation}
                onChange={handleChange}
                required
              />
              <span className="input-icon right">×</span>
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
