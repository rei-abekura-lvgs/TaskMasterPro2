import { useCallback, useState } from 'react';
import { useLocation } from 'wouter';
import { useTaskContext } from '@/context/TaskContext';
import { categoryIcons } from '@/lib/utils';
import CategoryManageModal from './CategoryManageModal';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewTaskModal: () => void;
};

export default function Sidebar({ isOpen, onClose, onOpenNewTaskModal }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { categories, filters, activeCategory, setActiveCategory, activeFilter, setActiveFilter } = useTaskContext();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

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

  // モバイル向けマスク（サイドバー表示時に背景を半透明にして閉じるためのクリックエリアを作る）
  const mobileMask = isOpen ? (
    <div 
      className="fixed inset-0 bg-black/50 z-20 md:hidden" 
      onClick={onClose}
      aria-hidden="true"
    />
  ) : null;

  const sidebarClasses = `
    ${isOpen ? 'fixed inset-y-0 left-0 z-30 translate-x-0' : 'fixed inset-y-0 -translate-x-full md:translate-x-0 z-30'} 
    md:block w-72 bg-white shadow-xl transition-all duration-300 ease-in-out flex-shrink-0 transform
  `;

  return (
    <>
      {mobileMask}
      <aside id="sidebar" className={sidebarClasses}>
        <div className="h-full flex flex-col bg-gradient-to-b from-blue-50 to-white">
          <div className="p-5 border-b border-gray-100">
            <button 
              onClick={onOpenNewTaskModal}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 px-4 transition-colors shadow-md font-medium btn-primary"
            >
              <span className="material-icons">add</span>
              <span>新規タスク</span>
            </button>
          </div>
          
          <nav className="flex-1 overflow-y-auto pt-2">
            {/* Categories */}
            <div className="px-3 mb-4">
              <div className="flex items-center justify-between px-3 py-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center">
                  <span className="material-icons text-xs mr-1">folder</span>
                  カテゴリー
                </h2>
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="p-1.5 rounded-full hover:bg-white/80 transition-colors text-blue-500 hover:text-blue-600 border border-transparent hover:border-blue-100"
                  title="カテゴリーを管理"
                >
                  <span className="material-icons text-xs">settings</span>
                </button>
              </div>
              <ul className="space-y-1">
                <li>
                  <a 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCategoryClick('all');
                    }}
                    className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      activeCategory === 'all' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'hover:bg-white/80 text-gray-700 hover:text-blue-600'
                    } transition-all duration-200`}
                  >
                    <span className={`material-icons text-sm ${activeCategory === 'all' ? 'text-blue-500' : 'text-gray-500'}`}>
                      list
                    </span>
                    <span>すべてのタスク</span>
                    <span className={`ml-auto ${
                      activeCategory === 'all' 
                        ? 'bg-white text-blue-600' 
                        : 'bg-gray-100 text-gray-700'
                    } text-xs rounded-full px-2 py-1`}>
                      {categories.find(c => c.id === 'all')?.count || 0}
                    </span>
                  </a>
                </li>
                
                {categories
                  .filter(category => category.id !== 'all')
                  .map(category => {
                    // カテゴリIDが数値型の場合は文字列に変換
                    const categoryId = typeof category.id === 'number' 
                      ? category.id.toString() 
                      : category.id;
                      
                    const isActive = activeCategory === categoryId;
                    
                    return (
                      <li key={category.id}>
                        <a 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleCategoryClick(categoryId);
                          }}
                          className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                            isActive
                              ? 'bg-blue-100 text-blue-700' 
                              : 'hover:bg-white/80 text-gray-700 hover:text-blue-600'
                          } transition-all duration-200`}
                        >
                          <span className={`material-icons text-sm ${isActive ? 'text-blue-500' : 'text-gray-500'}`}>
                            {categoryIcons[categoryId] || 'label'}
                          </span>
                          <span>{category.name}</span>
                          <span className={`ml-auto ${
                            isActive
                              ? 'bg-white text-blue-600' 
                              : 'bg-gray-100 text-gray-700'
                          } text-xs rounded-full px-2 py-1`}>
                            {category.count}
                          </span>
                        </a>
                      </li>
                    );
                  })}
              </ul>
            </div>
            
            <div className="border-t border-gray-100 my-2 opacity-70"></div>
            
            {/* Filters */}
            <div className="px-3">
              <div className="px-3 py-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center">
                  <span className="material-icons text-xs mr-1">filter_list</span>
                  フィルター
                </h2>
              </div>
              <ul className="space-y-1">
                {filters.map(filter => {
                  const isActive = activeFilter === filter.id;
                  
                  // 優先度に応じた色を設定
                  let priorityColor = 'text-gray-500';
                  let activeBgColor = 'bg-blue-100';
                  let activeBadgeColor = 'bg-white text-blue-600';
                  
                  if (filter.id === 'high') {
                    priorityColor = isActive ? 'text-red-500' : 'text-red-400';
                    activeBgColor = 'bg-red-50';
                    activeBadgeColor = 'bg-white text-red-600';
                  } else if (filter.id === 'medium') {
                    priorityColor = isActive ? 'text-amber-500' : 'text-amber-400';
                    activeBgColor = 'bg-amber-50';
                    activeBadgeColor = 'bg-white text-amber-600';
                  } else if (filter.id === 'low') {
                    priorityColor = isActive ? 'text-green-500' : 'text-green-400';
                    activeBgColor = 'bg-green-50';
                    activeBadgeColor = 'bg-white text-green-600';
                  }
                  
                  return (
                    <li key={filter.id}>
                      <a 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleFilterClick(filter.id);
                        }}
                        className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                          isActive
                            ? `${activeBgColor} text-gray-800` 
                            : 'hover:bg-white/80 text-gray-700 hover:text-blue-600'
                        } transition-all duration-200`}
                      >
                        <span className={`material-icons text-sm ${priorityColor}`}>
                          {filter.icon}
                        </span>
                        <span>{filter.name}</span>
                        <span className={`ml-auto ${
                          isActive
                            ? activeBadgeColor
                            : 'bg-gray-100 text-gray-700'
                        } text-xs rounded-full px-2 py-1`}>
                          {filter.count}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
          
          <div className="p-5 border-t border-gray-100 bg-white/70">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 font-semibold">
                <span className="text-blue-500">タスク管理</span> アプリ v1.0
              </div>
              <div className="text-xs text-gray-400">
                © 2025
              </div>
            </div>
          </div>
        </div>
      </aside>
      
      <CategoryManageModal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)}
        userId={3} // 固定ユーザーID
      />
    </>
  );
}
