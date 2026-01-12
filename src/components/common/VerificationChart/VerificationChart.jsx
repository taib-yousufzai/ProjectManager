import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Card from '../Card';
import styles from './VerificationChart.module.css';

const VerificationChart = ({ data = [], title = "Payment Verification Status" }) => {
  const COLORS = {
    'Verified': '#22C55E',
    'Pending Approval': '#6B7280',
    'Partial Approval': '#F59E0B'
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{data.name}</p>
          <p className={styles.tooltipValue}>
            {data.value} payments ({((data.value / data.payload.total) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }) => {
    return (
      <div className={styles.legend}>
        {payload.map((entry, index) => (
          <div key={index} className={styles.legendItem}>
            <div 
              className={styles.legendColor}
              style={{ backgroundColor: entry.color }}
            />
            <span className={styles.legendText}>
              {entry.value}: {entry.payload.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Calculate total for percentage calculations
  const dataWithTotal = data.map(item => ({
    ...item,
    total: data.reduce((sum, d) => sum + d.value, 0)
  }));

  const hasData = data.some(item => item.value > 0);

  return (
    <Card className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3>{title}</h3>
        <div className={styles.chartSubtitle}>
          Distribution of payment approval status
        </div>
      </div>
      
      <div className={styles.chartContainer}>
        {!hasData ? (
          <div className={styles.noData}>
            <div className={styles.noDataIcon}>📊</div>
            <p>No payment data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dataWithTotal}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {dataWithTotal.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.name] || '#8884d8'} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};

export default VerificationChart;