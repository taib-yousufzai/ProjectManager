import { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { PROJECT_STATUS, PAYMENT_STATUS } from '../../utils/constants';
import {
  exportToCSV,
  exportToPDF,
  prepareProjectsForCSV,
  preparePaymentsForCSV,
  prepareRevenueDataForCSV,
  exportLedgerData,
  generateReportData,
  printCurrentPage
} from '../../utils/exportUtils';
import { useAuth } from '../../hooks/useAuth'; // NEW
import { projectService } from '../../services/projectService'; // NEW
import { paymentService } from '../../services/paymentService'; // NEW
import styles from './Reports.module.css';


const Reports = () => {
  const [dateRange, setDateRange] = useState({
    startDate: '2023-01-01',
    endDate: '2024-12-31'
  });
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [revenueChartType, setRevenueChartType] = useState('line');
  const [projectChartType, setProjectChartType] = useState('bar');

  const { user } = useAuth(); // NEW
  const [projects, setProjects] = useState([]); // NEW
  const [payments, setPayments] = useState([]); // NEW
  const [isLoading, setIsLoading] = useState(true); // NEW

  // Fetch real data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        const [userProjects, userPayments] = await Promise.all([
          projectService.getUserProjects(user.id),
          paymentService.getUserPayments(user.id)
        ]);

        setProjects(userProjects);
        setPayments(userPayments);
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Filter data based on date range, project, and payment status
  const filteredData = useMemo(() => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);

    // Ensure projects is an array
    const safeProjects = Array.isArray(projects) ? projects : [];

    let filteredProjects = safeProjects.filter(project => {
      // Use createdAt for project date (adapt if needed)
      const projectDate = project.createdAt?.toDate ? project.createdAt.toDate() : new Date(project.createdAt || Date.now());
      return projectDate >= start && projectDate <= end;
    });

    // Ensure payments is an array
    const safePayments = Array.isArray(payments) ? payments : [];

    let filteredPayments = safePayments.filter(payment => {
      // Handle Firestore timestamps or standard dates
      const paymentDate = payment.paymentDate?.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate || Date.now());
      const dateInRange = paymentDate >= start && paymentDate <= end;

      // Filter by project if selected
      const projectMatch = selectedProject === 'all' || payment.projectId === selectedProject;

      // Filter by payment status if selected
      const statusMatch = selectedPaymentStatus === 'all' || payment.status === selectedPaymentStatus;

      return dateInRange && projectMatch && statusMatch;
    });

    // If a specific project is selected, also filter projects
    if (selectedProject !== 'all') {
      filteredProjects = filteredProjects.filter(project => project.id === selectedProject);
    }

    return { projects: filteredProjects, payments: filteredPayments };
  }, [dateRange, selectedProject, selectedPaymentStatus, projects, payments]);

  // Generate revenue trends data
  const revenueData = useMemo(() => {
    const monthlyData = {};

    filteredData.payments.forEach(payment => {
      if (payment.status === PAYMENT_STATUS.COMPLETED) {
        const date = payment.paymentDate?.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            revenue: 0,
            payments: 0
          };
        }

        monthlyData[monthKey].revenue += payment.amount;
        monthlyData[monthKey].payments += 1;
      }
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredData.payments]);

  // Generate project completion data
  const projectCompletionData = useMemo(() => {
    const statusCounts = {};

    filteredData.projects.forEach(project => {
      const status = project.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
      percentage: Math.round((count / filteredData.projects.length) * 100)
    }));
  }, [filteredData.projects]);

  // Generate project analytics by month
  const projectAnalytics = useMemo(() => {
    const monthlyProjects = {};

    filteredData.projects.forEach(project => {
      const date = project.createdAt?.toDate ? project.createdAt.toDate() : new Date(project.createdAt || Date.now());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyProjects[monthKey]) {
        monthlyProjects[monthKey] = {
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          created: 0,
          completed: 0,
          budget: 0
        };
      }

      monthlyProjects[monthKey].created += 1;
      monthlyProjects[monthKey].budget += project.budget;

      if (project.status === PROJECT_STATUS.COMPLETED) {
        monthlyProjects[monthKey].completed += 1;
      }
    });

    return Object.values(monthlyProjects).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredData.projects]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalRevenue = filteredData.payments
      .filter(p => p.status === PAYMENT_STATUS.COMPLETED)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalProjects = filteredData.projects.length;
    const completedProjects = filteredData.projects.filter(p => p.status === PROJECT_STATUS.COMPLETED).length;
    const activeProjects = filteredData.projects.filter(p => p.status === PROJECT_STATUS.ACTIVE).length;

    const avgProjectValue = totalProjects > 0 ?
      filteredData.projects.reduce((sum, p) => sum + p.budget, 0) / totalProjects : 0;

    return {
      totalRevenue,
      totalProjects,
      completedProjects,
      activeProjects,
      avgProjectValue,
      completionRate: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0
    };
  }, [filteredData]);

  // Generate verified vs unverified payments data
  const verifiedPaymentsData = useMemo(() => {
    const verified = filteredData.payments.filter(p => p.verified).length;
    const unverified = filteredData.payments.filter(p => !p.verified).length;

    return [
      { name: 'Verified', value: verified, color: '#22C55E' },
      { name: 'Unverified', value: unverified, color: '#F59E0B' }
    ];
  }, [filteredData.payments]);

  // Generate project revenue data (top 10 projects by revenue)
  const projectRevenueData = useMemo(() => {
    const projectRevenues = {};

    filteredData.payments.forEach(payment => {
      if (payment.status === PAYMENT_STATUS.COMPLETED) {
        const project = filteredData.projects.find(p => p.id === payment.projectId);
        if (project) {
          if (!projectRevenues[project.id]) {
            projectRevenues[project.id] = {
              name: project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name,
              revenue: 0
            };
          }
          projectRevenues[project.id].revenue += payment.amount;
        }
      }
    });

    return Object.values(projectRevenues)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredData]);

  // Generate insights summary
  const insightsSummary = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const currentMonthPayments = filteredData.payments.filter(payment => {
      const paymentDate = payment.paymentDate?.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
      return paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear &&
        payment.status === PAYMENT_STATUS.COMPLETED;
    });

    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const previousMonthPayments = filteredData.payments.filter(payment => {
      const paymentDate = payment.paymentDate?.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
      return paymentDate.getMonth() === previousMonth &&
        paymentDate.getFullYear() === previousYear &&
        payment.status === PAYMENT_STATUS.COMPLETED;
    });

    const currentMonthRevenue = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);
    const previousMonthRevenue = previousMonthPayments.reduce((sum, p) => sum + p.amount, 0);

    const growthPercentage = previousMonthRevenue > 0 ?
      ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;

    const completedPayments = filteredData.payments.filter(p => p.status === PAYMENT_STATUS.COMPLETED);
    const averagePaymentSize = completedPayments.length > 0 ?
      completedPayments.reduce((sum, p) => sum + p.amount, 0) / completedPayments.length : 0;

    // Calculate top clients by revenue
    const clientRevenues = {};
    filteredData.payments.forEach(payment => {
      if (payment.status === PAYMENT_STATUS.COMPLETED) {
        const project = filteredData.projects.find(p => p.id === payment.projectId);
        if (project && project.clientName) {
          if (!clientRevenues[project.clientName]) {
            clientRevenues[project.clientName] = { name: project.clientName, revenue: 0 };
          }
          clientRevenues[project.clientName].revenue += payment.amount;
        }
      }
    });

    const topClients = Object.values(clientRevenues)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      currentMonthRevenue,
      growthPercentage,
      averagePaymentSize,
      topClients
    };
  }, [filteredData]);

  // Generate profit margin analysis
  const profitMarginAnalysis = useMemo(() => {
    const projectAnalysis = filteredData.projects.map(project => {
      // Calculate total revenue for this project
      const projectPayments = filteredData.payments.filter(p =>
        p.projectId === project.id && p.status === PAYMENT_STATUS.COMPLETED
      );
      const totalRevenue = projectPayments.reduce((sum, p) => sum + p.amount, 0);

      // Estimate costs (using budget as proxy for costs)
      const estimatedCosts = project.budget * 0.7; // Assume 70% of budget represents costs

      // Calculate profit and margin
      const profit = totalRevenue - estimatedCosts;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      return {
        projectId: project.id,
        projectName: project.name,
        totalRevenue,
        estimatedCosts,
        profit,
        profitMargin: Math.round(profitMargin * 10) / 10,
        status: project.status
      };
    });

    // Calculate overall metrics
    const totalRevenue = projectAnalysis.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalCosts = projectAnalysis.reduce((sum, p) => sum + p.estimatedCosts, 0);
    const totalProfit = totalRevenue - totalCosts;
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Calculate average margins by project status
    const completedProjects = projectAnalysis.filter(p => p.status === PROJECT_STATUS.COMPLETED);
    const activeProjects = projectAnalysis.filter(p => p.status === PROJECT_STATUS.ACTIVE);

    const avgCompletedMargin = completedProjects.length > 0 ?
      completedProjects.reduce((sum, p) => sum + p.profitMargin, 0) / completedProjects.length : 0;

    const avgActiveMargin = activeProjects.length > 0 ?
      activeProjects.reduce((sum, p) => sum + p.profitMargin, 0) / activeProjects.length : 0;

    // Identify top and bottom performing projects
    const sortedByMargin = [...projectAnalysis].sort((a, b) => b.profitMargin - a.profitMargin);
    const topPerformers = sortedByMargin.slice(0, 5);
    const bottomPerformers = sortedByMargin.slice(-5).reverse();

    return {
      projectAnalysis,
      totalRevenue,
      totalCosts,
      totalProfit,
      overallMargin: Math.round(overallMargin * 10) / 10,
      avgCompletedMargin: Math.round(avgCompletedMargin * 10) / 10,
      avgActiveMargin: Math.round(avgActiveMargin * 10) / 10,
      topPerformers,
      bottomPerformers
    };
  }, [filteredData]);

  // Generate monthly profit trend data
  const monthlyProfitData = useMemo(() => {
    const monthlyData = {};

    filteredData.payments.forEach(payment => {
      if (payment.status === PAYMENT_STATUS.COMPLETED) {
        const date = payment.paymentDate?.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            revenue: 0,
            estimatedCosts: 0,
            profit: 0,
            margin: 0
          };
        }

        const project = filteredData.projects.find(p => p.id === payment.projectId);
        const estimatedCostRatio = 0.7; // 70% of payment assumed to be costs
        const estimatedCost = payment.amount * estimatedCostRatio;

        monthlyData[monthKey].revenue += payment.amount;
        monthlyData[monthKey].estimatedCosts += estimatedCost;
        monthlyData[monthKey].profit += (payment.amount - estimatedCost);
      }
    });

    // Calculate margins and sort by date
    return Object.values(monthlyData)
      .map(item => ({
        ...item,
        margin: item.revenue > 0 ? Math.round((item.profit / item.revenue) * 1000) / 10 : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredData]);

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
              {entry.name}: {entry.name.includes('revenue') || entry.name.includes('budget') ?
                formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const COLORS = ['#4A6CF7', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleExport = (format) => {
    try {
      const currentDate = new Date().toLocaleDateString();

      if (format === 'PDF') {
        const reportData = generateReportData({
          projects: filteredData.projects,
          payments: filteredData.payments,
          summaryStats,
          dateRange: {
            startDate: new Date(dateRange.startDate).toLocaleDateString(),
            endDate: new Date(dateRange.endDate).toLocaleDateString()
          }
        });

        exportToPDF(reportData, `project-report-${currentDate.replace(/\//g, '-')}.pdf`);
      } else if (format === 'CSV') {
        // Show options for what to export
        const exportChoice = window.prompt(
          'What would you like to export?\n' +
          '1. Projects\n' +
          '2. Payments\n' +
          '3. Revenue Data\n' +
          '4. Ledger Data (if available)\n' +
          'Enter 1, 2, 3, or 4:'
        );

        switch (exportChoice) {
          case '1':
            const projectsCSV = prepareProjectsForCSV(filteredData.projects);
            exportToCSV(projectsCSV, `projects-${currentDate.replace(/\//g, '-')}.csv`);
            break;
          case '2':
            const paymentsCSV = preparePaymentsForCSV(filteredData.payments);
            exportToCSV(paymentsCSV, `payments-${currentDate.replace(/\//g, '-')}.csv`);
            break;
          case '3':
            const revenueCSV = prepareRevenueDataForCSV(revenueData);
            exportToCSV(revenueCSV, `revenue-data-${currentDate.replace(/\//g, '-')}.csv`);
            break;
          case '4':
            // Export ledger data if available
            exportLedgerData({}, 'CSV', 'comprehensive', {
              dateRange: {
                start: new Date(dateRange.startDate),
                end: new Date(dateRange.endDate)
              }
            });
            break;
          default:
            if (exportChoice !== null) {
              alert('Invalid choice. Please select 1, 2, 3, or 4.');
            }
            return;
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  const handlePrint = () => {
    // Add print date attribute for CSS
    const container = document.querySelector(`.${styles.reportsContainer}`);
    if (container) {
      container.setAttribute('data-print-date', new Date().toLocaleDateString());
    }

    printCurrentPage();
  };

  // Add effect to set up print date
  useEffect(() => {
    const container = document.querySelector(`.${styles.reportsContainer}`);
    if (container) {
      container.setAttribute('data-print-date', new Date().toLocaleDateString());
    }
  }, []);

  return (
    <div className={styles.reportsContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Reports & Analytics</h1>
        <p className={styles.subtitle}>
          Comprehensive insights into project performance and financial trends
        </p>
      </div>

      {/* Enhanced Filters Section */}
      <div className={styles.filtersSection}>
        <h3 className={styles.filtersTitle}>Report Filters</h3>
        <div className={styles.filtersGrid}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Start Date</label>
            <input
              type="date"
              className={styles.filterInput}
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>End Date</label>
            <input
              type="date"
              className={styles.filterInput}
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Project</label>
            <select
              className={styles.filterInput}
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Payment Status</label>
            <select
              className={styles.filterInput}
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <button
            className={styles.applyButton}
            onClick={() => {/* Filters are applied automatically via useMemo */ }}
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatCurrency(summaryStats.totalRevenue)}</div>
          <div className={styles.statLabel}>Total Revenue</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{summaryStats.totalProjects}</div>
          <div className={styles.statLabel}>Total Projects</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{summaryStats.completedProjects}</div>
          <div className={styles.statLabel}>Completed Projects</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{summaryStats.completionRate}%</div>
          <div className={styles.statLabel}>Completion Rate</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatCurrency(summaryStats.avgProjectValue)}</div>
          <div className={styles.statLabel}>Avg Project Value</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{summaryStats.activeProjects}</div>
          <div className={styles.statLabel}>Active Projects</div>
        </div>
      </div>

      {/* Revenue Trends Chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Revenue Trends</h3>
            <p className={styles.chartSubtitle}>Monthly revenue and payment volume</p>
          </div>
          <div className={styles.chartTypeSelector}>
            <button
              className={`${styles.chartTypeButton} ${revenueChartType === 'line' ? styles.active : ''}`}
              onClick={() => setRevenueChartType('line')}
            >
              Line
            </button>
            <button
              className={`${styles.chartTypeButton} ${revenueChartType === 'area' ? styles.active : ''}`}
              onClick={() => setRevenueChartType('area')}
            >
              Area
            </button>
            <button
              className={`${styles.chartTypeButton} ${revenueChartType === 'bar' ? styles.active : ''}`}
              onClick={() => setRevenueChartType('bar')}
            >
              Bar
            </button>
          </div>
        </div>
        <div className={styles.chartWrapper}>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {revenueChartType === 'line' && (
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" tickFormatter={formatCurrency} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4A6CF7"
                    strokeWidth={3}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="payments"
                    stroke="#22C55E"
                    strokeWidth={2}
                    name="Payment Count"
                  />
                </LineChart>
              )}
              {revenueChartType === 'area' && (
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4A6CF7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4A6CF7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" tickFormatter={formatCurrency} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4A6CF7"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="Revenue"
                  />
                </AreaChart>
              )}
              {revenueChartType === 'bar' && (
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" tickFormatter={formatCurrency} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#4A6CF7" name="Revenue" />
                  <Bar dataKey="payments" fill="#22C55E" name="Payment Count" />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className={styles.noDataMessage}>
              No revenue data available for the selected date range
            </div>
          )}
        </div>
      </div>

      {/* Project Analytics Chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Project Analytics</h3>
            <p className={styles.chartSubtitle}>Project creation and completion trends</p>
          </div>
          <div className={styles.chartTypeSelector}>
            <button
              className={`${styles.chartTypeButton} ${projectChartType === 'bar' ? styles.active : ''}`}
              onClick={() => setProjectChartType('bar')}
            >
              Bar
            </button>
            <button
              className={`${styles.chartTypeButton} ${projectChartType === 'line' ? styles.active : ''}`}
              onClick={() => setProjectChartType('line')}
            >
              Line
            </button>
          </div>
        </div>
        <div className={styles.chartWrapper}>
          {projectAnalytics.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {projectChartType === 'bar' ? (
                <BarChart data={projectAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="created" fill="#4A6CF7" name="Projects Created" />
                  <Bar dataKey="completed" fill="#22C55E" name="Projects Completed" />
                </BarChart>
              ) : (
                <LineChart data={projectAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="created"
                    stroke="#4A6CF7"
                    strokeWidth={3}
                    name="Projects Created"
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#22C55E"
                    strokeWidth={3}
                    name="Projects Completed"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className={styles.noDataMessage}>
              No project data available for the selected date range
            </div>
          )}
        </div>
      </div>

      {/* Project Status Distribution */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Project Status Distribution</h3>
            <p className={styles.chartSubtitle}>Current project status breakdown</p>
          </div>
        </div>
        <div className={styles.chartWrapper}>
          {projectCompletionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectCompletionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percentage }) => `${status} (${percentage}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {projectCompletionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noDataMessage}>
              No project status data available for the selected date range
            </div>
          )}
        </div>
      </div>

      {/* Verified vs Unverified Payments Chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Verified vs Unverified Payments</h3>
            <p className={styles.chartSubtitle}>Payment verification status breakdown</p>
          </div>
        </div>
        <div className={styles.chartWrapper}>
          {verifiedPaymentsData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={verifiedPaymentsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percentage = Math.round((value / verifiedPaymentsData.reduce((sum, d) => sum + d.value, 0)) * 100) }) =>
                    `${name} (${percentage}%)`
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {verifiedPaymentsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noDataMessage}>
              No payment verification data available for the selected date range
            </div>
          )}
        </div>
      </div>

      {/* Project-wise Revenue Distribution */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Project-wise Revenue Distribution</h3>
            <p className={styles.chartSubtitle}>Top 10 projects by revenue</p>
          </div>
        </div>
        <div className={styles.chartWrapper}>
          {projectRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectRevenueData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-secondary)" tickFormatter={formatCurrency} />
                <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#4A6CF7" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noDataMessage}>
              No project revenue data available for the selected date range
            </div>
          )}
        </div>
      </div>

      {/* Profit Margin Analysis Section */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Profit Margin Analysis</h3>
            <p className={styles.chartSubtitle}>Overall profitability and margin trends</p>
          </div>
        </div>

        {/* Profit Summary Cards */}
        <div className={styles.profitSummaryGrid}>
          <div className={styles.profitCard}>
            <div className={styles.profitValue}>{formatCurrency(profitMarginAnalysis.totalProfit)}</div>
            <div className={styles.profitLabel}>Total Profit</div>
          </div>
          <div className={styles.profitCard}>
            <div className={`${styles.profitValue} ${profitMarginAnalysis.overallMargin >= 20 ? styles.positive : profitMarginAnalysis.overallMargin >= 10 ? styles.warning : styles.negative}`}>
              {profitMarginAnalysis.overallMargin.toFixed(1)}%
            </div>
            <div className={styles.profitLabel}>Overall Margin</div>
          </div>
          <div className={styles.profitCard}>
            <div className={styles.profitValue}>{profitMarginAnalysis.avgCompletedMargin.toFixed(1)}%</div>
            <div className={styles.profitLabel}>Avg Completed Margin</div>
          </div>
          <div className={styles.profitCard}>
            <div className={styles.profitValue}>{profitMarginAnalysis.avgActiveMargin.toFixed(1)}%</div>
            <div className={styles.profitLabel}>Avg Active Margin</div>
          </div>
        </div>
      </div>

      {/* Monthly Profit Trends */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Monthly Profit Trends</h3>
            <p className={styles.chartSubtitle}>Revenue, costs, and profit margins over time</p>
          </div>
        </div>
        <div className={styles.chartWrapper}>
          {monthlyProfitData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyProfitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" />
                <YAxis yAxisId="left" stroke="var(--text-secondary)" tickFormatter={formatCurrency} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tickFormatter={(value) => `${value}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="#4A6CF7" name="Revenue" />
                <Bar yAxisId="left" dataKey="estimatedCosts" fill="#F59E0B" name="Estimated Costs" />
                <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#22C55E" strokeWidth={3} name="Profit Margin %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noDataMessage}>
              No profit data available for the selected date range
            </div>
          )}
        </div>
      </div>

      {/* Top and Bottom Performers */}
      <div className={styles.performanceSection}>
        <div className={styles.performanceCard}>
          <h3 className={styles.performanceTitle}>Top Performing Projects</h3>
          <div className={styles.performanceList}>
            {profitMarginAnalysis.topPerformers.slice(0, 5).map((project, index) => (
              <div key={project.projectId} className={styles.performanceItem}>
                <div className={styles.performanceRank}>#{index + 1}</div>
                <div className={styles.performanceDetails}>
                  <div className={styles.performanceName}>{project.projectName}</div>
                  <div className={styles.performanceMetrics}>
                    {formatCurrency(project.totalRevenue)} revenue • {project.profitMargin.toFixed(1)}% margin
                  </div>
                </div>
                <div className={`${styles.performanceMargin} ${project.profitMargin >= 20 ? styles.positive : styles.warning}`}>
                  {project.profitMargin.toFixed(1)}%
                </div>
              </div>
            ))}
            {profitMarginAnalysis.topPerformers.length === 0 && (
              <div className={styles.noDataMessage}>No project data available</div>
            )}
          </div>
        </div>

        <div className={styles.performanceCard}>
          <h3 className={styles.performanceTitle}>Projects Needing Attention</h3>
          <div className={styles.performanceList}>
            {profitMarginAnalysis.bottomPerformers.slice(0, 5).map((project, index) => (
              <div key={project.projectId} className={styles.performanceItem}>
                <div className={styles.performanceRank}>⚠️</div>
                <div className={styles.performanceDetails}>
                  <div className={styles.performanceName}>{project.projectName}</div>
                  <div className={styles.performanceMetrics}>
                    {formatCurrency(project.totalRevenue)} revenue • {project.profitMargin.toFixed(1)}% margin
                  </div>
                </div>
                <div className={`${styles.performanceMargin} ${project.profitMargin < 10 ? styles.negative : styles.warning}`}>
                  {project.profitMargin.toFixed(1)}%
                </div>
              </div>
            ))}
            {profitMarginAnalysis.bottomPerformers.length === 0 && (
              <div className={styles.noDataMessage}>No project data available</div>
            )}
          </div>
        </div>
      </div>
      <div className={styles.insightsSection}>
        <h3 className={styles.insightsTitle}>Key Insights</h3>
        <div className={styles.insightsGrid}>
          <div className={styles.insightCard}>
            <div className={styles.insightHeader}>
              <h4 className={styles.insightCardTitle}>This Month's Revenue</h4>
            </div>
            <div className={styles.insightValue}>
              {formatCurrency(insightsSummary.currentMonthRevenue)}
            </div>
          </div>

          <div className={styles.insightCard}>
            <div className={styles.insightHeader}>
              <h4 className={styles.insightCardTitle}>Growth vs Last Month</h4>
            </div>
            <div className={`${styles.insightValue} ${insightsSummary.growthPercentage >= 0 ? styles.positive : styles.negative}`}>
              {insightsSummary.growthPercentage >= 0 ? '+' : ''}{insightsSummary.growthPercentage.toFixed(1)}%
            </div>
          </div>

          <div className={styles.insightCard}>
            <div className={styles.insightHeader}>
              <h4 className={styles.insightCardTitle}>Average Payment Size</h4>
            </div>
            <div className={styles.insightValue}>
              {formatCurrency(insightsSummary.averagePaymentSize)}
            </div>
          </div>

          <div className={styles.insightCard}>
            <div className={styles.insightHeader}>
              <h4 className={styles.insightCardTitle}>Top 5 Clients by Value</h4>
            </div>
            <div className={styles.topClientsList}>
              {insightsSummary.topClients.map((client, index) => (
                <div key={client.name} className={styles.topClientItem}>
                  <span className={styles.clientRank}>#{index + 1}</span>
                  <span className={styles.clientName}>{client.name}</span>
                  <span className={styles.clientRevenue}>{formatCurrency(client.revenue)}</span>
                </div>
              ))}
              {insightsSummary.topClients.length === 0 && (
                <div className={styles.noDataMessage}>No client data available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className={styles.exportSection}>
        <h3 className={styles.exportTitle}>Export & Print</h3>
        <div className={styles.exportButtons}>
          <button
            className={styles.exportButton}
            onClick={() => handleExport('PDF')}
          >
            📄 Export PDF
          </button>
          <button
            className={styles.exportButton}
            onClick={() => handleExport('CSV')}
          >
            📊 Export CSV
          </button>
          <button
            className={styles.exportButton}
            onClick={handlePrint}
          >
            🖨️ Print Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;