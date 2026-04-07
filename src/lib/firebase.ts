import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyARbyFNMANytoxtYpKkBVm_VkBGsAMKBwM',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'plant-fresh.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'plant-fresh',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'plant-fresh.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '650633366864',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:650633366864:web:ba360fc88b07bf4d21b055',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
