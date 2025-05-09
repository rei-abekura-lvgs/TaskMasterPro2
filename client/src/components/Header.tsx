export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  return (
    <header className="bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg z-10 text-white">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleSidebar}
              className="md:hidden p-2 rounded-full hover:bg-white/20 text-white transition-all duration-200 focus:ring-2 focus:ring-white/50 focus:outline-none"
              aria-label="メニューを開く"
            >
              <span className="material-icons">menu</span>
            </button>
            <div className="flex items-center space-x-2">
              <span className="material-icons text-2xl">check_circle</span>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">
                タスク管理
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center text-sm text-blue-100">
              <span className="material-icons mr-1 text-sm">date_range</span>
              <span>{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
