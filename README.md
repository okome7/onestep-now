# OneStep Now

> **「考える前に、1歩やる」** —— 行動のハードルを極限まで下げ、最初の一歩を強制的に踏み出させる“行動開始専用”アプリ。

---

## 🌟 コンセプト：OneStep Now 改善版設計

「やる気があっても動けない」「SNSが集中を邪魔する」といった課題を解決し、**迷わずすぐ行動できるUI**に特化した設計です。

### 解決方法：1つだけ

- **即実行 × 心理的制限 × 後から報酬**
- やることを1つに絞り、迷いを消して即行動につなげる。
- **Web版の工夫**: 強制ロックの代わりに、実行中は「集中モード専用画面」以外を見られないUIを採用し、心理的な脱線を防ぎます。
- **応援が報酬**: 完了後のみ、他ユーザーとの交流を解放。行動しただけが「応援」を受け取れる仕組みです。

---

## 🏗 開発・運用コマンド (Docker)

### 🚀 常用コマンド

| 操作                 | コマンド                                           |
| :------------------- | :------------------------------------------------- |
| **開発開始（起動）** | `docker compose up -d`                             |
| **開発終了（停止）** | `docker compose down`                              |
| **ログの確認**       | `docker compose logs -f`                           |
| **再起動**           | `docker compose restart`                           |
| **DB変更の反映**     | `docker compose exec backend bin/rails db:migrate` |

### 🛠 セットアップ・変更時

| 操作              | コマンド                                           |
| :---------------- | :------------------------------------------------- |
| **ビルド・起動**  | `docker compose up -d --build`                     |
| **初期DB構築**    | `docker compose exec backend bin/rails db:prepare` |
| **backendに入る** | `docker compose exec backend bash`                 |
| **テスト実行**    | `docker compose exec backend bundle exec rspec`    |

### 🧪 E2Eテスト (Playwright)

E2Eテストはルートディレクトリの Playwright 設定で、Rails API と Vite フロントエンドを起動して実行します。

#### ローカル実行

事前に Node.js 依存関係、Frontend 依存関係、Backend の gem、Playwright ブラウザをインストールしてください。

```bash
npm ci
npm --prefix frontend ci
cd backend && bundle install && cd ..
npx playwright install
npm run test:e2e
```

ローカル実行時は `scripts/start-rails-e2e.mjs` が `RAILS_ENV=test` で `backend/bin/rails db:prepare` を実行し、Rails を `127.0.0.1:3001` で起動します。Frontend は Vite を `127.0.0.1:5173` で起動します。

#### Docker 実行

Ruby gem や PostgreSQL をホストに用意しない場合、または `npx playwright install` が CDN の 403 などで失敗する環境では、ブラウザ同梱の Playwright 公式イメージを使って実行してください。

```bash
docker compose up -d --build backend frontend
npm run test:e2e:docker
```

Docker 上で Playwright 設定から開発サーバーも起動したい場合は、次のように実行できます。

```bash
E2E_USE_DOCKER=1 npm run test:e2e
```

既に別プロセスや Docker Compose でサーバーを起動済みの場合は、以下の環境変数で接続先を指定できます。

```bash
E2E_SKIP_WEBSERVER=1 \
BASE_URL=http://127.0.0.1:5173 \
E2E_BACKEND_URL=http://127.0.0.1:3000 \
npm run test:e2e
```

### パスワード再設定メールの送信設定

実際にメールを送信する場合は、backendにSMTP用の環境変数を設定してください。

```bash
MAIL_FROM=no-reply@example.com
SMTP_ADDRESS=smtp.example.com
SMTP_PORT=587
SMTP_DOMAIN=example.com
SMTP_USERNAME=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_AUTHENTICATION=plain
SMTP_ENABLE_STARTTLS_AUTO=true
```

SMTP設定がない場合、再設定コードの発行APIは動きますが、実際のメール配送は行われません。

---

## 🛠 技術スタック

### Frontend (frontend/)

- **Framework**: React 19 (Vite 8)
- **Language**: TypeScript 6.x
- **UI**: Tailwind CSS, React Router

### Backend (backend/)

- **Framework**: Ruby on Rails 7.2 (API Mode)
- **Database**: PostgreSQL 16
- **Auth**: JWT / Tokenベース認証

---

## 📋 第1弾 (MVP) 実装機能

1. **認証**: 新規登録、ログイン、自動ログイン。
2. **タスク1件管理**: 常に「今やる1件」に集中。完了まで新規作成不可。
3. **やります宣言**: 開始時刻を記録し、集中モード画面へ遷移。
4. **集中モード**: タイマーと「できた」ボタンのみの最小UIで脱線を防止。
5. **完了・報酬**: 達成アニメーション後、5分限定のフィードを解放。
6. **フィードと交流**:
   - 他ユーザーの「やります」「できた」投稿の閲覧。
   - いいね・コメントによる応援機能。
   - 5分経過で自動的にフィード閲覧が終了し、次の行動へ誘導。

---

## 📂 ディレクトリ構成

```text
.
├── backend/            # Rails API 本体
├── frontend/           # React 本体
├── .github/            # CI (GitHub Actions) 設定
├── docker-compose.yml  # 全サービスを繋ぐ設定
└── README.md           # プロジェクト全体設計図
```
