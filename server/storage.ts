import { tasks, categories, type Task, type InsertTask, type Category, type InsertCategory } from "@shared/schema";

export interface IStorage {
  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  getTasksByUserId(userId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Categories
  getCategory(id: number): Promise<Category | undefined>;
  getCategoriesByUserId(userId: string): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteCategory(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private tasks: Map<number, Task>;
  private categories: Map<number, Category>;
  private taskId: number;
  private categoryId: number;

  constructor() {
    this.tasks = new Map();
    this.categories = new Map();
    this.taskId = 1;
    this.categoryId = 1;
    
    // Initialize with default categories
    const defaultCategories = ['Work', 'Personal', 'Shopping', 'Health', 'Finance'];
    const userId = 'default-user';
    
    defaultCategories.forEach(name => {
      this.createCategory({ name, userId });
    });
  }

  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByUserId(userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.userId === userId);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskId++;
    const now = new Date();
    const task: Task = {
      ...insertTask,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    
    if (!existingTask) {
      return undefined;
    }
    
    const updatedTask: Task = {
      ...existingTask,
      ...updates,
      updatedAt: new Date()
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Category methods
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoriesByUserId(userId: string): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(category => category.userId === userId);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.categoryId++;
    const now = new Date();
    const category: Category = {
      ...insertCategory,
      id,
      createdAt: now
    };
    
    this.categories.set(id, category);
    return category;
  }

  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }
}

export const storage = new MemStorage();
