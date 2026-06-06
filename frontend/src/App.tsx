import { type FormEvent, useState } from 'react'
import './App.css'
import { signup, type SignupSuccessResponse } from './signupApi'

type FormState = {
  name: string
  email: string
  password: string
  passwordConfirmation: string
}

type Screen = 'home' | 'signup' | 'icon' | 'complete'

const initialFormState: FormState = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
}

const iconColors = [
  '#d7d7d7',
  '#ccd7e8',
  '#d6e6d3',
  '#f1d7c8',
  '#ded3eb',
  '#cde7e1',
  '#e8d8d2',
  '#d5d8df',
  '#e8e1bd',
]

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [form, setForm] = useState<FormState>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registeredUser, setRegisteredUser] = useState<
    SignupSuccessResponse['data'] | null
  >(null)
  const [errors, setErrors] = useState<string[]>([])
  const [selectedIcon, setSelectedIcon] = useState(iconColors[0])

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrors([])

    try {
      const response = await signup({
        name: form.name,
        email: form.email,
        password: form.password,
        passwordConfirmation: form.passwordConfirmation,
      })

      if (response.status === 'success') {
        setRegisteredUser(response.data)
        setScreen('icon')
      } else {
        setErrors(response.errors)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'ユーザー登録に失敗しました。'
      setErrors([message])
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayName = registeredUser?.name || form.name || 'おこめ'

  return (
    <main className="app-page">
      <section className="desktop-copy" aria-labelledby="app-title">
        <p className="eyebrow">OneStep Now</p>
        <h1 id="app-title">最初は登録なしで、まず見られる。</h1>
        <p>
          体験を先に見て、必要になったタイミングで新規登録へ進める画面です。
        </p>
      </section>

      <section className="app-frame" aria-label="OneStep Now">
        <header className="app-header">
          {screen === 'home' ? (
            <span className="header-space" />
          ) : (
            <button
              aria-label="前の画面に戻る"
              className="back-button"
              onClick={() => setScreen(screen === 'signup' ? 'home' : 'signup')}
              type="button"
            >
              &lt;
            </button>
          )}
          <strong>{screen === 'home' ? 'マイページ' : '新規登録'}</strong>
          <div className="floating-avatar" aria-hidden="true">
            Y
          </div>
        </header>

        <div className="app-body">
          {screen === 'home' ? (
            <section className="home-screen">
              <div className="experience-preview">
                <h2>今日の一歩</h2>
                <p>登録しなくても、まずはアプリの流れを確認できます。</p>
                <button className="primary-action" type="button">
                  最初の一歩を見る
                </button>
              </div>

              <div className="account-box">
                <h2>この操作をするにはアカウントが必要です</h2>
                <p>続けるには新規登録またはログインしてください</p>
                <button
                  className="primary-action"
                  onClick={() => setScreen('signup')}
                  type="button"
                >
                  新規登録
                </button>
                <button className="text-action" type="button">
                  ログイン
                </button>
              </div>
            </section>
          ) : null}

          {screen === 'signup' ? (
            <section className="signup-screen">
              <form className="signup-form" onSubmit={handleSubmit}>
                <label>
                  名前
                  <input
                    autoComplete="name"
                    name="name"
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder="名前を入力"
                    required
                    type="text"
                    value={form.name}
                  />
                </label>

                <label>
                  メールアドレス
                  <input
                    autoComplete="email"
                    name="email"
                    onChange={(event) =>
                      updateField('email', event.target.value)
                    }
                    placeholder="メールアドレスを入力"
                    required
                    type="email"
                    value={form.email}
                  />
                </label>

                <label>
                  パスワード
                  <input
                    autoComplete="new-password"
                    name="password"
                    onChange={(event) =>
                      updateField('password', event.target.value)
                    }
                    placeholder="パスワードを入力"
                    required
                    type="password"
                    value={form.password}
                  />
                </label>

                <label>
                  パスワード確認
                  <input
                    autoComplete="new-password"
                    name="passwordConfirmation"
                    onChange={(event) =>
                      updateField('passwordConfirmation', event.target.value)
                    }
                    placeholder="もう一度入力"
                    required
                    type="password"
                    value={form.passwordConfirmation}
                  />
                </label>

                <p className="password-hint">8文字以上の英数字を入力してください</p>

                <button
                  className="primary-action wide-action"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? '登録中' : '登録'}
                </button>

                <p className="login-copy">すでにアカウントをお持ちですか？</p>
                <button className="text-action" type="button">
                  ログイン
                </button>
              </form>

              {errors.length > 0 ? (
                <div className="notice error" role="alert">
                  <strong>登録できませんでした</strong>
                  <ul>
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {screen === 'icon' ? (
            <section className="icon-screen">
              <h2>アイコンを選ぼう！</h2>
              <p>気に入ったアイコンを選んでください</p>
              <p>後からでも変更できます。</p>

              <div className="icon-grid" aria-label="アイコン候補">
                {iconColors.map((color) => (
                  <button
                    aria-label="アイコンを選択"
                    className="icon-choice"
                    key={color}
                    onClick={() => setSelectedIcon(color)}
                    style={{ backgroundColor: color }}
                    type="button"
                  />
                ))}
              </div>

              <div className="image-actions">
                <button type="button">写真を撮る</button>
                <button type="button">写真を選ぶ</button>
              </div>

              <button
                className="primary-action wide-action"
                onClick={() => setScreen('complete')}
                type="button"
              >
                アイコンを設定する
              </button>
            </section>
          ) : null}

          {screen === 'complete' ? (
            <section className="complete-screen">
              <h2>登録が完了しました！</h2>
              <p>早速始めましょう！</p>
              <div
                aria-hidden="true"
                className="selected-avatar"
                style={{ backgroundColor: selectedIcon }}
              />
              <strong>{displayName}</strong>
              <button className="primary-action wide-action" type="button">
                最初の一歩を始める
              </button>
            </section>
          ) : null}
        </div>

        <nav className="bottom-nav" aria-label="主要ナビゲーション">
          <button aria-label="ホーム" type="button">
            □
          </button>
          <button aria-label="メッセージ" type="button">
            ▤
          </button>
          <button aria-label="マイページ" type="button">
            ●
          </button>
        </nav>
      </section>
    </main>
  )
}

export default App
