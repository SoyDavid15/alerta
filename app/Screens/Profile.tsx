import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { getAuth } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RFValue } from 'react-native-responsive-fontsize';
import { Image } from 'expo-image';
import { collection, doc, getDoc, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface DelitoItem {
  id: string;
  encabezado?: string;
  tipo?: string;
  timestamp?: Timestamp;
}

export default function Profile() {
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;

  const [profile, setProfile] = useState<any>(null);
  const [delitos, setDelitos] = useState<DelitoItem[]>([]);
  const [loadingDelitos, setLoadingDelitos] = useState(true);

  // Cargar perfil del usuario (colección Users)
  useEffect(() => {
    (async () => {
      try {
        if (user?.uid) {
          const snap = await getDoc(doc(db, 'Users', user.uid));
          if (snap.exists()) setProfile(snap.data());
        }
      } catch {}
    })();
  }, [user?.uid]);

  // Cargar denuncias del usuario
  useEffect(() => {
    if (!user?.uid) return;
    const qRef = query(collection(db, 'Delitos'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(qRef, (qs) => {
      const arr: DelitoItem[] = [];
      qs.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
      setDelitos(arr);
      setLoadingDelitos(false);
    });
    return () => unsub();
  }, [user?.uid]);

  const displayName = user?.displayName || profile?.displayName || '—';
  const username = profile?.username || (user?.email ? user.email.split('@')[0] : '—');
  const photoURL = user?.photoURL || profile?.photoURL || '';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Volver">
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.container}>
        {/* Cabecera con avatar, nombre y username */}
        <View style={styles.profileHeader}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} contentFit="cover" />
          ) : (
            <Ionicons name="person-circle" size={72} color="#bdbdbd" />
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.username}>@{username}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mis denuncias</Text>
        {loadingDelitos ? (
          <ActivityIndicator color="#007AFF" />
        ) : (
          <FlatList
            data={delitos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.delitoItem}>
                <Text style={styles.delitoTitle}>{item.encabezado || item.tipo || 'Sin título'}</Text>
                <Text style={styles.delitoDate}>
                  {item.timestamp ? item.timestamp.toDate().toLocaleString() : ''}
                </Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Aún no has realizado denuncias.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  header: {
    height: 56,
    backgroundColor: '#2c2c2e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3a3a3c',
    marginRight: 12,
  },
  profileInfo: {
    flexDirection: 'column',
  },
  name: {
    color: '#fff',
    fontSize: RFValue(16),
    fontWeight: '700',
  },
  username: {
    color: '#bdbdbd',
    fontSize: RFValue(12),
    marginTop: 4,
  },
  sectionTitle: {
    color: '#bdbdbd',
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
  },
  delitoItem: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    marginBottom: 10,
  },
  delitoTitle: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  delitoDate: {
    color: '#8e8e93',
    fontSize: RFValue(10),
  },
  emptyText: {
    color: '#bdbdbd',
    textAlign: 'center',
    marginTop: 20,
  },
});
