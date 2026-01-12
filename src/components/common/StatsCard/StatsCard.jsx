import { TrendingUp, TrendingDown } from 'lucide-react';
import styles from './StatsCard.module.css';

const StatsCard = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  subtitle
}) => {
  const getChangeClass = () => {
    switch (changeType) {
      case 'positive':
        return styles.positive;
      case 'negative':
        return styles.negative;
      default:
        return styles.neutral;
    }
  };

  return (
    <div className={styles.statsCard}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {icon && <div className={styles.iconContainer}>{icon}</div>}
      </div>

      <div className={styles.content}>
        <div className={styles.value}>{value}</div>
        {change && (
          <div className={`${styles.change} ${getChangeClass()}`}>
            {changeType === 'positive' && <TrendingUp size={14} />}
            {changeType === 'negative' && <TrendingDown size={14} />}
            <span>{change}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;