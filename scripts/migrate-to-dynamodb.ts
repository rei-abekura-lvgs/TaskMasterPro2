/**
 * PostgreSQLからAWS DynamoDBへのデータ移行スクリプト（TypeScript版）
 * 
 * このスクリプトは以下のステップを実行します：
 * 1. PostgreSQLのデータを読み込む
 * 2. AWS AppSync GraphQL APIを使用してDynamoDBにデータを登録
 * 3. 移行ログを出力
 * 
 * 実行方法：
 * $ npx tsx scripts/migrate-to-dynamodb.ts
 */

import dotenv from 'dotenv';
import pg from 'pg';
import fetch from 'node-fetch';

const { Pool } = pg;
type PoolClient = pg.PoolClient;

dotenv.config();

// データ型定義
interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  createdAt?: Date;
}

interface Category {
  id: number;
  name: string;
  userId: number;
  createdAt?: Date;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  dueDate?: Date;
  categoryId?: number;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  userId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// GraphQL入力型定義
interface CreateUserInput {
  username: string;
  email: string;
  displayName?: string;
}

interface CreateCategoryInput {
  name: string;
  ownerId: string;  // User IDへの参照
}

interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  completed: boolean;
  categoryId?: string;  // Category IDへの参照
  ownerId: string;  // User IDへの参照
}

// 移行ログ型定義
interface MigrationLog {
  users: {
    total: number;
    migrated: number;
    failed: number;
    errors: Array<{ id: number; error: string }>;
  };
  categories: {
    total: number;
    migrated: number;
    failed: number;
    errors: Array<{ id: number; error: string }>;
  };
  tasks: {
    total: number;
    migrated: number;
    failed: number;
    errors: Array<{ id: number; error: string }>;
  };
}

// GraphQL変異操作
const CREATE_USER = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      username
      email
      displayName
      createdAt
      updatedAt
    }
  }
`;

const CREATE_CATEGORY = `
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      name
      owner {
        id
      }
      createdAt
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
      category {
        id
      }
      owner {
        id
      }
      createdAt
      updatedAt
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
async function executeGraphQL<T>(query: string, variables: any): Promise<T> {
  try {
    console.log('GraphQLリクエスト送信先:', appSyncConfig.aws_appsync_graphqlEndpoint);
    console.log('APIキー使用:', appSyncConfig.aws_appsync_apiKey ? '設定されています' : '設定されていません');
    console.log('リクエストの詳細:', { query: query.substring(0, 50) + '...', variables });
    
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': appSyncConfig.aws_appsync_apiKey as string
    };
    
    console.log('リクエストヘッダー:', Object.keys(headers));
    
    const res = await fetch(appSyncConfig.aws_appsync_graphqlEndpoint as string, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    console.log('GraphQLレスポンスステータス:', res.status, res.statusText);
    
    if (!res.ok) {
      console.error(`HTTPエラー: ${res.status} ${res.statusText}`);
      const errorText = await res.text();
      console.error('エラーレスポンス:', errorText);
      throw new Error(`HTTPエラー: ${res.status} ${res.statusText}`);
    }

    const result = await res.json() as { data?: T; errors?: any[] };
    
    if (result.errors) {
      console.error('GraphQL エラー:', JSON.stringify(result.errors, null, 2));
      throw new Error('GraphQL 操作に失敗しました');
    }
    
    if (!result.data) {
      console.error('GraphQLレスポンスにデータがありません:', result);
      throw new Error('GraphQLレスポンスにデータがありません');
    }
    
    return result.data as T;
  } catch (error) {
    console.error('GraphQL リクエストエラー:', error);
    throw error;
  }
}

// PostgreSQLからデータを取得する関数
async function fetchPostgresData(): Promise<{ users: User[]; categories: Category[]; tasks: Task[] }> {
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
async function migrateDataToDynamoDB(
  data: { users: User[]; categories: Category[]; tasks: Task[] }
): Promise<MigrationLog> {
  const { users, categories, tasks } = data;
  const migrationLog: MigrationLog = {
    users: { total: users.length, migrated: 0, failed: 0, errors: [] },
    categories: { total: categories.length, migrated: 0, failed: 0, errors: [] },
    tasks: { total: tasks.length, migrated: 0, failed: 0, errors: [] },
  };
  
  // ユーザーマッピング（PostgreSQL ID → DynamoDB ID）
  const userIdMapping: Record<number, string> = {};
  const categoryIdMapping: Record<number, string> = {};
  
  // ユーザー移行
  console.log(`ユーザー移行開始 (${users.length} 件)...`);
  for (const user of users) {
    try {
      const input: CreateUserInput = {
        username: user.username,
        email: user.email,
      };
      
      const result = await executeGraphQL<{ createUser: { id: string } }>(CREATE_USER, { input });
      userIdMapping[user.id] = result.createUser.id;
      migrationLog.users.migrated++;
      console.log(`ユーザー移行成功: ${user.username} (${user.id} -> ${result.createUser.id})`);
    } catch (error: any) {
      migrationLog.users.failed++;
      migrationLog.users.errors.push({ id: user.id, error: error.message });
      console.error(`ユーザー移行失敗: ${user.username} (${user.id})`, error.message);
    }
  }
  
  // カテゴリー移行
  console.log(`カテゴリー移行開始 (${categories.length} 件)...`);
  for (const category of categories) {
    try {
      if (category.userId === undefined) {
        throw new Error('カテゴリーのuserIdが未定義です');
      }
      
      // ユーザーIDマッピングがない場合は直接文字列に変換
      const ownerId = category.userId.toString();
      
      const input: CreateCategoryInput = {
        name: category.name,
        ownerId,
      };
      
      console.log(`カテゴリー登録試行: ${category.name}, ownerId=${ownerId}`);
      
      const result = await executeGraphQL<{ createCategory: { id: string } }>(CREATE_CATEGORY, { input });
      
      if (result && result.createCategory && result.createCategory.id) {
        categoryIdMapping[category.id] = result.createCategory.id;
        migrationLog.categories.migrated++;
        console.log(`カテゴリー移行成功: ${category.name} (${category.id} -> ${result.createCategory.id})`);
      } else {
        throw new Error('カテゴリー登録に失敗しました: レスポンスにIDがありません');
      }
    } catch (error: any) {
      migrationLog.categories.failed++;
      migrationLog.categories.errors.push({ id: category.id, error: error.message });
      console.error(`カテゴリー移行失敗: ${category.name} (${category.id})`, error.message);
    }
  }
  
  // タスク移行
  console.log(`タスク移行開始 (${tasks.length} 件)...`);
  for (const task of tasks) {
    try {
      if (task.userId === undefined) {
        throw new Error('タスクのuserIdが未定義です');
      }
    
      // プリオリティを大文字に変換（DynamoDBスキーマ要件）
      const priority = task.priority ? task.priority.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' : 'MEDIUM';
      
      // カテゴリIDとオーナーIDを単純に文字列化
      const categoryId = task.categoryId ? task.categoryId.toString() : undefined;
      const ownerId = task.userId.toString();
      
      console.log(`タスク登録試行: ${task.title}, ownerId=${ownerId}, categoryId=${categoryId || 'なし'}`);
      
      const input: CreateTaskInput = {
        title: task.title,
        description: task.description,
        dueDate: task.dueDate ? (typeof task.dueDate === 'string' ? task.dueDate : task.dueDate.toISOString().split('T')[0]) : undefined,
        priority,
        completed: task.completed,
        categoryId,
        ownerId,
      };
      
      console.log('タスク入力データ:', JSON.stringify(input, null, 2));
      
      const result = await executeGraphQL<{ createTask: { id: string } }>(CREATE_TASK, { input });
      
      if (result && result.createTask && result.createTask.id) {
        migrationLog.tasks.migrated++;
        console.log(`タスク移行成功: ${task.title} (${task.id} -> ${result.createTask.id})`);
      } else {
        throw new Error('タスク登録に失敗しました: レスポンスにIDがありません');
      }
    } catch (error: any) {
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
    
    // 環境変数の確認
    console.log('=== 環境変数の確認 ===');
    console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '設定されています' : '設定されていません');
    console.log('- VITE_APPSYNC_ENDPOINT:', process.env.VITE_APPSYNC_ENDPOINT || 'なし');
    console.log('- VITE_AWS_REGION:', process.env.VITE_AWS_REGION || 'なし');
    console.log('- VITE_APPSYNC_API_KEY:', process.env.VITE_APPSYNC_API_KEY ? '設定されています' : '設定されていません');
    
    // .env.localの読み込み確認
    console.log('\n.env.localファイルからの読み込みを確認します...');
    dotenv.config({ path: '.env.local' });
    console.log('- VITE_APPSYNC_ENDPOINT (.env.local):', process.env.VITE_APPSYNC_ENDPOINT || 'なし');
    console.log('- VITE_AWS_REGION (.env.local):', process.env.VITE_AWS_REGION || 'なし');
    console.log('- VITE_APPSYNC_API_KEY (.env.local):', process.env.VITE_APPSYNC_API_KEY ? '設定されています' : '設定されていません');
    
    // AppSync設定の確認
    console.log('\nAppSync設定:');
    console.log('- エンドポイント:', appSyncConfig.aws_appsync_graphqlEndpoint || 'なし');
    console.log('- リージョン:', appSyncConfig.aws_appsync_region || 'なし');
    console.log('- 認証タイプ:', appSyncConfig.aws_appsync_authenticationType || 'なし');
    console.log('- APIキー:', appSyncConfig.aws_appsync_apiKey ? '設定されています' : '設定されていません');
    
    // PostgreSQLからデータを取得
    console.log('\nPostgreSQLからデータを取得中...');
    const data = await fetchPostgresData();
    console.log(`取得完了: ユーザー ${data.users.length} 件, カテゴリー ${data.categories.length} 件, タスク ${data.tasks.length} 件`);
    
    // DynamoDBにデータを移行
    console.log('\nDynamoDBにデータを移行中...');
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