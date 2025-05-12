import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { type GraphQLResult } from '@aws-amplify/api-graphql';

// GraphQLクライアント
let client: ReturnType<typeof generateClient>;

// 環境変数からAmplify設定を読み込む
export function configureAmplify() {
  // 環境変数のチェック - 明示的に文字列として取得
  const apiEndpoint = import.meta.env.VITE_APPSYNC_ENDPOINT as string;
  const apiRegion = import.meta.env.VITE_AWS_REGION as string;
  const apiKey = import.meta.env.VITE_APPSYNC_API_KEY as string;
  
  console.log('Amplify設定: 環境変数の読み込み');
  console.log('- エンドポイント:', apiEndpoint || 'エンドポイントが設定されていません');
  console.log('- リージョン:', apiRegion || 'リージョンが設定されていません');
  console.log('- APIキー:', apiKey ? `APIキーが設定されています (${apiKey.substring(0, 4)}...)` : 'APIキーが設定されていません');
  
  if (!apiEndpoint || !apiRegion || !apiKey) {
    console.error('環境変数が適切に設定されていません。');
    console.error(`VITE_APPSYNC_ENDPOINT: ${apiEndpoint ? '設定済み' : '未設定'}`);
    console.error(`VITE_AWS_REGION: ${apiRegion ? '設定済み' : '未設定'}`);
    console.error(`VITE_APPSYNC_API_KEY: ${apiKey ? '設定済み' : '未設定'}`);
    return;
  }
  
  // Amplifyの設定
  try {
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
  } catch (error) {
    console.error('Amplify設定中にエラーが発生しました:', error);
  }
}

// GraphQLクエリを実行する関数
export async function executeGraphQL(query: string, variables: Record<string, any> = {}) {
  try {
    // APIキーを取得
    const apiKey = import.meta.env.VITE_APPSYNC_API_KEY as string;
    if (!apiKey) {
      console.error('APIキーが設定されていません。.env.localファイルに VITE_APPSYNC_API_KEY を設定してください。');
      throw new Error('APIキーが見つかりません');
    }
    
    if (!client) {
      // クライアントが初期化されていない場合は初期化
      configureAmplify();
    }
    
    // クライアントが存在するか再確認
    if (!client) {
      throw new Error('GraphQLクライアントの初期化に失敗しました');
    }
    
    // GraphQLクエリを実行
    console.log('AppSync GraphQLクエリを実行中...');
    console.log('- クエリ:', query.slice(0, 50) + '...');
    console.log('- 変数:', JSON.stringify(variables));
    
    // API呼び出しを直接実行
    const response = await client.graphql({
      query,
      variables,
      authMode: 'apiKey'
    });
    
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