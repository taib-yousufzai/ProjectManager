import styles from './LoadingSkeleton.module.css';

const LoadingSkeleton = ({ 
  width = '100%', 
  height = '1rem', 
  borderRadius = '4px',
  className = '',
  count = 1,
  variant = 'text'
}) => {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  ));

  return count === 1 ? skeletons[0] : <div className={styles.skeletonGroup}>{skeletons}</div>;
};

// Predefined skeleton components for common use cases
export const TextSkeleton = ({ lines = 3, className = '' }) => (
  <div className={`${styles.textSkeleton} ${className}`}>
    {Array.from({ length: lines }, (_, index) => (
      <LoadingSkeleton
        key={index}
        width={index === lines - 1 ? '60%' : '100%'}
        height="1rem"
        className={styles.textLine}
      />
    ))}
  </div>
);

export const CardSkeleton = ({ className = '' }) => (
  <div className={`${styles.cardSkeleton} ${className}`}>
    <div className={styles.cardHeader}>
      <LoadingSkeleton width="40%" height="1.5rem" />
      <LoadingSkeleton width="20%" height="1rem" />
    </div>
    <div className={styles.cardContent}>
      <TextSkeleton lines={2} />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`${styles.tableSkeleton} ${className}`}>
    {/* Table header */}
    <div className={styles.tableHeader}>
      {Array.from({ length: columns }, (_, index) => (
        <LoadingSkeleton key={index} width="80%" height="1rem" />
      ))}
    </div>
    
    {/* Table rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={rowIndex} className={styles.tableRow}>
        {Array.from({ length: columns }, (_, colIndex) => (
          <LoadingSkeleton key={colIndex} width="90%" height="1rem" />
        ))}
      </div>
    ))}
  </div>
);

export const StatsSkeleton = ({ className = '' }) => (
  <div className={`${styles.statsSkeleton} ${className}`}>
    <div className={styles.statsHeader}>
      <LoadingSkeleton width="60%" height="0.875rem" />
      <LoadingSkeleton width="2.5rem" height="2.5rem" borderRadius="8px" />
    </div>
    <LoadingSkeleton width="40%" height="2rem" className={styles.statsValue} />
    <LoadingSkeleton width="30%" height="0.875rem" />
  </div>
);

export default LoadingSkeleton;