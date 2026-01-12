import { useApp } from '../../../contexts/AppContext';
import Toast from '../Toast';
import styles from './NotificationSystem.module.css';

const NotificationSystem = () => {
  const { notifications, ui, removeNotification, hideToast } = useApp();

  return (
    <div className={styles.notificationSystem}>
      {/* Toast notifications */}
      {ui.toast && (
        <Toast
          message={ui.toast.message}
          type={ui.toast.type}
          onClose={hideToast}
          position={ui.toast.position}
        />
      )}

      {/* System notifications */}
      <div className={styles.notificationContainer}>
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`${styles.notification} ${styles[notification.type]}`}
          >
            <div className={styles.notificationContent}>
              <div className={styles.notificationHeader}>
                <h4 className={styles.notificationTitle}>
                  {notification.title}
                </h4>
                <button
                  className={styles.closeButton}
                  onClick={() => removeNotification(notification.id)}
                  aria-label="Close notification"
                >
                  ×
                </button>
              </div>
              {notification.message && (
                <p className={styles.notificationMessage}>
                  {notification.message}
                </p>
              )}
              {notification.actions && (
                <div className={styles.notificationActions}>
                  {notification.actions.map((action, index) => (
                    <button
                      key={index}
                      className={`${styles.actionButton} ${styles[action.type]}`}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationSystem;