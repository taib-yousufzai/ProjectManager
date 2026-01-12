import React, { useState, useId } from 'react';
import styles from './Input.module.css';

const Input = ({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  className = '',
  helperText,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const errorId = useId();
  const helperTextId = useId();

  const inputClasses = [
    styles.input,
    error && styles['input--error'],
    disabled && styles['input--disabled'],
    focused && styles['input--focused'],
    className
  ].filter(Boolean).join(' ');

  const containerClasses = [
    styles.inputContainer,
    error && styles['inputContainer--error'],
    disabled && styles['inputContainer--disabled']
  ].filter(Boolean).join(' ');

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value, e);
    }
  };

  const handleFocus = (e) => {
    setFocused(true);
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  const handleBlur = (e) => {
    setFocused(false);
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <div className={containerClasses}>
      {label && (
        <label
          htmlFor={inputId}
          className={styles.label}
        >
          {label}
          {required && (
            <span className={styles.required} aria-label="required">
              *
            </span>
          )}
        </label>
      )}

      <div className={styles.inputWrapper}>
        <input
          id={inputId}
          type={type}
          className={inputClasses}
          placeholder={placeholder}
          value={value || ''}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            [
              error ? errorId : null,
              helperText ? helperTextId : null
            ].filter(Boolean).join(' ') || undefined
          }
          {...props}
        />
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

export default Input;