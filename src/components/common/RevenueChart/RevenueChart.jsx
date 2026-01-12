import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import styles from './RevenueChart.module.css';

const RevenueChart = ({ data, type = 'line', height = 300 }) => {
  // Mock data for initial development
  const defaultData = [
    { month: 'Jan', revenue: 4000, projects: 12 },
    { month: 'Feb', revenue: 3000, projects: 15 },
    { month: 'Mar', revenue: 5000, projects: 18 },
    { month: 'Apr', revenue: 4500, projects: 14 },
    { month: 'May', revenue: 6000, projects: 20 },
    { month: 'Jun', revenue: 5500, projects: 16 },
    { month: 'Jul', revenue: 7000, projects: 22 },
    { month: 'Aug', revenue: 6500, projects: 19 },
    { month: 'Sep', revenue: 8000, projects: 25 },
    { month: 'Oct', revenue: 7500, projects: 21 },
    { month: 'Nov', revenue: 9000, projects: 28 },
    { month: 'Dec', revenue: 8500, projects: 24 }
  ];

  const chartData = data || defaultData;

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
            <p key={index} className={styles.tooltipValue} style={{ color: entry.color }}>
              {entry.name === 'revenue' ? 'Revenue: ' : 'Projects: '}
              {entry.name === 'revenue' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    if (type === 'area') {
      return (
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
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
            fontSize={12}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--primary)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      );
    }

    return (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis 
          dataKey="month" 
          stroke="var(--text-secondary)"
          fontSize={12}
        />
        <YAxis 
          stroke="var(--text-secondary)"
          fontSize={12}
          tickFormatter={formatCurrency}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="var(--primary)"
          strokeWidth={3}
          dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: 'var(--primary)', strokeWidth: 2 }}
        />
      </LineChart>
    );
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Revenue Overview</h3>
        <p className={styles.chartSubtitle}>Monthly revenue trends</p>
      </div>
      <div className={styles.chartWrapper} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;