import React from 'react';
import styles from './Card.module.css';

const Card = ({
  title,
  subtitle,
  actions,
  padding = 'medium',
  shadow = true,
  children,
  className = '',
  onClick,
  ...props
}) => {
  const cardClasses = [
    styles.card,
    styles[`card--padding-${padding}`],
    shadow && styles['card--shadow'],
    onClick && styles['card--clickable'],
    className
  ].filter(Boolean).join(' ');

  const hasHeader = title || subtitle || actions;

  const CardComponent = onClick ? 'button' : 'div';

  return (
    <CardComponent
      className={cardClasses}
      onClick={onClick}
      {...props}
    >
      {hasHeader && (
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderContent}>
            {title && (
              <h3 className={styles.cardTitle}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className={styles.cardSubtitle}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className={styles.cardActions}>
              {actions}
            </div>
          )}
        </div>
      )}
      {children && (
        <div className={styles.cardContent}>
          {children}
        </div>
      )}
    </CardComponent>
  );
};

export default Card;