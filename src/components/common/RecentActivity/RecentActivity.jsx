import styles from './RecentActivity.module.css';

const RecentActivity = ({ activities, maxItems = 8 }) => {
  const activityData = activities || [];
  const displayedActivities = activityData.slice(0, maxItems);

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const getActivityTypeClass = (type) => {
    switch (type) {
      case 'payment_received':
        return styles.success;
      case 'payment_pending':
        return styles.warning;
      case 'project_completed':
        return styles.success;
      case 'project_created':
        return styles.info;
      default:
        return styles.neutral;
    }
  };

  // Show empty state if no activities
  if (displayedActivities.length === 0) {
    return (
      <div className={styles.activityContainer}>
        <div className={styles.header}>
          <h3 className={styles.title}>Recent Activity</h3>
          <p className={styles.subtitle}>Latest updates and actions</p>
        </div>

        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <h4 className={styles.emptyTitle}>No Activity Yet</h4>
          <p className={styles.emptyDescription}>
            Start creating projects and recording payments to see activity here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.activityContainer}>
      <div className={styles.header}>
        <h3 className={styles.title}>Recent Activity</h3>
        <p className={styles.subtitle}>Latest updates and actions</p>
      </div>

      <div className={styles.activityList}>
        {displayedActivities.map((activity) => (
          <div key={activity.id} className={styles.activityItem}>
            <div className={`${styles.activityIcon} ${getActivityTypeClass(activity.type)}`}>
              {activity.icon}
            </div>

            <div className={styles.activityContent}>
              <div className={styles.activityHeader}>
                <h4 className={styles.activityTitle}>{activity.title}</h4>
                <span className={styles.activityTime}>
                  {formatTimestamp(activity.timestamp)}
                </span>
              </div>

              <p className={styles.activityDescription}>
                {activity.description}
              </p>

              {activity.user && activity.user !== 'System' && (
                <span className={styles.activityUser}>by {activity.user}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button className={styles.viewAllButton}>
          View All Activity
        </button>
      </div>
    </div>
  );
};

export default RecentActivity;