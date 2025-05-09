import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Task } from '@/types';

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
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeFilter, setActiveFilter] = useState('');
  
  // デフォルトカテゴリ + API取得カテゴリ
  const [categories, setCategories] = useState<CategoryType[]>([
    { id: 'all', name: 'すべてのタスク', count: 0 }
  ]);
  
  // APIからカテゴリーを取得
  const { data: categoryData } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories?userId=3');
      if (!response.ok) {
        throw new Error('カテゴリーの取得に失敗しました');
      }
      return response.json();
    },
    staleTime: 10000 // 10 seconds
  });
  
  // 優先度フィルター
  const [filters, setFilters] = useState<FilterType[]>([
    { id: 'all_priority', name: 'すべての優先度', icon: 'filter_list', count: 0 },
    { id: 'high', name: '優先度: 高', icon: 'arrow_upward', count: 0 },
    { id: 'medium', name: '優先度: 中', icon: 'remove', count: 0 },
    { id: 'low', name: '優先度: 低', icon: 'arrow_downward', count: 0 }
  ]);
  
  // REST APIでタスクを取得 (ユーザーID固定)
  const { data } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    queryFn: async () => {
      const response = await fetch('/api/tasks?userId=3');
      if (!response.ok) {
        throw new Error('タスクの取得に失敗しました');
      }
      return response.json();
    },
    staleTime: 10000 // 10 seconds
  });

  // カテゴリAPIデータが更新されたらカテゴリリストを更新
  useEffect(() => {
    if (categoryData) {
      const apiCategories = categoryData.map((cat: any) => ({
        id: cat.id.toString(),
        name: cat.name,
        count: 0
      }));
      
      setCategories([
        { id: 'all', name: 'すべてのタスク', count: 0 },
        ...apiCategories
      ]);
    }
  }, [categoryData]);

  // カテゴリとフィルターのカウントを更新
  useEffect(() => {
    if (data) {
      // カテゴリごとのカウント
      const categoryCounts: Record<string, number> = { all: data.length };
      
      data.forEach((task: Task) => {
        const category = task.category || 'uncategorized';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      setCategories(prevCategories => 
        prevCategories.map(cat => ({
          ...cat,
          count: categoryCounts[cat.id] || 0
        }))
      );
      
      // 優先度ごとのカウント計算
      const highPriorityCount = data.filter((task: Task) => task.priority === 'high').length;
      const mediumPriorityCount = data.filter((task: Task) => task.priority === 'medium').length;
      const lowPriorityCount = data.filter((task: Task) => task.priority === 'low').length;
      const allPriorityCount = data.length;
      
      setFilters(prevFilters => 
        prevFilters.map(filter => {
          if (filter.id === 'high') {
            return { ...filter, count: highPriorityCount };
          } else if (filter.id === 'medium') {
            return { ...filter, count: mediumPriorityCount };
          } else if (filter.id === 'low') {
            return { ...filter, count: lowPriorityCount };
          } else if (filter.id === 'all_priority') {
            return { ...filter, count: allPriorityCount };
          }
          return filter;
        })
      );
    }
  }, [data]);

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
    setActiveFilter
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}
