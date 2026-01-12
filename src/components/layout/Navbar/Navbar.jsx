import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import NotificationBell from '../../common/NotificationBell/NotificationBell';
import { Menu, Search, ChevronDown, X } from 'lucide-react';
import styles from './Navbar.module.css';

const Navbar = ({ onToggleSidebar, isSidebarOpen }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const toggleMobileSearch = () => {
    setIsMobileSearchOpen(!isMobileSearchOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || 'User';
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContent}>
        {/* Left side - Logo and hamburger */}
        <div className={styles.leftSection}>
          <button
            className={styles.hamburger}
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          <div className={styles.logo}>
            <img src="/logo-v3.png" alt="ProjectTracker Logo" className={styles.logoImage} />
            <h2>ProjectTracker</h2>
          </div>
        </div>

        {/* Center - Search (hidden on mobile) */}
        <div className={styles.searchSection}>
          <div className={styles.searchContainer}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search projects, payments..."
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Right side - User menu */}
        <div className={styles.rightSection}>
          <button
            className={`${styles.notificationButton} ${styles.mobileSearchButton}`}
            onClick={toggleMobileSearch}
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          <NotificationBell />

          <div className={styles.userMenu}>
            <button
              className={styles.userButton}
              onClick={toggleUserMenu}
              aria-label="User menu"
            >
              <div className={styles.userAvatar}>
                <span>{getUserInitials()}</span>
              </div>
              <span className={styles.userName}>{getUserDisplayName()}</span>
              <ChevronDown size={14} className={styles.dropdownArrow} />
            </button>

            {isUserMenuOpen && (
              <div className={styles.userDropdown}>
                <Link to="/settings" className={styles.dropdownItem} onClick={() => setIsUserMenuOpen(false)}>
                  Profile
                </Link>
                <Link to="/settings" className={styles.dropdownItem} onClick={() => setIsUserMenuOpen(false)}>
                  Settings
                </Link>
                <hr className={styles.dropdownDivider} />
                <button
                  className={styles.dropdownItem}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className={styles.mobileSearchOverlay}>
          <div className={styles.mobileSearchContainer}>
            <input
              type="text"
              placeholder="Search projects, payments..."
              className={styles.mobileSearchInput}
              autoFocus
            />
            <button
              className={styles.mobileSearchClose}
              onClick={toggleMobileSearch}
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;