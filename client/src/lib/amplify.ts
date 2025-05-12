import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { type GraphQLResult } from '@aws-amplify/api-graphql';

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
    throw error;
  }
}