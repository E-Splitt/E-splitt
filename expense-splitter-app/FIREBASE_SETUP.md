# How to Set Up Firebase for Real-Time Sync

To make the app work with real-time collaboration, you need to connect it to a Firebase project.

## 1. Create a Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com/) and sign in with your Google account.
2. Click **"Create a project"** (or "Add project").
3. Name it **"E-Split"** (or anything you like).
4. Disable Google Analytics (not needed for this).
5. Click **"Create project"**.

## 2. Create a Web App
1. Once the project is ready, click the **Web icon (`</>`)** on the dashboard to add an app.
2. Name it **"E-Split Web"**.
3. Click **"Register app"**.

## 3. Get Configuration
1. You will see a code block with `firebaseConfig`.
2. **Copy the content inside `firebaseConfig`**:
   ```javascript
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     // ...
   };
   ```
3. Open the file `src/firebase.js` in your project.
4. **Replace the placeholder values** with your actual config keys.

## 4. Setup Database (Firestore) ⚠️ CRITICAL STEP
1. Go back to the Firebase Console.
2. Click **"Build"** -> **"Firestore Database"** in the left menu.
3. Click **"Create database"**.
4. Choose a location (e.g., `nam5 (us-central)`).
5. **Important:** Choose **"Start in test mode"** for now (allows anyone to read/write for 30 days).
   *   *Note: For a real production app, we would set up proper security rules later.*
6. Click **"Create"**.
7. **Wait for the database to be created** - you should see a screen with "Start collection" button.

## 5. Troubleshooting

### "Can't create group" or blank screen
**Most common cause:** Firestore database not created or wrong mode selected.

**Fix:**
1. Go to Firebase Console → Firestore Database
2. Make sure you see a database (not a "Create database" button)
3. Click the **"Rules"** tab
4. Your rules should look like this for testing:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
5. If different, click "Edit rules", paste the above, and click "Publish"

### Still not working?
Open browser console (F12) and look for red errors. Common errors:
- **"Missing or insufficient permissions"** → Rules are too restrictive (see above)
- **"PERMISSION_DENIED"** → Database not in test mode
- **"Network error"** → Check internet connection
