// src/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  // browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";

// Firebase config values from your .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

// Initialize the Firebase app once
const app = initializeApp(firebaseConfig);

// Get the authentication object from the app
const auth = getAuth(app);

// // 🔒 Ensure persistence is set to 'local':
// // This means the user remains logged in across tabs and browser restarts.
// setPersistence(auth, browserLocalPersistence)
//   .then(() => {
//     console.log("Firebase auth persistence set to localStorage");
//   })
//   .catch((error) => {
//     console.error("Failed to set Firebase persistence:", error);
//   });

// export { auth };


// Set session-only persistence (clears on tab/browser close)
setPersistence(auth, browserSessionPersistence)
  .then(() => {
    console.log("Firebase session persistence: session-only");
  })
  .catch((error) => {
    console.error("Error setting session persistence:", error);
  });

export { auth };
