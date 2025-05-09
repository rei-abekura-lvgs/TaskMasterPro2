// GraphQL API 型定義
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  __typename: 'Task';
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority | null;
  completed: boolean;
  category?: {
    __typename: 'Category';
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  __typename: 'Category';
  id: string;
  name: string;
  tasks?: {
    __typename: 'ModelTaskConnection';
    items: Array<Task | null>;
    nextToken?: string | null;
  } | null;
  createdAt: string;
}

export interface ModelTaskConnection {
  __typename: 'ModelTaskConnection';
  items: Array<Task | null>;
  nextToken?: string | null;
}

export interface ModelCategoryConnection {
  __typename: 'ModelCategoryConnection';
  items: Array<Category | null>;
  nextToken?: string | null;
}

export interface CreateTaskInput {
  id?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority | null;
  completed: boolean;
  categoryId?: string | null;
}

export interface UpdateTaskInput {
  id: string;
  title?: string | null;
  description?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority | null;
  completed?: boolean | null;
  categoryId?: string | null;
}

export interface DeleteTaskInput {
  id: string;
}

export interface CreateCategoryInput {
  id?: string | null;
  name: string;
  ownerId?: string | null;
}

export interface DeleteCategoryInput {
  id: string;
}

export interface ModelTaskFilterInput {
  id?: ModelIDInput | null;
  title?: ModelStringInput | null;
  description?: ModelStringInput | null;
  dueDate?: ModelStringInput | null;
  priority?: ModelTaskPriorityInput | null;
  completed?: ModelBooleanInput | null;
  and?: Array<ModelTaskFilterInput | null> | null;
  or?: Array<ModelTaskFilterInput | null> | null;
  not?: ModelTaskFilterInput | null;
}

export interface ModelCategoryFilterInput {
  id?: ModelIDInput | null;
  name?: ModelStringInput | null;
  and?: Array<ModelCategoryFilterInput | null> | null;
  or?: Array<ModelCategoryFilterInput | null> | null;
  not?: ModelCategoryFilterInput | null;
}

export interface ModelIDInput {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
  size?: ModelSizeInput | null;
}

export interface ModelStringInput {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
  size?: ModelSizeInput | null;
}

export interface ModelTaskPriorityInput {
  eq?: TaskPriority | null;
  ne?: TaskPriority | null;
}

export interface ModelBooleanInput {
  ne?: boolean | null;
  eq?: boolean | null;
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
}

export enum ModelAttributeTypes {
  binary = 'binary',
  binarySet = 'binarySet',
  bool = 'bool',
  list = 'list',
  map = 'map',
  number = 'number',
  numberSet = 'numberSet',
  string = 'string',
  stringSet = 'stringSet',
  _null = '_null'
}

export interface ModelSizeInput {
  ne?: number | null;
  eq?: number | null;
  le?: number | null;
  lt?: number | null;
  ge?: number | null;
  gt?: number | null;
  between?: Array<number | null> | null;
}

export interface ModelTaskConditionInput {
  title?: ModelStringInput | null;
  description?: ModelStringInput | null;
  dueDate?: ModelStringInput | null;
  priority?: ModelTaskPriorityInput | null;
  completed?: ModelBooleanInput | null;
  and?: Array<ModelTaskConditionInput | null> | null;
  or?: Array<ModelTaskConditionInput | null> | null;
  not?: ModelTaskConditionInput | null;
}

export interface ModelCategoryConditionInput {
  name?: ModelStringInput | null;
  and?: Array<ModelCategoryConditionInput | null> | null;
  or?: Array<ModelCategoryConditionInput | null> | null;
  not?: ModelCategoryConditionInput | null;
}