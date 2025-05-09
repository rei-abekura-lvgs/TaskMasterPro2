import { QueryClient, QueryFunction } from "@tanstack/react-query";

// APIのベースURLを環境に応じて調整
export function getApiBaseUrl(): string {
  console.log('Getting API base URL. Hostname:', window.location.hostname);
  
  // 開発環境またはローカル環境の場合は相対パスを使用
  if (window.location.hostname === 'localhost' || window.location.hostname.includes('replit.dev')) {
    console.log('Development environment detected - using relative paths');
    return '';
  }
  
  // AWS Amplifyにデプロイされた場合
  if (window.location.hostname.includes('amplifyapp.com')) {
    // AppSyncのGraphQLエンドポイントが設定されている場合はそれを使用
    if (import.meta.env.VITE_APPSYNC_ENDPOINT) {
      console.log('Using AppSync endpoint:', import.meta.env.VITE_APPSYNC_ENDPOINT);
      return import.meta.env.VITE_APPSYNC_ENDPOINT;
    }
    
    // APIがローカルかAmplifyホスティングと同じOriginにない場合は
    // 明示的にAPI URLを指定する必要があります
    
    // 開発中は一時的に開発サーバーURLを使う（プロダクションでは修正が必要）
    console.log('WARNING: No API endpoint configured. Using development API temporarily.');
    // Replitの開発サーバーURL - 本番環境ではこれを適切なAPIエンドポイントに変更する必要があります
    return 'https://b0c7db00-877b-471b-ba3d-bb7c9b15bfe2-00-1luv00rqdwdf4.pike.replit.dev';
  }
  
  // カスタムAPIのベースURLが設定されている場合はそれを使用
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('Using custom API base URL:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // デフォルトは空文字（相対パス）- フォールバック
  console.log('Using default relative path for API calls');
  return '';
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // 本番環境と開発環境でURLを適切に処理
  const baseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith('/api/') && baseUrl 
    ? `${baseUrl}${url}` 
    : url;
  
  console.log(`API Request to: ${fullUrl}`);
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // ベースURLを取得
    const baseUrl = getApiBaseUrl();
    const url = queryKey[0] as string;
    
    // 本番環境と開発環境でURLを適切に処理
    const fullUrl = url.startsWith('/api/') && baseUrl 
      ? `${baseUrl}${url}` 
      : url;
    
    console.log(`Query to: ${fullUrl}`);
    
    try {
      const res = await fetch(fullUrl, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
      
      // レスポンスのテキストを取得
      const text = await res.text();
      
      // JSONでない場合のエラーハンドリング
      if (!res.ok) {
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
      
      // 空のレスポンスの場合は空のオブジェクトを返す
      if (!text) {
        return {} as any;
      }
      
      // JSONをパース
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse JSON:', text.substring(0, 100));
        throw new Error('Invalid JSON response');
      }
    } catch (error) {
      console.error(`API query error for ${fullUrl}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // 自動更新の設定 - コスト削減のために頻度を下げる
      refetchInterval: 30000, // 30秒ごとに自動更新（大幅に頻度を下げる）
      refetchIntervalInBackground: false, // バックグラウンドでは更新しない
      refetchOnMount: "stale", // 古いデータの場合のみマウント時に更新
      refetchOnWindowFocus: false, // ウィンドウフォーカス時の自動更新をオフ
      refetchOnReconnect: "stale", // ネットワーク再接続時は古いデータのみ更新
      
      // キャッシュの設定 - 長期間キャッシュを維持
      staleTime: 60 * 1000, // データは1分間は新鮮とみなす
      gcTime: 5 * 60 * 1000, // 5分間キャッシュを維持
      
      // エラー設定
      retry: 2, // エラー時の再試行回数を減らす
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // 最大10秒までの指数バックオフ
    },
    mutations: {
      retry: 1, // 変更操作は1回だけリトライ
    },
  },
});
