import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTaskContext } from '@/context/TaskContext';
import { fetchGraphQL } from '@/lib/graphqlFetch';

type Category = {
  id: string;
  name: string;
  userId: string;
  createdAt?: string;
};

interface CategoryManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function CategoryManageModal({ isOpen, onClose, userId }: CategoryManageModalProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editedName, setEditedName] = useState('');
  const { toast } = useToast();
  const { refreshCategories } = useTaskContext();

  // カテゴリー一覧取得クエリ - GraphQLを使用
  const {
    data: categories,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['getUserCategories', userId],
    queryFn: async () => {
      console.log('GraphQLでカテゴリを取得します');
      
      try {
        // GraphQLクエリのインポート
        const { getUserCategories } = await import('@/graphql/queries');
        
        // GraphQL APIを呼び出す
        const result = await fetchGraphQL(getUserCategories, { userId });
        
        console.log('GraphQLからカテゴリを取得しました:', result?.getUserCategories || []);
        
        // 結果を返す (getUserCategoriesがundefinedの場合は空配列を返す)
        return result?.getUserCategories || [];
      } catch (error) {
        console.error('カテゴリ取得エラー:', error);
        // REST APIフォールバックを無効化 - 完全にGraphQLに移行
        console.warn('GraphQLに失敗しました。REST APIフォールバックは無効化されています。');
        // エラーを表示して空配列を返す
        return [];
      }
    },
    enabled: isOpen // モーダルが開いているときだけクエリを実行
  });

  // カテゴリー作成ミューテーション - GraphQLを使用
  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      console.log('GraphQLでカテゴリを作成します:', name);
      
      try {
        // GraphQLミューテーションのインポート
        const { createCategory } = await import('@/graphql/mutations');
        
        // GraphQL APIを呼び出す
        const result = await fetchGraphQL(createCategory, {
          input: {
            name,
            userId
          }
        });
        
        console.log('GraphQLカテゴリ作成結果:', result);
        
        if (result && result.createCategory) {
          return result.createCategory;
        }
        
        // GraphQLが失敗した場合のエラーハンドリング - フォールバックは無効化
        console.error('GraphQLカテゴリ作成に失敗しました');
        throw new Error('カテゴリの作成に失敗しました。もう一度お試しください。');
      } catch (error) {
        console.error('カテゴリ作成エラー:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // キャッシュ更新と再フェッチ
      queryClient.invalidateQueries({ queryKey: ['getUserCategories'] });
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

  // カテゴリー削除ミューテーション - GraphQLを使用
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      console.log('GraphQLでカテゴリを削除します:', categoryId);
      
      try {
        // GraphQLミューテーションのインポート
        const { deleteCategory } = await import('@/graphql/mutations');
        
        // GraphQL APIを呼び出す
        const result = await fetchGraphQL(deleteCategory, {
          input: { id: categoryId }
        });
        
        console.log('GraphQLカテゴリ削除結果:', result);
        
        if (result && result.deleteCategory) {
          return {
            success: true,
            data: result.deleteCategory,
            source: 'graphql'
          };
        }
        
        // GraphQLが失敗した場合のエラーハンドリング - フォールバック無効化
        console.error('GraphQLカテゴリ削除に失敗しました');
        throw new Error('カテゴリの削除に失敗しました。もう一度お試しください。');
      } catch (error) {
        console.error('カテゴリ削除エラー:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log('カテゴリ削除成功:', result);
      // キャッシュの無効化 - 明示的に完全なクエリキーを指定
      queryClient.invalidateQueries({ queryKey: ['getUserCategories'] });
      queryClient.invalidateQueries({ queryKey: ['getUserTasks'] });
      
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
  const handleDeleteCategory = (categoryId: string) => {
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
