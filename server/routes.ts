import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for the local development server
  
  // Tasks routes
  app.get('/api/tasks', async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string, 10);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Valid User ID is required' });
      }
      
      const tasks = await storage.getTasksByUserId(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch tasks', error });
    }
  });

  app.get('/api/tasks/:id', async (req, res) => {
    try {
      const task = await storage.getTask(Number(req.params.id));
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch task', error });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create task', error });
    }
  });

  app.patch('/api/tasks/:id', async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      const task = await storage.updateTask(taskId, req.body);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update task', error });
    }
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      const result = await storage.deleteTask(Number(req.params.id));
      if (!result) {
        return res.status(404).json({ message: 'Task not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete task', error });
    }
  });

  // Categories routes
  app.get('/api/categories', async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string, 10);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Valid User ID is required' });
      }
      
      const categories = await storage.getCategoriesByUserId(userId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch categories', error });
    }
  });

  app.post('/api/categories', async (req, res) => {
    try {
      const category = await storage.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create category', error });
    }
  });

  app.delete('/api/categories/:id', async (req, res) => {
    try {
      const result = await storage.deleteCategory(Number(req.params.id));
      if (!result) {
        return res.status(404).json({ message: 'Category not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete category', error });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
