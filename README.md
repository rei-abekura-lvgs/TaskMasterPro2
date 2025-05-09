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

このアプリケーションはAWS Amplify + AppSync + DynamoDBを使用してデプロイできます。

1. GitHubリポジトリをAWS Amplifyに接続
2. 環境変数の設定:
   - `VITE_APPSYNC_ENDPOINT`: AppSync APIのエンドポイント
   - `VITE_APPSYNC_API_KEY`: AppSync APIキー
   - `VITE_AWS_REGION`: AWSリージョン（例：us-east-1, ap-northeast-1）
   - `VITE_IDENTITY_POOL_ID`: Cognito Identity Poolのプール ID（匿名アクセス有効）

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