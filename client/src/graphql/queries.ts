// GraphQL Queries
export const listTasks = /* GraphQL */ `
  query GetUserTasks($userId: ID!) {
    getUserTasks(userId: $userId) {
      id
      title
      description
      dueDate
      priority
      completed
      userId
      categoryId
      createdAt
      updatedAt
    }
  }
`;

export const getTask = /* GraphQL */ `
  query GetTask($id: ID!) {
    getTask(id: $id) {
      id
      title
      description
      dueDate
      priority
      completed
      category {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

export const listCategories = /* GraphQL */ `
  query ListCategories {
    listCategories {
      items {
        id
        name
        createdAt
      }
    }
  }
`;

export const getUserCategories = /* GraphQL */ `
  query GetUserCategories($userId: ID!) {
    getUserCategories(userId: $userId) {
      id
      name
      createdAt
    }
  }
`;

// カテゴリーIDでフィルタリングしたタスクの取得
export const getTasksByCategory = /* GraphQL */ `
  query GetTasksByCategory($categoryId: ID!) {
    getTasksByCategory(categoryId: $categoryId) {
      id
      title
      description
      dueDate
      priority
      completed
      category {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

// 優先度でフィルタリングしたタスクの取得
export const getTasksByPriority = /* GraphQL */ `
  query GetTasksByPriority($priority: TaskPriority!) {
    getTasksByPriority(priority: $priority) {
      id
      title
      description
      dueDate
      priority
      completed
      category {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;