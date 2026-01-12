import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../../common/StatsCard';
import styles from './PendingPayoutCard.module.css';

const PendingPayoutCard = ({ 
  party, 
  amount, 
  currency = 'USD', 
  entryCount = 0, 
  error = null,
  showDetails = true,
  onClick = null 
}) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPartyIcon = (party) => {
    switch (party) {
      case 'admin':
        return '👑';
      case 'team':
        return '👥';
      case 'vendor':
        return '🏢';
      default:
        return '💰';
    }
  };

  const getPartyLabel = (party) => {
    switch (party) {
      case 'admin':
        return 'Admin';
      case 'team':
        return 'Team';
      case 'vendor':
        return 'Vendor';
      default:
        return party;
    }
  };

  const getChangeType = () => {
    if (error) return 'negative';
    if (amount > 0) return 'warning'; // Pending payouts need attention
    return 'neutral';
  };

  const getChangeText = () => {
    if (error) return 'Error loading';
    if (amount > 0) {
      return entryCount > 0 ? `${entryCount} pending ${entryCount === 1 ? 'entry' : 'entries'}` : 'Needs settlement';
    }
    return 'All settled';
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(party, amount, entryCount);
    } else if (amount > 0) {
      // Navigate to ledger page with party filter
      navigate(`/ledger?party=${party}&status=pending`);
    }
  };

  const cardProps = {
    title: `${getPartyLabel(party)} Pending`,
    value: error ? 'Error' : formatCurrency(amount),
    change: getChangeText(),
    changeType: getChangeType(),
    icon: getPartyIcon(party),
    subtitle: showDetails ? 'Pending payout amount' : undefined
  };

  return (
    <div 
      className={`${styles.payoutCard} ${amount > 0 ? styles.clickable : ''} ${isHovered ? styles.hovered : ''}`}
      onClick={amount > 0 ? handleCardClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <StatsCard {...cardProps} />
      
      {showDetails && amount > 0 && (
        <div className={styles.actionHint}>
          <span className={styles.hintText}>Click to view details</span>
          <span className={styles.hintIcon}>→</span>
        </div>
      )}
      
      {error && (
        <div className={styles.errorDetails}>
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorText}>{error}</span>
        </div>
      )}
    </div>
  );
};

export default PendingPayoutCard;