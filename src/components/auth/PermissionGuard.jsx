import { useAuth } from '../../hooks/useAuth';
import { hasPermission, hasAnyPermission } from '../../services/permissionsService';

/**
 * Permission Guard Component
 * Renders children only if user has required permissions
 */
const PermissionGuard = ({ 
  children, 
  permission, 
  permissions, 
  requireAll = false,
  fallback = null,
  onUnauthorized = null 
}) => {
  const { user } = useAuth();
  
  if (!user) {
    return fallback;
  }
  
  let hasAccess = false;
  
  if (permission) {
    // Single permission check
    hasAccess = hasPermission(user, permission);
  } else if (permissions && Array.isArray(permissions)) {
    // Multiple permissions check
    if (requireAll) {
      hasAccess = permissions.every(perm => hasPermission(user, perm));
    } else {
      hasAccess = permissions.some(perm => hasPermission(user, perm));
    }
  } else {
    // No permissions specified, allow access
    hasAccess = true;
  }
  
  if (!hasAccess) {
    if (onUnauthorized) {
      onUnauthorized();
    }
    return fallback;
  }
  
  return children;
};

/**
 * Higher-order component for permission-based route protection
 */
export const withPermissions = (Component, requiredPermissions, options = {}) => {
  const WrappedComponent = (props) => {
    const { user } = useAuth();
    const { 
      fallback = <div>Access Denied</div>, 
      requireAll = false,
      onUnauthorized = null 
    } = options;
    
    if (!user) {
      return fallback;
    }
    
    let hasAccess = false;
    
    if (typeof requiredPermissions === 'string') {
      hasAccess = hasPermission(user, requiredPermissions);
    } else if (Array.isArray(requiredPermissions)) {
      if (requireAll) {
        hasAccess = requiredPermissions.every(perm => hasPermission(user, perm));
      } else {
        hasAccess = requiredPermissions.some(perm => hasPermission(user, perm));
      }
    }
    
    if (!hasAccess) {
      if (onUnauthorized) {
        onUnauthorized();
      }
      return fallback;
    }
    
    return <Component {...props} />;
  };
  
  WrappedComponent.displayName = `withPermissions(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

/**
 * Hook for checking permissions in components
 */
export const usePermissions = () => {
  const { user } = useAuth();
  
  return {
    hasPermission: (permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions) => hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions) => permissions.every(perm => hasPermission(user, perm)),
    user
  };
};

export default PermissionGuard;