import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyB1GqHdWqi43-BXR2FNsUTSj5mpzWSW4G0",
  authDomain: "neuro-flow-50e38.firebaseapp.com",
  projectId: "neuro-flow-50e38",
  storageBucket: "neuro-flow-50e38.firebasestorage.app",
  messagingSenderId: "655892167106",
  appId: "1:655892167106:web:a402a99273527627f6fe5b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
