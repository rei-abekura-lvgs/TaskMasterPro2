import { Amplify } from 'aws-amplify';

// 環境変数からAmplify設定を読み込む
export function configureAmplify() {
  // 本番環境の場合のみ設定を適用
  if (import.meta.env.PROD) {
    Amplify.configure({
      // API Gateway または AppSync の設定
      API: {
        REST: {
          todoAPI: {
            endpoint: import.meta.env.VITE_API_ENDPOINT || '',
            region: import.meta.env.VITE_AWS_REGION || 'us-east-1'
          }
        }
      },
      // 必要に応じて追加設定を行います
      // Auth, Storage, Analytics など
    });
  }
}

// API Gateway を使用してAPIを呼び出す関数
export async function callAPI(path: string, options: RequestInit = {}) {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  // 本番環境ではAmplify APIを使用し、開発環境では直接Fetchを使用
  if (import.meta.env.PROD) {
    try {
      // @ts-ignore
      const { API } = await import('aws-amplify');
      const apiName = 'todoAPI';
      const response = await API.endpoint.get(apiName, path, options);
      return response;
    } catch (error) {
      console.error('Error calling Amplify API:', error);
      throw error;
    }
  } else {
    // 開発環境では直接Fetchを使用
    return fetch(path, defaultOptions);
  }
}