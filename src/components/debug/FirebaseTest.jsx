import { useState, useEffect } from 'react';
import { auth, db } from '../../config/firebase';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

const FirebaseTest = () => {
  const [status, setStatus] = useState({
    auth: 'testing...',
    firestore: 'testing...',
    config: 'checking...'
  });

  useEffect(() => {
    const testFirebase = async () => {
      // Test configuration
      const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };

      console.log('Firebase Config:', config);
      
      setStatus(prev => ({
        ...prev,
        config: Object.values(config).every(val => val) ? '✅ Config loaded' : '❌ Missing config values'
      }));

      // Test Auth
      try {
        console.log('Auth instance:', auth);
        setStatus(prev => ({ ...prev, auth: '✅ Auth initialized' }));
      } catch (error) {
        console.error('Auth error:', error);
        setStatus(prev => ({ ...prev, auth: `❌ Auth error: ${error.message}` }));
      }

      // Test Firestore
      try {
        console.log('Firestore instance:', db);
        setStatus(prev => ({ ...prev, firestore: '✅ Firestore initialized' }));
      } catch (error) {
        console.error('Firestore error:', error);
        setStatus(prev => ({ ...prev, firestore: `❌ Firestore error: ${error.message}` }));
      }
    };

    testFirebase();
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      padding: '20px', 
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      zIndex: 9999,
      fontSize: '14px',
      fontFamily: 'monospace'
    }}>
      <h3>Firebase Connection Test</h3>
      <div><strong>Config:</strong> {status.config}</div>
      <div><strong>Auth:</strong> {status.auth}</div>
      <div><strong>Firestore:</strong> {status.firestore}</div>
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        Check browser console for detailed logs
      </div>
    </div>
  );
};

export default FirebaseTest;