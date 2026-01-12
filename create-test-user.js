// Simple script to create a test user
// Run this in the browser console when the app is loaded

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Import Firebase functions
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const { doc, setDoc } = await import('firebase/firestore');
    
    // Import Firebase instances
    const { auth, db } = await import('./src/config/firebase.js');
    const { createUser } = await import('./src/models/index.js');
    
    const testUserData = {
      email: 'test@example.com',
      password: 'test123456',
      firstName: 'Test',
      lastName: 'User'
    };
    
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
    
    console.log('✅ Test user created successfully!');
    console.log('📧 Email:', testUserData.email);
    console.log('🔑 Password:', testUserData.password);
    
    return {
      success: true,
      credentials: {
        email: testUserData.email,
        password: testUserData.password
      }
    };
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('✅ Test user already exists!');
      console.log('📧 Email: test@example.com');
      console.log('🔑 Password: test123456');
      return {
        success: true,
        credentials: {
          email: 'test@example.com',
          password: 'test123456'
        }
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Make it available globally
window.createTestUser = createTestUser;

console.log('🚀 Test user creation script loaded!');
console.log('💡 Run: createTestUser() to create a test user');