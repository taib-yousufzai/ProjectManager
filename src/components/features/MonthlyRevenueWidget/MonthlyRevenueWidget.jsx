import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ledgerService } from '../../../services/ledgerService';
import { PARTY_TYPES, LEDGER_ENTRY_TYPES } from '../../../models';
import styles from './MonthlyRevenueWidget.module.css';

const MonthlyRevenueWidget = ({ 
  dateRange = null, 
  selectedParty = 'all',
  chartType = 'area',
  showTrends = true,
  className = ''
}) => {
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState(
    dateRange || {
      start: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1), // Last 12 months
      end: new Date()
    }
  );

  // Fetch ledger entries and calculate monthly revenue
  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all ledger entries within date range
        const filters = {
          dateRange: selectedDateRange,
          type: LEDGER_ENTRY_TYPES.CREDIT // Only credit entries represent revenue
        };

        // Add party filter if specific party is selected
        if (selectedParty !== 'all') {
          filters.party = selectedParty;
        }

        const entries = await ledgerService.getLedgerEntries(filters);

        // Group entries by month and party
        const monthlyData = {};

        entries.forEach(entry => {
          const entryDate = entry.date.toDate ? entry.date.toDate() : new Date(entry.date);
          const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              month: entryDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              monthDate: new Date(entryDate.getFullYear(), entryDate.getMonth(), 1),
              admin: 0,
              team: 0,
              vendor: 0,
              total: 0,
              entryCount: 0
            };
          }

          monthlyData[monthKey][entry.party] += entry.amount;
          monthlyData[monthKey].total += entry.amount;
          monthlyData[monthKey].entryCount += 1;
        });

        // Convert to array and sort by date
        const sortedData = Object.values(monthlyData)
          .sort((a, b) => a.monthDate - b.monthDate)
          .map(item => ({
            ...item,
            // Round amounts to 2 decimal places
            admin: Math.round(item.admin * 100) / 100,
            team: Math.round(item.team * 100) / 100,
            vendor: Math.round(item.vendor * 100) / 100,
            total: Math.round(item.total * 100) / 100
          }));

        setRevenueData(sortedData);
      } catch (err) {
        console.error('Error fetching revenue data:', err);
        setError('Failed to load revenue data');
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, [selectedDateRange, selectedParty]);

  // Calculate trend statistics
  const trendStats = useMemo(() => {
    if (revenueData.length < 2) return null;

    const currentMonth = revenueData[revenueData.length - 1];
    const previousMonth = revenueData[revenueData.length - 2];
    
    const currentTotal = currentMonth?.total || 0;
    const previousTotal = previousMonth?.total || 0;
    
    const growthAmount = currentTotal - previousTotal;
    const growthPercentage = previousTotal > 0 ? (growthAmount / previousTotal) * 100 : 0;

    // Calculate average monthly revenue
    const totalRevenue = revenueData.reduce((sum, month) => sum + month.total, 0);
    const averageMonthly = totalRevenue / revenueData.length;

    return {
      currentMonth: currentTotal,
      previousMonth: previousTotal,
      growthAmount: Math.round(growthAmount * 100) / 100,
      growthPercentage: Math.round(growthPercentage * 10) / 10,
      averageMonthly: Math.round(averageMonthly * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100
    };
  }, [revenueData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleDateRangeChange = (field, value) => {
    setSelectedDateRange(prev => ({
      ...prev,
      [field]: new Date(value)
    }));
  };

  const getChartColors = () => {
    return {
      admin: '#4A6CF7',
      team: '#22C55E',
      vendor: '#F59E0B',
      total: '#8B5CF6'
    };
  };

  const colors = getChartColors();

  if (loading) {
    return (
      <div className={`${styles.widget} ${className}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>Monthly Revenue Distribution</h3>
        </div>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading revenue data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.widget} ${className}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>Monthly Revenue Distribution</h3>
        </div>
        <div className={styles.errorState}>
          <p className={styles.errorMessage}>{error}</p>
          <button 
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.widget} ${className}`}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>Monthly Revenue Distribution</h3>
          <p className={styles.subtitle}>Revenue trends by party over time</p>
        </div>
        
        <div className={styles.controls}>
          <div className={styles.dateRangeControls}>
            <label className={styles.controlLabel}>
              From:
              <input
                type="date"
                className={styles.dateInput}
                value={selectedDateRange.start.toISOString().split('T')[0]}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
              />
            </label>
            <label className={styles.controlLabel}>
              To:
              <input
                type="date"
                className={styles.dateInput}
                value={selectedDateRange.end.toISOString().split('T')[0]}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      {showTrends && trendStats && (
        <div className={styles.trendsSection}>
          <div className={styles.trendCard}>
            <div className={styles.trendValue}>{formatCurrency(trendStats.currentMonth)}</div>
            <div className={styles.trendLabel}>This Month</div>
          </div>
          <div className={styles.trendCard}>
            <div className={`${styles.trendValue} ${trendStats.growthPercentage >= 0 ? styles.positive : styles.negative}`}>
              {trendStats.growthPercentage >= 0 ? '+' : ''}{trendStats.growthPercentage}%
            </div>
            <div className={styles.trendLabel}>Growth</div>
          </div>
          <div className={styles.trendCard}>
            <div className={styles.trendValue}>{formatCurrency(trendStats.averageMonthly)}</div>
            <div className={styles.trendLabel}>Avg Monthly</div>
          </div>
          <div className={styles.trendCard}>
            <div className={styles.trendValue}>{formatCurrency(trendStats.totalRevenue)}</div>
            <div className={styles.trendLabel}>Total Revenue</div>
          </div>
        </div>
      )}

      <div className={styles.chartContainer}>
        {revenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.admin} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colors.admin} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTeam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.team} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colors.team} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVendor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.vendor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colors.vendor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="month" 
                  stroke="var(--text-secondary)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="var(--text-secondary)"
                  tickFormatter={formatCurrency}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {selectedParty === 'all' || selectedParty === 'admin' ? (
                  <Area
                    type="monotone"
                    dataKey="admin"
                    stackId="1"
                    stroke={colors.admin}
                    fill="url(#colorAdmin)"
                    name="Admin"
                  />
                ) : null}
                
                {selectedParty === 'all' || selectedParty === 'team' ? (
                  <Area
                    type="monotone"
                    dataKey="team"
                    stackId="1"
                    stroke={colors.team}
                    fill="url(#colorTeam)"
                    name="Team"
                  />
                ) : null}
                
                {selectedParty === 'all' || selectedParty === 'vendor' ? (
                  <Area
                    type="monotone"
                    dataKey="vendor"
                    stackId="1"
                    stroke={colors.vendor}
                    fill="url(#colorVendor)"
                    name="Vendor"
                  />
                ) : null}
              </AreaChart>
            ) : (
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="month" 
                  stroke="var(--text-secondary)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="var(--text-secondary)"
                  tickFormatter={formatCurrency}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {selectedParty === 'all' || selectedParty === 'admin' ? (
                  <Line
                    type="monotone"
                    dataKey="admin"
                    stroke={colors.admin}
                    strokeWidth={3}
                    name="Admin"
                    dot={{ fill: colors.admin, strokeWidth: 2, r: 4 }}
                  />
                ) : null}
                
                {selectedParty === 'all' || selectedParty === 'team' ? (
                  <Line
                    type="monotone"
                    dataKey="team"
                    stroke={colors.team}
                    strokeWidth={3}
                    name="Team"
                    dot={{ fill: colors.team, strokeWidth: 2, r: 4 }}
                  />
                ) : null}
                
                {selectedParty === 'all' || selectedParty === 'vendor' ? (
                  <Line
                    type="monotone"
                    dataKey="vendor"
                    stroke={colors.vendor}
                    strokeWidth={3}
                    name="Vendor"
                    dot={{ fill: colors.vendor, strokeWidth: 2, r: 4 }}
                  />
                ) : null}
                
                {selectedParty === 'all' ? (
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={colors.total}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Total"
                    dot={{ fill: colors.total, strokeWidth: 2, r: 3 }}
                  />
                ) : null}
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className={styles.noDataState}>
            <div className={styles.noDataIcon}>📊</div>
            <h4 className={styles.noDataTitle}>No Revenue Data</h4>
            <p className={styles.noDataMessage}>
              No revenue entries found for the selected date range.
            </p>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.partyFilter}>
          <label className={styles.filterLabel}>Show:</label>
          <select
            className={styles.partySelect}
            value={selectedParty}
            onChange={(e) => setSelectedParty(e.target.value)}
          >
            <option value="all">All Parties</option>
            <option value="admin">Admin Only</option>
            <option value="team">Team Only</option>
            <option value="vendor">Vendor Only</option>
          </select>
        </div>
        
        <div className={styles.chartTypeToggle}>
          <button
            className={`${styles.toggleButton} ${chartType === 'area' ? styles.active : ''}`}
            onClick={() => setChartType('area')}
          >
            Area
          </button>
          <button
            className={`${styles.toggleButton} ${chartType === 'line' ? styles.active : ''}`}
            onClick={() => setChartType('line')}
          >
            Line
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthlyRevenueWidget;