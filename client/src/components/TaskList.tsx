import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TaskItem from './TaskItem';
import { useTaskContext } from '@/context/TaskContext';
import { Task } from '@/types';

type SortOption = 'dateNewest' | 'dateOldest' | 'priority' | 'alphabetical';
type FilterType = 'all' | 'active' | 'completed';

export default function TaskList({ onOpenNewTaskModal }: { onOpenNewTaskModal: () => void }) {
  const [sortOption, setSortOption] = useState<SortOption>('dateNewest');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  
  const { activeCategory, activeFilter } = useTaskContext();
  
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
          filter.priority = { eq: 'high' };
          break;
        case 'medium':
          filter.priority = { eq: 'medium' };
          break;
        case 'low':
          filter.priority = { eq: 'low' };
          break;
      }
    }
    
    // Additional UI filter
    if (filterType !== 'all') {
      filter.completed = { eq: filterType === 'completed' };
    }
    
    return filter;
  };
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', activeCategory, activeFilter, filterType],
    queryFn: async () => {
      try {
        // データベースからデータ取得 (仮のユーザーID=3を使用)
        const userId = 3;
        const response = await fetch(`/api/tasks?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        
        const tasks = await response.json();
        
        // フィルター処理（一時的にクライアント側でフィルタリング）
        const filter = buildFilter();
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
          filteredTasks = filteredTasks.filter(task => task.priority === filter.priority.eq);
        }
        
        // 日付フィルター
        if (filter.dueDate) {
          if (filter.dueDate.ge) {
            const geDate = new Date(filter.dueDate.ge);
            filteredTasks = filteredTasks.filter(task => {
              if (!task.dueDate) return false;
              return new Date(task.dueDate) >= geDate;
            });
          }
          
          if (filter.dueDate.lt) {
            const ltDate = new Date(filter.dueDate.lt);
            filteredTasks = filteredTasks.filter(task => {
              if (!task.dueDate) return false;
              return new Date(task.dueDate) < ltDate;
            });
          }
        }
        
        return filteredTasks;
      } catch (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }
    }
  });
  
  const sortTasks = (tasks: Task[]) => {
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
  };
  
  const sortedTasks = data ? sortTasks(data) : [];
  
  // 現在のビュータイトルを取得
  const getViewTitle = () => {
    if (activeFilter) {
      switch (activeFilter) {
        case 'today': return '今日のタスク';
        case 'upcoming': return '今後のタスク';
        case 'important': return '重要なタスク';
        case 'completed': return '完了済みタスク';
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
    <main className="flex-1 overflow-hidden flex flex-col bg-gray-50">
      {/* Task Toolbar */}
      <div className="bg-white shadow-sm p-4 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium">{getViewTitle()}</h2>
            <div className="text-sm text-gray-500 hidden sm:block">
              {sortedTasks.length} 件のタスク
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Filter dropdown */}
            <div className="relative">
              <button 
                onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <span className="material-icons">filter_list</span>
              </button>
              {filterMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
                  onBlur={() => setFilterMenuOpen(false)}
                >
                  <button 
                    onClick={() => {
                      setFilterType('all');
                      setFilterMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    すべてのタスク
                  </button>
                  <button 
                    onClick={() => {
                      setFilterType('active');
                      setFilterMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    未完了のタスク
                  </button>
                  <button 
                    onClick={() => {
                      setFilterType('completed');
                      setFilterMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    完了済みのタスク
                  </button>
                </div>
              )}
            </div>
            
            {/* Sort dropdown */}
            <div className="relative">
              <button 
                onClick={() => setSortMenuOpen(!sortMenuOpen)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <span className="material-icons">sort</span>
              </button>
              {sortMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
                  onBlur={() => setSortMenuOpen(false)}
                >
                  <button 
                    onClick={() => {
                      setSortOption('dateNewest');
                      setSortMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    日付（新しい順）
                  </button>
                  <button 
                    onClick={() => {
                      setSortOption('dateOldest');
                      setSortMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    日付（古い順）
                  </button>
                  <button 
                    onClick={() => {
                      setSortOption('priority');
                      setSortMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    優先度
                  </button>
                  <button 
                    onClick={() => {
                      setSortOption('alphabetical');
                      setSortMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    アルファベット順
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Search input row */}
        <div className="w-full flex relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-icons text-gray-400 text-sm">search</span>
          </span>
          <input 
            type="text" 
            placeholder="タスクを検索..." 
            className="pl-10 pr-4 py-2 w-full rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
      </div>
      
      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">ローディング中...</p>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500">
              <span className="material-icons text-3xl">error_outline</span>
            </div>
            <h3 className="mt-4 text-xl font-medium text-gray-700">エラーが発生しました</h3>
            <p className="mt-2 text-gray-600">しばらく経ってからもう一度お試しください</p>
            <button 
              className="mt-4 flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white rounded-lg py-2 px-4 transition-colors shadow-md"
              // Refetch the data
              onClick={() => window.location.reload()}
            >
              <span className="material-icons text-sm">refresh</span>
              <span>再読み込み</span>
            </button>
          </div>
        )}
        
        {/* Empty state */}
        {!isLoading && !error && sortedTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
              <span className="material-icons text-3xl">task_alt</span>
            </div>
            <h3 className="mt-4 text-xl font-medium text-gray-700">タスクがありません</h3>
            <p className="mt-2 text-gray-600">新規タスクを作成してみましょう</p>
            <button 
              className="mt-4 flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white rounded-lg py-2 px-4 transition-colors shadow-md"
              onClick={onOpenNewTaskModal}
            >
              <span className="material-icons text-sm">add</span>
              <span>新規タスク</span>
            </button>
          </div>
        )}
        
        {/* Task grid */}
        {!isLoading && !error && sortedTasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
