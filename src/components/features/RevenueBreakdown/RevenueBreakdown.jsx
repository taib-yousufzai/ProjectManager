import React, { useState, useEffect } from 'react';
import Card from '../../common/Card/Card';
import Button from '../../common/Button/Button';
import RevenuePieChart from '../RevenuePieChart';
import { useRevenueRules } from '../../../hooks/useRevenueRules';
import { useLedgerEntries } from '../../../hooks/useLedgerEntries';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import styles from './RevenueBreakdown.module.css';

const RevenueBreakdown = ({ projectId, payments = [] }) => {
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [revenueData, setRevenueData] = useState({});
  const { getRevenueRuleById } = useRevenueRules();
  const { getLedgerEntriesByPayment } = useLedgerEntries();

  useEffect(() => {
    loadRevenueData();
  }, [payments]);

  const loadRevenueData = async () => {
    const data = {};
    
    for (const payment of payments) {
      if (payment.revenueProcessed && payment.revenueRuleId) {
        try {
          // Get revenue rule
          const rule = await getRevenueRuleById(payment.revenueRuleId);
          
          // Get ledger entries for this payment
          const entries = await getLedgerEntriesByPayment(payment.id);
          
          data[payment.id] = {
            rule,
            entries,
            split: calculateSplit(payment.amount, rule),
            processed: true
          };
        } catch (error) {
          console.error('Error loading revenue data for payment:', payment.id, error);
          data[payment.id] = { processed: false, error: error.message };
        }
      } else {
        data[payment.id] = { processed: false };
      }
    }
    
    setRevenueData(data);
  };

  const calculateSplit = (amount, rule) => {
    if (!rule) return null;
    
    return {
      admin: (amount * rule.adminPercent) / 100,
      team: (amount * rule.teamPercent) / 100,
      vendor: rule.vendorPercent ? (amount * rule.vendorPercent) / 100 : 0
    };
  };

  const getProcessedPayments = () => {
    return payments.filter(payment => 
      revenueData[payment.id]?.processed
    );
  };

  const getTotalRevenue = () => {
    return getProcessedPayments().reduce((total, payment) => {
      return total + payment.amount;
    }, 0);
  };

  const getTotalByParty = (party) => {
    return getProcessedPayments().reduce((total, payment) => {
      const split = revenueData[payment.id]?.split;
      return total + (split?.[party] || 0);
    }, 0);
  };

  const getRevenueStatusBadge = (payment) => {
    const data = revenueData[payment.id];
    
    if (!data) {
      return <span className={`${styles.statusBadge} ${styles.loading}`}>Loading...</span>;
    }
    
    if (data.processed) {
      return <span className={`${styles.statusBadge} ${styles.processed}`}>Processed</span>;
    }
    
    if (data.error) {
      return <span className={`${styles.statusBadge} ${styles.error}`}>Error</span>;
    }
    
    return <span className={`${styles.statusBadge} ${styles.pending}`}>Pending</span>;
  };

  const renderRevenueOverview = () => {
    const processedPayments = getProcessedPayments();
    
    if (processedPayments.length === 0) {
      return (
        <Card>
          <div className={styles.emptyState}>
            <h4>No Revenue Data Available</h4>
            <p>Revenue breakdown will appear here once payments are verified and processed.</p>
          </div>
        </Card>
      );
    }

    return (
      <div className={styles.overviewGrid}>
        <Card title="Total Revenue" className={styles.totalCard}>
          <div className={styles.totalAmount}>
            {formatCurrency(getTotalRevenue())}
          </div>
          <div className={styles.totalSubtext}>
            From {processedPayments.length} processed payment{processedPayments.length !== 1 ? 's' : ''}
          </div>
        </Card>

        <Card title="Admin Share" className={styles.partyCard}>
          <div className={styles.partyAmount}>
            {formatCurrency(getTotalByParty('admin'))}
          </div>
        </Card>

        <Card title="Team Share" className={styles.partyCard}>
          <div className={styles.partyAmount}>
            {formatCurrency(getTotalByParty('team'))}
          </div>
        </Card>

        {getTotalByParty('vendor') > 0 && (
          <Card title="Vendor Share" className={styles.partyCard}>
            <div className={styles.partyAmount}>
              {formatCurrency(getTotalByParty('vendor'))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderPaymentsList = () => {
    if (payments.length === 0) {
      return (
        <Card>
          <div className={styles.emptyState}>
            <h4>No Payments Found</h4>
            <p>Add payments to this project to see revenue breakdown.</p>
          </div>
        </Card>
      );
    }

    return (
      <Card title="Payment Revenue Breakdown">
        <div className={styles.paymentsList}>
          {payments.map(payment => {
            const data = revenueData[payment.id];
            const split = data?.split;
            
            return (
              <div 
                key={payment.id} 
                className={`${styles.paymentItem} ${selectedPayment?.id === payment.id ? styles.selected : ''}`}
                onClick={() => setSelectedPayment(selectedPayment?.id === payment.id ? null : payment)}
              >
                <div className={styles.paymentHeader}>
                  <div className={styles.paymentInfo}>
                    <div className={styles.paymentDescription}>
                      {payment.description}
                    </div>
                    <div className={styles.paymentMeta}>
                      {formatCurrency(payment.amount)} • {formatDate(payment.paymentDate)}
                    </div>
                  </div>
                  <div className={styles.paymentStatus}>
                    {getRevenueStatusBadge(payment)}
                  </div>
                </div>

                {selectedPayment?.id === payment.id && data?.processed && (
                  <div className={styles.paymentDetails}>
                    <div className={styles.ruleInfo}>
                      <strong>Revenue Rule:</strong> {data.rule?.ruleName || 'Unknown Rule'}
                    </div>
                    
                    {/* Revenue Pie Chart */}
                    <div className={styles.chartSection}>
                      <RevenuePieChart
                        revenueRule={data.rule}
                        amount={payment.amount}
                        currency={payment.currency}
                        size="small"
                        showChart={true}
                        showBreakdown={false}
                      />
                    </div>
                    
                    <div className={styles.splitBreakdown}>
                      <div className={styles.splitItem}>
                        <span className={styles.splitLabel}>Admin ({data.rule?.adminPercent}%):</span>
                        <span className={styles.splitAmount}>{formatCurrency(split.admin)}</span>
                      </div>
                      <div className={styles.splitItem}>
                        <span className={styles.splitLabel}>Team ({data.rule?.teamPercent}%):</span>
                        <span className={styles.splitAmount}>{formatCurrency(split.team)}</span>
                      </div>
                      {split.vendor > 0 && (
                        <div className={styles.splitItem}>
                          <span className={styles.splitLabel}>Vendor ({data.rule?.vendorPercent}%):</span>
                          <span className={styles.splitAmount}>{formatCurrency(split.vendor)}</span>
                        </div>
                      )}
                    </div>

                    {data.entries && data.entries.length > 0 && (
                      <div className={styles.ledgerEntries}>
                        <div className={styles.entriesHeader}>
                          <strong>Ledger Entries:</strong>
                        </div>
                        {data.entries.map(entry => (
                          <div key={entry.id} className={styles.entryItem}>
                            <span className={styles.entryParty}>{entry.party}</span>
                            <span className={styles.entryAmount}>
                              {formatCurrency(entry.amount)}
                            </span>
                            <span className={`${styles.entryStatus} ${styles[entry.status]}`}>
                              {entry.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  return (
    <div className={styles.revenueBreakdown}>
      {renderRevenueOverview()}
      {renderPaymentsList()}
    </div>
  );
};

export default RevenueBreakdown;