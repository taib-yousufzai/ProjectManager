import { Link, useLocation } from 'react-router-dom';
import styles from './Breadcrumb.module.css';

const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Define breadcrumb labels for different paths
  const breadcrumbLabels = {
    dashboard: 'Dashboard',
    projects: 'Projects',
    add: 'Add Project',
    payments: 'Payments',
    reports: 'Reports',
    settings: 'Settings'
  };

  // Don't show breadcrumbs on dashboard
  if (location.pathname === '/dashboard' || location.pathname === '/') {
    return null;
  }

  const breadcrumbs = [
    { path: '/dashboard', label: 'Dashboard' }
  ];

  let currentPath = '';
  pathnames.forEach((pathname, index) => {
    currentPath += `/${pathname}`;
    
    // Handle dynamic routes like /projects/:id
    if (pathname.match(/^[0-9a-f-]+$/)) {
      breadcrumbs.push({
        path: currentPath,
        label: 'Project Details',
        isLast: index === pathnames.length - 1
      });
    } else {
      breadcrumbs.push({
        path: currentPath,
        label: breadcrumbLabels[pathname] || pathname.charAt(0).toUpperCase() + pathname.slice(1),
        isLast: index === pathnames.length - 1
      });
    }
  });

  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <ol className={styles.breadcrumbList}>
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className={styles.breadcrumbItem}>
            {crumb.isLast ? (
              <span className={styles.breadcrumbCurrent} aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <>
                <Link to={crumb.path} className={styles.breadcrumbLink}>
                  {crumb.label}
                </Link>
                <span className={styles.breadcrumbSeparator} aria-hidden="true">
                  /
                </span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;