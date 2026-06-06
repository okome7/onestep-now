import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'
import { signup } from './signupApi'
import type { SignupForm } from './signupApi'

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
      <section className="signup-panel" aria-labelledby="signup-title">
        <div className="signup-heading">
          <p className="eyebrow">OneStep Now</p>
          <h1 id="signup-title">新規登録</h1>
          <p>まずはアカウントを作成して、最初の一歩を始めましょう。</p>
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>
          <label>
            名前
            <input
              name="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            メールアドレス
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            パスワード
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            パスワード確認
            <input
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              value={form.passwordConfirmation}
              onChange={handleChange}
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '登録中...' : '登録する'}
          </button>
        </form>

        {message && <p className="notice success">{message}</p>}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  )
}

export default App
