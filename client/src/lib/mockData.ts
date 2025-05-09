import { Task, Category } from '@/types';

// モックタスクデータ
const mockTasks: Task[] = [
  {
    id: 1,
    title: '買い物リストを作成する',
    description: '週末の買い物のための食材リストを作成する',
    dueDate: new Date(Date.now() + 86400000).toISOString(), // 明日の日付
    categoryId: 3,
    category: 'shopping',
    priority: 'medium',
    completed: false,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    title: '会議の準備',
    description: '明日の会議資料を準備し、プレゼンの練習をする',
    dueDate: new Date(Date.now() + 86400000).toISOString(), // 明日の日付
    categoryId: 1,
    category: 'work',
    priority: 'high',
    completed: false,
    userId: 1,
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000)
  },
  {
    id: 3,
    title: 'ジムに行く',
    description: '週3回のトレーニングルーティンを実行する',
    dueDate: new Date().toISOString(), // 今日の日付
    categoryId: 4,
    category: 'health',
    priority: 'low',
    completed: true,
    userId: 1,
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 43200000)
  },
  {
    id: 4,
    title: '請求書の支払い',
    description: '電気代と水道代の請求書を支払う',
    dueDate: new Date(Date.now() + 259200000).toISOString(), // 3日後の日付
    categoryId: 5,
    category: 'finance',
    priority: 'high',
    completed: false,
    userId: 1,
    createdAt: new Date(Date.now() - 259200000),
    updatedAt: new Date(Date.now() - 259200000)
  },
  {
    id: 5,
    title: '家族との夕食',
    description: '実家で家族と夕食を取る約束',
    dueDate: new Date(Date.now() + 432000000).toISOString(), // 5日後の日付
    categoryId: 2,
    category: 'personal',
    priority: 'medium',
    completed: false,
    userId: 1,
    createdAt: new Date(Date.now() - 345600000),
    updatedAt: new Date(Date.now() - 345600000)
  }
];

// モックカテゴリデータ
const mockCategories: Category[] = [
  { id: 'all', name: 'すべてのタスク', count: mockTasks.length },
  { id: 1, name: '仕事', count: mockTasks.filter(t => t.category === 'work').length },
  { id: 2, name: '個人', count: mockTasks.filter(t => t.category === 'personal').length },
  { id: 3, name: 'ショッピング', count: mockTasks.filter(t => t.category === 'shopping').length },
  { id: 4, name: '健康', count: mockTasks.filter(t => t.category === 'health').length },
  { id: 5, name: '金融', count: mockTasks.filter(t => t.category === 'finance').length }
];

// 簡易的なインメモリデータベース
let tasks = [...mockTasks];
let categories = [...mockCategories];

// ユニークIDの生成
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// モックサービス
export const mockDataService = {
  // タスク関連
  getTasks: (filter?: any): Promise<Task[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filteredTasks = [...tasks];
        
        if (filter) {
          // カテゴリーフィルター
          if (filter.category && filter.category.eq) {
            filteredTasks = filteredTasks.filter(task => task.category === filter.category.eq);
          }
          
          // 優先度フィルター
          if (filter.priority && filter.priority.eq) {
            filteredTasks = filteredTasks.filter(task => task.priority === filter.priority.eq);
          }
          
          // 完了状態フィルター
          if (filter.completed !== undefined && filter.completed.eq !== undefined) {
            filteredTasks = filteredTasks.filter(task => task.completed === filter.completed.eq);
          }
          
          // 日付フィルター（簡易版）
          if (filter.dueDate) {
            // 特定日以降
            if (filter.dueDate.ge) {
              const geDate = new Date(filter.dueDate.ge);
              filteredTasks = filteredTasks.filter(task => {
                if (!task.dueDate) return false;
                return new Date(task.dueDate) >= geDate;
              });
            }
            
            // 特定日以前
            if (filter.dueDate.lt) {
              const ltDate = new Date(filter.dueDate.lt);
              filteredTasks = filteredTasks.filter(task => {
                if (!task.dueDate) return false;
                return new Date(task.dueDate) < ltDate;
              });
            }
          }
        }
        
        resolve(filteredTasks);
      }, 300); // 遅延を追加して非同期処理をシミュレート
    });
  },
  
  getTask: (id: number): Promise<Task | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const task = tasks.find(t => t.id === id);
        resolve(task);
      }, 200);
    });
  },
  
  createTask: (taskData: Partial<Task>): Promise<Task> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date();
        const newId = Math.floor(Math.random() * 10000) + 6; // 簡易的なID生成
        const newTask: Task = {
          id: newId,
          title: taskData.title || '',
          description: taskData.description,
          dueDate: taskData.dueDate,
          categoryId: taskData.categoryId || 2,
          category: taskData.category || 'personal',
          priority: taskData.priority || 'medium',
          completed: taskData.completed || false,
          userId: 1,
          createdAt: now,
          updatedAt: now
        };
        
        tasks.push(newTask);
        updateCategoryCounts();
        
        resolve(newTask);
      }, 300);
    });
  },
  
  updateTask: (id: number, updates: Partial<Task>): Promise<Task | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = tasks.findIndex(t => t.id === id);
        if (index === -1) {
          resolve(undefined);
          return;
        }
        
        const updatedTask: Task = {
          ...tasks[index],
          ...updates,
          updatedAt: new Date()
        };
        
        tasks[index] = updatedTask;
        updateCategoryCounts();
        
        resolve(updatedTask);
      }, 300);
    });
  },
  
  deleteTask: (id: number): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const initialLength = tasks.length;
        tasks = tasks.filter(t => t.id !== id);
        
        if (initialLength !== tasks.length) {
          updateCategoryCounts();
          resolve(true);
        } else {
          resolve(false);
        }
      }, 300);
    });
  },
  
  // カテゴリー関連
  getCategories: (): Promise<Category[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...categories]);
      }, 200);
    });
  }
};

// カテゴリーのカウントを更新する内部ヘルパー関数
function updateCategoryCounts() {
  categories = categories.map(cat => {
    if (cat.id === 'all') {
      return { ...cat, count: tasks.length };
    }
    // カテゴリIDが数値型の場合は文字列に変換して比較
    const catId = typeof cat.id === 'number' ? cat.id.toString() : cat.id;
    return { 
      ...cat, 
      count: tasks.filter(t => {
        // カテゴリー名での比較またはカテゴリーIDでの比較
        return t.category === catId || (t.categoryId && t.categoryId === cat.id);
      }).length 
    };
  });
}

// モックデータ直接エクスポート（開発用）
export { tasks as mockTasks, categories as mockCategories };