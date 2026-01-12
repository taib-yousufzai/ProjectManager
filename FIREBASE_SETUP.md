# Firebase Setup Instructions

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `project-payments-tracking`
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** provider
3. Click "Save"

## 3. Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location close to your users
5. Click "Done"

## 4. Enable Storage

1. Go to **Storage**
2. Click "Get started"
3. Choose "Start in test mode"
4. Select same location as Firestore
5. Click "Done"

## 5. Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click "Web app" icon (`</>`)
4. Register app name: `project-payments-tracking-web`
5. Copy the configuration object

## 6. Configure Environment Variables

1. Create `.env` file in project root:
```bash
cp .env.example .env
```

2. Fill in your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

## 7. Firestore Security Rules (Development)

In Firestore > Rules, use these rules for development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Projects: users can read/write projects they're team members of
    match /projects/{projectId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.teamMembers;
      allow create: if request.auth != null && 
        request.auth.uid in request.resource.data.teamMembers;
    }
    
    // Payments: users can read/write payments for their projects
    match /payments/{paymentId} {
      allow read, write: if request.auth != null;
      // TODO: Add proper project-based security
    }
    
    // Files: users can read/write their uploaded files
    match /files/{fileId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.uploadedBy;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.uploadedBy;
    }
  }
}
```

## 8. Storage Security Rules (Development)

In Storage > Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 9. Test the Setup

1. Start the development server:
```bash
npm run dev
```

2. Try to register a new user
3. Login with the created user
4. Create a test project
5. Check Firestore Console to see the data

## 10. Production Security (Later)

For production, implement proper security rules:
- Validate user permissions
- Restrict data access based on team membership
- Add field validation
- Implement rate limiting

## Troubleshooting

### Common Issues:

1. **"Firebase not configured"**: Check environment variables
2. **"Permission denied"**: Update Firestore rules
3. **"Auth domain not authorized"**: Add domain in Firebase Console > Authentication > Settings > Authorized domains

### Debug Mode:

Add to `src/config/firebase.js` for debugging:
```javascript
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

// Only in development
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```