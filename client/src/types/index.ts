import { z } from 'zod';

// Task model - REST APIとGraphQLの両方に対応
export interface Task {
  id: number | string;  // REST APIは数値ID、GraphQLは文字列ID
  title: string;
  description?: string;
  dueDate?: string;
  categoryId?: number | string;  // REST APIは数値ID、GraphQLは文字列ID
  category?: string;  // カテゴリ名 (UI表示用)
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  userId?: number | string;  // REST APIは数値ID、GraphQLは文字列ID
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Validation schemas
export const createTaskSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  categoryId: z.union([z.number(), z.string()]).optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  completed: z.boolean().default(false),
  userId: z.number().optional()
});

export const updateTaskSchema = createTaskSchema.extend({
  id: z.number().optional() // コンテキストから取得するため省略可能
});

// Category type
export interface Category {
  id: string | number;
  name: string;
  count: number;
}

// Filter type
export interface Filter {
  id: string;
  name: string;
  icon: string;
  count: number;
}

// Task query responses
export interface ListTasksResponse {
  listTasks: {
    items: Task[];
  };
}

export interface GetTaskResponse {
  getTask: Task;
}

// Task mutation responses
export interface CreateTaskResponse {
  createTask: Task;
}

export interface UpdateTaskResponse {
  updateTask: Task;
}

export interface DeleteTaskResponse {
  deleteTask: {
    id: string;
  };
}
