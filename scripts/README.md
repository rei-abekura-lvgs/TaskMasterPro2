# データ移行スクリプト

PostgreSQLデータベースからAWS DynamoDB（AppSync）へのデータ移行スクリプトです。

## 準備

以下の環境変数が設定されていることを確認してください。

```
DATABASE_URL=...            # PostgreSQLの接続文字列
VITE_APPSYNC_ENDPOINT=...   # AWS AppSyncのエンドポイントURL
VITE_APPSYNC_API_KEY=...    # AWS AppSyncのAPIキー
VITE_AWS_REGION=...         # AWSリージョン（デフォルト: ap-northeast-1）
```

## スクリプト

このディレクトリには2種類のスクリプトがあります：

1. **migrate-to-dynamodb.js**: JavaScriptバージョン
2. **migrate-to-dynamodb.ts**: TypeScriptバージョン

## 実行方法

### TypeScriptバージョン（推奨）

```bash
npx tsx scripts/migrate-to-dynamodb.ts
```

### JavaScriptバージョン

```bash
node scripts/migrate-to-dynamodb.js
```

## 動作フロー

1. PostgreSQLデータベースからデータ（ユーザー、カテゴリー、タスク）を取得
2. AWS AppSync GraphQL APIを使用してDynamoDBにデータを登録
3. 各エンティティのマッピング（PostgreSQL ID → DynamoDB ID）を維持
4. 移行結果のログを出力

## 移行結果

スクリプト実行後、以下の移行結果が表示されます：

- 各エンティティの合計数、成功数、失敗数
- 失敗した場合のエラー詳細

## 注意点

- 既に移行済みのデータがある場合、重複エラーが発生することがあります。
- AWS AppSyncスキーマとPostgreSQLスキーマの互換性を確認してください。
- ユーザー認証情報（パスワードなど）は必要に応じて処理してください。