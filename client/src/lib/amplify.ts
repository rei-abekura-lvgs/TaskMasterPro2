import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { type GraphQLResult } from '@aws-amplify/api-graphql';

// GraphQLクライアント
let client: ReturnType<typeof generateClient>;

// 環境変数からAmplify設定を読み込む
export function configureAmplify() {
  // 環境変数のチェック
  const apiEndpoint = import.meta.env.VITE_APPSYNC_ENDPOINT;
  const apiRegion = import.meta.env.VITE_AWS_REGION;
  const apiKey = import.meta.env.VITE_APPSYNC_API_KEY;
  
  console.log('Amplify設定: 環境変数の読み込み');
  console.log('- エンドポイント:', apiEndpoint || 'エンドポイントが設定されていません');
  console.log('- リージョン:', apiRegion || 'リージョンが設定されていません');
  console.log('- APIキー:', apiKey ? 'APIキーが設定されています' : 'APIキーが設定されていません');
  
  // Amplifyの設定
  Amplify.configure({
    API: {
      GraphQL: {
        endpoint: apiEndpoint,
        region: apiRegion,
        defaultAuthMode: 'apiKey',
        apiKey: apiKey
      }
    }
  });
  
  // 明示的に認証モードを指定してGraphQLクライアントを初期化
  client = generateClient({
    authMode: 'apiKey',
    apiKey: apiKey,
    // ヘッダーを追加して認証情報を含める
    additionalHeaders: {
      'x-api-key': apiKey
    }
  });
  
  console.log('Amplify設定が完了しました！');
}

// GraphQLクエリを実行する関数
export async function executeGraphQL(query: string, variables: Record<string, any> = {}) {
  try {
    // APIキーを取得
    const apiKey = import.meta.env.VITE_APPSYNC_API_KEY;
    if (!apiKey) {
      console.error('APIキーが設定されていません。.env.localファイルに VITE_APPSYNC_API_KEY を設定してください。');
      throw new Error('APIキーが見つかりません');
    }
    
    if (!client) {
      // クライアントが初期化されていない場合は初期化
      configureAmplify();
      // 明示的にAPIキーを指定して初期化
      client = generateClient({
        authMode: 'apiKey',
        apiKey: apiKey
      });
    }
    
    // GraphQLクエリを実行
    console.log('AppSync GraphQLクエリを実行中...');
    console.log('- APIキー:', apiKey ? '設定されています' : '未設定');
    
    // APIキーを含むオプション
    const options = {
      query,
      variables,
      authMode: 'apiKey' as const,
      authToken: apiKey,
    };
    
    const response = await client.graphql(options);
    
    console.log('AppSync GraphQL結果:', response);
    
    if ('data' in response) {
      return response.data;
    } else {
      console.error('GraphQL response has no data property:', response);
      return null;
    }
  } catch (error) {
    console.error('Error executing GraphQL query:', error);
    throw error;
  }
}