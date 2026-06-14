import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, MouseEvent, ReactNode } from 'react'
import './App.css'
import { login } from './loginApi'
import type { LoginForm } from './loginApi'
import {
  resetPassword,
  sendPasswordResetCode,
  verifyPasswordResetCode,
} from './passwordResetApi'
import type { PasswordResetForm } from './passwordResetApi'
import { checkSignupEmail, signup } from './signupApi'
import type { SignupForm } from './signupApi'
import passwordShowIcon from './assets/icons/password_show.svg'
import passwordHideIcon from './assets/icons/password_hide.svg'
import likeIcon from './assets/icons/like.svg'
import likeActiveIcon from './assets/icons/like-active.svg'
import commentIcon from './assets/icons/comment.svg'
import settingsIcon from './assets/icons/settings.svg'
import avatarOne from './assets/avatars/avatar-1.svg'
import avatarTwo from './assets/avatars/avatar-2.svg'
import avatarThree from './assets/avatars/avatar-3.svg'
import avatarFour from './assets/avatars/avatar-4.svg'
import avatarFive from './assets/avatars/avatar-5.svg'
import avatarSix from './assets/avatars/avatar-6.svg'
import avatarSeven from './assets/avatars/avatar-7.svg'
import avatarEight from './assets/avatars/avatar-8.svg'

const initialForm: SignupForm = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
}

const passwordGuidance = '8文字以上で英字と数字を含めてください'
const passwordPattern = '(?=.*[A-Za-z])(?=.*\\d)[A-Za-z0-9]{8,}'
type FieldErrors = Partial<Record<keyof SignupForm, string>>
type LoginFieldErrors = Partial<Record<keyof LoginForm, string>>
type PasswordResetFieldErrors = Partial<Record<keyof PasswordResetForm, string>>
type PasswordResetStep = 'email' | 'code' | 'password'
type Screen = 'signup' | 'icon' | 'complete'
const customPhotoIconId = 'custom-photo'
const signupScreenStorageKey = 'onestep-signup-screen'
const signupDraftStorageKey = 'onestep-signup-draft'
const signupCompleteStorageKey = 'onestep-signup-complete'
const avatarImageSize = 256
const avatarImageQuality = 0.82
const taskCompleteComments = [
  '頑張れ！',
  'ファイト🔥',
  '今日も一歩進めていてすごい！その調子で次の一歩も応援してるよ',
  '応援してる！',
  '集中できたのすごい！',
  'その一歩が未来につながってるよ',
  'ナイスチャレンジ✨',
  '最後までやり切ったね！',
  '次も一緒に進もう！',
]
const taskCompleteLikeCount = 12

type FeedPostStatus = 'doing' | 'done'

type FeedPost = {
  id: string
  userName: string
  level: number
  task: string
  status: FeedPostStatus
  likes: number
  comments: string[]
  createdAt: number
  liked: boolean
  isOwnPost: boolean
}

const feedViewDurationSeconds = 5 * 60
const sampleFeedPosts: Array<
  Omit<FeedPost, 'createdAt'> & { ageMinutes: number }
> = [
  {
    id: 'sample-1',
    userName: 'あや',
    level: 5,
    task: '参考記事を1つ読む',
    status: 'done',
    likes: 10,
    comments: ['いいね！'],
    ageMinutes: 1,
    liked: false,
    isOwnPost: false,
  },
  {
    id: 'sample-2',
    userName: 'たろう',
    level: 20,
    task: '問題5問解く',
    status: 'doing',
    likes: 1,
    comments: [],
    ageMinutes: 3,
    liked: false,
    isOwnPost: false,
  },
  {
    id: 'sample-3',
    userName: 'みき',
    level: 7,
    task: '洗い物をする',
    status: 'done',
    likes: 12,
    comments: ['おつかれさま！', 'すごい！'],
    ageMinutes: 4,
    liked: true,
    isOwnPost: false,
  },
  {
    id: 'sample-4',
    userName: 'けんじ',
    level: 1,
    task: 'バグを直す',
    status: 'doing',
    likes: 2,
    comments: ['応援してる！'],
    ageMinutes: 7,
    liked: true,
    isOwnPost: false,
  },
  {
    id: 'sample-5',
    userName: 'はる',
    level: 16,
    task: '部屋を片付ける',
    status: 'done',
    likes: 12,
    comments: ['ナイス！', 'えらい！', '助かるね'],
    ageMinutes: 8,
    liked: false,
    isOwnPost: false,
  },
  {
    id: 'sample-6',
    userName: 'ゆい',
    level: 9,
    task: 'ストレッチを5分する',
    status: 'doing',
    likes: 4,
    comments: ['一緒にがんばろう！'],
    ageMinutes: 10,
    liked: false,
    isOwnPost: false,
  },
  {
    id: 'sample-7',
    userName: 'そうた',
    level: 12,
    task: '英単語を10個覚える',
    status: 'done',
    likes: 8,
    comments: ['継続できててすごい！', 'ナイス一歩！'],
    ageMinutes: 12,
    liked: true,
    isOwnPost: false,
  },
  {
    id: 'sample-8',
    userName: 'りん',
    level: 3,
    task: '机の上を整理する',
    status: 'doing',
    likes: 3,
    comments: [],
    ageMinutes: 15,
    liked: false,
    isOwnPost: false,
  },
  {
    id: 'sample-9',
    userName: 'なお',
    level: 18,
    task: 'メールを1件返信する',
    status: 'done',
    likes: 15,
    comments: ['早い！', '助かるね'],
    ageMinutes: 18,
    liked: false,
    isOwnPost: false,
  },
  {
    id: 'sample-10',
    userName: 'まい',
    level: 6,
    task: '明日の予定を3つ書く',
    status: 'doing',
    likes: 5,
    comments: ['いい準備！'],
    ageMinutes: 20,
    liked: false,
    isOwnPost: false,
  },
]

const avatarOptions = [
  { id: 'avatar-1', src: avatarOne, label: 'アイコン1' },
  { id: 'avatar-2', src: avatarTwo, label: 'アイコン2' },
  { id: 'avatar-3', src: avatarThree, label: 'アイコン3' },
  { id: 'avatar-4', src: avatarFour, label: 'アイコン4' },
  { id: 'avatar-5', src: avatarFive, label: 'アイコン5' },
  { id: 'avatar-6', src: avatarSix, label: 'アイコン6' },
  { id: 'avatar-7', src: avatarSeven, label: 'アイコン7' },
  { id: 'avatar-8', src: avatarEight, label: 'アイコン8' },
  { id: customPhotoIconId, src: '', label: '選択した写真' },
]

function formatPasswordInput(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, '')
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function formatElapsedTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatFeedRemainingTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatFeedPostAge(createdAt: number, now: number) {
  const elapsedMinutes = Math.max(1, Math.floor((now - createdAt) / 60000))

  return `${elapsedMinutes}分前`
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
    nextErrors.password = passwordGuidance
  } else if (!new RegExp(`^${passwordPattern}$`).test(form.password)) {
    nextErrors.password = passwordGuidance
  }

  if (!form.passwordConfirmation) {
    nextErrors.passwordConfirmation = 'パスワード確認を入力してください'
  } else if (form.password !== form.passwordConfirmation) {
    nextErrors.passwordConfirmation = 'パスワード確認が一致していません'
  }

  return nextErrors
}

function validateLoginForm(form: LoginForm) {
  const nextErrors: LoginFieldErrors = {}

  if (!form.email.trim()) {
    nextErrors.email = 'メールアドレスを入力してください'
  } else if (!isValidEmail(form.email)) {
    nextErrors.email = '@を含む正しいメールアドレスを入力してください'
  }

  if (!form.password) {
    nextErrors.password = 'パスワードを入力してください'
  }

  return nextErrors
}

function validatePasswordResetEmail(form: Pick<PasswordResetForm, 'email'>) {
  const nextErrors: PasswordResetFieldErrors = {}

  if (!form.email.trim()) {
    nextErrors.email = 'メールアドレスを入力してください'
  } else if (!isValidEmail(form.email)) {
    nextErrors.email = '@を含む正しいメールアドレスを入力してください'
  }

  return nextErrors
}

function validatePasswordResetCode(form: Pick<PasswordResetForm, 'code'>) {
  const nextErrors: PasswordResetFieldErrors = {}

  if (!form.code.trim()) {
    nextErrors.code = '認証コードを入力してください'
  } else if (!/^\d{6}$/.test(form.code)) {
    nextErrors.code = '6桁の認証コードを入力してください'
  }

  return nextErrors
}

function validatePasswordResetPassword(
  form: Pick<PasswordResetForm, 'password' | 'passwordConfirmation'>,
) {
  const nextErrors: PasswordResetFieldErrors = {}

  if (!form.password) {
    nextErrors.password = 'パスワードを入力してください'
  } else if (form.password.length < 8) {
    nextErrors.password = passwordGuidance
  } else if (!new RegExp(`^${passwordPattern}$`).test(form.password)) {
    nextErrors.password = passwordGuidance
  }

  if (!form.passwordConfirmation) {
    nextErrors.passwordConfirmation = 'パスワード確認を入力してください'
  } else if (form.password !== form.passwordConfirmation) {
    nextErrors.passwordConfirmation = 'パスワード確認が一致していません'
  }

  return nextErrors
}

function hasErrors(errors: object) {
  return Object.keys(errors).length > 0
}

function errorFieldClass(error: string | undefined) {
  return error ? 'field-error' : undefined
}

function isPasswordGuidanceError(error: string | undefined) {
  return Boolean(
    error &&
    (error.includes('8文字以上') ||
      error.includes('英数字') ||
      error.includes('英字と数字') ||
      error === passwordGuidance),
  )
}

function apiMessageToFieldErrors(message: string): FieldErrors {
  const nextErrors: FieldErrors = {}

  for (const line of message.split('\n')) {
    if (line.includes('メールアドレス')) {
      nextErrors.email = line
    } else if (line.includes('パスワード確認')) {
      nextErrors.passwordConfirmation = line
    } else if (line.includes('パスワード') || line.startsWith('Password')) {
      nextErrors.password = passwordGuidance
    } else if (line.includes('表示名') || line.includes('名前')) {
      nextErrors.name = line
    }
  }

  return nextErrors
}

function apiMessageToLoginFieldErrors(message: string): LoginFieldErrors {
  if (message.includes('メールアドレスまたはパスワード')) {
    return { password: message }
  }

  if (message.includes('メールアドレス')) {
    return { email: message }
  }

  if (message.includes('パスワード')) {
    return { password: message }
  }

  return {}
}

function apiMessageToPasswordResetFieldErrors(
  message: string,
): PasswordResetFieldErrors {
  const nextErrors: PasswordResetFieldErrors = {}

  for (const line of message.split('\n')) {
    if (line.includes('メールアドレス')) {
      nextErrors.email = line
    } else if (line.includes('認証コード')) {
      nextErrors.code = line
    } else if (line.includes('パスワード確認')) {
      nextErrors.passwordConfirmation = line
    } else if (line.includes('パスワード') || line.startsWith('Password')) {
      nextErrors.password = passwordGuidance
    }
  }

  return nextErrors
}

type CompleteProfile = {
  name: string
  avatarId: string
}

function isAvatarImageDataUrl(value: string | undefined) {
  return Boolean(value?.startsWith('data:image/'))
}

function getAvatarSrc(avatarId: string) {
  if (isAvatarImageDataUrl(avatarId)) {
    return avatarId
  }

  return (
    avatarOptions.find((avatar) => avatar.id === avatarId)?.src ??
    avatarOptions[0].src
  )
}

function getInitialScreen(): Screen {
  const savedScreen = window.sessionStorage.getItem(signupScreenStorageKey)
  const savedCompleteProfile = window.localStorage.getItem(
    signupCompleteStorageKey,
  )

  if (savedScreen === 'complete' || savedScreen === 'icon') {
    return savedScreen
  }

  if (savedCompleteProfile) {
    return 'complete'
  }

  return 'signup'
}

function getInitialForm(screen: Screen): SignupForm {
  const savedForm = window.sessionStorage.getItem(signupDraftStorageKey)

  if (!savedForm) {
    return initialForm
  }

  try {
    const parsedForm = JSON.parse(savedForm) as Partial<SignupForm>

    return {
      ...initialForm,
      name: parsedForm.name ?? '',
      email: parsedForm.email ?? '',
      password: screen === 'icon' ? (parsedForm.password ?? '') : '',
      passwordConfirmation:
        screen === 'icon' ? (parsedForm.passwordConfirmation ?? '') : '',
    }
  } catch {
    return initialForm
  }
}

function saveSignupDraft(form: SignupForm, includePassword = false) {
  window.sessionStorage.setItem(
    signupDraftStorageKey,
    JSON.stringify({
      name: form.name,
      email: form.email,
      ...(includePassword
        ? {
            password: form.password,
            passwordConfirmation: form.passwordConfirmation,
          }
        : {}),
    }),
  )
}

function getInitialCompleteProfile(): CompleteProfile {
  const savedProfile = window.localStorage.getItem(signupCompleteStorageKey)

  if (!savedProfile) {
    return { name: '', avatarId: avatarOptions[0].id }
  }

  try {
    const parsedProfile = JSON.parse(savedProfile) as Partial<CompleteProfile>

    return {
      name: parsedProfile.name ?? '',
      avatarId: parsedProfile.avatarId ?? avatarOptions[0].id,
    }
  } catch {
    return { name: '', avatarId: avatarOptions[0].id }
  }
}

function saveCompleteProfile(profile: CompleteProfile) {
  window.localStorage.setItem(signupCompleteStorageKey, JSON.stringify(profile))
}

function getCompleteAvatarSrc(profile: CompleteProfile) {
  return getAvatarSrc(profile.avatarId)
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () =>
      reject(
        new Error('写真の読み込みに失敗しました。もう一度選択してください。'),
      )
    reader.readAsDataURL(blob)
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () =>
      reject(
        new Error('写真の読み込みに失敗しました。もう一度選択してください。'),
      )
    image.src = src
  })
}

async function createAvatarImageDataUrl(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください。')
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(objectUrl)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('写真の変換に失敗しました。もう一度選択してください。')
    }

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
    const sourceX = (image.naturalWidth - sourceSize) / 2
    const sourceY = (image.naturalHeight - sourceSize) / 2

    canvas.width = avatarImageSize
    canvas.height = avatarImageSize
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, avatarImageSize, avatarImageSize)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      avatarImageSize,
      avatarImageSize,
    )

    const avatarBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
            return
          }

          reject(
            new Error('写真の変換に失敗しました。もう一度選択してください。'),
          )
        },
        'image/jpeg',
        avatarImageQuality,
      )
    })

    return readBlobAsDataUrl(avatarBlob)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

type SignupHeaderProps = {
  title: string
  onBack: () => void
}

function SignupHeader({ title, onBack }: SignupHeaderProps) {
  return (
    <header className="signup-header">
      <button
        className="back-button"
        type="button"
        aria-label="戻る"
        onClick={onBack}
      >
        &lt;
      </button>
      <h1>{title}</h1>
    </header>
  )
}

type AppHeaderProps = {
  title?: string
  rightAction?: ReactNode
}

function AppHeader({
  title = 'OneStep Now',
  rightAction = null,
}: AppHeaderProps) {
  return (
    <header className="home-header">
      <div className="home-header-action" aria-hidden="true" />
      <h1>{title}</h1>
      <div className="home-header-action home-header-action-right">
        {rightAction}
      </div>
    </header>
  )
}

function HomeNavIcon() {
  return (
    <svg
      className="home-nav-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 10.5L12 3L21 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 10V20H10V15H14V20H19V10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FeedNavIcon() {
  return (
    <svg
      className="home-nav-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 9H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 13H13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 13.5L17 14.5L19 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ProfileNavIcon() {
  return (
    <svg
      className="home-nav-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 19C5 15.6863 8.13401 13 12 13C15.866 13 19 15.6863 19 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

type HomeBottomNavActiveItem = 'home' | 'feed' | 'profile'

type HomeBottomNavProps = {
  activeItem: HomeBottomNavActiveItem
  onHomeClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  onFeedClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  onProfileClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

function HomeBottomNav({
  activeItem,
  onHomeClick,
  onFeedClick,
  onProfileClick,
}: HomeBottomNavProps) {
  return (
    <nav className="home-bottom-nav" aria-label="ホームメニュー">
      <a
        className={`home-nav-item ${activeItem === 'home' ? 'active' : ''}`}
        href="/home"
        aria-label="ホーム"
        aria-current={activeItem === 'home' ? 'page' : undefined}
        onClick={onHomeClick}
      >
        <HomeNavIcon />
      </a>
      <a
        className={`home-nav-item ${activeItem === 'feed' ? 'active' : ''}`}
        href="/home"
        aria-label="投稿"
        aria-current={activeItem === 'feed' ? 'page' : undefined}
        onClick={onFeedClick}
      >
        <FeedNavIcon />
      </a>
      <a
        className={`home-nav-item ${activeItem === 'profile' ? 'active' : ''}`}
        href="/home"
        aria-label="プロフィール"
        aria-current={activeItem === 'profile' ? 'page' : undefined}
        onClick={onProfileClick}
      >
        <ProfileNavIcon />
      </a>
    </nav>
  )
}

function SignupPage() {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [screen, setScreen] = useState<Screen>(getInitialScreen)
  const [form, setForm] = useState<SignupForm>(() =>
    getInitialForm(getInitialScreen()),
  )
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedIconId, setSelectedIconId] = useState(avatarOptions[0].id)
  const [customPhotoUrl, setCustomPhotoUrl] = useState('')
  const [customPhotoDataUrl, setCustomPhotoDataUrl] = useState('')
  const [completedName, setCompletedName] = useState(
    () => getInitialCompleteProfile().name,
  )
  const [completedIconSrc, setCompletedIconSrc] = useState(() =>
    getCompleteAvatarSrc(getInitialCompleteProfile()),
  )
  const [isMobilePhotoMenu, setIsMobilePhotoMenu] = useState(false)
  const [isPhotoChoiceOpen, setIsPhotoChoiceOpen] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] =
    useState(false)
  const showPasswordGuidanceError = isPasswordGuidanceError(
    fieldErrors.password,
  )
  const noticeText = message || error

  useEffect(() => {
    return () => {
      if (customPhotoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(customPhotoUrl)
      }
    }
  }, [customPhotoUrl])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)')
    const updatePhotoMenu = () => {
      setIsMobilePhotoMenu(mediaQuery.matches)
      setIsPhotoChoiceOpen(false)
    }

    updatePhotoMenu()
    mediaQuery.addEventListener('change', updatePhotoMenu)

    return () => mediaQuery.removeEventListener('change', updatePhotoMenu)
  }, [])

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    const nextValue =
      name === 'password' || name === 'passwordConfirmation'
        ? formatPasswordInput(value)
        : value

    setForm((current) => {
      const nextForm = { ...current, [name]: nextValue }

      if (name === 'name' || name === 'email') {
        saveSignupDraft(nextForm)
      }

      return nextForm
    })
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
      await checkSignupEmail(form.email)
      saveSignupDraft(form, true)
      window.sessionStorage.setItem(signupScreenStorageKey, 'icon')
      window.localStorage.removeItem(signupCompleteStorageKey)
      setScreen('icon')
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : '登録に失敗しました。'
      const nextFieldErrors = apiMessageToFieldErrors(nextError)

      if (hasErrors(nextFieldErrors)) {
        setFieldErrors((current) => ({ ...current, ...nextFieldErrors }))
        return
      }

      setError(nextError)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleBack() {
    if (screen === 'icon') {
      window.sessionStorage.setItem(signupScreenStorageKey, 'signup')
      setScreen('signup')
      return
    }

    window.history.back()
  }

  async function handleIconSubmit() {
    setMessage('')
    setError('')
    setIsSubmitting(true)

    try {
      const selectedAvatar = avatarOptions.find(
        (avatar) => avatar.id === selectedIconId,
      )
      const isCustomPhotoSelected = selectedIconId === customPhotoIconId

      if (isCustomPhotoSelected && !customPhotoDataUrl) {
        throw new Error('写真をもう一度選択してください。')
      }

      const nextCompletedName = form.name.trim()
      const avatarKeyToSave = isCustomPhotoSelected
        ? customPhotoDataUrl
        : selectedIconId
      const createdUser = await signup({
        ...form,
        avatarKey: avatarKeyToSave,
      })
      const nextCompletedAvatarId = createdUser.avatar_key ?? avatarKeyToSave
      const nextCompletedIconSrc =
        getAvatarSrc(nextCompletedAvatarId) ??
        selectedAvatar?.src ??
        avatarOptions[0].src

      setCompletedName(nextCompletedName)
      setCompletedIconSrc(nextCompletedIconSrc)
      setFieldErrors({})
      window.sessionStorage.removeItem(signupDraftStorageKey)
      window.sessionStorage.setItem(signupScreenStorageKey, 'complete')
      saveCompleteProfile({
        name: nextCompletedName,
        avatarId: nextCompletedAvatarId,
      })
      setScreen('complete')
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : '登録に失敗しました。'
      const nextFieldErrors = apiMessageToFieldErrors(nextError)

      if (hasErrors(nextFieldErrors)) {
        setFieldErrors((current) => ({ ...current, ...nextFieldErrors }))
        window.sessionStorage.setItem(signupScreenStorageKey, 'signup')
        setScreen('signup')
        return
      }

      setError(nextError)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]

    if (selectedFile) {
      try {
        const photoDataUrl = await createAvatarImageDataUrl(selectedFile)
        setCustomPhotoDataUrl(photoDataUrl)
        setCustomPhotoUrl(photoDataUrl)
        setSelectedIconId(customPhotoIconId)
        setIsPhotoChoiceOpen(false)
        setMessage('')
        setError('')
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : '写真の読み込みに失敗しました。',
        )
      }
    }
  }

  function handleAvatarClick(avatarId: string) {
    if (avatarId !== customPhotoIconId || customPhotoUrl) {
      setSelectedIconId(avatarId)
      return
    }
  }

  function handlePhotoButtonClick() {
    if (isMobilePhotoMenu) {
      setIsPhotoChoiceOpen((current) => !current)
      return
    }

    photoInputRef.current?.click()
  }

  function handleStart() {
    window.localStorage.removeItem(signupCompleteStorageKey)
    window.sessionStorage.removeItem(signupScreenStorageKey)
    window.location.href = '/home'
  }

  return (
    <main
      className={`signup-page ${screen === 'complete' ? 'complete-page' : ''}`}
    >
      {screen === 'complete' ? null : (
        <SignupHeader title="新規登録" onBack={handleBack} />
      )}

      {screen === 'complete' ? (
        <section className="complete-content" aria-labelledby="complete-title">
          <h2 id="complete-title">登録が完了しました！</h2>
          <p className="complete-description">早速始めましょう！</p>

          <div className="complete-profile">
            <span className="sparkle sparkle-one" aria-hidden="true" />
            <span className="sparkle sparkle-two" aria-hidden="true" />
            <span className="sparkle sparkle-three" aria-hidden="true" />
            <span className="sparkle sparkle-four" aria-hidden="true" />
            <span className="sparkle sparkle-five" aria-hidden="true" />
            <span className="sparkle sparkle-six" aria-hidden="true" />
            <span className="celebration-dot dot-one" aria-hidden="true" />
            <span className="celebration-dot dot-two" aria-hidden="true" />
            <span className="celebration-dot dot-three" aria-hidden="true" />
            <img
              className="complete-avatar"
              src={completedIconSrc}
              alt=""
              aria-hidden="true"
            />
            <span className="complete-check" aria-hidden="true" />
            <p className="complete-name">{completedName}</p>
          </div>

          <button
            className="submit-button start-button"
            type="button"
            onClick={handleStart}
          >
            最初の一歩を始める
          </button>
        </section>
      ) : screen === 'icon' ? (
        <section className="icon-content" aria-labelledby="icon-title">
          <h2 id="icon-title">アイコンを選ぼう！</h2>
          <p className="icon-description">
            気に入ったアイコンを選んでください。
            <br />
            後からでも変更できます。
          </p>

          <div className="avatar-grid" role="radiogroup" aria-label="アイコン">
            {avatarOptions.map((avatar) => {
              const isCustomPhoto = avatar.id === customPhotoIconId
              const hasCustomPhoto = isCustomPhoto && customPhotoUrl
              const isCameraSlot = isCustomPhoto && !hasCustomPhoto

              return (
                <button
                  key={avatar.id}
                  className={`avatar-option ${
                    selectedIconId === avatar.id ? 'selected' : ''
                  } ${isCameraSlot ? 'photo-slot-empty' : ''}`}
                  type="button"
                  role="radio"
                  aria-checked={selectedIconId === avatar.id}
                  aria-label={isCameraSlot ? '写真未選択' : avatar.label}
                  disabled={isCameraSlot}
                  onClick={() => handleAvatarClick(avatar.id)}
                >
                  {hasCustomPhoto ? (
                    <img src={customPhotoUrl} alt="" aria-hidden="true" />
                  ) : (
                    !isCustomPhoto && (
                      <img src={avatar.src} alt="" aria-hidden="true" />
                    )
                  )}
                </button>
              )
            })}
          </div>

          <div className="photo-actions">
            <button
              className="photo-button"
              type="button"
              aria-expanded={isMobilePhotoMenu ? isPhotoChoiceOpen : undefined}
              onClick={handlePhotoButtonClick}
            >
              <span
                className="photo-button-icon folder-icon"
                aria-hidden="true"
              />
              写真を選ぶ
            </button>
          </div>

          {isMobilePhotoMenu ? (
            <div
              className={`photo-choice-panel ${
                isPhotoChoiceOpen ? 'is-open' : ''
              }`}
            >
              <button
                className="photo-choice-button"
                type="button"
                tabIndex={isPhotoChoiceOpen ? 0 : -1}
                onClick={() => cameraInputRef.current?.click()}
              >
                カメラで撮影
              </button>
              <button
                className="photo-choice-button"
                type="button"
                tabIndex={isPhotoChoiceOpen ? 0 : -1}
                onClick={() => photoInputRef.current?.click()}
              >
                写真を選択
              </button>
            </div>
          ) : null}

          <input
            ref={cameraInputRef}
            className="photo-input"
            type="file"
            accept="image/*"
            capture="user"
            aria-label="撮影する写真"
            onChange={handlePhotoChange}
          />
          <input
            ref={photoInputRef}
            className="photo-input"
            type="file"
            accept="image/*"
            aria-label="選択する写真"
            onChange={handlePhotoChange}
          />

          <button
            className="submit-button icon-submit-button"
            type="button"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            onClick={handleIconSubmit}
          >
            決定
          </button>

          <p
            className={`notice ${message ? 'success' : ''} ${error ? 'error' : ''}`}
            role={error ? 'alert' : undefined}
            aria-live="polite"
          >
            {noticeText}
          </p>
        </section>
      ) : (
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
                  <p
                    id="name-error"
                    className="field-error-message"
                    role="alert"
                  >
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
                  aria-describedby={
                    fieldErrors.email ? 'email-error' : undefined
                  }
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
                    title="8文字以上で英字と数字を含めてください"
                    value={form.password}
                    onChange={handleChange}
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
            <a className="login-action-link" href="/login">
              ログイン
            </a>
          </div>
        </section>
      )}
    </main>
  )
}

function LoginPage() {
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleBack = () => {
    window.location.href = '/'
  }

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

    try {
      await login(form)
      window.location.href = '/home'
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
      setIsSubmitting(false)
    }
  }

  return (
    <main className="signup-page login-page">
      <SignupHeader title="ログイン" onBack={handleBack} />

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
          <a className="login-action-link" href="/">
            新規登録
          </a>
        </div>
      </section>
    </main>
  )
}

function PasswordResetPage() {
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

function HomePage() {
  const [taskText, setTaskText] = useState('')
  const [activeTask, setActiveTask] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isTaskComplete, setIsTaskComplete] = useState(false)
  const [isFeedOpen, setIsFeedOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [feedRemainingSeconds, setFeedRemainingSeconds] = useState(
    feedViewDurationSeconds,
  )
  const [feedNow, setFeedNow] = useState(() => Date.now())
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>(() => {
    const initialNow = Date.now()

    return sampleFeedPosts.map(({ ageMinutes, ...post }) => ({
      ...post,
      createdAt: initialNow - ageMinutes * 60 * 1000,
    }))
  })
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  )
  const isTaskActive = Boolean(activeTask)
  const isTaskRunning = isTaskActive && !isTaskComplete
  const hasCompleteComments = taskCompleteComments.length > 0
  const isFeedExpired = feedRemainingSeconds <= 0
  const visibleFeedPosts = feedPosts.filter((post) => !post.isOwnPost)
  const completedProfile = getInitialCompleteProfile()
  const profileAvatarSrc = getCompleteAvatarSrc(completedProfile)
  const profileName = completedProfile.name || 'おこめ'
  const recentAchievements = [
    { task: 'スライド1枚作る', likes: 12, comments: 3, age: '4分前' },
    { task: '部屋の掃除をする', likes: 13, comments: 3, age: '2時間前' },
  ]
  const activeCommentPost = activeCommentPostId
    ? (feedPosts.find((post) => post.id === activeCommentPostId) ?? null)
    : null

  useEffect(() => {
    if (!isTaskRunning) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [isTaskRunning])

  useEffect(() => {
    if (!isTaskComplete) {
      return
    }

    window.scrollTo({ top: 0, left: 0 })
  }, [isTaskComplete])

  useEffect(() => {
    if (!isFeedOpen || isFeedExpired) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setFeedRemainingSeconds((current) => Math.max(0, current - 1))
      setFeedNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [isFeedExpired, isFeedOpen])

  function addFeedPost(task: string, status: FeedPostStatus) {
    const postId = `${status}-${Date.now()}`

    setFeedPosts((currentPosts) => [
      {
        id: postId,
        userName: 'あなた',
        level: 1,
        task,
        status,
        likes: 0,
        comments: [],
        createdAt: Date.now(),
        liked: false,
        isOwnPost: true,
      },
      ...currentPosts,
    ])
  }

  function openFeed(event?: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
    event?.preventDefault()
    setIsFeedOpen(true)
    setIsProfileOpen(false)
    setFeedRemainingSeconds(feedViewDurationSeconds)
    setFeedNow(Date.now())
    window.scrollTo({ top: 0, left: 0 })
  }

  function openHome(event?: MouseEvent<HTMLAnchorElement>) {
    event?.preventDefault()
    setIsFeedOpen(false)
    setIsProfileOpen(false)
    window.scrollTo({ top: 0, left: 0 })
  }

  function openProfile(event?: MouseEvent<HTMLAnchorElement>) {
    event?.preventDefault()
    setIsFeedOpen(false)
    setIsProfileOpen(true)
    window.scrollTo({ top: 0, left: 0 })
  }

  function handleTaskStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextTask = taskText.trim()

    if (!nextTask) {
      return
    }

    setActiveTask(nextTask)
    setElapsedSeconds(0)
    setIsTaskComplete(false)
    addFeedPost(nextTask, 'doing')
  }

  function handleTaskCancel() {
    setActiveTask('')
    setElapsedSeconds(0)
    setIsTaskComplete(false)
  }

  function handleTaskDone() {
    setIsTaskComplete(true)
    addFeedPost(activeTask, 'done')
  }

  function handleNextTask() {
    setTaskText('')
    setActiveTask('')
    setElapsedSeconds(0)
    setIsTaskComplete(false)
  }

  function togglePostLike(postId: string) {
    setFeedPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post
        }

        return {
          ...post,
          liked: !post.liked,
          likes: post.liked ? Math.max(0, post.likes - 1) : post.likes + 1,
        }
      }),
    )
  }

  function handleCommentDraftChange(postId: string, value: string) {
    setCommentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [postId]: value,
    }))
  }

  function openCommentPanel(postId: string) {
    setActiveCommentPostId(postId)
  }

  function closeCommentPanel() {
    setActiveCommentPostId(null)
  }

  function addPostComment(postId: string) {
    const nextComment = (commentDrafts[postId] ?? '').trim()

    if (!nextComment) {
      return
    }

    setFeedPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, nextComment] }
          : post,
      ),
    )
    setCommentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [postId]: '',
    }))
  }

  if (isProfileOpen) {
    return (
      <main className="home-page profile-page">
        <AppHeader
          title="マイページ"
          rightAction={
            <button
              className="profile-settings-button"
              type="button"
              aria-label="設定"
            >
              <img src={settingsIcon} alt="" aria-hidden="true" />
            </button>
          }
        />

        <section className="profile-content" aria-label="マイページ">
          <img
            className="profile-avatar-large"
            src={profileAvatarSrc}
            alt=""
            aria-hidden="true"
          />
          <p className="profile-name">{profileName}</p>

          <section className="profile-level-card" aria-label="レベル">
            <div className="profile-level-row">
              <span className="profile-level-label">
                Lv.<strong>12</strong>
              </span>
              <span className="profile-level-next">あと2回でLv.13！</span>
            </div>
            <div className="profile-level-meter" aria-hidden="true">
              <span />
            </div>
            <span className="profile-level-percent">80%</span>
          </section>

          <section
            className="profile-section"
            aria-labelledby="profile-stats-title"
          >
            <h2 id="profile-stats-title">実績</h2>
            <div className="profile-stats-grid">
              <div className="profile-stat-card">
                <span aria-hidden="true">✓</span>
                <strong>128回</strong>
                <small>達成</small>
              </div>
              <div className="profile-stat-card">
                <span aria-hidden="true">🔥</span>
                <strong>7日</strong>
                <small>連続</small>
              </div>
              <div className="profile-stat-card">
                <img src={likeIcon} alt="" aria-hidden="true" />
                <strong>234</strong>
                <small>いいね</small>
              </div>
              <div className="profile-stat-card">
                <img src={commentIcon} alt="" aria-hidden="true" />
                <strong>32</strong>
                <small>コメント</small>
              </div>
            </div>
          </section>

          <section
            className="profile-section"
            aria-labelledby="profile-recent-title"
          >
            <div className="profile-section-heading">
              <h2 id="profile-recent-title">最近の達成</h2>
              <a href="/home" onClick={(event) => event.preventDefault()}>
                すべて見る&gt;
              </a>
            </div>
            <div className="profile-achievement-list">
              {recentAchievements.map((achievement) => (
                <article
                  className="profile-achievement-card"
                  key={achievement.task}
                >
                  <strong>{achievement.task}</strong>
                  <div>
                    <span>
                      <img src={likeIcon} alt="" aria-hidden="true" />
                      {achievement.likes}
                    </span>
                    <span>
                      <img src={commentIcon} alt="" aria-hidden="true" />
                      {achievement.comments}
                    </span>
                    <time>{achievement.age}</time>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <HomeBottomNav
          activeItem="profile"
          onHomeClick={openHome}
          onFeedClick={openFeed}
          onProfileClick={openProfile}
        />
      </main>
    )
  }

  if (isFeedOpen) {
    return (
      <main className="home-page feed-page">
        <AppHeader
          title="フィード"
          rightAction={
            <time
              className="feed-countdown"
              dateTime={`PT${feedRemainingSeconds}S`}
            >
              <span className="feed-countdown-icon" aria-hidden="true" />
              残り {formatFeedRemainingTime(feedRemainingSeconds)}
            </time>
          }
        />

        {isFeedExpired ? (
          <section className="feed-expired" aria-live="polite">
            <h2>フィードの閲覧時間が終了しました</h2>
            <p>もう一度見る場合は、みんなを見るを押してください。</p>
            <button
              className="home-start-button"
              type="button"
              onClick={openFeed}
            >
              もう一度見る
            </button>
          </section>
        ) : (
          <section className="feed-list" aria-label="みんなの投稿">
            {visibleFeedPosts.map((post) => (
              <article
                className={`feed-card feed-card-${post.status}`}
                key={post.id}
              >
                <div className="feed-card-header">
                  <div className="feed-user">
                    <span className="feed-avatar" aria-hidden="true" />
                    <span className="feed-user-name">{post.userName}</span>
                    <span className="feed-user-level">Lv.{post.level}</span>
                  </div>
                  <span className={`feed-status feed-status-${post.status}`}>
                    {post.status === 'done' ? '✓ できた' : '⚑ やります'}
                  </span>
                </div>

                <p className="feed-task">{post.task}</p>

                <div className="feed-card-footer">
                  <button
                    className={`feed-reaction ${post.liked ? 'active' : ''}`}
                    type="button"
                    aria-pressed={post.liked}
                    onClick={() => togglePostLike(post.id)}
                  >
                    <span className="feed-action-icon">
                      <img
                        src={post.liked ? likeActiveIcon : likeIcon}
                        alt=""
                        aria-hidden="true"
                      />
                    </span>
                    <span>{post.likes}</span>
                  </button>
                  <button
                    className="feed-comment-count"
                    type="button"
                    aria-label={`${post.userName}さんのコメントを開く`}
                    onClick={() => openCommentPanel(post.id)}
                  >
                    <span className="feed-action-icon">
                      <img src={commentIcon} alt="" aria-hidden="true" />
                    </span>
                    <span>{post.comments.length}</span>
                  </button>
                  <time
                    className="feed-post-age"
                    dateTime={new Date(post.createdAt).toISOString()}
                  >
                    {formatFeedPostAge(post.createdAt, feedNow)}
                  </time>
                </div>
              </article>
            ))}
          </section>
        )}

        <HomeBottomNav
          activeItem="feed"
          onHomeClick={openHome}
          onFeedClick={openFeed}
          onProfileClick={openProfile}
        />
        {activeCommentPost ? (
          <>
            <button
              className="feed-comment-backdrop"
              type="button"
              aria-label="コメントを閉じる"
              onClick={closeCommentPanel}
            />
            <section
              className={`feed-comment-panel feed-comment-panel-${activeCommentPost.status}`}
              aria-labelledby="feed-comment-panel-title"
            >
              <div className="feed-comment-panel-header">
                <h2 id="feed-comment-panel-title">コメント</h2>
                <button
                  className="feed-comment-panel-close"
                  type="button"
                  aria-label="コメントを閉じる"
                  onClick={closeCommentPanel}
                >
                  ×
                </button>
              </div>

              <div className="feed-comment-panel-task">
                {activeCommentPost.task}
              </div>

              {activeCommentPost.comments.length > 0 ? (
                <ul
                  className="feed-comment-panel-list"
                  aria-label="コメント一覧"
                >
                  {activeCommentPost.comments.map((comment, index) => (
                    <li key={`${activeCommentPost.id}-panel-comment-${index}`}>
                      <div className="feed-comment-author">
                        <span
                          className="feed-comment-avatar"
                          aria-hidden="true"
                        />
                        <span>みき</span>
                        <span className="feed-comment-level">Lv.7</span>
                      </div>
                      <div className="feed-comment-body">
                        <span>{comment}</span>
                        <time
                          dateTime={new Date(
                            activeCommentPost.createdAt,
                          ).toISOString()}
                        >
                          {index === activeCommentPost.comments.length - 1
                            ? formatFeedPostAge(
                                activeCommentPost.createdAt,
                                feedNow,
                              )
                            : '2時間前'}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="feed-comment-empty">まだコメントはありません</p>
              )}

              <div className="feed-comment-panel-form">
                <input
                  type="text"
                  aria-label={`${activeCommentPost.userName}さんの投稿にコメントする`}
                  placeholder="コメントを入力"
                  value={commentDrafts[activeCommentPost.id] ?? ''}
                  onChange={(event) =>
                    handleCommentDraftChange(
                      activeCommentPost.id,
                      event.target.value,
                    )
                  }
                />
                <button
                  type="button"
                  aria-label="コメントを送信"
                  onClick={() => addPostComment(activeCommentPost.id)}
                  disabled={!(commentDrafts[activeCommentPost.id] ?? '').trim()}
                >
                  ➤
                </button>
              </div>
            </section>
          </>
        ) : null}
      </main>
    )
  }

  return (
    <main className={`home-page ${isTaskActive ? 'task-active' : ''}`}>
      {isTaskActive ? null : <AppHeader />}

      {isTaskComplete ? (
        <section
          className="task-complete-screen"
          aria-labelledby="task-complete-title"
        >
          <div className="complete-confetti" aria-hidden="true">
            <div className="cracker-burst cracker-burst-left">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
            <div className="cracker-burst cracker-burst-right">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
          </div>

          <div className="task-complete-content">
            <h1 id="task-complete-title" className="task-complete-title">
              <svg
                className="title-star title-star-left"
                width="34"
                height="34"
                viewBox="0 0 34 34"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M17 2.5L20.8 12.6L31.5 13.1L23.1 19.8L25.9 30.2L17 24.3L8.1 30.2L10.9 19.8L2.5 13.1L13.2 12.6L17 2.5Z" />
              </svg>
              <span>よくできた</span>
              <svg
                className="title-star title-star-right"
                width="34"
                height="34"
                viewBox="0 0 34 34"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M17 2.5L20.8 12.6L31.5 13.1L23.1 19.8L25.9 30.2L17 24.3L8.1 30.2L10.9 19.8L2.5 13.1L13.2 12.6L17 2.5Z" />
              </svg>
            </h1>
            <p className="task-complete-name">{activeTask}</p>

            <div className="task-complete-stats" aria-label="リアクション">
              <span>
                <img src={likeIcon} alt="" aria-hidden="true" />
                {taskCompleteLikeCount}件
              </span>
              <span>
                <img src={commentIcon} alt="" aria-hidden="true" />
                {taskCompleteComments.length}件
              </span>
            </div>

            {hasCompleteComments ? (
              <section className="complete-comments">
                <h2>コメント</h2>
                <div
                  className="complete-comments-scroll"
                  role="region"
                  aria-label="コメント"
                >
                  <ul>
                    {taskCompleteComments.map((comment) => (
                      <li key={comment}>
                        <span className="comment-avatar" aria-hidden="true" />
                        <span className="complete-comment-text">{comment}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}
          </div>

          <div className="task-complete-actions">
            <a className="complete-feed-button" href="/home" onClick={openFeed}>
              みんなを見る
            </a>
            <button
              className="complete-next-button"
              type="button"
              onClick={handleNextTask}
            >
              次の一歩へ
            </button>
          </div>
        </section>
      ) : isTaskActive ? (
        <section className="focus-session" aria-labelledby="focus-task-title">
          <div className="focus-main">
            <h1 id="focus-task-title">{activeTask}</h1>
            <time className="focus-timer" dateTime={`PT${elapsedSeconds}S`}>
              {formatElapsedTime(elapsedSeconds)}
            </time>
          </div>

          <div className="focus-actions">
            <button
              className="focus-done-button"
              type="button"
              onClick={handleTaskDone}
            >
              できた！
            </button>
            <button
              className="focus-cancel-button"
              type="button"
              onClick={handleTaskCancel}
            >
              やめる
            </button>
          </div>
        </section>
      ) : (
        <form
          className="home-start"
          aria-labelledby="home-start-title"
          onSubmit={handleTaskStart}
        >
          <h2 id="home-start-title">今できることから</h2>
          <input
            className="home-task-input"
            type="text"
            aria-label="今できること"
            placeholder="やることを入力"
            value={taskText}
            onChange={(event) => setTaskText(event.target.value)}
          />
          <button
            className="home-start-button"
            type="submit"
            disabled={!taskText.trim()}
          >
            始める
          </button>
        </form>
      )}

      {isTaskActive ? null : (
        <HomeBottomNav
          activeItem="home"
          onHomeClick={openHome}
          onFeedClick={openFeed}
          onProfileClick={openProfile}
        />
      )}
    </main>
  )
}

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'

  if (pathname === '/login') {
    return <LoginPage />
  }

  if (pathname === '/password-reset') {
    return <PasswordResetPage />
  }

  if (pathname === '/home') {
    return <HomePage />
  }

  return <SignupPage />
}

export default App
