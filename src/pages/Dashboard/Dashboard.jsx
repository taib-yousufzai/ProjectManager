import { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import StatsCard from '../../components/common/StatsCard';
import RevenueChart from '../../components/common/RevenueChart';
import VerificationChart from '../../components/common/VerificationChart';
import RecentActivity from '../../components/common/RecentActivity';
import PendingPayoutCard from '../../components/features/PendingPayoutCard';
import { StatsSkeleton, CardSkeleton } from '../../components/common/LoadingSkeleton';
import { useProjects } from '../../hooks/useProjects';
import { usePaymentAnalytics } from '../../hooks/usePaymentAnalytics';
import { usePendingPayouts } from '../../hooks/usePendingPayouts';
import { projectService } from '../../services/projectService';
import { useAuth } from '../../hooks/useAuth';
import useLoading from '../../hooks/useLoading';
import { LayoutDashboard, Clock, CheckCircle2, DollarSign, Banknote } from 'lucide-react';

const Dashboard = () => {
  const { isLoading, startLoading, stopLoading } = useLoading(true);
  const { projects } = useProjects();
  const { stats: paymentStats, approvalStats, monthlyData, verificationData } = usePaymentAnalytics();
  const { payouts, loading: payoutsLoading, hasPendingPayouts, totalPending } = usePendingPayouts();
  const { user } = useAuth();
  const [statsData, setStatsData] = useState([]);

  // Calculate dashboard statistics
  useEffect(() => {
    const calculateStats = async () => {
      if (!user?.id) {
        setStatsData([]);
        return;
      }

      startLoading();

      try {
        const projectStats = projects.length > 0
          ? await projectService.getProjectStats(user.id)
          : { total: 0, totalBudget: 0, totalPaid: 0 };

        const calculatedStats = [
          {
            title: 'Total Projects',
            value: projectStats.total.toString(),
            change: '+12%',
            changeType: 'positive',
            icon: <LayoutDashboard size={20} />,
            subtitle: 'Active projects'
          },
          {
            title: 'Pending Approval',
            value: `${approvalStats?.pendingApproval || 0}`,
            change: approvalStats?.pendingApproval > 0 ? 'Needs attention' : 'All clear',
            changeType: approvalStats?.pendingApproval > 0 ? 'warning' : 'positive',
            icon: <Clock size={20} />,
            subtitle: 'Awaiting approval'
          },
          {
            title: 'Verified Payments',
            value: `${approvalStats?.verified || 0}`,
            change: `${Math.round(((approvalStats?.verified || 0) / (approvalStats?.total || 1)) * 100)}%`,
            changeType: 'positive',
            icon: <CheckCircle2 size={20} />,
            subtitle: 'Fully approved'
          },
          {
            title: 'Total Budget',
            value: `${projectStats.totalBudget.toLocaleString()}`,
            change: '+8.2%',
            changeType: 'positive',
            icon: <DollarSign size={20} />,
            subtitle: 'Project budgets'
          },
          {
            title: 'Pending Payouts',
            value: `₹${totalPending.toLocaleString('en-IN')}`,
            change: hasPendingPayouts ? 'Needs settlement' : 'All settled',
            changeType: hasPendingPayouts ? 'warning' : 'positive',
            icon: <Banknote size={20} />,
            subtitle: 'Outstanding dues'
          }
        ];

        setStatsData(calculatedStats);
      } catch (error) {
        console.error('Error calculating stats:', error);
        // Fallback to basic stats
        setStatsData([
          {
            title: 'Total Projects',
            value: projects.length.toString(),
            change: '+12%',
            changeType: 'positive',
            icon: <LayoutDashboard size={20} />,
            subtitle: 'Active projects'
          },
          {
            title: 'Pending Payouts',
            value: `₹${totalPending.toLocaleString('en-IN')}`,
            change: hasPendingPayouts ? 'Needs settlement' : 'All settled',
            changeType: hasPendingPayouts ? 'warning' : 'positive',
            icon: <Banknote size={20} />,
            subtitle: 'Outstanding dues'
          }
        ]);
      } finally {
        stopLoading();
      }
    };

    calculateStats();
  }, [projects, paymentStats, approvalStats, user?.id, totalPending, hasPendingPayouts, startLoading, stopLoading]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
        <p>Welcome back! Here's an overview of your projects and payments.</p>
      </div>

      <div className={styles.content}>
        <div className={styles.statsGrid}>
          {isLoading ? (
            // Show loading skeletons
            Array.from({ length: 5 }, (_, index) => (
              <StatsSkeleton key={index} />
            ))
          ) : (
            // Show actual data
            statsData.map((stat, index) => (
              <StatsCard
                key={index}
                title={stat.title}
                value={stat.value}
                change={stat.change}
                changeType={stat.changeType}
                icon={stat.icon}
                subtitle={stat.subtitle}
              />
            ))
          )}
        </div>

        {/* Pending Payouts Section */}
        {hasPendingPayouts && (
          <div className={styles.payoutsSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Pending Payouts</h2>
              <p className={styles.sectionSubtitle}>Outstanding amounts requiring settlement</p>
            </div>
            <div className={styles.payoutsGrid}>
              {payoutsLoading ? (
                Array.from({ length: 3 }, (_, index) => (
                  <StatsSkeleton key={index} />
                ))
              ) : (
                Object.entries(payouts).map(([party, data]) => (
                  <PendingPayoutCard
                    key={party}
                    party={party}
                    amount={data.amount}
                    currency={data.currency}
                    entryCount={data.entryCount}
                    error={data.error}
                  />
                ))
              )}
            </div>
          </div>
        )}

        <div className={styles.chartsSection}>
          <div className={styles.chartGrid}>
            <div className={styles.revenueChart}>
              {isLoading ? (
                <CardSkeleton />
              ) : (
                <RevenueChart
                  type="area"
                  height={350}
                  data={monthlyData}
                />
              )}
            </div>
            <div className={styles.verificationChart}>
              {isLoading ? (
                <CardSkeleton />
              ) : (
                <VerificationChart
                  data={verificationData}
                  title="Payment Verification Status"
                />
              )}
            </div>
          </div>
        </div>

        <div className={styles.activitySection}>
          {isLoading ? (
            <CardSkeleton />
          ) : (
            <RecentActivity maxItems={6} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;