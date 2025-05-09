import { useCallback } from 'react';
import { useLocation } from 'wouter';
import { useTaskContext } from '@/context/TaskContext';
import { categoryIcons } from '@/lib/utils';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewTaskModal: () => void;
};

export default function Sidebar({ isOpen, onClose, onOpenNewTaskModal }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { categories, filters, activeCategory, setActiveCategory, activeFilter, setActiveFilter } = useTaskContext();

  const handleCategoryClick = useCallback((category: string) => {
    setActiveCategory(category);
    setActiveFilter('');
    onClose();
  }, [setActiveCategory, setActiveFilter, onClose]);

  const handleFilterClick = useCallback((filter: string) => {
    setActiveFilter(filter);
    setActiveCategory('');
    onClose();
  }, [setActiveFilter, setActiveCategory, onClose]);

  const sidebarClasses = `
    ${isOpen ? 'fixed inset-y-0 left-0 z-30' : 'hidden'} 
    md:block w-64 bg-white dark:bg-neutral-800 shadow-md transition-all duration-300 flex-shrink-0
  `;

  return (
    <aside id="sidebar" className={sidebarClasses}>
      <div className="h-full flex flex-col">
        <div className="p-4">
          <button 
            onClick={onOpenNewTaskModal}
            className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary-dark text-white rounded-lg py-2 px-4 transition-colors shadow-md"
          >
            <span className="material-icons text-sm">add</span>
            <span>新しいタスク</span>
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto">
          {/* Categories */}
          <div className="px-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 px-3 py-2">カテゴリー</h2>
            <ul>
              <li>
                <a 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCategoryClick('all');
                  }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                    activeCategory === 'all' 
                      ? 'bg-gray-100 dark:bg-neutral-700 text-primary-dark dark:text-primary-light' 
                      : 'hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300'
                  } transition-colors`}
                >
                  <span className="material-icons text-sm">list</span>
                  <span>すべてのタスク</span>
                  <span className="ml-auto bg-gray-200 dark:bg-neutral-600 text-gray-800 dark:text-gray-200 text-xs rounded-full px-2 py-0.5">
                    {categories.find(c => c.id === 'all')?.count || 0}
                  </span>
                </a>
              </li>
              
              {categories
                .filter(category => category.id !== 'all')
                .map(category => (
                  <li key={category.id}>
                    <a 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        // カテゴリIDが数値型の場合は文字列に変換
                        const categoryId = typeof category.id === 'number' 
                          ? category.id.toString() 
                          : category.id;
                        handleCategoryClick(categoryId);
                      }}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                        activeCategory === (typeof category.id === 'number' ? category.id.toString() : category.id)
                          ? 'bg-gray-100 dark:bg-neutral-700 text-primary-dark dark:text-primary-light' 
                          : 'hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300'
                      } transition-colors`}
                    >
                      <span className="material-icons text-sm">{
                        typeof category.id === 'number' 
                          ? categoryIcons[category.id.toString()] || 'label'
                          : categoryIcons[category.id] || 'label'
                      }</span>
                      <span>{category.name}</span>
                      <span className="ml-auto bg-gray-200 dark:bg-neutral-600 text-gray-800 dark:text-gray-200 text-xs rounded-full px-2 py-0.5">
                        {category.count}
                      </span>
                    </a>
                  </li>
                ))}
            </ul>
          </div>
          
          <div className="border-t border-gray-200 dark:border-neutral-700 my-2"></div>
          
          {/* Filters */}
          <div className="px-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 px-3 py-2">フィルター</h2>
            <ul>
              {filters.map(filter => (
                <li key={filter.id}>
                  <a 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleFilterClick(filter.id);
                    }}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                      activeFilter === filter.id 
                        ? 'bg-gray-100 dark:bg-neutral-700 text-primary-dark dark:text-primary-light' 
                        : 'hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300'
                    } transition-colors`}
                  >
                    <span className="material-icons text-sm">{filter.icon}</span>
                    <span>{filter.name}</span>
                    <span className="ml-auto bg-gray-200 dark:bg-neutral-600 text-gray-800 dark:text-gray-200 text-xs rounded-full px-2 py-0.5">
                      {filter.count}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        
        <div className="p-4 border-t border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ストレージ: 4/10 MB
            </div>
            <a href="#" className="text-xs text-primary-dark dark:text-primary-light hover:underline">アップグレード</a>
          </div>
          <div className="mt-2 h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '40%' }}></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
