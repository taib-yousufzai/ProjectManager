import { useNotifications } from '../../../hooks/useNotifications';
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../../../models';
import { formatDistanceToNow } from 'date-fns';
import styles from './NotificationDropdown.module.css';

const NotificationDropdown = ({ onNotificationClick, onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications({
    limitCount: 10,
    autoRefresh: true
  });

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.PAYMENT_ADDED:
        return '💰';
      case NOTIFICATION_TYPES.PAYMENT_REMINDER:
        return '⏰';
      case NOTIFICATION_TYPES.APPROVAL_PENDING:
        return '👥';
      case NOTIFICATION_TYPES.PROOF_UPLOADED:
        return '📎';
      case NOTIFICATION_TYPES.PAYMENT_VERIFIED:
        return '✅';
      case NOTIFICATION_TYPES.PROJECT_CREATED:
        return '📁';
      case NOTIFICATION_TYPES.PROJECT_COMPLETED:
        return '🎉';
      case NOTIFICATION_TYPES.SUMMARY_REPORT:
        return '📊';
      case NOTIFICATION_TYPES.SYSTEM_ALERT:
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case NOTIFICATION_PRIORITIES.URGENT:
        return styles.urgent;
      case NOTIFICATION_PRIORITIES.HIGH:
        return styles.high;
      case NOTIFICATION_PRIORITIES.MEDIUM:
        return styles.medium;
      case NOTIFICATION_PRIORITIES.LOW:
        return styles.low;
      default:
        return styles.medium;
    }
  };

  const formatNotificationTime = (createdAt) => {
    try {
      const date = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Recently';
    }
  };

  if (isLoading) {
    return (
      <div className={styles.dropdown}>
        <div className={styles.header}>
          <h3 className={styles.title}>Notifications</h3>
        </div>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dropdown}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          Notifications
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount}</span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            className={styles.markAllButton}
            onClick={handleMarkAllAsRead}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className={styles.notificationsList}>
        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔔</div>
            <p className={styles.emptyText}>No notifications yet</p>
            <p className={styles.emptySubtext}>
              You'll see updates about payments, projects, and approvals here
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`${styles.notificationItem} ${
                !notification.read ? styles.unread : ''
              } ${getPriorityClass(notification.priority)}`}
              onClick={() => onNotificationClick(notification)}
            >
              <div className={styles.notificationIcon}>
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className={styles.notificationContent}>
                <div className={styles.notificationHeader}>
                  <h4 className={styles.notificationTitle}>
                    {notification.title}
                  </h4>
                  <span className={styles.notificationTime}>
                    {formatNotificationTime(notification.createdAt)}
                  </span>
                </div>
                
                <p className={styles.notificationMessage}>
                  {notification.message}
                </p>
                
                {notification.metadata?.amount && (
                  <div className={styles.notificationMeta}>
                    Amount: ${notification.metadata.amount.toLocaleString()}
                  </div>
                )}
              </div>

              <button
                className={styles.deleteButton}
                onClick={(e) => handleDeleteNotification(e, notification.id)}
                aria-label="Delete notification"
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className={styles.footer}>
          <button
            className={styles.viewAllButton}
            onClick={() => {
              window.location.href = '/notifications';
              onClose();
            }}
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;