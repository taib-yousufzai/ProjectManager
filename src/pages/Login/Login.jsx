import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Wifi, WifiOff, Loader2, LogIn } from 'lucide-react';
import logo from '../../assets/logo-v2.png'; // NEW
import styles from './Login.module.css';

const Login = () => {
  const [formData, setFormData] = useState({
// ... (lines 8-136)
        {/* Connection Status */ }
        { connectionStatus === 'offline' && (
      <div className={styles.connectionBanner}>
        <WifiOff size={16} />
        <span>No internet connection</span>
      </div>
    )}

{/* Header */ }
<div className={styles.header}>
  <img src={logo} alt="Project Manager Logo" className={styles.logo} />
  <h1 className={styles.title}>Project Manager</h1>
  <p className={styles.subtitle}>Sign in to your account</p>
</div>

{/* Error Message */ }
{
  errors.general && (
    <div className={styles.errorMessage} role="alert">
      {errors.general}
    </div>
  )
}

{/* Login Form */ }
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
      </div >
    </div >
  );
};

export default Login;