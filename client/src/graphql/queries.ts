// GraphQL Queries
export const listTasks = /* GraphQL */ `
  query ListTasks {
    listTaskItems {
      items {
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
    listCategoryItems {
      items {
        id
        name
        createdAt
      }
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