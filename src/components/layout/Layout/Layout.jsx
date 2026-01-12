import { useState } from 'react';
import Navbar from '../Navbar';
import Sidebar from '../Sidebar';
import Breadcrumb from '../../common/Breadcrumb';
import NotificationSystem from '../../common/NotificationSystem';
import ErrorBoundary from '../../common/ErrorBoundary';
import { useApp } from '../../../contexts/AppContext';
import styles from './Layout.module.css';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={styles.layout}>
      <ErrorBoundary
        title="Navigation Error"
        message="There was a problem with the navigation. Please refresh the page."
        showReload={true}
      >
        <Navbar 
          onToggleSidebar={toggleSidebar} 
          isSidebarOpen={isSidebarOpen}
        />
      </ErrorBoundary>
      
      <div className={styles.container}>
        <ErrorBoundary
          title="Sidebar Error"
          message="There was a problem with the sidebar navigation."
        >
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={closeSidebar}
          />
        </ErrorBoundary>
        
        <main className={`${styles.main} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.content}>
            <ErrorBoundary
              title="Breadcrumb Error"
              message="There was a problem with the navigation breadcrumbs."
            >
              <Breadcrumb />
            </ErrorBoundary>
            
            <ErrorBoundary
              title="Page Error"
              message="There was a problem loading this page content."
              showReload={true}
            >
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
      
      {/* Global notification system */}
      <ErrorBoundary
        title="Notification Error"
        message="There was a problem with the notification system."
      >
        <NotificationSystem />
      </ErrorBoundary>
    </div>
  );
};

export default Layout;