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

- 新規登録
- ログイン
- パスワード再設定
- アイコン選択、写真選択、スマホ幅でのカメラ撮影導線
- マイページ
- 表示名変更
- アイコン変更
- ログアウト確認モーダル
- アカウント削除確認モーダル
- アカウント削除後の完了モーダル
- 1つのタスクを開始する画面
- 集中中のタイマー画面
- タスク完了画面
- 完了後に見られるフィード画面
- マイページの達成一覧
- 達成ごとのいいね、コメント一覧モーダル

### 現在はフロントエンド中心の仮実装

以下は画面と体験を優先して実装しており、現時点ではサンプルデータやブラウザ内の状態管理を使っています。

- タスクの開始、完了、フィード投稿
- フィードのいいね、コメント
- マイページの達成一覧
- 達成詳細のいいね、コメント一覧
- レベル表示や達成数

バックエンドには `Task` モデルがありますが、タスク投稿・フィード・コメント・いいねを永続化するAPIは今後実装予定です。

### バックエンドで実装済み

- ユーザー登録
- メールアドレス重複チェック
- ログイン
- パスワード再設定コードの発行、確認、更新
- アカウント削除
- ユーザー削除時の関連データ削除

## 画面の流れ

1. 新規登録またはログイン
2. 表示名とアイコンを設定
3. ホームで「今できること」を1つ入力
4. 集中画面でタイマーを見ながら実行
5. できたら完了画面へ
6. 完了後だけフィードを見て、いいねやコメントで応援を受け取る
7. 次の一歩へ戻る

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
bundle exec rspec
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
- 新規登録からホーム、集中、完了、フィードまでの主要画面
- マイページ、設定画面、各種モーダル
- PlaywrightとRSpecによる主要フローのテスト

まだ途中のこと:

- タスク、フィード、いいね、コメントのDB永続化
- 複数ユーザー間でリアルタイムに応援を届ける仕組み
- 本番運用を前提にした認証セッション管理
- 画像アップロードのストレージ設計
- UIの細かいレスポンシブ調整

今後やりたいこと:

- タスク投稿APIの実装
- フィード、いいね、コメントのDB設計とAPI実装
- マイページの達成履歴を実データ化
- ログイン状態をサーバー側で安全に管理
- 本番デプロイ環境の整備

## 見てほしいポイント

- 「行動前は情報を減らし、行動後に交流を解放する」という体験設計
- 新規登録、ログイン、パスワード再設定、アカウント削除までの認証まわり
- 画面遷移やモーダルを含む細かいUI改善の積み重ね
- 未完成部分を残しつつ、MVPとして体験の流れを先に作っている点

