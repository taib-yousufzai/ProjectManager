import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  CLIENTS: 'clients', // NEW
  PROJECTS: 'projects',
  TASKS: 'tasks', // NEW
  MILESTONES: 'milestones', // NEW
  PAYMENTS: 'payments',
  FILES: 'files',
  REVENUE_RULES: 'revenueRules',
  LEDGER_ENTRIES: 'ledgerEntries',
  SETTLEMENTS: 'settlements',
  AUDIT_LOGS: 'auditLogs'
};

// Generic CRUD operations
export class FirestoreService {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collectionRef = collection(db, collectionName);
  }

  // Create a new document
  async create(data) {
    try {
      // Remove id from data if it exists to prevent conflicts
      const { id, ...dataWithoutId } = data;

      const docData = {
        ...dataWithoutId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add timeout to prevent infinite hangs
      const createPromise = addDoc(this.collectionRef, docData);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out. Please check your internet connection.')), 30000);
      });

      const docRef = await Promise.race([createPromise, timeoutPromise]);
      // Always use the Firestore-generated ID
      return { id: docRef.id, ...docData };
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);

      // Provide user-friendly error messages
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        throw new Error('Unable to connect to the database. Please check your internet connection and try again.');
      } else if (error.message.includes('timeout')) {
        throw error; // Already has a user-friendly message
      } else if (error.code === 'permission-denied') {
        throw new Error('You do not have permission to create this item.');
      }

      throw error;
    }
  }

  // Get a document by ID
  async getById(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error(`${this.collectionName} not found`);
      }
    } catch (error) {
      console.error(`Error getting ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Get all documents
  async getAll(queryOptions = {}) {
    try {
      let q = this.collectionRef;

      // Apply filters
      if (queryOptions.where) {
        queryOptions.where.forEach(([field, operator, value]) => {
          q = query(q, where(field, operator, value));
        });
      }

      // Apply ordering
      if (queryOptions.orderBy) {
        queryOptions.orderBy.forEach(([field, direction = 'asc']) => {
          q = query(q, orderBy(field, direction));
        });
      }

      // Apply limit
      if (queryOptions.limit) {
        q = query(q, limit(queryOptions.limit));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Update a document
  async update(id, data) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };

      // Add timeout to prevent infinite hangs
      const updatePromise = updateDoc(docRef, updateData);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out. Please check your internet connection.')), 30000);
      });

      await Promise.race([updatePromise, timeoutPromise]);
      return { id, ...updateData };
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);

      // Provide user-friendly error messages
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        throw new Error('Unable to connect to the database. Please check your internet connection and try again.');
      } else if (error.message.includes('timeout')) {
        throw error;
      } else if (error.code === 'permission-denied') {
        throw new Error('You do not have permission to update this item.');
      } else if (error.code === 'not-found') {
        throw new Error(`${this.collectionName} not found.`);
      }

      throw error;
    }
  }

  // Delete a document
  async delete(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
      return id;
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Subscribe to real-time updates
  subscribe(callback, queryOptions = {}) {
    let q = this.collectionRef;

    // Apply filters
    if (queryOptions.where) {
      queryOptions.where.forEach(([field, operator, value]) => {
        q = query(q, where(field, operator, value));
      });
    }

    // Apply ordering
    if (queryOptions.orderBy) {
      queryOptions.orderBy.forEach(([field, direction = 'asc']) => {
        q = query(q, orderBy(field, direction));
      });
    }

    return onSnapshot(q, (querySnapshot) => {
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(docs);
    });
  }
}

// Specific service instances
export const usersService = new FirestoreService(COLLECTIONS.USERS);
export const clientsService = new FirestoreService(COLLECTIONS.CLIENTS); // NEW
export const projectsService = new FirestoreService(COLLECTIONS.PROJECTS);
export const tasksService = new FirestoreService(COLLECTIONS.TASKS); // NEW
export const milestonesService = new FirestoreService(COLLECTIONS.MILESTONES); // NEW
export const paymentsService = new FirestoreService(COLLECTIONS.PAYMENTS);
export const filesService = new FirestoreService(COLLECTIONS.FILES);
export const revenueRulesService = new FirestoreService(COLLECTIONS.REVENUE_RULES);
export const ledgerEntriesService = new FirestoreService(COLLECTIONS.LEDGER_ENTRIES);
export const settlementsService = new FirestoreService(COLLECTIONS.SETTLEMENTS);
export const auditLogsService = new FirestoreService(COLLECTIONS.AUDIT_LOGS);