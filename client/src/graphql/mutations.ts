// GraphQL Mutations
export const createTask = /* GraphQL */ `
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
      title
      description
      dueDate
      categoryId
      priority
      completed
      userId
      createdAt
      updatedAt
    }
  }
`;

export const updateTask = /* GraphQL */ `
  mutation UpdateTask($input: UpdateTaskInput!) {
    updateTask(input: $input) {
      id
      title
      description
      dueDate
      priority
      completed
      categoryId
      userId
      createdAt
      updatedAt
    }
  }
`;

export const deleteTask = /* GraphQL */ `
  mutation DeleteTask($input: DeleteTaskInput!) {
    deleteTask(input: $input) {
      id
      title
      description
      dueDate
      priority
      completed
      categoryId
      userId
      createdAt
      updatedAt
    }
  }
`;

export const createCategory = /* GraphQL */ `
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      name
      userId
      createdAt
    }
  }
`;

export const deleteCategory = /* GraphQL */ `
  mutation DeleteCategory(
    $input: DeleteCategoryInput!
    $condition: ModelCategoryConditionInput
  ) {
    deleteCategory(input: $input, condition: $condition) {
      id
      name
    }
  }
`;