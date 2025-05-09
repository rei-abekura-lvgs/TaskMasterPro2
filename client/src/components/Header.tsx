import { useState } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
// import { useAuth } from 'aws-amplify';

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  // const { signOut, user } = useAuth();
  
  // モックユーザー情報
  const mockUser = {
    name: 'テストユーザー'
  };

  // Get user initials from the user's name
  const getUserInitials = () => {
    return 'TU'; // テストユーザーの頭文字
  };

  const displayName = mockUser.name;

  return (
    <header className="bg-white dark:bg-neutral-800 shadow-md z-10">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleSidebar}
              className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <span className="material-icons">menu</span>
            </button>
            <h1 className="text-xl font-medium text-primary-dark dark:text-primary-light">タスクマスター</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search input - hidden on mobile */}
            <div className="hidden md:flex relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-icons text-gray-400 text-sm">search</span>
              </span>
              <input 
                type="text" 
                placeholder="タスクを検索..." 
                className="pl-10 pr-4 py-2 w-64 rounded-lg bg-gray-100 dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            
            {/* Dark mode toggle */}
            <div className="flex items-center space-x-2">
              <span className="material-icons text-yellow-500 text-sm">light_mode</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isDarkMode}
                  onChange={toggleDarkMode}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary"></div>
              </label>
              <span className="material-icons text-blue-800 dark:text-gray-400 text-sm">dark_mode</span>
            </div>
            
            {/* User profile */}
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)} 
                className="flex items-center space-x-1 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                  <span className="text-sm font-medium">{getUserInitials()}</span>
                </div>
                <span className="hidden md:inline text-sm font-medium">{displayName}</span>
                <span className="material-icons text-sm">arrow_drop_down</span>
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-md shadow-lg py-1 z-50">
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700">プロフィール</a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700">設定</a>
                  <div className="border-t border-gray-200 dark:border-neutral-700"></div>
                  <button 
                    onClick={() => alert('サインアウト機能は現在実装されていません')} 
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-neutral-700"
                  >
                    サインアウト
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
