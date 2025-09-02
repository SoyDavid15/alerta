
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Inicializar Auth con persistencia en React Native (AsyncStorage) sin romper tipado
try {
  // Cargar dinámicamente para evitar errores de tipos si no se exporta en tu versión
  const authMod: any = require('firebase/auth');
  if (authMod?.initializeAuth && authMod?.getReactNativePersistence) {
    authMod.initializeAuth(app, {
      persistence: authMod.getReactNativePersistence(AsyncStorage),
    });
  }
} catch (e) {
  // Ignorar si no está disponible o ya fue inicializado
}

const db = getFirestore(app);
const database = getDatabase(app);
const auth = getAuth(app);

export { database, db, auth };

