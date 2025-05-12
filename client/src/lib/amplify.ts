import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';

// GraphQLクライアント
let client: ReturnType<typeof generateClient>;

// 環境変数からAmplify設定を読み込む
export function configureAmplify() {
  // 開発環境と本番環境の両方で設定を適用
  Amplify.configure({
    // AppSync GraphQL API の設定
    API: {
      GraphQL: {
        endpoint: import.meta.env.VITE_APPSYNC_ENDPOINT || 'https://fnu22ygzgbc2zfa6ae5hfi6pvm.appsync-api.ap-northeast-1.amazonaws.com/graphql',
        region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1',
        defaultAuthMode: 'apiKey',
        apiKey: import.meta.env.VITE_APPSYNC_API_KEY || 'rdu6y63cwbgsnpq2wxuuzt7thq'
      }
    },
    // Auth設定
    Auth: {
      // 匿名アクセスを許可
      // 本番環境では適切な認証設定をする必要があります
      Cognito: {
        identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID || '',
        region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1'
      }
    }
  });
  
  // GraphQLクライアントを初期化
  client = generateClient();
}

// GraphQLクエリを実行する関数
export async function executeGraphQL(query: string, variables: Record<string, any> = {}) {
  try {
    if (!client) {
      // クライアントが初期化されていない場合は初期化
      configureAmplify();
      client = generateClient();
    }
    
    // GraphQLクエリを実行
    const response = await client.graphql({
      query,
      variables
    });
    
    return response.data;
  } catch (error) {
    console.error('Error executing GraphQL query:', error);
    
    // 開発環境では、AppSyncが使えない場合に備えてRESTful APIにフォールバック
    if (!import.meta.env.PROD) {
      console.log('Falling back to REST API...');
      // パスをクエリタイプから推測（単純化のため）
      const isQuery = query.includes('query');
      const isMutation = query.includes('mutation');
      const path = getPathFromQuery(query);
      
      const method = isMutation ? 'POST' : 'GET';
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      if (method === 'POST') {
        options.body = JSON.stringify(variables);
      }
      
      return fetch(`/api/${path}`, options).then(res => res.json());
    }
    
    throw error;
  }
}

// GraphQLクエリからAPIパスを推測（開発環境用）
function getPathFromQuery(query: string): string {
  if (query.includes('getTask(')) return 'tasks';
  if (query.includes('createTask') || query.includes('updateTask') || query.includes('deleteTask')) return 'tasks';
  if (query.includes('listTasks')) return 'tasks';
  if (query.includes('Category')) return 'categories';
  if (query.includes('User')) return 'users';
  
  return 'tasks'; // デフォルト
}