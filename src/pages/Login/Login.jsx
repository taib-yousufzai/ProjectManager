import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Wifi, WifiOff, Loader2, LogIn } from 'lucide-react';
import logo from '../../assets/logo-v3.png';
import styles from './Login.module.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  const { login } = useAuth();
  const navigate = useNavigate();

  // Check connection status
  useEffect(() => {
    const checkConnection = () => {
      if (navigator.onLine) {
        setConnectionStatus('online');
      } else {
        setConnectionStatus('offline');
      }
    };

    checkConnection();
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      setErrors({
        general: 'Login is taking longer than expected. Please check your connection and try again.'
      });
    }, 30000);

    try {
      const result = await login(formData.email, formData.password);

      clearTimeout(timeoutId);

      if (result.success) {
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      } else {
        setErrors({
          general: result.error || 'Unable to sign in. Please check your credentials and try again.'
        });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Login error:', error);

      let errorMessage = 'An unexpected error occurred. ';
      if (error.message?.includes('offline')) {
        errorMessage += 'Please check your internet connection and try again.';
      } else {
        errorMessage += 'Please try again or contact support if the problem persists.';
      }

      setErrors({
        general: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        {/* Connection Status */}
        {connectionStatus === 'offline' && (
          <div className={styles.connectionBanner}>
            <WifiOff size={16} />
            <span>No internet connection</span>
          </div>
        )}

        {/* Header */}
        <div className={styles.header}>
          <img src="/logo-v3.png" alt="Project Manager Logo" className={styles.logo} />
          <h1 className={styles.title}>Project Manager</h1>
          <p className={styles.subtitle}>Sign in to your account</p>
        </div>

        {/* Error Message */}
        {errors.general && (
          <div className={styles.errorMessage} role="alert">
            {errors.general}
          </div>
        )}

        {/* Login Form */}
        <form className={styles.loginForm} onSubmit={handleSubmit} autoComplete="on">
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e)}
              disabled={isSubmitting}
              autoComplete="email"
              className={errors.email ? styles.inputError : ''}
            />
            {errors.email && (
              <span className={styles.error}>{errors.email}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e)}
              disabled={isSubmitting}
              autoComplete="current-password"
              className={errors.password ? styles.inputError : ''}
            />
            {errors.password && (
              <span className={styles.error}>{errors.password}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || connectionStatus === 'offline'}
            className={styles.submitButton}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className={styles.spinner} />
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Sign in
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;