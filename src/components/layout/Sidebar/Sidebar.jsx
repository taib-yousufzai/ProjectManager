import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CreditCard, TrendingUp, Bell, DollarSign, FileText, Settings, Plus, Briefcase } from 'lucide-react';
import styles from './Sidebar.module.css';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    {
      section: 'Main',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/clients', label: 'Clients', icon: Briefcase },
        { path: '/projects', label: 'Projects', icon: FolderKanban },
        { path: '/payments', label: 'Payments', icon: CreditCard },
        { path: '/reports', label: 'Reports', icon: TrendingUp },
        { path: '/notifications', label: 'Notifications', icon: Bell },
      ]
    },
    {
      section: 'Management',
      items: [
        { path: '/revenue-rules', label: 'Revenue Rules', icon: DollarSign },
        { path: '/ledger', label: 'Ledger', icon: FileText },
        { path: '/settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.sidebarContent}>
          {/* Quick Actions */}
          <div className={styles.quickActions}>
            <Link to="/projects/add" className={styles.addButton} onClick={onClose}>
              <Plus size={18} className={styles.addIcon} />
              Add Project
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className={styles.navigation}>
            {menuItems.map((section) => (
              <div key={section.section} className={styles.menuSection}>
                <h3 className={styles.sectionTitle}>{section.section}</h3>
                <ul className={styles.menuList}>
                  {section.items.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <li key={item.path} className={styles.menuItem}>
                        <Link
                          to={item.path}
                          className={`${styles.menuLink} ${isActive(item.path) ? styles.active : ''
                            }`}
                          onClick={onClose}
                        >
                          <IconComponent size={18} className={styles.menuIcon} />
                          <span className={styles.menuLabel}>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className={styles.sidebarFooter}>
            <div className={styles.footerContent}>
              <p className={styles.footerText}>
                ProjectTracker v1.0
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;