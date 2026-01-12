/**
 * Data encryption utilities for sensitive financial data
 * Note: This is a simplified implementation for demonstration.
 * In production, use proper encryption libraries and key management.
 */

// Simple encryption key (in production, this should be from environment variables)
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Simple XOR encryption for demonstration
 * In production, use proper encryption algorithms like AES
 */
function simpleEncrypt(text, key) {
  if (!text) return text;
  
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result); // Base64 encode
}

/**
 * Simple XOR decryption
 */
function simpleDecrypt(encryptedText, key) {
  if (!encryptedText) return encryptedText;
  
  try {
    const decoded = atob(encryptedText); // Base64 decode
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedText; // Return original if decryption fails
  }
}

/**
 * Encrypt sensitive financial data
 */
export const encryptSensitiveData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = [
    'amount', 'totalAmount', 'balance', 'netBalance',
    'totalPending', 'totalCleared', 'adminPercent',
    'teamPercent', 'vendorPercent', 'transactionId',
    'accountNumber', 'routingNumber', 'ssn', 'taxId'
  ];
  
  const encrypted = { ...data };
  
  sensitiveFields.forEach(field => {
    if (encrypted[field] !== undefined && encrypted[field] !== null) {
      // Convert to string if it's a number
      const value = typeof encrypted[field] === 'number' 
        ? encrypted[field].toString() 
        : encrypted[field];
      
      encrypted[field] = simpleEncrypt(value, ENCRYPTION_KEY);
      encrypted[`${field}_encrypted`] = true;
    }
  });
  
  return encrypted;
};

/**
 * Decrypt sensitive financial data
 */
export const decryptSensitiveData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const decrypted = { ...data };
  
  Object.keys(decrypted).forEach(key => {
    if (key.endsWith('_encrypted') && decrypted[key] === true) {
      const fieldName = key.replace('_encrypted', '');
      if (decrypted[fieldName]) {
        const decryptedValue = simpleDecrypt(decrypted[fieldName], ENCRYPTION_KEY);
        
        // Convert back to number if it was originally a number
        if (!isNaN(decryptedValue) && decryptedValue !== '') {
          decrypted[fieldName] = parseFloat(decryptedValue);
        } else {
          decrypted[fieldName] = decryptedValue;
        }
        
        // Remove the encryption flag
        delete decrypted[`${fieldName}_encrypted`];
      }
    }
  });
  
  return decrypted;
};

/**
 * Hash sensitive data for comparison without storing plaintext
 */
export const hashSensitiveData = (data) => {
  if (!data) return data;
  
  // Simple hash function (in production, use proper hashing like SHA-256)
  let hash = 0;
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash.toString(36);
};

/**
 * Mask sensitive data for display purposes
 */
export const maskSensitiveData = (data, maskChar = '*') => {
  if (!data) return data;
  
  const str = typeof data === 'string' ? data : data.toString();
  
  if (str.length <= 4) {
    return maskChar.repeat(str.length);
  }
  
  // Show first 2 and last 2 characters, mask the middle
  const start = str.substring(0, 2);
  const end = str.substring(str.length - 2);
  const middle = maskChar.repeat(str.length - 4);
  
  return start + middle + end;
};

/**
 * Validate data integrity using checksums
 */
export const generateChecksum = (data) => {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  let checksum = 0;
  
  for (let i = 0; i < str.length; i++) {
    checksum += str.charCodeAt(i);
  }
  
  return checksum.toString(16);
};

/**
 * Verify data integrity
 */
export const verifyChecksum = (data, expectedChecksum) => {
  const actualChecksum = generateChecksum(data);
  return actualChecksum === expectedChecksum;
};

/**
 * Secure data transmission preparation
 */
export const prepareForTransmission = (data) => {
  const encrypted = encryptSensitiveData(data);
  const checksum = generateChecksum(encrypted);
  
  return {
    data: encrypted,
    checksum,
    timestamp: new Date().toISOString(),
    version: '1.0'
  };
};

/**
 * Verify and decrypt received data
 */
export const processReceivedData = (payload) => {
  if (!payload || !payload.data || !payload.checksum) {
    throw new Error('Invalid payload structure');
  }
  
  // Verify checksum
  if (!verifyChecksum(payload.data, payload.checksum)) {
    throw new Error('Data integrity check failed');
  }
  
  // Decrypt sensitive data
  return decryptSensitiveData(payload.data);
};

/**
 * Compliance utilities
 */
export const complianceUtils = {
  /**
   * Remove sensitive data for logging
   */
  sanitizeForLogging: (data) => {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    const sensitiveFields = [
      'amount', 'totalAmount', 'balance', 'netBalance',
      'totalPending', 'totalCleared', 'transactionId',
      'accountNumber', 'routingNumber', 'ssn', 'taxId',
      'password', 'token', 'key', 'secret'
    ];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field] !== undefined) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  },
  
  /**
   * Generate audit-safe data representation
   */
  createAuditSafeData: (data) => {
    const sanitized = complianceUtils.sanitizeForLogging(data);
    return {
      ...sanitized,
      dataHash: hashSensitiveData(data),
      auditTimestamp: new Date().toISOString()
    };
  },
  
  /**
   * Check if data contains sensitive information
   */
  containsSensitiveData: (data) => {
    if (!data || typeof data !== 'object') return false;
    
    const sensitiveFields = [
      'amount', 'totalAmount', 'balance', 'transactionId',
      'accountNumber', 'routingNumber', 'ssn', 'taxId'
    ];
    
    return sensitiveFields.some(field => data[field] !== undefined);
  }
};

// Export all utilities
export {
  simpleEncrypt,
  simpleDecrypt
};