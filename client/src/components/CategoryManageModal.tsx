import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, getApiBaseUrl, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTaskContext } from '@/context/TaskContext';

type Category = {
  id: number;
  name: string;
  userId: number;
};

interface CategoryManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
}

export default function CategoryManageModal({ isOpen, onClose, userId }: CategoryManageModalProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editedName, setEditedName] = useState('');
  const { toast } = useToast();
  const { refreshCategories } = useTaskContext();

  // カテゴリー一覧取得クエリ - REST APIを使用
  const {
    data: categories,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/categories', userId],
    queryFn: async () => {
      console.log('Using REST API for categories listing');
      
      try {
        // 環境に応じたAPIリクエスト
        const response = await apiRequest('GET', `/api/categories?userId=${userId}`);
        
        const data = await response.json();
        console.log('Categories from REST API:', data);
        return data;
      } catch (error) {
        console.error('Error in categories fetch:', error);
        throw error;
      }
    },
    enabled: isOpen // モーダルが開いているときだけクエリを実行
  });

  // カテゴリー作成ミューテーション
  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      console.log('Creating category using REST API:', name);
      
      try {
        // 環境に応じたAPIリクエスト
        const response = await apiRequest('POST', '/api/categories', { name, userId });
        
        // レスポンスからJSONを取得
        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error('Invalid JSON response:', responseText);
          throw new Error(`Invalid response format: ${responseText.substring(0, 100)}`);
        }
        
        console.log('Category created successfully:', responseData);
        return responseData;
      } catch (error) {
        console.error('Error creating category:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // キャッシュ更新と再フェッチ
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      refetch(); // 明示的に再フェッチ
      refreshCategories(); // TaskContextを通じて全コンポーネントに通知
      setNewCategoryName('');
      toast({
        title: 'カテゴリーが作成されました',
        description: '新しいカテゴリーが正常に作成されました。'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'カテゴリーの作成に失敗しました',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // カテゴリー削除ミューテーション
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      console.log('Deleting category using REST API:', categoryId);
      
      try {
        // 環境に応じたAPIリクエスト
        const response = await apiRequest('DELETE', `/api/categories/${categoryId}`);
        
        // レスポンスの処理
        const responseText = await response.text();
        // 空のレスポンスの場合は成功として扱う
        if (!responseText.trim()) {
          return true;
        }
        
        // JSONレスポンスがある場合は解析
        try {
          const responseData = JSON.parse(responseText);
          console.log('Category deleted successfully:', responseData);
          return true;
        } catch (e) {
          console.log('Deletion successful with non-JSON response');
          return true;
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // キャッシュの無効化 - 明示的に完全なクエリキーを指定
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      // 最も重要: refetchは最も直接的な方法
      refetch();
      
      // TaskContextを通じて全コンポーネントに通知
      refreshCategories();
      
      toast({
        title: 'カテゴリーが削除されました',
        description: 'カテゴリーが正常に削除されました。'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'カテゴリーの削除に失敗しました',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // 新しいカテゴリーの作成を処理
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      createCategoryMutation.mutate(newCategoryName.trim());
    }
  };

  // カテゴリーの削除を処理
  const handleDeleteCategory = (categoryId: number) => {
    if (window.confirm('このカテゴリーを削除してもよろしいですか？このカテゴリーに属するタスクはカテゴリなしになります。')) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  // Escキーでモーダルを閉じる
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // キーボードイベントリスナーの設定
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
      
      {/* Modal content */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full mx-auto overflow-hidden transform transition-all">
          {/* Modal header */}
          <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">カテゴリー管理</h3>
            <button className="focus:outline-none" onClick={onClose}>
              <span className="material-icons">close</span>
            </button>
          </div>
          
          {/* Modal body */}
          <div className="px-6 py-4">
            {/* Form to create new category */}
            <form onSubmit={handleCreateCategory} className="mb-6">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="新しいカテゴリー名"
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={createCategoryMutation.isPending}
                >
                  {createCategoryMutation.isPending ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
            
            {/* Categories list */}
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300">カテゴリー一覧</h4>
                <button 
                  onClick={() => {
                    refetch(); 
                    refreshCategories();
                  }} 
                  className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                  title="カテゴリー一覧を更新"
                >
                  <span className="material-icons text-sm">refresh</span>
                </button>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 py-2">
                  カテゴリーの読み込み中にエラーが発生しました。
                </div>
              ) : categories && categories.length > 0 ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {categories.map((category: Category) => (
                    <li key={category.id} className="py-3 flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        {editingCategory && editingCategory.id === category.id ? (
                          <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-gray-800 dark:text-gray-200">{category.name}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        title="カテゴリーを削除"
                        disabled={deleteCategoryMutation.isPending}
                      >
                        <span className="material-icons text-xl">delete</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-500 py-2 text-center">
                  カテゴリーがありません。新しいカテゴリーを作成してください。
                </div>
              )}
            </div>
          </div>
          
          {/* Modal footer */}
          <div className="bg-gray-50 dark:bg-neutral-700 px-6 py-3">
            <button
              onClick={onClose}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
