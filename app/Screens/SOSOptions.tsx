import * as Location from 'expo-location'; // Importamos expo-location
import { push, ref } from 'firebase/database';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { database, db } from '@/firebaseConfig';

type SOSOptionsProps = {
  onClose: () => void;
};

type LocationInfo = {
  latitude: number;
  longitude: number;
  city: string;
  neighborhood: string;
};

// Componente SOSOptions
const SOSOptions: React.FC<SOSOptionsProps> = ({ onClose }) => {
  const [cachedLocation, setCachedLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Pre-solicitar permisos y cachear la última ubicación disponible para enviar la alerta rápidamente
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // Intentamos obtener una ubicación rápida: primero la última conocida, luego la actual en background
        const last = await Location.getLastKnownPositionAsync();
        if (last && mounted) {
          setCachedLocation({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        }

        // Obtenemos la posición actual (no bloqueante para la UI inicial)
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
          if (pos && mounted) setCachedLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        } catch (e) {
          // no crítico: seguimos con la última conocida
          console.warn('No se pudo obtener posición actual rápida:', e);
        }
      } catch (err) {
        console.warn('Error al preobtener permisos/ubicación:', err);
      }
    })();
    return () => { mounted = false };
  }, []);

  const handleEmergencyPress = async (tipo: 'Policía' | 'Ambulancia' | 'Bomberos') => {
    let locationData: Partial<LocationInfo> = {};
    let locationString = 'Ubicación no disponible';

    try {
      // Usar la ubicación cacheada si existe para enviar inmediatamente
      if (cachedLocation) {
        locationData = {
          latitude: cachedLocation.latitude,
          longitude: cachedLocation.longitude,
        };
        locationString = `Ubicación: Lat ${cachedLocation.latitude.toFixed(4)}, Lon ${cachedLocation.longitude.toFixed(4)}`;
      } else {
        // Intentamos una lectura rápida si no hay cache
        try {
          const pos = await Location.getLastKnownPositionAsync();
          if (pos) {
            locationData = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            locationString = `Ubicación: Lat ${pos.coords.latitude.toFixed(4)}, Lon ${pos.coords.longitude.toFixed(4)}`;
          }
        } catch (e) {
          console.warn('No se pudo obtener ubicación rápida al presionar:', e);
        }
      }

      // Enviar inmediatamente usando timestamp local para evitar esperas
      await push(ref(database, 'alertas_emergencia'), {
        tipo: tipo,
        timestamp: Date.now(),
        ...locationData,
      });
      // Guardar también en Firestore (colección separada)
      try {
        await addDoc(collection(db, 'AlertasEmergencia'), {
          tipo: tipo,
          timestamp: serverTimestamp(),
          latitude: (locationData as any)?.latitude,
          longitude: (locationData as any)?.longitude,
        });
      } catch (e) {
        console.warn('No se pudo guardar alerta en Firestore:', e);
      }

      // Opcional: desencadenar geocoding en background si quieres añadir ciudad/barrio luego
      // (se podría actualizar el nodo pushedRef con reverseGeocodeAsync, pero lo dejamos fuera para la velocidad)

      Alert.alert('Alerta Enviada', `Se ha notificado a: ${tipo}\n${locationString}`);
      onClose(); // Cierra el menú de opciones SOS
    } catch (error) {
      console.error('Error al enviar alerta o al obtener ubicación: ', error);
      Alert.alert('Error', 'No se pudo enviar la alerta. Inténtalo de nuevo.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>¿Cuál es tu emergencia?</Text>

      <TouchableOpacity style={styles.BotonEmergencia} onPress={() => handleEmergencyPress('Policía')}>
        <Text style={styles.texto}>Policía</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.BotonEmergencia} onPress={() => handleEmergencyPress('Ambulancia')}>
        <Text style={styles.texto}>Ambulancia</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.BotonEmergencia} onPress={() => handleEmergencyPress('Bomberos')}>
        <Text style={styles.texto}>Bomberos</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.BotonCancelar} onPress={onClose}>
        <Text style={styles.textoCancelar}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: "column",
    width: "100%",
    height: "100%",
    position: "absolute",
    zIndex: 10,
    backgroundColor: "#1c1c1eb9",
  },
  titulo: {
    color: "white",
    fontSize: RFValue(22),
    fontWeight: 'bold',
    marginBottom: 20,
  },
  texto: {
    color: "white",
    fontSize: RFValue(16),
    textAlign: "center",
    fontWeight: 'bold',
  },
  BotonEmergencia: {
    backgroundColor: "#c20000ff",
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    width: RFValue(120),
    height: RFValue(90),
    alignItems: "center",
    justifyContent: 'center',
  },
  BotonCancelar: {
    marginTop: 20,
    padding: 12,
  },
  textoCancelar: {
    color: "#a0a0a0",
    fontSize: RFValue(14),
  },
});

export default SOSOptions