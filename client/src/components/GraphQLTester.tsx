import { useState } from 'react';
import { fetchGraphQL } from '@/lib/graphqlFetch';

export default function GraphQLTester() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // スキーマ検証（タイプを確認する）
  const testSchema = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // IntrospectionクエリでGraphQLスキーマを取得
      const query = `
        query IntrospectionQuery {
          __schema {
            queryType {
              name
              fields {
                name
                description
                args {
                  name
                  description
                  type {
                    name
                    kind
                  }
                }
                type {
                  name
                  kind
                }
              }
            }
            types {
              name
              kind
              description
              fields {
                name
                description
              }
            }
          }
        }
      `;
      
      const data = await fetchGraphQL(query);
      setResult(data);
    } catch (err: any) {
      console.error('GraphQLスキーマ取得中のエラー:', err);
      setError(err.message || 'GraphQLスキーマの取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 基本的なクエリテスト
  const testListQuery = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // AWS管理コンソールからクエリ名を確認後、適切なクエリを作成
      const query = `
        query ListTasks {
          listTaskses {
            items {
              id
              title
              description
              dueDate
              priority
              completed
              owner
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
  
  // API情報を検証
  const testApiConfig = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 環境変数の情報を収集
      const apiUrl = import.meta.env.VITE_APPSYNC_ENDPOINT;
      const apiKey = import.meta.env.VITE_APPSYNC_API_KEY;
      const region = import.meta.env.VITE_AWS_REGION;
      
      // AWS CLI configを参照
      const configData = {
        endpoint: apiUrl,
        apiKey: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : null,
        region,
        encodedKey: apiKey ? btoa(apiKey) : null // Base64エンコード
      };
      
      setResult(configData);
      
      // AWS AppSyncのエンドポイントが到達可能か確認
      if (apiUrl) {
        try {
          const pingResponse = await fetch(apiUrl, {
            method: 'OPTIONS',
            mode: 'cors'
          });
          console.log('API エンドポイント接続テスト:', pingResponse.status, pingResponse.statusText);
          
          if (pingResponse.ok) {
            setResult(prev => ({ 
              ...prev, 
              pingStatus: 'OK', 
              pingStatusCode: pingResponse.status,
              cors: 'Supported'
            }));
          } else {
            setResult(prev => ({ 
              ...prev, 
              pingStatus: 'Error', 
              pingStatusCode: pingResponse.status,
              pingStatusText: pingResponse.statusText
            }));
          }
        } catch (pingErr: any) {
          console.error('API接続テスト中のエラー:', pingErr);
          setResult(prev => ({ 
            ...prev, 
            pingStatus: 'Failed',
            pingError: pingErr.message
          }));
        }
      }
    } catch (err: any) {
      console.error('API構成検証中のエラー:', err);
      setError(err.message || 'API構成の検証中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
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
      
      // Introspection query to get schema info
      const query = `
        query {
          __schema {
            queryType {
              name
            }
          }
        }
      `;
      
      // より多くのヘッダーバリエーションを試す
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'X-Api-Key': apiKey,
        'Authorization': apiKey,
        'Host': new URL(apiUrl).host,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br'
      };
      
      console.log('API request headers:', Object.keys(headers).join(', '));
      console.log('Request URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
        mode: 'cors',
        credentials: 'omit'
      });
      
      // ステータス情報とヘッダーを含める
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      const data = await response.json();
      setResult({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data
      });
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
      
      <div className="flex flex-wrap gap-2 mb-4">
        <button 
          onClick={checkApiKey}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={loading}
        >
          環境変数チェック
        </button>
        
        <button 
          onClick={testApiConfig}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          disabled={loading}
        >
          API構成検証
        </button>
        
        <button 
          onClick={testSchema}
          className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
          disabled={loading}
        >
          スキーマ検証
        </button>
        
        <button 
          onClick={testListQuery}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={loading}
        >
          タスククエリテスト
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