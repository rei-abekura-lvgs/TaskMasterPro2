/**
 * GraphQL APIに直接アクセスするためのシンプルなフェッチ関数
 * AWS SDK一切を使わずに直接HTTPリクエストを行います
 */

// 環境変数から認証情報を取得
// 注意: 環境変数が変更された場合、Viteの再起動が必要な場合があります
const API_URL = import.meta.env.VITE_APPSYNC_ENDPOINT as string;
const API_KEY = import.meta.env.VITE_APPSYNC_API_KEY as string;

/**
 * GraphQLクエリを実行する単純なフェッチ関数
 * AWS SDKを使わずに直接HTTPリクエストを行う
 */
export async function fetchGraphQL(query: string, variables: Record<string, any> = {}) {
  if (!API_URL) {
    throw new Error('GraphQL API URLが設定されていません。環境変数VITE_APPSYNC_ENDPOINTを確認してください。');
  }

  if (!API_KEY) {
    throw new Error('GraphQL API Keyが設定されていません。環境変数VITE_APPSYNC_API_KEYを確認してください。');
  }

  // デバッグ用のログ
  console.log('GraphQL API直接呼び出し');
  console.log(`API URL: ${API_URL}`);
  console.log(`API KEY: ${API_KEY.substring(0, 4)}...`);
  console.log(`Query: ${query.substring(0, 50)}...`);
  console.log(`Variables: ${JSON.stringify(variables)}`);

  try {
    // AWS AppSyncのAPI呼び出しに必要なヘッダーを設定
    // AppSync API Keyは 'x-api-key' ヘッダーで送信する必要がある
    // 参考: https://docs.aws.amazon.com/appsync/latest/devguide/security-authz.html#api-key-authorization
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY // 標準的なAWS AppSync API Key形式のヘッダー
    };
    
    console.log('APIヘッダー:', Object.keys(headers));
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables
      })
    });

    // レスポンスが正常でない場合
    if (!response.ok) {
      console.error('GraphQL API呼び出しに失敗しました:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('エラーレスポンス:', errorText);
      throw new Error(`GraphQL API呼び出しに失敗: ${response.status} ${response.statusText}`);
    }

    // レスポンスをJSONとして解析
    const result = await response.json();
    console.log('GraphQL API呼び出し結果:', result);

    // エラーがある場合
    if (result.errors) {
      console.error('GraphQLエラー:', result.errors);
      throw new Error(`GraphQLエラー: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  } catch (error) {
    console.error('GraphQL API呼び出し中の例外:', error);
    throw error;
  }
}