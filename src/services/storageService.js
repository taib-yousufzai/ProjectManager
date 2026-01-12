import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable,
  getMetadata
} from 'firebase/storage';
import { storage } from '../config/firebase';
import { filesService } from './firestore';
import { createFile } from '../models';

export class StorageService {
  // Upload file to Firebase Storage
  async uploadFile(file, path, onProgress = null) {
    try {
      const storageRef = ref(storage, path);
      
      if (onProgress) {
        // Use resumable upload for progress tracking
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress(progress);
            },
            (error) => {
              console.error('Upload error:', error);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      } else {
        // Simple upload without progress
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Upload payment proof file
  async uploadPaymentProof(file, paymentId, userId, onProgress = null) {
    try {
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}_${file.name}`;
      const path = `payments/${paymentId}/proofs/${fileName}`;
      
      // Upload to Firebase Storage
      const downloadURL = await this.uploadFile(file, path, onProgress);
      
      // Create file record in Firestore
      const fileData = createFile({
        name: file.name,
        size: file.size,
        type: file.type,
        url: downloadURL,
        uploadedBy: userId,
        paymentId: paymentId,
        storagePath: path
      });
      
      const fileRecord = await filesService.create(fileData);
      
      return {
        id: fileRecord.id,
        url: downloadURL,
        name: file.name,
        size: file.size,
        type: file.type,
        storagePath: path
      };
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      throw error;
    }
  }

  // Upload payment proof file and update payment record
  async uploadPaymentProofAndUpdate(file, paymentId, userId, onProgress = null) {
    try {
      // Validate file first
      const validation = this.validatePaymentProof(file);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Upload the file
      const uploadResult = await this.uploadPaymentProof(file, paymentId, userId, onProgress);
      
      // Get current payment to update proofUrls
      const { paymentsService, projectsService } = await import('./firestore');
      const payment = await paymentsService.getById(paymentId);
      
      // Add new proof URL to the payment
      const updatedProofUrls = [...(payment.proofUrls || []), uploadResult.url];
      
      // Update payment with new proof URL
      await paymentsService.update(paymentId, {
        proofUrls: updatedProofUrls
      });
      
      // Send notification to team members about proof upload
      try {
        const { notificationService } = await import('./notificationService');
        const project = await projectsService.getById(payment.projectId);
        
        await notificationService.notifyProofUploaded(
          { ...payment, proofUrls: updatedProofUrls },
          project,
          userId
        );
      } catch (notificationError) {
        console.error('Error sending proof upload notification:', notificationError);
        // Don't fail the upload if notification fails
      }
      
      return uploadResult;
    } catch (error) {
      console.error('Error uploading payment proof and updating payment:', error);
      throw error;
    }
  }

  // Upload project file
  async uploadProjectFile(file, projectId, userId, onProgress = null) {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const path = `projects/${projectId}/files/${fileName}`;
      
      // Upload to Firebase Storage
      const downloadURL = await this.uploadFile(file, path, onProgress);
      
      // Create file record in Firestore
      const fileData = createFile({
        name: file.name,
        size: file.size,
        type: file.type,
        url: downloadURL,
        uploadedBy: userId,
        projectId: projectId,
        storagePath: path
      });
      
      const fileRecord = await filesService.create(fileData);
      
      return {
        id: fileRecord.id,
        url: downloadURL,
        name: file.name,
        size: file.size,
        type: file.type,
        storagePath: path
      };
    } catch (error) {
      console.error('Error uploading project file:', error);
      throw error;
    }
  }

  // Delete file from storage and Firestore
  async deleteFile(fileId) {
    try {
      // Get file record from Firestore
      const fileRecord = await filesService.getById(fileId);
      
      // Delete from Firebase Storage
      if (fileRecord.storagePath) {
        const storageRef = ref(storage, fileRecord.storagePath);
        await deleteObject(storageRef);
      }
      
      // Delete from Firestore
      await filesService.delete(fileId);
      
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Get files for a payment
  async getPaymentFiles(paymentId) {
    try {
      return await filesService.getAll({
        where: [['paymentId', '==', paymentId]],
        orderBy: [['createdAt', 'desc']]
      });
    } catch (error) {
      console.error('Error getting payment files:', error);
      throw error;
    }
  }

  // Get files for a project
  async getProjectFiles(projectId) {
    try {
      return await filesService.getAll({
        where: [['projectId', '==', projectId]],
        orderBy: [['createdAt', 'desc']]
      });
    } catch (error) {
      console.error('Error getting project files:', error);
      throw error;
    }
  }

  // Get file metadata
  async getFileMetadata(storagePath) {
    try {
      const storageRef = ref(storage, storagePath);
      return await getMetadata(storageRef);
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  // Generate file preview URL (for images)
  getPreviewUrl(file) {
    if (file.type.startsWith('image/')) {
      return file.url;
    }
    return null;
  }

  // Check if file type is supported for preview
  isPreviewSupported(fileType) {
    const supportedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];
    return supportedTypes.includes(fileType);
  }

  // Upload settlement proof file
  async uploadSettlementProof(file, settlementId, userId, onProgress = null) {
    try {
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}_${file.name}`;
      const path = `settlements/${settlementId}/proofs/${fileName}`;
      
      // Upload to Firebase Storage
      const downloadURL = await this.uploadFile(file, path, onProgress);
      
      // Create file record in Firestore
      const fileData = createFile({
        name: file.name,
        size: file.size,
        type: file.type,
        url: downloadURL,
        uploadedBy: userId,
        settlementId: settlementId,
        storagePath: path
      });
      
      const fileRecord = await filesService.create(fileData);
      
      return {
        id: fileRecord.id,
        url: downloadURL,
        name: file.name,
        size: file.size,
        type: file.type,
        storagePath: path,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error uploading settlement proof:', error);
      throw error;
    }
  }

  // Get files for a settlement
  async getSettlementFiles(settlementId) {
    try {
      return await filesService.getAll({
        where: [['settlementId', '==', settlementId]],
        orderBy: [['createdAt', 'desc']]
      });
    } catch (error) {
      console.error('Error getting settlement files:', error);
      throw error;
    }
  }

  // Validate payment proof file
  validatePaymentProof(file, maxSize = 5 * 1024 * 1024) { // 5MB for proof files
    const errors = [];
    
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSize / 1024 / 1024}MB`);
    }
    
    // Only allow images and PDFs for payment proofs
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      errors.push('Only JPG, PNG, and PDF files are allowed for payment proofs');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate settlement proof file
  validateSettlementProof(file, maxSize = 5 * 1024 * 1024) { // 5MB for settlement proof files
    const errors = [];
    
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSize / 1024 / 1024}MB`);
    }
    
    // Allow images, PDFs, and documents for settlement proofs
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      errors.push('Only JPG, PNG, PDF, DOC, DOCX, and TXT files are allowed for settlement proofs');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate file before upload
  validateFile(file, maxSize = 10 * 1024 * 1024) { // 10MB default
    const errors = [];
    
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSize / 1024 / 1024}MB`);
    }
    
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png', 
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not supported');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const storageService = new StorageService();