import { database, db } from '@/firebaseConfig';
import { useTheme } from '@/theme/Theme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getAuth } from 'firebase/auth';
import { push, ref } from 'firebase/database';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';

// Tipos
interface SOSOptionsProps { onClose: () => void; }
interface LocationInfo { latitude: number; longitude: number; }

type EmergencyType = 'Emergencia' | 'Eventos' | 'Recomendación';

const EMERGENCY_CONFIG: Record<EmergencyType, { color: string; icon: any }> = {
  'Emergencia': { color: '#ff3b30', icon: 'warning-outline' },
  'Eventos': { color: '#0a84ff', icon: 'calendar-outline' },
  'Recomendación': { color: '#34c759', icon: 'bulb-outline' },
};

const EmergencyForm: React.FC<{ type: EmergencyType, onSubmit: (title: string, description: string) => void, onCancel: () => void }> = ({ type, onSubmit, onCancel }) => {
    const { colors } = useTheme();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    return (
        <View style={styles.formContainer}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Nueva Alerta: {type}</Text>
            <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]} 
                placeholder="Título"
                placeholderTextColor={colors.muted}
                value={title}
                onChangeText={setTitle}
            />
            <TextInput
                style={[styles.input, styles.inputArea, { backgroundColor: colors.card, color: colors.text }]} 
                placeholder="Descripción"
                placeholderTextColor={colors.muted}
                value={description}
                onChangeText={setDescription}
                multiline
            />
            <View style={styles.formActions}>
                <TouchableOpacity style={[styles.formButton, styles.cancelButton]} onPress={onCancel}>
                    <Text style={styles.formButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.formButton, { backgroundColor: EMERGENCY_CONFIG[type].color }]} onPress={() => onSubmit(title, description)}>
                    <Text style={styles.formButtonText}>Enviar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const SOSOptions: React.FC<SOSOptionsProps> = ({ onClose }) => {
  const { colors, theme } = useTheme();
  const [cachedLocation, setCachedLocation] = useState<LocationInfo | null>(null);
  const [sending, setSending] = useState<EmergencyType | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);

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

  const handleEmergencyPress = async (tipo: EmergencyType, title: string, description: string) => {
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
        title,
        description,
        timestamp: Date.now(),
        ...locationData,
        ...(userState ? { state: userState } : {}),
      });

      // Firestore
      try {
        await addDoc(collection(db, 'AlertasEmergencia'), {
          tipo,
          title,
          description,
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
      setFormVisible(false);
    }
  };

  const handleButtonPress = (type: EmergencyType) => {
      setSelectedType(type);
      setFormVisible(true);
  }

  // Derivados de animación para el radar
  const pulseStyle = (val: Animated.Value) => ({
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }) }],
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
    backgroundColor: '#ff3b3055',
  });

  if (formVisible && selectedType) {
      return <EmergencyForm type={selectedType} onSubmit={(title, description) => handleEmergencyPress(selectedType, title, description)} onCancel={() => setFormVisible(false)} />
  }

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
        <Text style={[styles.title, { color: colors.text }]}>¿Cuál es tu alerta?</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Selecciona una opción para avisar rápidamente</Text>

        <View style={styles.actionsRow}>
          {(Object.keys(EMERGENCY_CONFIG) as EmergencyType[]).map((key) => {
            const cfg = EMERGENCY_CONFIG[key];
            const isSending = sending === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.actionBtn, { backgroundColor: cfg.color, opacity: isSending ? 0.7 : 1 }]} 
                onPress={() => handleButtonPress(key)}
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
    flexDirection: 'column',
    gap: 4,
    paddingHorizontal: 4,
  },
  actionText: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.3,
    fontSize: RFValue(12),
    textAlign: 'center',
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
  formContainer: {
      padding: 20,
  },
  formTitle: {
      fontSize: RFValue(18),
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
  },
  input: {
      borderWidth: 1,
      borderColor: '#ccc',
      padding: 12,
      borderRadius: 10,
      marginBottom: 12,
  },
  inputArea: {
      minHeight: 100,
      textAlignVertical: 'top',
  },
  formActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 10,
  },
  formButton: {
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
  },
  cancelButton: {
      backgroundColor: '#ccc',
  },
  formButtonText: {
      color: '#fff',
      fontWeight: 'bold',
  }
});

export default SOSOptions;