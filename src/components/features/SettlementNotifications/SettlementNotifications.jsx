import { useState } from 'react';
import { useSettlementNotifications } from '../../../hooks/useSettlementNotifications';
import Button from '../../common/Button';
import LoadingSkeleton from '../../common/LoadingSkeleton';
import styles from './SettlementNotifications.module.css';

const SettlementNotifications = ({ showAll = false, limit = 5 }) => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useSettlementNotifications();

  const [expandedNotifications, setExpandedNotifications] = useState(new Set());

  const displayNotifications = showAll ? notifications : notifications.slice(0, limit);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const toggleExpanded = (notificationId) => {
    const newExpanded = new Set(expandedNotifications);
    if (newExpanded.has(notificationId)) {
      newExpanded.delete(notificationId);
    } else {
      newExpanded.add(notificationId);
    }
    setExpandedNotifications(newExpanded);
  };

  const formatDate = (date) => {
    const notificationDate = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffInHours = (now - notificationDate) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return notificationDate.toLocaleDateString();
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'settlement_completed':
        return '✅';
      case 'settlement_reminder':
        return '⏰';
      case 'ledger_entry_created':
        return '📊';
      default:
        return '📋';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'urgent':
        return styles.urgent;
      case 'high':
        return styles.high;
      case 'medium':
        return styles.medium;
      case 'low':
        return styles.low;
      default:
        return styles.medium;
    }
  };

  if (loading) {
    return (
      <div className={styles.settlementNotifications}>
        <div className={styles.header}>
          <h3>Settlement Notifications</h3>
        </div>
        <LoadingSkeleton count={3} height={60} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.settlementNotifications}>
        <div className={styles.header}>
          <h3>Settlement Notifications</h3>
        </div>
        <div className={styles.error}>
          <p>Error loading notifications: {error}</p>
          <Button variant="secondary" size="small" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settlementNotifications}>
      <div className={styles.header}>
        <h3>
          Settlement Notifications
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount}</span>
          )}
        </h3>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="small"
            onClick={markAllAsRead}
          >
            Mark All Read
          </Button>
        )}
      </div>

      {displayNotifications.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔔</div>
          <p>No settlement notifications</p>
          <p className={styles.emptySubtext}>
            You'll see notifications about settlements, ledger entries, and reminders here.
          </p>
        </div>
      ) : (
        <div className={styles.notificationsList}>
          {displayNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`${styles.notificationItem} ${
                !notification.read ? styles.unread : ''
              } ${getPriorityClass(notification.priority)}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className={styles.notificationHeader}>
                <div className={styles.notificationIcon}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className={styles.notificationContent}>
                  <div className={styles.notificationTitle}>
                    {notification.title}
                  </div>
                  <div className={styles.notificationTime}>
                    {formatDate(notification.createdAt)}
                  </div>
                </div>
                <div className={styles.notificationActions}>
                  {notification.message.length > 100 && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(notification.id);
                      }}
                    >
                      {expandedNotifications.has(notification.id) ? 'Less' : 'More'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    ×
                  </Button>
                </div>
              </div>
              
              <div className={styles.notificationMessage}>
                {expandedNotifications.has(notification.id) || notification.message.length <= 100
                  ? notification.message
                  : `${notification.message.substring(0, 100)}...`
                }
              </div>

              {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                <div className={styles.notificationMetadata}>
                  {notification.metadata.amount && notification.metadata.currency && (
                    <span className={styles.metadataItem}>
                      Amount: {notification.metadata.amount} {notification.metadata.currency}
                    </span>
                  )}
                  {notification.metadata.party && (
                    <span className={styles.metadataItem}>
                      Party: {notification.metadata.party}
                    </span>
                  )}
                  {notification.metadata.entryCount && (
                    <span className={styles.metadataItem}>
                      Entries: {notification.metadata.entryCount}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!showAll && notifications.length > limit && (
        <div className={styles.footer}>
          <Button
            variant="secondary"
            onClick={() => window.location.href = '/notifications?filter=settlement'}
          >
            View All Settlement Notifications ({notifications.length})
          </Button>
        </div>
      )}
    </div>
  );
};

export default SettlementNotifications;