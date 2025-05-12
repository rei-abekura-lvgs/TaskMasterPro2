/**
 * GraphQL APIに直接アクセスするためのシンプルなフェッチ関数
 * AWS SDK一切を使わずに直接HTTPリクエストを行います
 */

// 環境変数から認証情報を取得
const API_URL = import.meta.env.VITE_APPSYNC_ENDPOINT;
const API_KEY = import.meta.env.VITE_APPSYNC_API_KEY;

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
    // 参考: https://docs.aws.amazon.com/appsync/latest/devguide/security-authz.html#api-key-authorization
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      // API認証関連の追加ヘッダー - AWS AppSyncが期待する形式で設定
      'X-Api-Key': API_KEY, // 大文字形式も試す
      'Authorization': API_KEY // 別形式も試す
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