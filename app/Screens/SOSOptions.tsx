import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { push, ref } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { database, db } from '@/firebaseConfig';
import { useTheme } from '@/theme/Theme';

// Tipos
interface SOSOptionsProps { onClose: () => void; }
interface LocationInfo { latitude: number; longitude: number; }

type EmergencyType = 'Policía' | 'Ambulancia' | 'Bomberos';

const EMERGENCY_CONFIG: Record<EmergencyType, { color: string; icon: any }> = {
  'Policía': { color: '#0a84ff', icon: 'shield-outline' },
  'Ambulancia': { color: '#34c759', icon: 'medical-outline' },
  'Bomberos': { color: '#ff3b30', icon: 'flame-outline' },
};

const SOSOptions: React.FC<SOSOptionsProps> = ({ onClose }) => {
  const { colors, theme } = useTheme();
  const [cachedLocation, setCachedLocation] = useState<LocationInfo | null>(null);
  const [sending, setSending] = useState<EmergencyType | null>(null);

  // Animaciones: radar (dos pulsos) + entrada del sheet
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(60)).current; // sheet entra desde abajo

  useEffect(() => {
    const loopPulse = (val: Animated.Value, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 1800, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    loopPulse(pulse1, 0);
    loopPulse(pulse2, 600);

    Animated.timing(slide, { toValue: 0, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);

  // Pre-permisos y cacheo de ubicación
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const last = await Location.getLastKnownPositionAsync();
        if (last && mounted) setCachedLocation({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
          if (pos && mounted) setCachedLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        } catch {}
      } catch (err) { console.warn('Permisos/ubicación:', err); }
    })();
    return () => { mounted = false };
  }, []);

  const handleEmergencyPress = async (tipo: EmergencyType) => {
    setSending(tipo);
    let locationData: Partial<LocationInfo> = {};
    let locationString = 'Ubicación no disponible';

    try {
      if (cachedLocation) {
        locationData = { latitude: cachedLocation.latitude, longitude: cachedLocation.longitude };
        locationString = `Lat ${cachedLocation.latitude.toFixed(4)}, Lon ${cachedLocation.longitude.toFixed(4)}`;
      } else {
        try {
          const pos = await Location.getLastKnownPositionAsync();
          if (pos) {
            locationData = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            locationString = `Lat ${pos.coords.latitude.toFixed(4)}, Lon ${pos.coords.longitude.toFixed(4)}`;
          }
        } catch {}
      }

      // Leer state del perfil
      let userState: string | null = null;
      const uid = getAuth().currentUser?.uid;
      if (uid) {
        try {
          const up = await getDoc(doc(db, 'Users', uid));
          userState = up.exists() ? ((up.data() as any)?.state || null) : null;
        } catch {}
      }

      // RTDB
      await push(ref(database, 'alertas_emergencia'), {
        tipo,
        timestamp: Date.now(),
        ...locationData,
        ...(userState ? { state: userState } : {}),
      });

      // Firestore
      try {
        await addDoc(collection(db, 'AlertasEmergencia'), {
          tipo,
          timestamp: serverTimestamp(),
          latitude: (locationData as any)?.latitude,
          longitude: (locationData as any)?.longitude,
          ...(userState ? { state: userState } : {}),
        });
      } catch (e) {
        console.warn('No se pudo guardar en FS:', e);
      }

      Alert.alert('Alerta enviada', `Se ha notificado a: ${tipo}\n${locationString}`);
      onClose();
    } catch (error) {
      console.error('Error al enviar alerta:', error);
      Alert.alert('Error', 'No se pudo enviar la alerta. Inténtalo de nuevo.');
    } finally {
      setSending(null);
    }
  };

  // Derivados de animación para el radar
  const pulseStyle = (val: Animated.Value) => ({
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }) }],
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
    backgroundColor: '#ff3b3055',
  });

  return (
    <View style={[styles.overlay, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)' }]}>
      {/* Radar pulsante en el fondo */}
      <View pointerEvents="none" style={styles.radarWrap}>
        <Animated.View style={[styles.pulse, pulseStyle(pulse1)]} />
        <Animated.View style={[styles.pulse, pulseStyle(pulse2)]} />
        <View style={[styles.pulseCore, { backgroundColor: '#ff3b30' }]} />
      </View>

      {/* Sheet inferior */}
      <Animated.View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ translateY: slide }] }]}>
        <Text style={[styles.title, { color: colors.text }]}>¿Cuál es tu emergencia?</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Selecciona una opción para avisar rápidamente</Text>

        <View style={styles.actionsRow}>
          {(Object.keys(EMERGENCY_CONFIG) as EmergencyType[]).map((key) => {
            const cfg = EMERGENCY_CONFIG[key];
            const isSending = sending === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.actionBtn, { backgroundColor: cfg.color, opacity: isSending ? 0.7 : 1 }]}
                onPress={() => handleEmergencyPress(key)}
                activeOpacity={0.9}
                accessibilityLabel={`Solicitar ${key}`}
                disabled={!!sending}
              >
                <Ionicons name={cfg.icon as any} size={22} color="#fff" />
                <Text style={styles.actionText}>{isSending ? 'Enviando…' : key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={onClose}
          style={[styles.cancelBtn, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f1f4', borderColor: colors.border }]}
          accessibilityLabel="Cancelar"
          activeOpacity={0.85}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={18} color={colors.muted} style={{ marginRight: 6 }} />
          <Text style={[styles.cancelText, { color: colors.muted }]}>Cancelar</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  radarWrap: {
    position: 'absolute',
    top: '24%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: RFValue(220),
    height: RFValue(220),
    borderRadius: RFValue(110),
  },
  pulseCore: {
    width: RFValue(36),
    height: RFValue(36),
    borderRadius: RFValue(18),
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  title: {
    fontSize: RFValue(18),
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: RFValue(72),
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cancelBtn: {
    marginTop: 20,
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default SOSOptions;
