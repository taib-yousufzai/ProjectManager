// Test user creation utility
// This is for development/testing purposes only

import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { createUser } from '../models';

export const createTestUser = async () => {
  const testUserData = {
    email: 'test@example.com',
    password: 'test123456',
    firstName: 'Test',
    lastName: 'User'
  };

  try {
    console.log('Creating test user...');
    
    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      testUserData.email, 
      testUserData.password
    );
    
    console.log('Firebase user created:', userCredential.user.uid);
    
    // Update display name
    await updateProfile(userCredential.user, {
      displayName: `${testUserData.firstName} ${testUserData.lastName}`
    });
    
    // Create user document in Firestore
    const newUserData = createUser({
      email: testUserData.email,
      firstName: testUserData.firstName,
      lastName: testUserData.lastName,
      lastLoginAt: new Date()
    });
    
    await setDoc(doc(db, 'users', userCredential.user.uid), newUserData);
    
    console.log('Test user created successfully!');
    console.log('Email:', testUserData.email);
    console.log('Password:', testUserData.password);
    
    return {
      success: true,
      user: userCredential.user,
      credentials: {
        email: testUserData.email,
        password: testUserData.password
      }
    };
  } catch (error) {
    console.error('Error creating test user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Add to window for easy access in development
if (import.meta.env.MODE === 'development') {
  window.createTestUser = createTestUser;
}