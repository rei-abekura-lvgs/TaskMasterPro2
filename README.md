# モダンTODOアプリケーション

クラウドネイティブ技術を活用した、動的でユーザーフレンドリーなタスク管理アプリケーションです。

## 主な機能

- タスクの追加・編集・削除
- カテゴリによるタスク整理
- 優先度の設定とカラー表示
- 期限日の設定と管理
- タスク完了状態の管理
- レスポンシブデザイン

## 技術スタック

- **フロントエンド**: React, TypeScript, TailwindCSS, ShadcnUI
- **バックエンド**: Node.js, Express
- **データベース**: PostgreSQL with Drizzle ORM
- **デプロイ**: AWS Amplify

## デプロイ方法

このアプリケーションはAWS Amplifyを使用してデプロイできます。

1. GitHubリポジトリをAWS Amplifyに接続
2. 環境変数の設定:
   - `DATABASE_URL`: PostgreSQLデータベースの接続文字列
   - `VITE_API_ENDPOINT`: APIエンドポイントのURL
   - `VITE_AWS_REGION`: AWSリージョン

## ローカル開発

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# データベースの初期化
npm run db:push
```

## ライセンス

MIT