/**
 * PostgreSQLからAWS DynamoDBへのデータ移行スクリプト
 * 
 * このスクリプトは以下のステップを実行します：
 * 1. PostgreSQLのデータを読み込む
 * 2. AWS AppSync GraphQL APIを使用してDynamoDBにデータを登録
 * 3. 移行ログを出力
 * 
 * 実行方法：
 * $ node scripts/migrate-to-dynamodb.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { Amplify } = require('aws-amplify');
const fetch = require('node-fetch');

// GraphQL変異操作
const CREATE_USER = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      username
      email
    }
  }
`;

const CREATE_CATEGORY = `
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      name
      ownerId
    }
  }
`;

const CREATE_TASK = `
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
      title
      description
      dueDate
      priority
      completed
      categoryId
    }
  }
`;

// 環境変数の確認
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL環境変数が設定されていません');
  process.exit(1);
}

if (!process.env.VITE_APPSYNC_ENDPOINT || !process.env.VITE_APPSYNC_API_KEY) {
  console.error('VITE_APPSYNC_ENDPOINT または VITE_APPSYNC_API_KEY 環境変数が設定されていません');
  process.exit(1);
}

// AWS AppSync設定
const appSyncConfig = {
  aws_appsync_graphqlEndpoint: process.env.VITE_APPSYNC_ENDPOINT,
  aws_appsync_region: process.env.VITE_AWS_REGION || 'ap-northeast-1',
  aws_appsync_authenticationType: 'API_KEY',
  aws_appsync_apiKey: process.env.VITE_APPSYNC_API_KEY,
};

// データベース接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GraphQL API呼び出し関数
async function executeGraphQL(query, variables) {
  try {
    const res = await fetch(appSyncConfig.aws_appsync_graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': appSyncConfig.aws_appsync_apiKey,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const result = await res.json();
    
    if (result.errors) {
      console.error('GraphQL エラー:', JSON.stringify(result.errors, null, 2));
      throw new Error('GraphQL 操作に失敗しました');
    }
    
    return result.data;
  } catch (error) {
    console.error('GraphQL リクエストエラー:', error);
    throw error;
  }
}

// PostgreSQLからデータを取得する関数
async function fetchPostgresData() {
  const client = await pool.connect();
  try {
    // ユーザー取得
    const userResult = await client.query('SELECT * FROM users');
    const users = userResult.rows;
    
    // カテゴリー取得
    const categoryResult = await client.query('SELECT * FROM categories');
    const categories = categoryResult.rows;
    
    // タスク取得
    const taskResult = await client.query('SELECT * FROM tasks');
    const tasks = taskResult.rows;
    
    return { users, categories, tasks };
  } finally {
    client.release();
  }
}

// DynamoDBにデータを移行する関数
async function migrateDataToDynamoDB(data) {
  const { users, categories, tasks } = data;
  const migrationLog = {
    users: { total: users.length, migrated: 0, failed: 0, errors: [] },
    categories: { total: categories.length, migrated: 0, failed: 0, errors: [] },
    tasks: { total: tasks.length, migrated: 0, failed: 0, errors: [] },
  };
  
  // ユーザーマッピング（PostgreSQL ID → DynamoDB ID）
  const userIdMapping = {};
  const categoryIdMapping = {};
  
  // ユーザー移行
  console.log(`ユーザー移行開始 (${users.length} 件)...`);
  for (const user of users) {
    try {
      const input = {
        username: user.username,
        email: user.email,
        // 実際のスキーマに合わせて他のフィールドも追加
      };
      
      const result = await executeGraphQL(CREATE_USER, { input });
      userIdMapping[user.id] = result.createUser.id;
      migrationLog.users.migrated++;
      console.log(`ユーザー移行成功: ${user.username} (${user.id} -> ${result.createUser.id})`);
    } catch (error) {
      migrationLog.users.failed++;
      migrationLog.users.errors.push({ id: user.id, error: error.message });
      console.error(`ユーザー移行失敗: ${user.username} (${user.id})`, error.message);
    }
  }
  
  // カテゴリー移行
  console.log(`カテゴリー移行開始 (${categories.length} 件)...`);
  for (const category of categories) {
    try {
      const ownerId = userIdMapping[category.userId] || category.userId.toString();
      
      const input = {
        name: category.name,
        ownerId: ownerId,
      };
      
      const result = await executeGraphQL(CREATE_CATEGORY, { input });
      categoryIdMapping[category.id] = result.createCategory.id;
      migrationLog.categories.migrated++;
      console.log(`カテゴリー移行成功: ${category.name} (${category.id} -> ${result.createCategory.id})`);
    } catch (error) {
      migrationLog.categories.failed++;
      migrationLog.categories.errors.push({ id: category.id, error: error.message });
      console.error(`カテゴリー移行失敗: ${category.name} (${category.id})`, error.message);
    }
  }
  
  // タスク移行
  console.log(`タスク移行開始 (${tasks.length} 件)...`);
  for (const task of tasks) {
    try {
      const categoryId = task.categoryId ? (categoryIdMapping[task.categoryId] || task.categoryId.toString()) : null;
      
      // プリオリティを大文字に変換（DynamoDBスキーマ要件）
      const priority = task.priority ? task.priority.toUpperCase() : 'MEDIUM';
      
      const input = {
        title: task.title,
        description: task.description || '',
        dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : null,
        priority: priority,
        completed: task.completed || false,
        categoryId: categoryId,
        // 実際のスキーマに合わせて他のフィールドも追加
      };
      
      const result = await executeGraphQL(CREATE_TASK, { input });
      migrationLog.tasks.migrated++;
      console.log(`タスク移行成功: ${task.title} (${task.id} -> ${result.createTask.id})`);
    } catch (error) {
      migrationLog.tasks.failed++;
      migrationLog.tasks.errors.push({ id: task.id, error: error.message });
      console.error(`タスク移行失敗: ${task.title} (${task.id})`, error.message);
    }
  }
  
  return migrationLog;
}

// メイン関数
async function main() {
  try {
    console.log('PostgreSQLからAWS DynamoDBへの移行を開始します...');
    
    // PostgreSQLからデータを取得
    console.log('PostgreSQLからデータを取得中...');
    const data = await fetchPostgresData();
    console.log(`取得完了: ユーザー ${data.users.length} 件, カテゴリー ${data.categories.length} 件, タスク ${data.tasks.length} 件`);
    
    // DynamoDBにデータを移行
    console.log('DynamoDBにデータを移行中...');
    const migrationLog = await migrateDataToDynamoDB(data);
    
    // 移行結果のサマリを表示
    console.log('\n=== 移行結果 ===');
    console.log(`ユーザー: 合計 ${migrationLog.users.total} 件, 成功 ${migrationLog.users.migrated} 件, 失敗 ${migrationLog.users.failed} 件`);
    console.log(`カテゴリー: 合計 ${migrationLog.categories.total} 件, 成功 ${migrationLog.categories.migrated} 件, 失敗 ${migrationLog.categories.failed} 件`);
    console.log(`タスク: 合計 ${migrationLog.tasks.total} 件, 成功 ${migrationLog.tasks.migrated} 件, 失敗 ${migrationLog.tasks.failed} 件`);
    
    // エラーログの詳細表示
    if (migrationLog.users.failed > 0) {
      console.log('\nユーザー移行エラー:');
      console.log(JSON.stringify(migrationLog.users.errors, null, 2));
    }
    
    if (migrationLog.categories.failed > 0) {
      console.log('\nカテゴリー移行エラー:');
      console.log(JSON.stringify(migrationLog.categories.errors, null, 2));
    }
    
    if (migrationLog.tasks.failed > 0) {
      console.log('\nタスク移行エラー:');
      console.log(JSON.stringify(migrationLog.tasks.errors, null, 2));
    }
    
    console.log('\n移行が完了しました。');
  } catch (error) {
    console.error('移行中にエラーが発生しました:', error);
    process.exit(1);
  } finally {
    // データベース接続終了
    await pool.end();
  }
}

// スクリプト実行
main();