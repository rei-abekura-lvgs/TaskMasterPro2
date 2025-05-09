import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TaskItem from './TaskItem';
import { useTaskContext } from '@/context/TaskContext';
import { Task } from '@/types';
import { gql } from '@apollo/client';
import { executeQuery } from '@/lib/utils';

const LIST_TASKS = gql`
  query ListTasks($filter: ModelTaskFilterInput) {
    listTasks(filter: $filter) {
      items {
        id
        title
        description
        dueDate
        category
        priority
        completed
        createdAt
        updatedAt
      }
    }
  }
`;

type SortOption = 'dateNewest' | 'dateOldest' | 'priority' | 'alphabetical';
type FilterType = 'all' | 'active' | 'completed';

export default function TaskList({ onOpenNewTaskModal }: { onOpenNewTaskModal: () => void }) {
  const [sortOption, setSortOption] = useState<SortOption>('dateNewest');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  
  const { activeCategory, activeFilter } = useTaskContext();
  
  // Build the filter based on active category and filter
  const buildFilter = () => {
    let filter: any = {};
    
    // Category filter
    if (activeCategory && activeCategory !== 'all') {
      filter.category = { eq: activeCategory };
    }
    
    // Special filters
    if (activeFilter) {
      switch (activeFilter) {
        case 'today':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          filter.dueDate = { 
            ge: today.toISOString(), 
            lt: tomorrow.toISOString() 
          };
          break;
        case 'upcoming':
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0);
          filter.dueDate = { ge: currentDate.toISOString() };
          break;
        case 'important':
          filter.priority = { eq: 'high' };
          break;
        case 'completed':
          filter.completed = { eq: true };
          break;
      }
    }
    
    // Additional UI filter
    if (filterType !== 'all') {
      filter.completed = { eq: filterType === 'completed' };
    }
    
    return filter;
  };
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', activeCategory, activeFilter, filterType],
    queryFn: async () => {
      const filter = buildFilter();
      const result = await executeQuery<{ listTasks: { items: Task[] } }>(LIST_TASKS, { filter });
      return result.listTasks.items;
    }
  });
  
  const sortTasks = (tasks: Task[]) => {
    if (!tasks) return [];
    
    const sortedTasks = [...tasks];
    
    switch (sortOption) {
      case 'dateNewest':
        return sortedTasks.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'dateOldest':
        return sortedTasks.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case 'priority': {
        const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return sortedTasks.sort((a, b) => 
          priorityWeight[b.priority] - priorityWeight[a.priority]
        );
      }
      case 'alphabetical':
        return sortedTasks.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sortedTasks;
    }
  };
  
  const sortedTasks = data ? sortTasks(data) : [];
  
  // Get current view title
  const getViewTitle = () => {
    if (activeFilter) {
      switch (activeFilter) {
        case 'today': return 'Today';
        case 'upcoming': return 'Upcoming';
        case 'important': return 'Important';
        case 'completed': return 'Completed';
        default: return 'All Tasks';
      }
    }
    
    if (activeCategory === 'all') return 'All Tasks';
    
    const categoryMap: Record<string, string> = {
      work: 'Work',
      personal: 'Personal',
      shopping: 'Shopping',
      health: 'Health',
      finance: 'Finance'
    };
    
    return categoryMap[activeCategory] || 'Tasks';
  };

  return (
    <main className="flex-1 overflow-hidden flex flex-col bg-gray-50 dark:bg-neutral-900">
      {/* Task Toolbar */}
      <div className="bg-white dark:bg-neutral-800 shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-medium">{getViewTitle()}</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
            {sortedTasks.length} tasks
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Filter dropdown */}
          <div className="relative">
            <button 
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <span className="material-icons">filter_list</span>
            </button>
            {filterMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-md shadow-lg py-1 z-10"
                onBlur={() => setFilterMenuOpen(false)}
              >
                <button 
                  onClick={() => {
                    setFilterType('all');
                    setFilterMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  All Tasks
                </button>
                <button 
                  onClick={() => {
                    setFilterType('active');
                    setFilterMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  Active Tasks
                </button>
                <button 
                  onClick={() => {
                    setFilterType('completed');
                    setFilterMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  Completed Tasks
                </button>
              </div>
            )}
          </div>
          
          {/* Sort dropdown */}
          <div className="relative">
            <button 
              onClick={() => setSortMenuOpen(!sortMenuOpen)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <span className="material-icons">sort</span>
            </button>
            {sortMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-md shadow-lg py-1 z-10"
                onBlur={() => setSortMenuOpen(false)}
              >
                <button 
                  onClick={() => {
                    setSortOption('dateNewest');
                    setSortMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  Date (Newest)
                </button>
                <button 
                  onClick={() => {
                    setSortOption('dateOldest');
                    setSortMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  Date (Oldest)
                </button>
                <button 
                  onClick={() => {
                    setSortOption('priority');
                    setSortMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  Priority
                </button>
                <button 
                  onClick={() => {
                    setSortOption('alphabetical');
                    setSortMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  Alphabetical
                </button>
              </div>
            )}
          </div>
          
          {/* Mobile search button */}
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors md:hidden">
            <span className="material-icons">search</span>
          </button>
          
          {/* New task button */}
          <button 
            onClick={onOpenNewTaskModal}
            className="flex items-center space-x-1 bg-primary hover:bg-primary-dark text-white rounded-lg py-2 px-3 transition-colors shadow-sm"
          >
            <span className="material-icons text-sm">add</span>
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>
      
      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tasks...</p>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 dark:text-red-400">
              <span className="material-icons text-3xl">error_outline</span>
            </div>
            <h3 className="mt-4 text-xl font-medium text-gray-700 dark:text-gray-300">Error loading tasks</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Please try again later</p>
            <button 
              className="mt-4 flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white rounded-lg py-2 px-4 transition-colors shadow-md"
              // Refetch the data
              onClick={() => window.location.reload()}
            >
              <span className="material-icons text-sm">refresh</span>
              <span>Retry</span>
            </button>
          </div>
        )}
        
        {/* Empty state */}
        {!isLoading && !error && sortedTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-200 dark:bg-neutral-700 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500">
              <span className="material-icons text-3xl">task_alt</span>
            </div>
            <h3 className="mt-4 text-xl font-medium text-gray-700 dark:text-gray-300">No tasks yet</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Create a new task to get started</p>
            <button 
              className="mt-4 flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white rounded-lg py-2 px-4 transition-colors shadow-md"
              onClick={onOpenNewTaskModal}
            >
              <span className="material-icons text-sm">add</span>
              <span>New Task</span>
            </button>
          </div>
        )}
        
        {/* Task grid */}
        {!isLoading && !error && sortedTasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
