import { Component } from 'react';
import styles from './ErrorBoundary.module.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You can also log the error to an error reporting service here
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className={styles.errorBoundary}>
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <h2 className={styles.errorTitle}>
              {this.props.title || 'Something went wrong'}
            </h2>
            <p className={styles.errorMessage}>
              {this.props.message || 'An unexpected error occurred. Please try again.'}
            </p>
            
            {this.props.showDetails && this.state.error && (
              <details className={styles.errorDetails}>
                <summary>Error Details</summary>
                <pre className={styles.errorStack}>
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            
            <div className={styles.errorActions}>
              <button 
                className={styles.retryButton}
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              
              {this.props.showReload && (
                <button 
                  className={styles.reloadButton}
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use with hooks
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Lightweight error boundary for specific sections
export const ErrorFallback = ({ 
  error, 
  resetError, 
  title = 'Something went wrong',
  message = 'Please try again or contact support if the problem persists.'
}) => (
  <div className={styles.errorFallback}>
    <div className={styles.fallbackContent}>
      <span className={styles.fallbackIcon}>⚠️</span>
      <h3 className={styles.fallbackTitle}>{title}</h3>
      <p className={styles.fallbackMessage}>{message}</p>
      <button 
        className={styles.fallbackButton}
        onClick={resetError}
      >
        Try Again
      </button>
    </div>
  </div>
);

export default ErrorBoundary;