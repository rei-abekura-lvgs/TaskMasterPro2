export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {

  return (
    <header className="bg-white shadow-md z-10">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleSidebar}
              className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <span className="material-icons">menu</span>
            </button>
            <h1 className="text-xl font-medium text-primary-dark">タスクマスター</h1>
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
                className="pl-10 pr-4 py-2 w-64 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
