import { useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import TaskList from '@/components/TaskList';
import CreateTaskModal from '@/components/CreateTaskModal';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const openNewTaskModal = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={closeSidebar} 
          onOpenNewTaskModal={openNewTaskModal} 
        />
        
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" 
            onClick={closeSidebar}
          ></div>
        )}
        
        <TaskList onOpenNewTaskModal={openNewTaskModal} />
      </div>
      
      <CreateTaskModal />
    </div>
  );
}
