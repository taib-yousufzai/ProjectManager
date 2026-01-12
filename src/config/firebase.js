// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBg92aE-CqwYeJFuiVA4mhCAnh9UF_X_ho",
  authDomain: "projectmanager-92ad9.firebaseapp.com",
  projectId: "projectmanager-92ad9",
  storageBucket: "projectmanager-92ad9.firebasestorage.app",
  messagingSenderId: "57667733276",
  appId: "1:57667733276:web:56163f2fa4f335a7bc9cd9",
  measurementId: "G-533DTRJX8R"
};

// Initialize Firebase
let app;
let analytics;
let auth;
let db;
let storage;

try {
  app = initializeApp(firebaseConfig);

  // Initialize Firestore with settings
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
  });

  // Enable network to handle offline/online states better
  enableNetwork(db).catch(console.error);

  // Initialize other services
  auth = getAuth(app);
  storage = getStorage(app);

  // Analytics is optional and might fail in some envs
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Analytics failed to init", e);
  }

} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { auth, db, storage, analytics };
export default app;
