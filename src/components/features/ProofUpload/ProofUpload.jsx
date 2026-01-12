import { useState, useRef } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { storageService } from '../../../services/storageService';
import Button from '../../common/Button';
import Modal from '../../common/Modal';
import styles from './ProofUpload.module.css';

const ProofUpload = ({ paymentId, existingFiles = [], onFilesChange }) => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    
    try {
      const uploadPromises = files.map(file => {
        // Validate payment proof file (only images and PDFs)
        const validation = storageService.validatePaymentProof(file);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
        
        return storageService.uploadPaymentProofAndUpdate(
          file, 
          paymentId, 
          user.id,
          (progress) => setUploadProgress(progress)
        );
      });
      
      const uploadedFiles = await Promise.all(uploadPromises);
      
      // Update parent component with new files
      onFilesChange?.([...existingFiles, ...uploadedFiles]);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      // Create a fake event object for handleFileSelect
      const fakeEvent = {
        target: { files }
      };
      handleFileSelect(fakeEvent);
    }
  };
  
  const handleFileDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }
    
    try {
      await storageService.deleteFile(fileId);
      
      // Update parent component
      const updatedFiles = existingFiles.filter(f => f.id !== fileId);
      onFilesChange?.(updatedFiles);
    } catch (error) {
      console.error('Error deleting file:', error);
      alert(`Delete failed: ${error.message}`);
    }
  };
  
  const handlePreview = (file) => {
    setPreviewFile(file);
    setShowPreview(true);
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
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <>
      <div className={styles.proofUpload}>
        <div className={styles.uploadHeader}>
          <h4>Payment Proof Files</h4>
          <Button
            variant="primary"
            size="small"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className={styles.hiddenInput}
        />
        
        {uploading && (
          <div className={styles.uploadProgress}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className={styles.progressText}>
              Uploading... {Math.round(uploadProgress)}%
            </span>
          </div>
        )}
        
        {existingFiles.length === 0 ? (
          <div 
            className={`${styles.emptyState} ${isDragOver ? styles.dragOver : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.emptyIcon}>📎</div>
            <p>No proof files uploaded yet</p>
            <p className={styles.emptySubtext}>
              Drag and drop files here or click to upload
            </p>
            <p className={styles.emptySubtext}>
              Upload receipts, invoices, or other payment proof documents
            </p>
          </div>
        ) : (
          <div className={styles.filesList}>
            {existingFiles.map((file) => (
              <div key={file.id} className={styles.fileItem}>
                <div className={styles.fileIcon}>
                  {getFileIcon(file.type)}
                </div>
                <div className={styles.fileInfo}>
                  <div className={styles.fileName}>{file.name}</div>
                  <div className={styles.fileDetails}>
                    {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={styles.fileActions}>
                  {storageService.isPreviewSupported(file.type) && (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handlePreview(file)}
                    >
                      Preview
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => window.open(file.url, '_blank')}
                  >
                    Download
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => handleFileDelete(file.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className={styles.uploadHint}>
          <p>Supported formats: PDF, JPG, PNG (payment proof files only)</p>
          <p>Maximum file size: 5MB per file</p>
        </div>
      </div>
      
      {/* File Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={previewFile?.name || 'File Preview'}
        size="large"
      >
        {previewFile && (
          <div className={styles.previewContainer}>
            {previewFile.type.startsWith('image/') ? (
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className={styles.previewImage}
              />
            ) : previewFile.type === 'application/pdf' ? (
              <iframe
                src={previewFile.url}
                className={styles.previewPdf}
                title={previewFile.name}
              />
            ) : (
              <div className={styles.previewUnsupported}>
                <div className={styles.previewIcon}>
                  {getFileIcon(previewFile.type)}
                </div>
                <p>Preview not available for this file type</p>
                <Button
                  variant="primary"
                  onClick={() => window.open(previewFile.url, '_blank')}
                >
                  Open in New Tab
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default ProofUpload;