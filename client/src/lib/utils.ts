import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
// import { API, graphqlOperation } from 'aws-amplify';
// import { GraphQLQuery, GraphQLSubscription } from '@aws-amplify/api';
import { mockDataService } from './mockData';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: Date | string): string => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '年').replace(/\//g, '月') + '日';
};

export const priorityColors: Record<string, string> = {
  'low': 'bg-green-500',
  'medium': 'bg-yellow-500',
  'high': 'bg-red-500'
};

export const priorityLabels: Record<string, string> = {
  'low': '低',
  'medium': '中',
  'high': '高'
};

export const categoryIcons: Record<string, string> = {
  'all': 'list',
  'work': 'work',
  'personal': 'home',
  'shopping': 'shopping_cart',
  'health': 'favorite',
  'finance': 'attach_money'
};

// Helper for executing GraphQL queries with mock data
export async function executeQuery<T>(query: any, variables?: any): Promise<T> {
  console.log('Executing query:', query, 'with variables:', variables);
  
  try {
    // クエリのタイプに基づいて適切なモックデータを返す
    if (query.definitions && query.definitions[0]?.name?.value === 'ListTasks') {
      const filter = variables?.filter;
      const tasks = await mockDataService.getTasks(filter);
      return { listTasks: { items: tasks } } as unknown as T;
    }
    
    // その他のクエリの場合
    return { data: {} } as unknown as T;
  } catch (error) {
    console.error('Error executing mock query:', error);
    throw error;
  }
}

// Helper for executing GraphQL mutations with mock data
export async function executeMutation<T>(mutation: any, variables?: any): Promise<T> {
  console.log('Executing mutation:', mutation, 'with variables:', variables);
  
  try {
    // ミューテーションのタイプに基づいて適切な処理を行う
    if (mutation.definitions && mutation.definitions[0]?.name?.value === 'CreateTask') {
      const input = variables?.input;
      const newTask = await mockDataService.createTask(input);
      return { createTask: newTask } as unknown as T;
    }
    
    if (mutation.definitions && mutation.definitions[0]?.name?.value === 'UpdateTask') {
      const input = variables?.input;
      const updatedTask = await mockDataService.updateTask(input.id, input);
      return { updateTask: updatedTask } as unknown as T;
    }
    
    if (mutation.definitions && mutation.definitions[0]?.name?.value === 'DeleteTask') {
      const input = variables?.input;
      const result = await mockDataService.deleteTask(input.id);
      return { deleteTask: { id: input.id } } as unknown as T;
    }
    
    // サポートされていないミューテーション
    throw new Error('Unsupported mutation type');
  } catch (error) {
    console.error('Error executing mock mutation:', error);
    throw error;
  }
}

// Helper for creating GraphQL subscriptions (モックでは何もしない)
export function createSubscription<T>(subscription: any, variables?: any, callback?: (value: T) => void) {
  console.log('Creating subscription:', subscription, 'with variables:', variables);
  
  // サブスクリプションのモックオブジェクトを返す
  return {
    unsubscribe: () => {
      console.log('Unsubscribing from mock subscription');
    }
  };
}
