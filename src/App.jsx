import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppProvider } from './contexts/AppContext';
import { ProtectedRoute } from './components/auth';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingFallback from './components/common/LoadingFallback';
import Notifications from './pages/Notifications';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients/Clients'));
const AddClient = lazy(() => import('./pages/AddClient/AddClient'));
const ClientDetails = lazy(() => import('./pages/ClientDetails/ClientDetails'));
const Projects = lazy(() => import('./pages/Projects'));
const AddProject = lazy(() => import('./pages/AddProject'));
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const Payments = lazy(() => import('./pages/Payments'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const RevenueRules = lazy(() => import('./pages/RevenueRules'));
const Ledger = lazy(() => import('./pages/Ledger'));

// Import test utilities for development
if (import.meta.env.MODE === 'development') {
  import('./utils/createTestUser');
}

// App Routes component that uses auth context
const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public route */}
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
            }
          />

          {/* Protected routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/clients/add" element={<AddClient />} />
                    <Route path="/clients/:id" element={<ClientDetails />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/projects/add" element={<AddProject />} />
                    <Route path="/projects/:id/edit" element={<AddProject />} />
                    <Route path="/projects/:id" element={<ProjectDetails />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/revenue-rules" element={<RevenueRules />} />
                    <Route path="/ledger" element={<Ledger />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    {/* Catch all route */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </Router>
  );
};

function App() {
  return (
    <ErrorBoundary
      title="Application Error"
      message="Something went wrong with the application. Please refresh the page or contact support if the problem persists."
      showReload={true}
      showDetails={import.meta.env.MODE === 'development'}
      onError={(error, errorInfo) => {
        // Log error to monitoring service in production
        console.error('Application Error:', error, errorInfo);
      }}
    >
      <AppProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
