import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebaseConfig';
import { ThemeProvider } from '@/theme/Theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';


export default function AppLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<unknown | null>(null);
  
  // Suscribirse a cambios de autenticación una vez
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (u) => {
      setUser(u);
      setChecking(false);
    });
    return unsubscribe;
  }, []);

  // Redirecciones según autenticación y ruta actual
  useEffect(() => {
    if (checking) return;
    const inLogin = segments[0] === 'Screens' && segments[1] === 'login';

    if (!user && !inLogin) {
      router.replace('/Screens/login');
    } else if (user && inLogin) {
      router.replace('/(tabs)');
    }
  }, [checking, user, segments]);

  
  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}
