#!/bin/bash

# データ移行スクリプトを実行するシェルスクリプト

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 環境変数の確認
echo -e "${GREEN}環境変数の確認...${NC}"

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}エラー: DATABASE_URL 環境変数が設定されていません${NC}"
  exit 1
fi

if [ -z "$VITE_APPSYNC_ENDPOINT" ]; then
  echo -e "${RED}エラー: VITE_APPSYNC_ENDPOINT 環境変数が設定されていません${NC}"
  exit 1
fi

if [ -z "$VITE_APPSYNC_API_KEY" ]; then
  echo -e "${RED}エラー: VITE_APPSYNC_API_KEY 環境変数が設定されていません${NC}"
  exit 1
fi

# AWS リージョンのデフォルト値設定
if [ -z "$VITE_AWS_REGION" ]; then
  export VITE_AWS_REGION="ap-northeast-1"
  echo -e "${YELLOW}警告: VITE_AWS_REGION が設定されていないため、デフォルト値 'ap-northeast-1' を使用します${NC}"
fi

echo -e "${GREEN}設定OK: すべての必要な環境変数が設定されています${NC}"
echo -e "DATABASE_URL: $DATABASE_URL"
echo -e "VITE_APPSYNC_ENDPOINT: $VITE_APPSYNC_ENDPOINT"
echo -e "VITE_AWS_REGION: $VITE_AWS_REGION"
echo -e "VITE_APPSYNC_API_KEY: [機密情報のため非表示]"

# 実行確認
echo ""
echo -e "${YELLOW}警告: このスクリプトを実行すると、PostgreSQLからDynamoDBへデータ移行が開始されます。${NC}"
echo -e "${YELLOW}既存のデータがある場合、重複エラーが発生する可能性があります。${NC}"
read -p "続行しますか？ (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}操作がキャンセルされました${NC}"
  exit 1
fi

# TypeScriptバージョンの実行
echo ""
echo -e "${GREEN}移行プロセスを開始します...${NC}"
echo -e "${GREEN}TypeScriptバージョンのスクリプトを実行中...${NC}"
npx tsx scripts/migrate-to-dynamodb.ts

# 実行結果を保存
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}データ移行が完了しました！${NC}"
else
  echo -e "${RED}データ移行に失敗しました。エラーコード: $EXIT_CODE${NC}"
fi

exit $EXIT_CODE