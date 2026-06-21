import avatarOne from './assets/avatars/avatar-1.svg'
import avatarTwo from './assets/avatars/avatar-2.svg'
import avatarThree from './assets/avatars/avatar-3.svg'
import avatarFour from './assets/avatars/avatar-4.svg'
import avatarFive from './assets/avatars/avatar-5.svg'
import avatarSix from './assets/avatars/avatar-6.svg'
import avatarSeven from './assets/avatars/avatar-7.svg'
import avatarEight from './assets/avatars/avatar-8.svg'
import type {
  AchievementComment,
  AchievementLikeUser,
  FeedPost,
  ProfileAchievement,
} from './appTypes'
import type { SignupForm } from './signupApi'

export const initialForm: SignupForm = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
}

export const passwordGuidance = '8文字以上で英字と数字を含めてください'
export const passwordPattern = '(?=.*[A-Za-z])(?=.*\\d)[A-Za-z0-9]{8,}'
export const customPhotoIconId = 'custom-photo'
export const signupScreenStorageKey = 'onestep-signup-screen'
export const signupDraftStorageKey = 'onestep-signup-draft'
export const signupCompleteStorageKey = 'onestep-signup-complete'
export const avatarImageSize = 256
export const avatarImageQuality = 0.82
export const feedViewDurationSeconds = 5 * 60

export const taskCompleteComments = [
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

export const taskCompleteLikeCount = 12

export const sampleFeedPosts: Array<
  Omit<FeedPost, 'createdAt'> & { ageMinutes: number }
> = [
  {
    id: 'sample-1',
    userName: 'あや',
    level: 5,
    task: '参考記事を1つ読む',
    status: 'done',
    likes: 120,
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

export const sampleProfileAchievements: Array<
  Omit<ProfileAchievement, 'createdAt'> & { ageMinutes: number }
> = [
  {
    id: 'achievement-1',
    task: 'スライド1枚作る',
    likes: 12,
    comments: 5,
    ageMinutes: 4,
  },
  {
    id: 'achievement-2',
    task: '部屋の掃除をする',
    likes: 13,
    comments: 3,
    ageMinutes: 2 * 60,
  },
  {
    id: 'achievement-3',
    task: '英単語を10個覚える',
    likes: 20,
    comments: 4,
    ageMinutes: 24 * 60,
  },
  {
    id: 'achievement-4',
    task: 'ランニング3km',
    likes: 11,
    comments: 1,
    ageMinutes: 2 * 24 * 60,
  },
  {
    id: 'achievement-5',
    task: '読書を30分する',
    likes: 8,
    comments: 2,
    ageMinutes: 3 * 24 * 60,
  },
  {
    id: 'achievement-6',
    task: 'セキュリティの勉強をする',
    likes: 18,
    comments: 3,
    ageMinutes: 4 * 24 * 60,
  },
  {
    id: 'achievement-7',
    task: '洗い物をする',
    likes: 7,
    comments: 1,
    ageMinutes: 5 * 24 * 60,
  },
  {
    id: 'achievement-8',
    task: 'AIを使ってみる',
    likes: 10,
    comments: 2,
    ageMinutes: 6 * 24 * 60,
  },
  {
    id: 'achievement-9',
    task: 'エラーを解決する',
    likes: 12,
    comments: 1,
    ageMinutes: 93 * 24 * 60,
  },
  {
    id: 'achievement-10',
    task: '新しいことを1つ調べる',
    likes: 9,
    comments: 2,
    ageMinutes: 94 * 24 * 60,
  },
]

export const achievementLikeUsers: AchievementLikeUser[] = [
  { name: 'みき', level: 7, afterComplete: false },
  { name: 'あや', level: 5, afterComplete: false },
  { name: 'けんじ', level: 1, afterComplete: false },
  { name: 'さくら', level: 22, afterComplete: false },
  { name: 'はる', level: 18, afterComplete: true },
]

export const achievementComments: AchievementComment[] = [
  {
    name: 'みき',
    level: 7,
    afterComplete: false,
    text: '頑張れ！',
    age: '3時間前',
  },
  {
    name: 'あや',
    level: 5,
    afterComplete: false,
    text: 'ファイト🔥',
    age: '2時間前',
  },
  {
    name: 'けんじ',
    level: 1,
    afterComplete: false,
    text: 'がんば！',
    age: '2時間前',
  },
  {
    name: 'さくら',
    level: 22,
    afterComplete: true,
    text: 'いい感じ！',
    age: '1時間前',
  },
]

export const avatarOptions = [
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
