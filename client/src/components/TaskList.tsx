import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import TaskItem from './TaskItem';
import { useTaskContext } from '@/context/TaskContext';
import { listTasks } from '@/graphql/queries';
import { fetchGraphQL } from '@/lib/graphqlFetch';

type SortOption = 'dateNewest' | 'dateOldest' | 'priority' | 'alphabetical';
type FilterType = 'all' | 'active' | 'completed';

export default function TaskList({ onOpenNewTaskModal }: { onOpenNewTaskModal: () => void }) {
  // タスクコンテキストから値を取得
  const { 
    activeCategory, 
    setActiveCategory, 
    categories,
    activeFilter, 
    setActiveFilter, 
    filters 
  } = useTaskContext();
  
  // 検索と並び替えの状態
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('dateNewest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // フィルターの構築
  const buildFilter = () => {
    const filter: any = {};
    
    // カテゴリーフィルター (GraphQL用)
    if (activeCategory !== 'all') {
      filter.categoryId = { eq: activeCategory };
    }
    
    // タスクステータスフィルター
    if (activeFilter === 'active') {
      filter.completed = { eq: false };
    } else if (activeFilter === 'completed') {
      filter.completed = { eq: true };
    } else if (activeFilter === 'high') {
      filter.priority = { eq: 'HIGH' }; // GraphQLでは大文字
    } else if (activeFilter === 'medium') {
      filter.priority = { eq: 'MEDIUM' };
    } else if (activeFilter === 'low') {
      filter.priority = { eq: 'LOW' };
    }
    
    return filter;
  };
  
  // フィルターやソートが変更されたときにデータを再取得
  useEffect(() => {
    console.log('フィルターまたはカテゴリーが変更されました - データを再取得します');
    refetch();
  }, [activeCategory, activeFilter]);
  
  // GraphQLレスポンスのタスクを標準形式に変換
  const formatTaskFromGraphQL = (item: any) => {
    try {
      if (!item) return null;
      
      // 優先度を小文字に統一（UIコンポーネントが小文字を想定）
      const priority = item.priority ? item.priority.toLowerCase() : 'medium';
      
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        dueDate: item.dueDate,
        categoryId: item.categoryId,
        priority: priority,
        completed: item.completed,
        userId: item.userId,
        category: item.category,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      };
    } catch (error) {
      console.error('タスクのフォーマット中にエラーが発生しました:', error, item);
      return null;
    }
  };
  
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
  
  // タスクデータを取得 - GraphQLを使用
  const { data, isLoading, error, refetch } = useQuery({
    // GraphQLクエリキー
    queryKey: ['getUserTasks', '3'],
    // フィルター関連の依存配列を追加して、フィルターが変更されたときにクエリを再実行
    enabled: true,
    // キャッシュデータを取得したら毎回最新データを取得するように
    staleTime: 0,
    // GraphQLを使用したクエリ関数
    queryFn: async () => {
      try {
        const filter = buildFilter();
        
        // 固定ユーザーID（本番環境では認証から取得）
        const userId = "3"; 
        console.log('タスクリスト: GraphQLでデータを取得中...');
        
        try {
          // GraphQLでタスクを取得 - 直接フェッチを試みる
          console.log('直接フェッチによるGraphQL呼び出しを試行');
          const result = await fetchGraphQL(listTasks, {
            // GraphQLクエリの変数を渡す
            userId: userId,
            filter: filter
          });
          
          // タスクデータがnullの場合は空配列を返す
          if (!result) {
            console.error('GraphQLからのレスポンスがありません');
            return [];
          }
          
          // getUserTasksがnullの場合（タスクなし）
          if (result.getUserTasks === null) {
            console.log('GraphQLから取得したタスクはありません');
            return [];
          }
          
          // getUserTasksはリストまたは単一オブジェクトを返す可能性があります
          const tasksData = Array.isArray(result.getUserTasks) ? result.getUserTasks : [result.getUserTasks];
          
          // GraphQLレスポンスのフォーマット
          const tasks = tasksData.map(formatTaskFromGraphQL);
          console.log(`GraphQLから${tasks.length}件のタスクを取得しました`);
          
          // クライアント側でのフィルタリング（追加の絞り込みが必要な場合）
          const filteredTasks = filterTasksClient(tasks, filter);
          console.log(`フィルタリング後: ${filteredTasks.length}件のタスクを表示`);
          
          return filteredTasks;
        } catch (error) {
          console.error('GraphQLタスク取得中にエラー発生:', error);
          
          // RESTフォールバックを無効化
          console.warn('GraphQLの取得に失敗しました。REST APIは無効化されています。');
          throw new Error('GraphQL APIが応答しません。アプリケーションの再起動をお試しください。');
        }
      } catch (error) {
        console.error('タスク取得エラー:', error);
        throw error;
      }
    }
  });
  
  // タスクのソート処理
  const sortedTasks = useMemo(() => {
    let tasks = data || [];
    
    // 検索フィルタリング
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(query) || 
        (task.description && task.description.toLowerCase().includes(query))
      );
    }
    
    // ソート
    return [...tasks].sort((a, b) => {
      switch (sortOption) {
        case 'dateNewest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'dateOldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'priority': {
          const priorityValue = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityValue[a.priority as keyof typeof priorityValue] || 0;
          const bPriority = priorityValue[b.priority as keyof typeof priorityValue] || 0;
          return bPriority - aPriority;
        }
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [data, searchQuery, sortOption]);
  
  // モバイルメニューの状態
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // デバイスサイズに応じてメニューを自動開閉
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">タスク一覧</h1>
          
          {/* Desktop New Task Button */}
          <div className="hidden md:block">
            <button
              onClick={onOpenNewTaskModal}
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors"
            >
              <span className="material-icons mr-2">add</span>
              新規タスク
            </button>
          </div>
          
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
          >
            <span className="material-icons">
              {isMobileMenuOpen ? 'close' : 'filter_list'}
            </span>
          </button>
        </div>
        
        {/* Filter tabs & Sort dropdown */}
        <div className={`filter-tabs ${isMobileMenuOpen ? 'block' : 'hidden md:block'} space-y-4 mb-6`}>
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id.toString())}
                className={`py-1.5 px-3 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category.id.toString()
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
                {category.count > 0 && (
                  <span className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full ${
                    activeCategory === category.id.toString() 
                      ? 'bg-blue-200 text-blue-800' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {category.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            {filters.map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`flex items-center py-1.5 px-3 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === filter.id
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="material-icons text-sm mr-1">{filter.icon}</span>
                {filter.name}
                {filter.count > 0 && (
                  <span className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full ${
                    activeFilter === filter.id 
                      ? 'bg-blue-200 text-blue-800' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Sort dropdown */}
          <div className="relative inline-block text-left mt-4 md:mt-0">
            <div>
              <button 
                type="button" 
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center justify-between w-40 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
              >
                <span>
                  {sortOption === 'dateNewest' && '新しい順'}
                  {sortOption === 'dateOldest' && '古い順'}
                  {sortOption === 'priority' && '優先度順'}
                  {sortOption === 'alphabetical' && 'アルファベット順'}
                </span>
                <span className="material-icons text-gray-400 text-sm">arrow_drop_down</span>
              </button>
            </div>
            
            {showSortMenu && (
              <div className="absolute right-0 z-10 mt-1 w-40 bg-white shadow-lg rounded-md ring-1 ring-black ring-opacity-5">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button 
                    className={`${sortOption === 'dateNewest' ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-100`}
                    onClick={() => { 
                      setSortOption('dateNewest');
                      setShowSortMenu(false);
                    }}
                  >
                    新しい順
                  </button>
                  <button 
                    className={`${sortOption === 'dateOldest' ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-100`}
                    onClick={() => { 
                      setSortOption('dateOldest');
                      setShowSortMenu(false);
                    }}
                  >
                    古い順
                  </button>
                  <button 
                    className={`${sortOption === 'priority' ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-100`}
                    onClick={() => { 
                      setSortOption('priority');
                      setShowSortMenu(false);
                    }}
                  >
                    優先度順
                  </button>
                  <button 
                    className={`${sortOption === 'alphabetical' ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-100`}
                    onClick={() => { 
                      setSortOption('alphabetical');
                      setShowSortMenu(false);
                    }}
                  >
                    アルファベット順
                  </button>
                </div>
              </div>
            )}
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
    </div>
  );
}