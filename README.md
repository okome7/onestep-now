# OneStep Now

OneStep Now は、「やる気はあるのに最初の一歩が出ない」人のための行動開始アプリです。

大きな目標管理ではなく、今できることを1つだけ入力し、すぐに始めることに集中しています。タスク完了後だけフィードを見られるようにすることで、SNSのような交流を「脱線」ではなく「行動後のごほうび」として扱う設計にしています。

## このアプリで解決したいこと

- やることを考えすぎて、始める前に止まってしまう
- SNSや通知を見て、やる前に時間が過ぎてしまう
- 頑張ったことが小さすぎて、誰にも共有しづらい

OneStep Now では、行動前に見られる情報をかなり絞り、まず1つ始める体験を優先しています。完了後にだけ、いいねやコメントなどの応援が見られるようにしています。

## 主な機能

### 実装済み

- 新規登録、メールアドレス重複チェック
- ログイン、パスワード再設定
- アイコン選択、写真選択、スマホ幅でのカメラ撮影導線
- 表示名・アイコン変更
- ログアウト、アカウント削除と確認モーダル
- タスクの作成、開始、完了、中止
- 集中中のタイマー画面
- タスク開始時の「やります」投稿と完了時の「できた」投稿
- 完了後に5分間だけ見られるフィード
- 投稿へのいいね、いいね解除、コメント
- マイページの実績、最近の達成、すべての達成
- 達成ごとのいいね・コメント詳細
- 達成回数に基づくレベルと進捗
- 完了投稿の日付に基づく連続日数
- マイページからの自分の投稿削除
- 投稿削除後の達成回数、連続日数、レベル、いいね・コメント合計の再計算

タスク、投稿、コメント、いいね、実績の集計元データは Rails API と PostgreSQL に保存されます。投稿を削除すると関連するコメントといいねも削除され、フィードとマイページの表示に反映されます。他のユーザーの投稿は削除できないよう、画面表示とAPIの両方で所有者を確認しています。

## 画面の流れ

1. 新規登録またはログイン
2. 表示名とアイコンを設定
3. ホームで「今できること」を1つ入力
4. 集中画面でタイマーを見ながら実行
5. できたら完了画面へ
6. 完了後だけフィードを見て、いいねやコメントで応援を受け取る
7. 次の一歩へ戻る

## 主なAPI

| Method | Path | 内容 |
| --- | --- | --- |
| `POST` | `/signup` | ユーザー登録 |
| `POST` | `/login` | ログイン |
| `POST` | `/password_reset` | パスワード再設定コード発行 |
| `POST` | `/password_reset/verify` | 再設定コード確認 |
| `PATCH` | `/password_reset` | パスワード更新 |
| `DELETE` | `/account` | アカウント削除 |
| `POST` | `/api/tasks` | タスク作成 |
| `PATCH` | `/api/tasks/:id/start` | タスク開始と投稿作成 |
| `PATCH` | `/api/tasks/:id/complete` | タスクと投稿を完了状態へ更新 |
| `DELETE` | `/api/tasks/:id` | 開始中タスクの中止 |
| `GET` | `/api/feed` | 閲覧可能時間と投稿一覧取得 |
| `GET` | `/api/mypage` | 実績、レベル、達成一覧取得 |
| `DELETE` | `/api/completion_posts/:id` | 所有する投稿と関連データの削除 |
| `POST` | `/api/completion_posts/:completion_post_id/likes` | いいね |
| `DELETE` | `/api/completion_posts/:completion_post_id/likes` | いいね解除 |
| `POST` | `/api/completion_posts/:completion_post_id/comments` | コメント投稿 |

APIのユーザー識別には現在 `X-User-Id` ヘッダーを利用しています。本番運用ではサーバー側の安全な認証セッションへ置き換える予定です。

## 技術スタック

### Frontend

- React 19
- TypeScript 6
- Vite 8
- CSS
- Vitest
- Playwright

### Backend

- Ruby on Rails 8.1 API
- PostgreSQL 16
- bcrypt
- RSpec
- Resend

### Infrastructure / Development

- Docker Compose
- GitHub Actions
- Playwright E2E

## ディレクトリ構成

```text
.
├── backend/            # Rails API
├── frontend/           # React SPA
├── tests/              # Playwright E2E
├── scripts/            # E2E用の補助スクリプト
├── .github/            # GitHub Actions
├── docker-compose.yml
└── README.md
```

## セットアップ

### Dockerで起動する場合

```bash
docker compose up -d --build
```

起動後のURL:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

停止:

```bash
docker compose down
```

DBの準備やマイグレーション:

```bash
docker compose exec backend bin/rails db:prepare
docker compose exec backend bin/rails db:migrate
```

### ローカルで起動する場合

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

Backend:

```bash
cd backend
bundle install
bin/rails db:prepare
bin/rails s
```

## テスト

Frontend build:

```bash
cd frontend
npm run build
```

Backend test:

```bash
cd backend
bin/rspec
```

Docker内で実行する場合:

```bash
docker compose exec -e RAILS_ENV=test backend bin/rspec
```

E2E test:

```bash
npm ci
npm run test:e2e
```

DockerでE2Eを実行する場合:

```bash
npm ci
npm run test:e2e:docker
```

## メール送信設定

パスワード再設定メールの送信には Resend を使います。実際にメール送信を行う場合は、`backend/.env` または本番環境に以下を設定します。

```bash
MAIL_FROM=onboarding@resend.dev
RESEND_API_KEY=your-resend-api-key
```

`RESEND_API_KEY` がない場合でも再設定コード発行APIは動きますが、実際のメール配送は行われません。

## 現在の開発状況

できていること:

- 認証まわりのAPIと画面
- パスワード再設定
- アカウント削除
- タスク、投稿、フィード、いいね、コメントのDB永続化
- 新規登録からホーム、集中、完了、フィードまでの主要フロー
- マイページの実データによる実績・レベル・連続日数表示
- 自分の投稿削除と、削除後のフィード・実績再計算
- マイページ、設定画面、削除確認を含む各種モーダル
- PlaywrightとRSpecによる主要フローのテスト

まだ途中のこと:

- 複数ユーザー間でリアルタイムに応援を届ける仕組み
- 本番運用を前提にした認証セッション管理
- 画像アップロードのストレージ設計
- UIの細かいレスポンシブ調整

今後やりたいこと:

- ログイン状態をサーバー側で安全に管理
- リアルタイム通知やフィード更新
- プロフィール画像を永続ストレージへ保存
- 本番デプロイ環境の整備

## 見てほしいポイント

- 「行動前は情報を減らし、行動後に交流を解放する」という体験設計
- 新規登録、ログイン、パスワード再設定、アカウント削除までの認証まわり
- 投稿、リアクション、マイページ実績が同じDBデータから一貫して更新される点
- 所有者だけが投稿を削除でき、削除結果がフィード・実績・レベルへ反映される点
- 画面遷移やモーダル、レスポンシブ表示を含む細かいUI改善の積み重ね

