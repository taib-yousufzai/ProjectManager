import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Card from '../../common/Card/Card';
import { formatCurrency } from '../../../utils/helpers';
import styles from './RevenuePieChart.module.css';

const RevenuePieChart = ({
  revenueRule,
  amount,
  currency = 'USD',
  showChart = true,
  showBreakdown = true,
  size = 'medium'
}) => {
  const [activeIndex, setActiveIndex] = useState(null);

  // Define colors for each party
  const COLORS = {
    admin: '#4F46E5', // Indigo
    team: '#10B981',  // Emerald
    vendor: '#F59E0B' // Amber
  };

  // Calculate revenue split data
  const chartData = useMemo(() => {
    if (!revenueRule || !amount) return [];

    const data = [];

    // Admin share
    if (revenueRule.adminPercent > 0) {
      data.push({
        name: 'Admin',
        party: 'admin',
        percentage: revenueRule.adminPercent,
        value: (amount * revenueRule.adminPercent) / 100,
        color: COLORS.admin
      });
    }

    // Team share
    if (revenueRule.teamPercent > 0) {
      data.push({
        name: 'Team',
        party: 'team',
        percentage: revenueRule.teamPercent,
        value: (amount * revenueRule.teamPercent) / 100,
        color: COLORS.team
      });
    }

    // Vendor share
    if (revenueRule.vendorPercent && revenueRule.vendorPercent > 0) {
      data.push({
        name: 'Vendor',
        party: 'vendor',
        percentage: revenueRule.vendorPercent,
        value: (amount * revenueRule.vendorPercent) / 100,
        color: COLORS.vendor
      });
    }

    return data;
  }, [revenueRule, amount]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={styles.tooltip}>
          <div className={styles.tooltipHeader}>
            <div
              className={styles.tooltipColor}
              style={{ backgroundColor: data.color }}
            />
            <span className={styles.tooltipName}>{data.name}</span>
          </div>
          <div className={styles.tooltipContent}>
            <div className={styles.tooltipRow}>
              <span>Percentage:</span>
              <span className={styles.tooltipValue}>{data.percentage}%</span>
            </div>
            <div className={styles.tooltipRow}>
              <span>Amount:</span>
              <span className={styles.tooltipValue}>
                {formatCurrency(data.value, currency)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Handle pie slice hover
  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  // Get chart dimensions based on size
  const getChartDimensions = () => {
    switch (size) {
      case 'small':
        return { width: 200, height: 200 };
      case 'large':
        return { width: 400, height: 400 };
      default:
        return { width: 300, height: 300 };
    }
  };

  const dimensions = getChartDimensions();

  if (!revenueRule || !amount || chartData.length === 0) {
    return (
      <Card className={styles.emptyChart}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <h4>No Revenue Data</h4>
          <p>Revenue breakdown will appear here when data is available.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={`${styles.revenuePieChart} ${styles[size]}`}>
      {showChart && (
        <Card title="Revenue Distribution" className={styles.chartCard}>
          <div className={styles.chartContainer} style={{ height: dimensions.height, minHeight: dimensions.height }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={size === 'small' ? 60 : size === 'large' ? 120 : 90}
                  innerRadius={size === 'small' ? 30 : size === 'large' ? 60 : 45}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={activeIndex === index ? '#fff' : 'none'}
                      strokeWidth={activeIndex === index ? 2 : 0}
                      style={{
                        filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry) => (
                    <span style={{ color: entry.color }}>
                      {value} ({entry.payload.percentage}%)
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Center label showing total amount */}
          <div className={styles.centerLabel}>
            <div className={styles.totalAmount}>
              {formatCurrency(amount, currency)}
            </div>
            <div className={styles.totalLabel}>Total Revenue</div>
          </div>
        </Card>
      )}

      {showBreakdown && (
        <Card title="Breakdown Details" className={styles.breakdownCard}>
          <div className={styles.breakdownList}>
            {chartData.map((item, index) => (
              <div
                key={item.party}
                className={`${styles.breakdownItem} ${activeIndex === index ? styles.active : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className={styles.breakdownHeader}>
                  <div className={styles.breakdownIndicator}>
                    <div
                      className={styles.colorDot}
                      style={{ backgroundColor: item.color }}
                    />
                    <span className={styles.partyName}>{item.name}</span>
                  </div>
                  <div className={styles.breakdownPercentage}>
                    {item.percentage}%
                  </div>
                </div>
                <div className={styles.breakdownAmount}>
                  {formatCurrency(item.value, currency)}
                </div>
              </div>
            ))}
          </div>

          {revenueRule.ruleName && (
            <div className={styles.ruleInfo}>
              <div className={styles.ruleLabel}>Applied Rule:</div>
              <div className={styles.ruleName}>{revenueRule.ruleName}</div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default RevenuePieChart;