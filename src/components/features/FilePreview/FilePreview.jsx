import { useState } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import { formatDate } from '../../../utils/helpers';
import styles from './FilePreview.module.css';

const FilePreview = ({ file, isOpen, onClose, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!file) return null;

  const isImage = file.type?.startsWith('image/');
  const isPDF = file.type === 'application/pdf';
  const isText = file.type?.startsWith('text/');

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, this would download from the server
      // For now, we'll simulate the download
      if (file.url) {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('File URL not available');
      }
    } catch (err) {
      setError('Failed to download file');
      console.error('Download error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      try {
        setLoading(true);
        setError(null);
        await onDelete?.(file.id);
        onClose();
      } catch (err) {
        setError('Failed to delete file');
        console.error('Delete error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderPreview = () => {
    if (error) {
      return (
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>⚠️</div>
          <p>Unable to preview this file</p>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      );
    }

    if (isImage && file.url) {
      return (
        <div className={styles.imagePreview}>
          <img 
            src={file.url} 
            alt={file.name}
            className={styles.previewImage}
            onError={() => setError('Failed to load image')}
          />
        </div>
      );
    }

    if (isPDF && file.url) {
      return (
        <div className={styles.pdfPreview}>
          <iframe
            src={file.url}
            className={styles.pdfFrame}
            title={file.name}
            onError={() => setError('Failed to load PDF')}
          />
        </div>
      );
    }

    if (isText && file.url) {
      return (
        <div className={styles.textPreview}>
          <iframe
            src={file.url}
            className={styles.textFrame}
            title={file.name}
            onError={() => setError('Failed to load text file')}
          />
        </div>
      );
    }

    // Generic file preview
    return (
      <div className={styles.genericPreview}>
        <div className={styles.fileIcon}>
          {getFileIcon(file.type)}
        </div>
        <h3>{file.name}</h3>
        <p>Preview not available for this file type</p>
        <p className={styles.fileType}>{file.type || 'Unknown type'}</p>
      </div>
    );
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type?.startsWith('text/')) return '📝';
    if (type?.includes('spreadsheet') || type?.includes('excel')) return '📊';
    if (type?.includes('presentation') || type?.includes('powerpoint')) return '📈';
    if (type?.includes('word') || type?.includes('document')) return '📃';
    if (type?.includes('zip') || type?.includes('archive')) return '🗜️';
    return '📎';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large" title="File Preview">
      <div className={styles.filePreview}>
        {/* File Info Header */}
        <div className={styles.fileInfo}>
          <div className={styles.fileDetails}>
            <h3 className={styles.fileName}>{file.name}</h3>
            <div className={styles.fileMetadata}>
              <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
              <span className={styles.separator}>•</span>
              <span className={styles.fileDate}>
                Uploaded {formatDate(file.uploadedAt, 'relative')}
              </span>
              {file.uploadedBy && (
                <>
                  <span className={styles.separator}>•</span>
                  <span className={styles.uploadedBy}>by {file.uploadedBy}</span>
                </>
              )}
            </div>
          </div>
          
          <div className={styles.fileActions}>
            <Button
              variant="secondary"
              onClick={handleDownload}
              disabled={loading}
            >
              {loading ? 'Downloading...' : 'Download'}
            </Button>
            {onDelete && (
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className={styles.errorBanner}>
            <span className={styles.errorIcon}>⚠️</span>
            {error}
          </div>
        )}

        {/* Preview Content */}
        <div className={styles.previewContainer}>
          {renderPreview()}
        </div>
      </div>
    </Modal>
  );
};

export default FilePreview;