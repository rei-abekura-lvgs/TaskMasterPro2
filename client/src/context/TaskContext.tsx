import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/utils';
import { mockCategories, mockDataService } from '@/lib/mockData';
import { Task } from '@/types';
import { gql } from '@apollo/client';

// GraphQL query for categories
const LIST_TASKS = gql`
  query ListTasks {
    listTasks {
      items {
        id
        category
        completed
      }
    }
  }
`;

type CategoryType = {
  id: string;
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
  
  // 日本語カテゴリ
  const [categories, setCategories] = useState<CategoryType[]>([
    { id: 'all', name: 'すべてのタスク', count: 0 },
    { id: 'work', name: '仕事', count: 0 },
    { id: 'personal', name: '個人', count: 0 },
    { id: 'shopping', name: 'ショッピング', count: 0 },
    { id: 'health', name: '健康', count: 0 },
    { id: 'finance', name: '金融', count: 0 }
  ]);
  
  // 日本語フィルター
  const [filters, setFilters] = useState<FilterType[]>([
    { id: 'today', name: '今日', icon: 'today', count: 0 },
    { id: 'upcoming', name: '今後', icon: 'calendar_today', count: 0 },
    { id: 'important', name: '重要', icon: 'priority_high', count: 0 },
    { id: 'completed', name: '完了済み', icon: 'check_circle', count: 0 }
  ]);
  
  // モックデータでタスクを取得
  const { data } = useQuery({
    queryKey: ['task-counts'],
    queryFn: async () => {
      const tasks = await mockDataService.getTasks();
      return tasks;
    },
    staleTime: 10000 // 10 seconds
  });

  // カテゴリとフィルターのカウントを更新
  useEffect(() => {
    if (data) {
      // カテゴリごとのカウント
      const categoryCounts: Record<string, number> = { all: data.length };
      
      data.forEach(task => {
        const category = task.category || 'uncategorized';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      setCategories(prevCategories => 
        prevCategories.map(cat => ({
          ...cat,
          count: categoryCounts[cat.id] || 0
        }))
      );
      
      // フィルターのカウント計算
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const completedCount = data.filter(task => task.completed).length;
      const todayCount = data.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return (
          taskDate.getFullYear() === today.getFullYear() &&
          taskDate.getMonth() === today.getMonth() &&
          taskDate.getDate() === today.getDate()
        );
      }).length;
      
      const upcomingCount = data.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return taskDate >= today;
      }).length;
      
      const importantCount = data.filter(task => task.priority === 'high').length;
      
      setFilters(prevFilters => 
        prevFilters.map(filter => {
          if (filter.id === 'completed') {
            return { ...filter, count: completedCount };
          } else if (filter.id === 'today') {
            return { ...filter, count: todayCount };
          } else if (filter.id === 'upcoming') {
            return { ...filter, count: upcomingCount };
          } else if (filter.id === 'important') {
            return { ...filter, count: importantCount };
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
