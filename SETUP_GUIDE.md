# The Factory Manual: Deploying a Client Instance

This guide explains how to take your generic "Tenant Agnostic" code and deploy it for a specific client (e.g., Coca-Cola).

## 1. Create the Firebase Project
1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Click **Add Project**.
3.  Name it: `client-coca-cola` (or similar).
4.  **Disable** Google Analytics (simplifies setup) unless they specifically ask for it.
5.  Click **Create Project**.

## 2. Enable Services (The "Back End")
In the new project dashboard:
1.  **Authentication:** Enable "Google" provider.
2.  **Firestore:** Create Database (Start in **Production Mode**).
3.  **Storage:** Enable Storage.

## 3. Get the "Keys" (The Secret Sauce)
1.  Click the **Gear Icon** (Project Settings).
2.  Scroll down to **Your Apps**.
3.  Click the **</>** (Web) icon.
4.  Register the app (Name: "Coca-Cola App").
5.  **Copy the `firebaseConfig` object values.** You need these for the next step.

## 4. Configure the Build
On your computer (in VS Code):
1.  Create a file named `.env.local` (or edit your existing `.env` temporarily).
2.  Paste the client's keys:
    ```ini
    VITE_FIREBASE_API_KEY=AIzaSyD...
    VITE_FIREBASE_PROJECT_ID=client-coca-cola
    ... (fill in the rest)
    
    # IMPORTANT: Set the Admin Email!
    VITE_ADMIN_EMAILS=bob@coca-cola.com,gord@agency.com
    ```

## 5. Deploy
Run the deploy command:
```bash
npm run build
npm run deploy
```

**Result:** You will get a unique URL (e.g., `client-coca-cola.web.app`) to send to the client.

## 6. Cleanup
**Revert your `.env` file back to your own DEV keys** so you can continue working on your own version.
