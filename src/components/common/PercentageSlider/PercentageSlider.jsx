import React, { useState, useId } from 'react';
import styles from './PercentageSlider.module.css';

const PercentageSlider = ({
  label,
  value = 0,
  onChange,
  min = 0,
  max = 100,
  step = 0.1,
  disabled = false,
  error,
  helperText,
  showInput = true,
  className = '',
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const sliderId = useId();
  const inputId = useId();
  const errorId = useId();
  const helperTextId = useId();

  const containerClasses = [
    styles.percentageSlider,
    error && styles['percentageSlider--error'],
    disabled && styles['percentageSlider--disabled'],
    focused && styles['percentageSlider--focused'],
    className
  ].filter(Boolean).join(' ');

  const handleSliderChange = (e) => {
    const newValue = parseFloat(e.target.value);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleInputChange = (e) => {
    let newValue = e.target.value;
    
    // Allow empty string for user input
    if (newValue === '') {
      if (onChange) {
        onChange(0);
      }
      return;
    }
    
    // Parse and validate the input
    newValue = parseFloat(newValue);
    if (!isNaN(newValue)) {
      // Clamp value to min/max range
      newValue = Math.max(min, Math.min(max, newValue));
      if (onChange) {
        onChange(newValue);
      }
    }
  };

  const handleFocus = () => {
    setFocused(true);
  };

  const handleBlur = () => {
    setFocused(false);
  };

  // Calculate slider fill percentage for visual feedback
  const fillPercentage = ((value - min) / (max - min)) * 100;

  // Get validation status for styling
  const getValidationStatus = () => {
    if (error) return 'error';
    if (value === 0) return 'empty';
    if (value < 25) return 'low';
    if (value < 75) return 'medium';
    return 'high';
  };

  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={sliderId} className={styles.label}>
          {label}
        </label>
      )}
      
      <div className={styles.sliderContainer}>
        {/* Range Slider */}
        <div className={styles.sliderWrapper}>
          <input
            id={sliderId}
            type="range"
            className={`${styles.slider} ${styles[`slider--${getValidationStatus()}`]}`}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            aria-describedby={
              [
                error ? errorId : null,
                helperText ? helperTextId : null
              ].filter(Boolean).join(' ') || undefined
            }
            {...props}
          />
          <div 
            className={styles.sliderFill}
            style={{ width: `${fillPercentage}%` }}
          />
          <div className={styles.sliderTrack} />
        </div>

        {/* Percentage Input */}
        {showInput && (
          <div className={styles.inputWrapper}>
            <input
              id={inputId}
              type="number"
              className={styles.percentageInput}
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={disabled}
              aria-label={`${label} percentage value`}
            />
            <span className={styles.percentageSymbol}>%</span>
          </div>
        )}
      </div>

      {/* Visual Indicators */}
      <div className={styles.indicators}>
        <div className={styles.rangeLabels}>
          <span className={styles.rangeLabel}>{min}%</span>
          <span className={styles.currentValue}>
            {value.toFixed(1)}%
          </span>
          <span className={styles.rangeLabel}>{max}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className={styles.progressBar}>
          <div 
            className={`${styles.progressFill} ${styles[`progressFill--${getValidationStatus()}`]}`}
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
      </div>

      {error && (
        <div 
          id={errorId}
          className={styles.errorMessage}
          role="alert"
        >
          {error}
        </div>
      )}

      {helperText && !error && (
        <div 
          id={helperTextId}
          className={styles.helperText}
        >
          {helperText}
        </div>
      )}
    </div>
  );
};

export default PercentageSlider;