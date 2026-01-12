import { useState, useEffect, createContext, useContext } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { usersService } from '../services/firestore';
import { createUser } from '../models';

// Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper functions for the auth state listener
  const fetchUserDataWithRetry = async (firebaseUser, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          return { id: firebaseUser.uid, ...userDoc.data() };
        } else {
          // If document doesn't exist, create it
          const newUserData = createUser({
            email: firebaseUser.email,
            firstName: firebaseUser.displayName?.split(' ')[0] || '',
            lastName: firebaseUser.displayName?.split(' ')[1] || '',
            lastLoginAt: new Date()
          });
          await setDoc(doc(db, 'users', firebaseUser.uid), newUserData);
          return { id: firebaseUser.uid, ...newUserData };
        }
      } catch (error) {
        console.warn(`Attempt ${i + 1} failed to fetch user data:`, error);
        if (i < retries - 1) {
          await new Promise(res => setTimeout(res, delay));
        } else {
          throw error; // Re-throw if all retries fail
        }
      }
    }
  };

  const updateLastLogin = async (uid) => {
    try {
      await usersService.update(uid, {
        lastLoginAt: new Date()
      });
    } catch (updateError) {
      console.warn('Could not update last login time:', updateError);
    }
  };

  const createUserDocument = async (firebaseUser, minimalUser) => {
    try {
      // Use minimalUser data to create the document
      const newUserData = createUser({
        email: minimalUser.email,
        firstName: minimalUser.firstName,
        lastName: minimalUser.lastName,
        lastLoginAt: new Date(),
        role: minimalUser.role // Include role from minimalUser
      });
      await setDoc(doc(db, 'users', firebaseUser.uid), newUserData);
      console.log('User document created in background.');
    } catch (error) {
      console.error('Error creating user document in background:', error);
    }
  };

  useEffect(() => {
    console.log('[useAuth] Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[useAuth] Auth state changed, firebaseUser:', firebaseUser ? 'logged in' : 'logged out');
      try {
        if (firebaseUser) {
          try {
            console.log('[useAuth] Fetching user data for UID:', firebaseUser.uid);
            // Try to get user data with retry logic
            const userData = await fetchUserDataWithRetry(firebaseUser);
            console.log('[useAuth] Successfully fetched user data');
            setUser(userData);

            // Cache user data
            localStorage.setItem('cachedUser', JSON.stringify(userData));

            // Update last login time (don't block on this)
            updateLastLogin(firebaseUser.uid);
          } catch (error) {
            console.error('[useAuth] Error fetching user data:', error);

            // Try to use cached user data
            const cachedData = localStorage.getItem('cachedUser');
            if (cachedData) {
              console.log('[useAuth] Using cached user data');
              setUser(JSON.parse(cachedData));
            } else {
              console.log('[useAuth] Creating minimal user object');
              // Create minimal user object from Firebase auth
              const minimalUser = {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                firstName: firebaseUser.displayName?.split(' ')[0] || '',
                lastName: firebaseUser.displayName?.split(' ')[1] || '',
                role: 'user' // Default role
              };
              setUser(minimalUser);

              // Try to create user document in background
              createUserDocument(firebaseUser, minimalUser);
            }
          }
        } else {
          console.log('[useAuth] No user logged in, clearing user state');
          setUser(null);
          localStorage.removeItem('cachedUser');
        }
      } catch (error) {
        console.error('[useAuth] Critical error in auth state listener:', error);
        setUser(null);
      } finally {
        // CRITICAL: Always set loading to false, no matter what happens
        console.log('[useAuth] Setting isLoading to false');
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Wait for the auth state to update
      await new Promise(resolve => setTimeout(resolve, 500));

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: getAuthErrorMessage(error.code)
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      const { email, password, firstName, lastName } = userData;

      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`
      });

      // Create user document in Firestore
      const newUserData = createUser({
        email,
        firstName,
        lastName,
        lastLoginAt: new Date()
      });

      await setDoc(doc(db, 'users', userCredential.user.uid), newUserData);

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: getAuthErrorMessage(error.code)
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    register,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to get user-friendly error messages
const getAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    default:
      return 'An error occurred. Please try again.';
  }
};