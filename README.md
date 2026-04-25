# OneStep Now

> **「考える前に、1歩やる」** —— 行動のハードルを極限まで下げ、最初の一歩を強制的に踏み出させる“行動開始専用”アプリ。

---

## 🌟 コンセプト：OneStep Now 改善版設計

「やる気があっても動けない」「SNSが集中を邪魔する」といった課題を解決し、**迷わずすぐ行動できるUI**に特化した設計です。

### 解決方法：1つだけ

- **即実行 × 心理的制限 × 後から報酬**
- やることを1つに絞り、迷いを消して即行動につなげる。
- **Web版の工夫**: 強制ロックの代わりに、実行中は「集中モード専用画面」以外を見られないUIを採用し、心理的な脱線を防ぎます。
- **応援が報酬**: 完了後のみ、他ユーザーとの交流を解放。行動した人だけが「応援」を受け取れる仕組みです。

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
   - **いいね・コメントによる応援機能**。
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
