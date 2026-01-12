# Login Troubleshooting Guide

## Issue: Can't Login - Firebase Connection Errors

Based on the browser console errors showing "net::ERR_BLOCKED_BY_CLIENT", here are the most common causes and solutions:

### 1. Ad Blocker or Browser Extensions
**Most Common Cause** - Ad blockers often block Firebase requests

**Solutions:**
- Disable ad blocker for localhost:5173
- Try in an incognito/private window
- Disable browser extensions temporarily
- Whitelist Firebase domains in your ad blocker:
  - `*.googleapis.com`
  - `*.firebaseapp.com`
  - `*.firestore.googleapis.com`

### 2. Network/Firewall Issues
**Solutions:**
- Check if your network/firewall blocks Google services
- Try a different network (mobile hotspot)
- Check corporate firewall settings

### 3. Browser Issues
**Solutions:**
- Clear browser cache and cookies
- Try a different browser
- Disable browser security extensions

### 4. Firebase Project Issues
**Solutions:**
- Verify Firebase project is active
- Check Firebase console for any service outages
- Ensure Firestore and Authentication are enabled

## Testing Steps

1. **Open Developer Tools** (F12)
2. **Check Console Tab** for specific error messages
3. **Check Network Tab** to see which requests are failing
4. **Look for the Firebase Test Component** in the top-right corner (development mode only)

## Test User Credentials

For testing purposes, you can create a test user by:

1. Open browser console (F12)
2. Type: `createTestUser()`
3. Use the returned credentials to login

Or use these test credentials if they exist:
- Email: `test@example.com`
- Password: `test123456`

## Manual Test User Creation

If the automatic test user creation fails, you can:

1. Go to Firebase Console
2. Navigate to Authentication > Users
3. Add a new user manually
4. Use those credentials to login

## Still Having Issues?

1. Check the Firebase Test Component output (top-right corner in development)
2. Look at browser console for detailed error messages
3. Try the solutions above in order
4. If all else fails, check if Firebase services are down: https://status.firebase.google.com/