
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDruNg6Sep5RzGn6cwKUDymV9_RqLJOnQ0",
  authDomain: "pandas-f7fff.firebaseapp.com",
  projectId: "pandas-f7fff",
  storageBucket: "pandas-f7fff.appspot.com",
  messagingSenderId: "423307147483",
  appId: "1:423307147483:android:43b0f44b9559c14920f4fe"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const database = getDatabase(app);

export { database, db };

