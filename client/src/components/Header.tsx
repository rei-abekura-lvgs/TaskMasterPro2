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
          </div>
        </div>
      </div>
    </header>
  );
}
