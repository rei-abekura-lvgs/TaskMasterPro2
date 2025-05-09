// GraphQL Queries
export const listTasks = /* GraphQL */ `
  query ListTasks($filter: ModelTaskFilterInput, $limit: Int, $nextToken: String) {
    listTasks(filter: $filter, limit: $limit, nextToken: $nextToken) {
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
      nextToken
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
  query ListCategories($filter: ModelCategoryFilterInput, $limit: Int, $nextToken: String) {
    listCategories(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        createdAt
      }
      nextToken
    }
  }
`;

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