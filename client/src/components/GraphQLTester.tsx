import { useState } from 'react';
import { fetchGraphQL } from '@/lib/graphqlFetch';

export default function GraphQLTester() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 基本的なクエリテスト
  const testListQuery = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const query = `
        query ListUsers {
          listUsers {
            items {
              id
              username
              email
            }
          }
        }
      `;
      
      const data = await fetchGraphQL(query);
      setResult(data);
    } catch (err: any) {
      console.error('GraphQLテスト中のエラー:', err);
      setError(err.message || 'GraphQLクエリの実行中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };
  
  // APIキーのチェック
  const checkApiKey = () => {
    const apiUrl = import.meta.env.VITE_APPSYNC_ENDPOINT;
    const apiKey = import.meta.env.VITE_APPSYNC_API_KEY;
    const region = import.meta.env.VITE_AWS_REGION;
    
    if (!apiUrl || !apiKey || !region) {
      setError('環境変数が正しく設定されていません');
      return false;
    }
    
    setResult({
      apiUrl: apiUrl,
      apiKey: `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`,
      region: region
    });
    
    return true;
  };
  
  // 手動HTTPリクエスト
  const testDirectFetch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = import.meta.env.VITE_APPSYNC_ENDPOINT;
      const apiKey = import.meta.env.VITE_APPSYNC_API_KEY;
      
      if (!apiUrl || !apiKey) {
        throw new Error('API設定が見つかりません');
      }
      
      const query = `
        query {
          __schema {
            queryType {
              name
            }
          }
        }
      `;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ query })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error('直接フェッチ中のエラー:', err);
      setError(err.message || '直接HTTPリクエスト中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <h2 className="text-xl font-bold mb-4">GraphQL API テスター</h2>
      
      <div className="flex gap-2 mb-4">
        <button 
          onClick={checkApiKey}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={loading}
        >
          環境変数チェック
        </button>
        
        <button 
          onClick={testListQuery}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={loading}
        >
          ListUsersクエリテスト
        </button>
        
        <button 
          onClick={testDirectFetch}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          disabled={loading}
        >
          直接HTTPリクエスト
        </button>
      </div>
      
      {loading && (
        <div className="my-4 text-gray-600">
          読み込み中...
        </div>
      )}
      
      {error && (
        <div className="my-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
          <h3 className="font-bold">エラー</h3>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="my-4">
          <h3 className="font-bold mb-2">結果:</h3>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}