import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Card from '../../common/Card/Card';
import LoadingSkeleton from '../../common/LoadingSkeleton/LoadingSkeleton';
import { PARTY_TYPES } from '../../../models';
import styles from './BalanceCard.module.css';

const BalanceCard = ({
  party,
  balance,
  isLoading = false,
  currency = 'USD',
  showBreakdown = true,
  onSettlementClick,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (amount, curr = currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const getPartyDisplayName = (partyType) => {
    return partyType.charAt(0).toUpperCase() + partyType.slice(1);
  };

  const getPartyIcon = (partyType) => {
    switch (partyType) {
      case PARTY_TYPES.ADMIN:
        return '👑';
      case PARTY_TYPES.TEAM:
        return '👥';
      case PARTY_TYPES.VENDOR:
        return '🏢';
      default:
        return '💼';
    }
  };

  const getBalanceStatusClass = (netBalance) => {
    if (netBalance > 0) return styles.positiveBalance;
    if (netBalance < 0) return styles.negativeBalance;
    return styles.neutralBalance;
  };

  const getBalanceStatusText = (netBalance) => {
    if (netBalance > 0) return 'Credit Balance';
    if (netBalance < 0) return 'Debit Balance';
    return 'Zero Balance';
  };

  const getBalanceStatusIcon = (netBalance) => {
    if (netBalance > 0) return '📈';
    if (netBalance < 0) return '📉';
    return '⚖️';
  };

  const hasPendingAmount = balance?.totalPending && Math.abs(balance.totalPending) > 0.01;
  const hasSettlableAmount = hasPendingAmount && balance.totalPending > 0;

  if (isLoading) {
    return (
      <Card className={`${styles.balanceCard} ${className}`}>
        <LoadingSkeleton height="120px" />
      </Card>
    );
  }

  if (!balance) {
    return (
      <Card className={`${styles.balanceCard} ${styles.noData} ${className}`}>
        <div className={styles.noDataContent}>
          <div className={styles.partyHeader}>
            <span className={styles.partyIcon}>{getPartyIcon(party)}</span>
            <h3 className={styles.partyName}>{getPartyDisplayName(party)}</h3>
          </div>
          <div className={styles.noDataMessage}>
            <span>No balance data available</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${styles.balanceCard} ${className}`}>
      <div className={styles.cardHeader}>
        <div className={styles.partyHeader}>
          <span className={styles.partyIcon}>{getPartyIcon(party)}</span>
          <div className={styles.partyInfo}>
            <h3 className={styles.partyName}>{getPartyDisplayName(party)}</h3>
            <span className={styles.partyCurrency}>{currency}</span>
          </div>
        </div>
        
        <div className={styles.balanceStatus}>
          <span className={styles.statusIcon}>
            {getBalanceStatusIcon(balance.netBalance)}
          </span>
          <span className={`${styles.statusText} ${getBalanceStatusClass(balance.netBalance)}`}>
            {getBalanceStatusText(balance.netBalance)}
          </span>
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.mainBalance}>
          <div className={styles.balanceLabel}>Net Balance</div>
          <div className={`${styles.balanceAmount} ${getBalanceStatusClass(balance.netBalance)}`}>
            {formatCurrency(balance.netBalance)}
          </div>
        </div>

        {showBreakdown && (
          <div className={styles.balanceBreakdown}>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>Pending</span>
              <span className={`${styles.breakdownAmount} ${balance.totalPending > 0 ? styles.pendingCredit : styles.pendingDebit}`}>
                {formatCurrency(balance.totalPending)}
              </span>
            </div>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>Cleared</span>
              <span className={`${styles.breakdownAmount} ${balance.totalCleared > 0 ? styles.clearedCredit : styles.clearedDebit}`}>
                {formatCurrency(balance.totalCleared)}
              </span>
            </div>
          </div>
        )}

        {hasPendingAmount && (
          <div className={styles.pendingAlert}>
            <div className={styles.alertIcon}>⏳</div>
            <div className={styles.alertContent}>
              <span className={styles.alertText}>
                {balance.totalPending > 0 
                  ? `${formatCurrency(balance.totalPending)} pending payout`
                  : `${formatCurrency(Math.abs(balance.totalPending))} pending charge`
                }
              </span>
              {hasSettlableAmount && onSettlementClick && (
                <button
                  className={styles.settlementButton}
                  onClick={() => onSettlementClick(party, balance)}
                  type="button"
                >
                  Settle Now
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showBreakdown && (
        <div className={styles.cardFooter}>
          <button
            className={styles.expandButton}
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </button>
          
          {isExpanded && (
            <div className={styles.expandedDetails}>
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Last Updated</span>
                  <span className={styles.detailValue}>
                    {balance.lastUpdated 
                      ? new Date(balance.lastUpdated).toLocaleString()
                      : 'Never'
                    }
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Party Type</span>
                  <span className={styles.detailValue}>{getPartyDisplayName(party)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Currency</span>
                  <span className={styles.detailValue}>{currency}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={`${styles.detailValue} ${getBalanceStatusClass(balance.netBalance)}`}>
                    {getBalanceStatusText(balance.netBalance)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

BalanceCard.propTypes = {
  party: PropTypes.oneOf(Object.values(PARTY_TYPES)).isRequired,
  balance: PropTypes.shape({
    totalPending: PropTypes.number,
    totalCleared: PropTypes.number,
    netBalance: PropTypes.number,
    currency: PropTypes.string,
    lastUpdated: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)])
  }),
  isLoading: PropTypes.bool,
  currency: PropTypes.string,
  showBreakdown: PropTypes.bool,
  onSettlementClick: PropTypes.func,
  className: PropTypes.string
};

export default BalanceCard;