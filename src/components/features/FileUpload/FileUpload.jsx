import { useState, useRef } from 'react';
import Button from '../../common/Button';
import { generateId } from '../../../utils/helpers';
import styles from './FileUpload.module.css';

const FileUpload = ({ 
  onFileUpload, 
  onFileRemove, 
  acceptedTypes = '.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt',
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  multiple = true,
  existingFiles = []
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const errors = [];
    
    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File "${file.name}" is too large. Maximum size is ${formatFileSize(maxFileSize)}.`);
    }
    
    // Check file type
    if (acceptedTypes && acceptedTypes !== '*') {
      const allowedExtensions = acceptedTypes.split(',').map(ext => ext.trim().toLowerCase());
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      const mimeTypeAllowed = allowedExtensions.some(ext => 
        ext === fileExtension || file.type.includes(ext.replace('.', ''))
      );
      
      if (!mimeTypeAllowed) {
        errors.push(`File "${file.name}" type is not allowed. Accepted types: ${acceptedTypes}`);
      }
    }
    
    return errors;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const simulateUpload = (file, fileId) => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
          resolve();
        } else {
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: Math.round(progress)
          }));
        }
      }, 200);
    });
  };

  const handleFiles = async (files) => {
    const fileArray = Array.from(files);
    const validationErrors = [];
    
    // Validate all files first
    fileArray.forEach(file => {
      const fileErrors = validateFile(file);
      validationErrors.push(...fileErrors);
    });
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setErrors([]);
    setUploading(true);
    
    try {
      for (const file of fileArray) {
        const fileId = generateId();
        
        // Start progress tracking
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        
        // Simulate upload progress
        await simulateUpload(file, fileId);
        
        // Create file object
        const uploadedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file), // In real app, this would be the server URL
          uploadedBy: 'Current User', // In real app, get from auth context
          uploadedAt: new Date(),
        };
        
        // Notify parent component
        onFileUpload?.(uploadedFile);
      }
    } catch (error) {
      setErrors(['Upload failed. Please try again.']);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (fileId) => {
    onFileRemove?.(fileId);
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type?.startsWith('text/')) return '📝';
    if (type?.includes('spreadsheet') || type?.includes('excel')) return '📊';
    if (type?.includes('presentation') || type?.includes('powerpoint')) return '📈';
    if (type?.includes('word') || type?.includes('document')) return '📃';
    return '📎';
  };

  return (
    <div className={styles.fileUpload}>
      {/* Upload Area */}
      <div
        className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''} ${uploading ? styles.uploading : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes}
          onChange={handleFileInput}
          className={styles.hiddenInput}
        />
        
        <div className={styles.uploadContent}>
          <div className={styles.uploadIcon}>📁</div>
          <h3>Drop files here or click to browse</h3>
          <p>
            Accepted formats: {acceptedTypes.replace(/\./g, '').toUpperCase()}
            <br />
            Maximum file size: {formatFileSize(maxFileSize)}
          </p>
          <Button variant="primary" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Choose Files'}
          </Button>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className={styles.errorContainer}>
          {errors.map((error, index) => (
            <div key={index} className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className={styles.progressContainer}>
          <h4>Uploading files...</h4>
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className={styles.progressItem}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={styles.progressText}>{progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <div className={styles.fileList}>
          <h4>Uploaded Files</h4>
          {existingFiles.map(file => (
            <div key={file.id} className={styles.fileItem}>
              <div className={styles.fileInfo}>
                <span className={styles.fileIcon}>{getFileIcon(file.type)}</span>
                <div className={styles.fileDetails}>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                </div>
              </div>
              <div className={styles.fileActions}>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => window.open(file.url, '_blank')}
                >
                  View
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => removeFile(file.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;