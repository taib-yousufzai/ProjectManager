import { useState, useMemo } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../../models';
import { formatDistanceToNow, format } from 'date-fns';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import LoadingSkeleton from '../../components/common/LoadingSkeleton/LoadingSkeleton';
import styles from './Notifications.module.css';

const Notifications = () => {
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications({
    limitCount: 100,
    autoRefresh: true
  });

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }

    // Filter by read status
    if (filterRead === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filterRead === 'read') {
      filtered = filtered.filter(n => n.read);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(term) ||
        n.message.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [notifications, filterType, filterRead, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredNotifications.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNotifications, currentPage, itemsPerPage]);

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
      return {
        relative: formatDistanceToNow(date, { addSuffix: true }),
        absolute: format(date, 'MMM d, yyyy h:mm a')
      };
    } catch (error) {
      return {
        relative: 'Recently',
        absolute: 'Unknown time'
      };
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate to action URL if provided
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (notificationId) => {
    await deleteNotification(notificationId);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className={styles.notificationsPage}>
        <div className={styles.header}>
          <LoadingSkeleton width="200px" height="2rem" />
          <LoadingSkeleton width="150px" height="2.5rem" />
        </div>
        <div className={styles.filters}>
          <LoadingSkeleton width="100%" height="3rem" />
        </div>
        <div className={styles.notificationsList}>
          {[...Array(5)].map((_, i) => (
            <LoadingSkeleton key={i} width="100%" height="6rem" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.notificationsPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Notifications</h1>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>
              {unreadCount} unread
            </span>
          )}
        </div>
        
        <div className={styles.headerActions}>
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <Card className={styles.filtersCard}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <Input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={setSearchTerm}
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Type</label>
            <select
              className={styles.filterSelect}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value={NOTIFICATION_TYPES.PAYMENT_ADDED}>Payment Added</option>
              <option value={NOTIFICATION_TYPES.PAYMENT_REMINDER}>Payment Reminder</option>
              <option value={NOTIFICATION_TYPES.APPROVAL_PENDING}>Approval Pending</option>
              <option value={NOTIFICATION_TYPES.PROOF_UPLOADED}>Proof Uploaded</option>
              <option value={NOTIFICATION_TYPES.PAYMENT_VERIFIED}>Payment Verified</option>
              <option value={NOTIFICATION_TYPES.PROJECT_CREATED}>Project Created</option>
              <option value={NOTIFICATION_TYPES.PROJECT_COMPLETED}>Project Completed</option>
              <option value={NOTIFICATION_TYPES.SUMMARY_REPORT}>Summary Report</option>
              <option value={NOTIFICATION_TYPES.SYSTEM_ALERT}>System Alert</option>
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Status</label>
            <select
              className={styles.filterSelect}
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </div>
      </Card>

      <div className={styles.notificationsList}>
        {filteredNotifications.length === 0 ? (
          <Card className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔔</div>
            <h3 className={styles.emptyTitle}>No notifications found</h3>
            <p className={styles.emptyText}>
              {searchTerm || filterType !== 'all' || filterRead !== 'all'
                ? 'Try adjusting your filters to see more notifications.'
                : 'You\'ll see updates about payments, projects, and approvals here.'}
            </p>
          </Card>
        ) : (
          paginatedNotifications.map((notification) => {
            const timeInfo = formatNotificationTime(notification.createdAt);
            
            return (
              <Card
                key={notification.id}
                className={`${styles.notificationCard} ${
                  !notification.read ? styles.unread : ''
                } ${getPriorityClass(notification.priority)}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={styles.notificationContent}>
                  <div className={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className={styles.notificationBody}>
                    <div className={styles.notificationHeader}>
                      <h3 className={styles.notificationTitle}>
                        {notification.title}
                      </h3>
                      <div className={styles.notificationTime}>
                        <span className={styles.relativeTime}>
                          {timeInfo.relative}
                        </span>
                        <span className={styles.absoluteTime}>
                          {timeInfo.absolute}
                        </span>
                      </div>
                    </div>
                    
                    <p className={styles.notificationMessage}>
                      {notification.message}
                    </p>
                    
                    {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                      <div className={styles.notificationMeta}>
                        {notification.metadata.amount && (
                          <span className={styles.metaItem}>
                            Amount: ${notification.metadata.amount.toLocaleString()}
                          </span>
                        )}
                        {notification.metadata.projectId && (
                          <span className={styles.metaItem}>
                            Project ID: {notification.metadata.projectId}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.notificationActions}>
                    {!notification.read && (
                      <button
                        className={styles.markReadButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        title="Mark as read"
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </button>
                    )}
                    
                    <button
                      className={styles.deleteButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      title="Delete notification"
                    >
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="secondary"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </Button>
          
          <div className={styles.pageNumbers}>
            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  className={`${styles.pageButton} ${
                    currentPage === page ? styles.active : ''
                  }`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              );
            })}
          </div>
          
          <Button
            variant="secondary"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default Notifications;