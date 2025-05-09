import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TaskItem from './TaskItem';
import { useTaskContext } from '@/context/TaskContext';
import { Task } from '@/types';
import { listTasks } from '@/graphql/queries';
import { executeGraphQL } from '@/lib/amplify';
import { getApiBaseUrl, apiRequest } from '@/lib/queryClient';

type SortOption = 'dateNewest' | 'dateOldest' | 'priority' | 'alphabetical';
type FilterType = 'all' | 'active' | 'completed';

export default function TaskList({ onOpenNewTaskModal }: { onOpenNewTaskModal: () => void }) {
  const [sortOption, setSortOption] = useState<SortOption>('dateNewest');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const { activeCategory, activeFilter } = useTaskContext();
  const queryClient = useQueryClient(); // QueryClientを使用するための初期化
  
  // フィルターやカテゴリー変更時にデータを再取得
  useEffect(() => {
    console.log("フィルターまたはカテゴリーが変更されました - データを再取得します");
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    refetch(); // 明示的に再取得
  }, [activeCategory, activeFilter, filterType, queryClient]);
  
  // データ更新のためのポーリング設定（最後の手段）
  useEffect(() => {
    // 2秒ごとに自動更新
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    }, 2000);
    
    return () => clearInterval(interval);
  }, [queryClient]);
  
  // Build the filter based on active category and filter
  const buildFilter = () => {
    let filter: any = {};
    
    // Category filter
    if (activeCategory && activeCategory !== 'all') {
      filter.category = { eq: activeCategory };
    }
    
    // 優先度フィルター
    if (activeFilter) {
      switch (activeFilter) {
        case 'high':
          filter.priority = { eq: 'HIGH' }; // AppSyncでは大文字
          break;
        case 'medium':
          filter.priority = { eq: 'MEDIUM' }; // AppSyncでは大文字
          break;
        case 'low':
          filter.priority = { eq: 'LOW' }; // AppSyncでは大文字
          break;
        case 'all_priority':
          // すべての優先度のタスクを表示するため、フィルターは設定しない
          break;
      }
    }
    
    // Additional UI filter
    if (filterType !== 'all') {
      filter.completed = { eq: filterType === 'completed' };
    }
    
    return filter;
  };
  
  // GraphQLから返されたタスクを標準形式にフォーマット
  const formatTaskFromGraphQL = (item: any): Task => ({
    id: item.id,
    title: item.title,
    description: item.description || '',
    dueDate: item.dueDate || '',
    categoryId: item.category ? item.category.id : undefined,
    category: item.category ? item.category.name : '',
    // AppSyncからの応答は大文字の列挙型、フロントエンドでは小文字
    priority: item.priority ? item.priority.toLowerCase() as 'low' | 'medium' | 'high' : 'medium',
    completed: item.completed,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    userId: item.userId || 0,
  });
  
  // クライアント側でのフィルタリング（RESTフォールバック用）
  const filterTasksClient = (tasks: any[], filter: any) => {
    let filteredTasks = [...tasks];
    
    // カテゴリーフィルター
    if (filter.category && filter.category.eq) {
      filteredTasks = filteredTasks.filter(task => task.category === filter.category.eq);
    }
    
    // 完了状態フィルター
    if (filter.completed !== undefined && filter.completed.eq !== undefined) {
      filteredTasks = filteredTasks.filter(task => task.completed === filter.completed.eq);
    }
    
    // 優先度フィルター
    if (filter.priority && filter.priority.eq) {
      // AppSyncでは大文字、REST APIでは小文字
      const priorityValue = filter.priority.eq.toLowerCase();
      filteredTasks = filteredTasks.filter(task => task.priority === priorityValue);
    }
    
    return filteredTasks;
  };
  
  // タスクデータを取得 - 統一されたキーでクエリを実行
  const { data, isLoading, error, refetch } = useQuery({
    // 重要: 標準化されたキーを使用 - 他のコンポーネントと同じキーを使用することで
    // キャッシュの無効化が正しく機能する
    queryKey: ['/api/tasks'],
    // フィルター関連の依存配列を追加して、フィルターが変更されたときにクエリを再実行
    enabled: true,
    // キャッシュデータを取得したら毎回最新データを取得するように
    staleTime: 0,
    // 関数の定義
    queryFn: async () => {
      try {
        const filter = buildFilter();
        
        // REST APIからタスクを取得
        const userId = 3; // 仮のユーザーID - 実際のアプリでは認証から取得する
        console.log('タスクリスト: データを取得中...');
        
        try {
          const response = await apiRequest('GET', `/api/tasks?userId=${userId}`);
          
          if (!response.ok) {
            throw new Error(`タスク取得エラー: ${response.status}`);
          }
          
          const tasks = await response.json();
          console.log(`${tasks.length}件のタスクを取得しました`);
          
          // クライアント側でのフィルタリング
          const filteredTasks = filterTasksClient(tasks, filter);
          console.log(`フィルタリング後: ${filteredTasks.length}件のタスクを表示`);
          
          return filteredTasks;
        } catch (error) {
          console.error('タスク取得中にエラー発生:', error);
          throw error;
        }
      } catch (error) {
        console.error('タスク取得エラー:', error);
        throw error;
      }
    }
  });
  
  // タスクのソート処理
  const sortTasks = useCallback((tasks: Task[]) => {
    if (!tasks) return [];
    
    const sortedTasks = [...tasks];
    
    switch (sortOption) {
      case 'dateNewest':
        return sortedTasks.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'dateOldest':
        return sortedTasks.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case 'priority': {
        const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return sortedTasks.sort((a, b) => 
          priorityWeight[b.priority] - priorityWeight[a.priority]
        );
      }
      case 'alphabetical':
        return sortedTasks.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sortedTasks;
    }
  }, [sortOption]);
  
  // 検索とソート処理
  const filteredAndSortedTasks = useMemo(() => {
    if (!data) return [];
    
    // 1. 検索フィルタリング
    let filtered = [...data];
    if (searchQuery.trim() !== '') {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query))
      );
    }
    
    // 2. ソート処理
    return sortTasks(filtered);
  }, [data, searchQuery, sortOption, sortTasks]);
  
  const sortedTasks = filteredAndSortedTasks;
  
  // 現在のビュータイトルを取得
  const getViewTitle = () => {
    if (activeFilter) {
      switch (activeFilter) {
        case 'high': return '優先度「高」のタスク';
        case 'medium': return '優先度「中」のタスク';
        case 'low': return '優先度「低」のタスク';
        case 'all_priority': return 'すべての優先度のタスク';
        default: return 'すべてのタスク';
      }
    }
    
    if (activeCategory === 'all') return 'すべてのタスク';
    
    const categoryMap: Record<string, string> = {
      work: '仕事',
      personal: '個人',
      shopping: 'ショッピング',
      health: '健康',
      finance: '金融'
    };
    
    return categoryMap[activeCategory] ? `${categoryMap[activeCategory]}のタスク` : 'タスク';
  };

  return (
    <main className="flex-1 overflow-hidden flex flex-col bg-gray-50 w-full">
      {/* Task Toolbar */}
      <div className="bg-white shadow p-5 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">
              {getViewTitle()}
            </h2>
            <div className="text-sm bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium hidden sm:flex items-center">
              <span className="material-icons text-blue-500 mr-1 text-xs">task</span>
              {sortedTasks.length} 件
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Filter dropdown */}
            <div className="relative">
              <button 
                onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                className="p-2 rounded-lg hover:bg-blue-50 transition-all text-blue-500 border border-transparent hover:border-blue-200 flex items-center"
                aria-label="タスクをフィルタリング"
              >
                <span className="material-icons mr-1">filter_list</span>
                <span className="text-sm font-medium hidden sm:inline">フィルタ</span>
              </button>
              {filterMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-2 z-10 border border-gray-100 overflow-hidden"
                >
                  <div className="px-3 py-2 bg-blue-50 text-sm font-semibold text-gray-600 border-b border-gray-100">
                    表示するタスク
                  </div>
                  <button 
                    onClick={() => {
                      setFilterType('all');
                      setFilterMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <span className="material-icons text-blue-400 mr-2 text-sm">list</span>
                    すべてのタスク
                  </button>
                  <button 
                    onClick={() => {
                      setFilterType('active');
                      setFilterMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <span className="material-icons text-amber-400 mr-2 text-sm">radio_button_unchecked</span>
                    未完了のタスク
                  </button>
                  <button 
                    onClick={() => {
                      setFilterType('completed');
                      setFilterMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <span className="material-icons text-green-400 mr-2 text-sm">check_circle</span>
                    完了済みのタスク
                  </button>
                </div>
              )}
            </div>
            
            {/* Sort dropdown */}
            <div className="relative">
              <button 
                onClick={() => setSortMenuOpen(!sortMenuOpen)}
                className="p-2 rounded-lg hover:bg-blue-50 transition-all text-blue-500 border border-transparent hover:border-blue-200 flex items-center"
                aria-label="タスクを並び替え"
              >
                <span className="material-icons mr-1">sort</span>
                <span className="text-sm font-medium hidden sm:inline">並び替え</span>
              </button>
              {sortMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-2 z-10 border border-gray-100 overflow-hidden"
                >
                  <div className="px-3 py-2 bg-blue-50 text-sm font-semibold text-gray-600 border-b border-gray-100">
                    並び順の選択
                  </div>
                  <button 
                    onClick={() => {
                      setSortOption('dateNewest');
                      setSortMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <span className="material-icons text-indigo-400 mr-2 text-sm">arrow_downward</span>
                    日付（新しい順）
                  </button>
                  <button 
                    onClick={() => {
                      setSortOption('dateOldest');
                      setSortMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <span className="material-icons text-indigo-400 mr-2 text-sm">arrow_upward</span>
                    日付（古い順）
                  </button>
                  <button 
                    onClick={() => {
                      setSortOption('priority');
                      setSortMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <span className="material-icons text-red-400 mr-2 text-sm">priority_high</span>
                    優先度
                  </button>
                  <button 
                    onClick={() => {
                      setSortOption('alphabetical');
                      setSortMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <span className="material-icons text-blue-400 mr-2 text-sm">sort_by_alpha</span>
                    名前順
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Search input row */}
        <div className="w-full flex relative">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="material-icons text-blue-400 text-lg">search</span>
          </span>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="タスクを検索..." 
            className="pl-12 pr-4 py-3 w-full rounded-xl bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-gray-700 placeholder-gray-400 shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
            >
              <span className="material-icons text-sm">close</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6">
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-6 text-gray-600 text-lg">ローディング中...</p>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-16 max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-2">
              <span className="material-icons text-4xl">error_outline</span>
            </div>
            <h3 className="mt-4 text-2xl font-medium text-gray-800">エラーが発生しました</h3>
            <p className="mt-2 text-gray-600">サーバーとの通信中に問題が発生しました。しばらく経ってからもう一度お試しください。</p>
            <button 
              className="mt-6 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 px-6 transition-colors shadow-md w-full max-w-xs mx-auto font-medium"
              onClick={() => window.location.reload()}
            >
              <span className="material-icons">refresh</span>
              <span>再読み込み</span>
            </button>
          </div>
        )}
        
        {/* Empty state */}
        {!isLoading && !error && sortedTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 max-w-md mx-auto text-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-400 mb-2">
              <span className="material-icons text-5xl">task_alt</span>
            </div>
            <h3 className="mt-4 text-2xl font-medium text-gray-800">タスクが見つかりません</h3>
            <p className="mt-2 text-gray-600">
              {searchQuery ? 
                `「${searchQuery}」に一致するタスクは見つかりませんでした。検索条件を変更するか、新しいタスクを作成してください。` : 
                'タスクがありません。新しいタスクを作成してみましょう。'}
            </p>
            <button 
              className="mt-6 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 px-6 transition-colors shadow-md w-full max-w-xs mx-auto font-medium"
              onClick={onOpenNewTaskModal}
            >
              <span className="material-icons">add</span>
              <span>新規タスク</span>
            </button>
          </div>
        )}
        
        {/* Task grid */}
        {!isLoading && !error && sortedTasks.length > 0 && (
          <div className="task-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTasks.map((task, index) => (
              <div 
                key={task.id} 
                style={{ '--animation-order': index } as React.CSSProperties}
                className="animate-fade-in-up"
              >
                <TaskItem task={task} />
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* New Task Floating Button (Mobile) */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={onOpenNewTaskModal}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 btn-primary animate-float"
        >
          <span className="material-icons">add</span>
        </button>
      </div>
    </main>
  );
}
