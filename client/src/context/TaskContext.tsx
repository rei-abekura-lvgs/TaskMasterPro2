import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

// 型定義
type Task = {
  id: number | string;
  title: string;
  description?: string;
  dueDate?: string | null;
  categoryId?: number | string | null;
  priority: 'low' | 'medium' | 'high' | 'LOW' | 'MEDIUM' | 'HIGH';
  completed: boolean;
  userId: number | string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CategoryType = {
  id: string | number;
  name: string;
  count: number;
};

type FilterType = {
  id: string;
  name: string;
  icon: string;
  count: number;
};

interface TaskContextType {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  editingTask: Task | null;
  setEditingTask: (task: Task | null) => void;
  categories: CategoryType[];
  filters: FilterType[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  refreshCategories: () => void; // カテゴリの強制更新関数
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  
  // フィルターのリスト（固定）
  const [filters, setFilters] = useState<FilterType[]>([
    { id: 'all', name: 'すべてのタスク', icon: 'list', count: 0 },
    { id: 'active', name: '未完了', icon: 'radio_button_unchecked', count: 0 },
    { id: 'completed', name: '完了済み', icon: 'check_circle', count: 0 },
    { id: 'high', name: '優先度: 高', icon: 'arrow_upward', count: 0 },
    { id: 'medium', name: '優先度: 中', icon: 'remove', count: 0 },
    { id: 'low', name: '優先度: 低', icon: 'arrow_downward', count: 0 }
  ]);
  
  // GraphQL APIを使用してタスクを取得
  const { data } = useQuery<Task[]>({
    queryKey: ['getUserTasks'],
    queryFn: async () => {
      console.log('タスクリスト: GraphQLでデータを取得中...');
      try {
        // 直接GraphQLを使用
        console.log('直接フェッチによるGraphQL呼び出しを試行');
        
        // GraphQL APIの準備
        const { getUserTasks } = await import('@/graphql/queries');
        const { fetchGraphQL } = await import('@/lib/graphqlFetch');
        
        console.log('GraphQL API直接呼び出し');
        const result = await fetchGraphQL(getUserTasks, {
          userId: "3", // GraphQLではIDは文字列として扱う
          filter: {} // 必要に応じてフィルタリング条件を追加
        });
        
        if (!result || !result.getUserTasks) {
          console.error('GraphQLタスク取得に失敗:', result);
          throw new Error('タスク取得に失敗しました');
        }
        
        console.log('GraphQLから' + result.getUserTasks.length + '件のタスクを取得しました');
        return result.getUserTasks;
      } catch (error) {
        console.error('タスク取得エラー:', error);
        return [];
      }
    }
  });
  
  // GraphQL APIを使用してカテゴリーを取得
  const { data: categoryData } = useQuery({
    queryKey: ['getUserCategories'],
    queryFn: async () => {
      console.log('カテゴリを取得中...');
      try {
        // GraphQL APIの準備
        const { getUserCategories } = await import('@/graphql/queries');
        const { fetchGraphQL } = await import('@/lib/graphqlFetch');
        
        console.log('GraphQLでカテゴリを取得します');
        const result = await fetchGraphQL(getUserCategories, {
          userId: "3" // GraphQLではIDは文字列として扱う
        });
        
        if (!result || !result.getUserCategories) {
          console.error('GraphQLカテゴリ取得に失敗:', result);
          throw new Error('カテゴリ取得に失敗しました');
        }
        
        console.log('GraphQLからカテゴリを取得しました:', result.getUserCategories);
        return result.getUserCategories || [];
      } catch (error) {
        console.error('カテゴリ取得エラー:', error);
        return [];
      }
    }
  });
  
  // カテゴリと統計情報を計算
  const [categories, setCategories] = useState<CategoryType[]>([
    { id: 'all', name: 'すべてのタスク', count: 0 },
  ]);
  
  useEffect(() => {
    // データが両方ともロードされた場合のみ処理
    if (data && categoryData) {
      // カテゴリの集計
      try {
        // カテゴリに実際のデータをマッピング
        const categoryCounts = new Map<string | number, number>();
        data.forEach((task: Task) => {
          const catId = task.categoryId || 'none';
          categoryCounts.set(catId, (categoryCounts.get(catId) || 0) + 1);
        });
        
        // 集計されたカウントでカテゴリデータを更新
        const updatedCategories: CategoryType[] = [
          { id: 'all', name: 'すべてのタスク', count: data.length }
        ];
        
        // 実際のカテゴリデータを追加
        if (categoryData.length > 0) {
          categoryData.forEach((cat: any) => {
            updatedCategories.push({
              id: cat.id,
              name: cat.name,
              count: categoryCounts.get(cat.id) || 0
            });
          });
        }
        
        console.log('実際のタスク数:', data.length, '件');
        console.log('「すべてのタスク」のカウント:', updatedCategories[0].count, '件');
        setCategories(updatedCategories);
        console.log('更新されたカテゴリ一覧:', updatedCategories);
        
        // フィルターのカウントも更新
        const highPriorityCount = data.filter((task: Task) => task.priority === 'high' || task.priority === 'HIGH').length;
        const mediumPriorityCount = data.filter((task: Task) => task.priority === 'medium' || task.priority === 'MEDIUM').length;
        const lowPriorityCount = data.filter((task: Task) => task.priority === 'low' || task.priority === 'LOW').length;
        const activeCount = data.filter((task: Task) => !task.completed).length;
        const completedCount = data.filter((task: Task) => task.completed).length;
        
        const updatedFilters = [...filters];
        updatedFilters[0].count = data.length; // すべて
        updatedFilters[1].count = activeCount; // 未完了
        updatedFilters[2].count = completedCount; // 完了済み
        updatedFilters[3].count = highPriorityCount; // 優先度高
        updatedFilters[4].count = mediumPriorityCount; // 優先度中
        updatedFilters[5].count = lowPriorityCount; // 優先度低
        
        setFilters(updatedFilters);
      } catch (err) {
        console.error('カテゴリとフィルターの集計中にエラーが発生しました:', err);
      }
    }
  }, [data, categoryData]);
  
  // カテゴリを強制更新する関数
  const refreshCategories = () => {
    console.log('カテゴリとタスクリストを強制更新します');
    queryClient.invalidateQueries({ queryKey: ['getUserCategories'] });
    // タスクも同時に更新
    queryClient.invalidateQueries({ queryKey: ['getUserTasks'] });
  };
  
  const value = {
    isModalOpen,
    setIsModalOpen,
    editingTask,
    setEditingTask,
    categories,
    filters,
    activeCategory,
    setActiveCategory,
    activeFilter,
    setActiveFilter,
    refreshCategories
  };
  
  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}