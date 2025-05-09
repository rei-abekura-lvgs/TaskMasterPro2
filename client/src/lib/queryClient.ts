import { QueryClient, QueryFunction } from "@tanstack/react-query";

// APIのベースURLを環境に応じて調整
export function getApiBaseUrl(): string {
  // 開発環境またはローカル環境の場合は相対パスを使用
  if (window.location.hostname === 'localhost' || window.location.hostname.includes('replit.dev')) {
    return '';
  }
  
  // AWS Amplifyにデプロイされたときは、AppSyncのGraphQLエンドポイントを使用
  // 実際のアプリでは環境変数から取得する
  if (import.meta.env.VITE_APPSYNC_ENDPOINT) {
    return import.meta.env.VITE_APPSYNC_ENDPOINT;
  }
  
  // フォールバックとしてAPI Gatewayのベースパスを使用（もし設定されていれば）
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Amplifyの場合、Lambdaへのリレーが必要
  if (window.location.hostname.includes('amplifyapp.com')) {
    return 'https://api-relay.amplifyapp.com';
  }
  
  // デフォルトは空文字（相対パス）
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
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
