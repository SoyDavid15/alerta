import { useTheme } from '@/theme/Theme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { onValue, ref } from 'firebase/database';
import { Timestamp } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { WebView } from 'react-native-webview';
import { database } from '../../firebaseConfig';

export interface AlertaEmergencia {
  id: string;
  tipo: string;
  timestamp: Timestamp;
  latitude?: number;
  longitude?: number;
  city?: string;
  neighborhood?: string;
}

const AlertaItem = ({ item, currentLocation }: { item: AlertaEmergencia; currentLocation?: { latitude: number; longitude: number } | null }) => {
  const { colors, theme } = useTheme();
  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  let distanciaText = 'No disponible';
  if (item.latitude != null && item.longitude != null && !currentLocation) distanciaText = 'Cargando distancia';
  if (item.latitude != null && item.longitude != null && currentLocation) {
    try {
      const d = haversine(currentLocation.latitude, currentLocation.longitude, item.latitude, item.longitude);
      distanciaText = `${d.toFixed(1)} km de ti`;
    } catch { distanciaText = 'No disponible'; }
  }

  const typeColor = item.tipo?.toLowerCase().includes('bombero')
    ? '#ff3b30'
    : item.tipo?.toLowerCase().includes('ambul')
    ? '#34c759'
    : item.tipo?.toLowerCase().includes('pol')
    ? '#0a84ff'
    : '#ff9f0a';

  return (
    <View style={[styles.alertCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: typeColor }]}> 
      <View style={styles.alertRow}>
        <View style={[styles.alertIconWrap, { backgroundColor: theme==='dark' ? 'rgba(255,255,255,0.08)' : '#ececf2' }]}> 
          <Ionicons name={'alert-circle-outline'} size={20} color={typeColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.alertTitle, { color: colors.text }]} numberOfLines={1}>Alerta: {item.tipo}</Text>
          <View style={styles.alertMetaRow}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>{distanciaText}</Text>
            <Ionicons name="time-outline" size={14} color={colors.muted} style={{ marginLeft: 10 }} />
            <Text style={[styles.metaText, { color: colors.muted }]}>{item.timestamp ? item.timestamp.toDate().toLocaleString() : 'Enviando...'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const Alertas = () => {
  const [alertas, setAlertas] = useState<AlertaEmergencia[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const webviewRef = useRef<any>(null);
  
  const screenHeight = Dimensions.get('window').height;
  const mapHeight = Math.round(screenHeight * 0.8); // map ocupa 80% de la pantalla

  useEffect(() => {
    const r = ref(database, 'alertas_emergencia');
    const unsubscribe = onValue(r, (snapshot) => {
      const val = snapshot.val();
      const alertasData: AlertaEmergencia[] = [];
      if (val) {
        Object.entries(val).forEach(([key, data]) => {
          const d = data as any;
          let ts: any = d.timestamp;
          let timestampObj: Timestamp | undefined = undefined;
          if (typeof ts === 'number') timestampObj = Timestamp.fromMillis(ts);
          else if (ts && ts._seconds) timestampObj = new Timestamp(ts._seconds, ts._nanoseconds || 0);

          alertasData.push({ id: key, tipo: d.tipo, timestamp: timestampObj || Timestamp.now(), latitude: d.latitude, longitude: d.longitude, city: d.city, neighborhood: d.neighborhood });
        });
        alertasData.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
      }
      setAlertas(alertasData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        if (mounted) setCurrentLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch (err) { console.warn('No se pudo obtener la ubicación actual:', err); }
    })();
    return () => { mounted = false };
  }, []);

  useEffect(() => {
    if (!webviewRef.current) return;
    const points = alertas
      .filter(a => a.latitude != null && a.longitude != null)
      .map(a => ({ id: a.id, lat: a.latitude, lng: a.longitude, tipo: a.tipo, timestamp: a.timestamp?.toMillis?.() || null }));
    const msg = JSON.stringify({ type: 'SET_POINTS', points, currentLocation });
    try { webviewRef.current.postMessage(msg); } catch { /* ignore */ }
  }, [alertas, currentLocation]);

  return (
    <View style={styles.container}>
      
      {/* Mapa como fondo absoluto (full width) */}
      <View style={[styles.mapBackground, { height: mapHeight }]}> 
        <WebView
          ref={webviewRef}
          originWhitelist={["*" ]}
          source={{ html: HTML_MAP }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>

      {/* Bottom sheet con la lista de alertas */}
      <BottomSheet alerts={alertas} currentLocation={currentLocation} />

          </View>
  );
};

export default Alertas;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: '#0b0b0c',
  alignSelf: 'stretch',
  },
  list: {
    flex: 1,
    zIndex: 10,
  width: '100%',
  backgroundColor: '#0f0f10',
  },
  alertaItem: {
    backgroundColor: '#c20000',
    padding: 15,
    marginVertical: 8,
  marginHorizontal: 0,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  alertaTipo: {
    fontSize: RFValue(16),
    fontWeight: 'bold',
    color: 'white',
  },
  alertaDistancia: {
    fontSize: RFValue(14),
    fontWeight: '600',
    color: '#ffecec',
    marginTop: 6,
  },
  alertaTimestamp: {
    fontSize: RFValue(10),
    color: '#f0f0f0',
    textAlign: 'right',
    marginTop: 8,
  },
  alertCard: {
    padding: 14,
    marginVertical: 8,
    marginHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  alertTitle: {
    fontSize: RFValue(14),
    fontWeight: '800',
  },
  alertMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  metaText: {
    fontSize: RFValue(11),
    marginLeft: 4,
  },
  mapBackground: {
  position: 'relative',
  width: '100%',
  borderRadius: 12,
  overflow: 'hidden',
  backgroundColor: '#121214',
  zIndex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  emptyListText: {
    color: '#ddd',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  sheetContainer: {
    backgroundColor: '#0b0b0d',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  sheetHandle: {
  height: 48,
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 8,
  },
  sheetHandleBar: {
  width: 56,
  height: 6,
  borderRadius: 4,
  backgroundColor: '#333',
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    color: '#fff',
    fontSize: RFValue(14),
    fontWeight: '700',
  },
  sheetContent: {
    paddingBottom: 40,
  },
});

// BottomSheet component (simple, draggable)
const BottomSheet = ({ alerts, currentLocation }: { alerts: AlertaEmergencia[]; currentLocation: { latitude: number; longitude: number } | null }) => {
  const { colors, theme } = useTheme();
  const screenHeight = Dimensions.get('window').height;
  const SHEET_HEIGHT = screenHeight; // sheet full-screen container
  // collapsed shows bottom 40% of screen => translateY = screenHeight * 0.6
  const SNAP_COLLAPSED = Math.round(screenHeight * 0.6);
  // expanded shows 80% of the screen (sheet translateY = 20% of screen height)
  const SNAP_EXPANDED = Math.round(screenHeight * 0.2);

  // animProgress goes from 0 (expanded) to 1 (collapsed)
  const animProgress = useRef(new Animated.Value(1)).current;
  const lastProgress = useRef(1);
  const isExpanded = useRef(false);

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
    onPanResponderGrant: () => {
      animProgress.setOffset(lastProgress.current);
      animProgress.setValue(0);
    },
    onPanResponderMove: (_, gesture) => {
      // normalize gesture.dy against the collapsed distance so delta maps properly to [0..1]
      const delta = gesture.dy / SNAP_COLLAPSED;
      animProgress.setValue(delta);
    },
    onPanResponderRelease: (_, gesture) => {
      animProgress.flattenOffset();
      // project final progress based on current value + gesture
      const projected = lastProgress.current + gesture.dy / SNAP_COLLAPSED;
      const toValue = projected > 0.5 ? 1 : 0;
  Animated.timing(animProgress, { toValue, duration: 200, useNativeDriver: false }).start(() => {
        lastProgress.current = toValue;
        isExpanded.current = toValue === 0;
      });
    },
    onPanResponderTerminationRequest: () => false,
  })).current;

  // toggle sheet on tap of the handle
  const toggleSheet = () => {
    animProgress.flattenOffset();
    const toValue = isExpanded.current ? 1 : 0; // if expanded -> collapse (1), else expand (0)
    Animated.timing(animProgress, { toValue, duration: 220, useNativeDriver: false }).start(() => {
      lastProgress.current = toValue;
      isExpanded.current = toValue === 0;
    });
  };

  const translateY = animProgress.interpolate({ inputRange: [0, 1], outputRange: [SNAP_EXPANDED, SNAP_COLLAPSED], extrapolate: 'clamp' });
  const animatedStyle = { transform: [{ translateY }] };

  return (
    <Animated.View style={[styles.bottomSheet, { height: SHEET_HEIGHT }, animatedStyle]} pointerEvents="box-none">
      <Animated.View style={[styles.sheetContainer, { height: SHEET_HEIGHT, backgroundColor: colors.card }]}> 
        {/* attach pan handlers only to the handle so the FlatList can receive scroll gestures; also allow tap to toggle */}
        <Pressable style={styles.sheetHandle} {...pan.panHandlers} onPress={toggleSheet}>
          <View style={[styles.sheetHandleBar, { backgroundColor: theme==='dark' ? 'rgba(255,255,255,0.18)' : '#cfd0d4' }]} />
        </Pressable>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Alertas</Text>
          {/* removed toggle button (auto-expand on scroll instead) */}
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.sheetContent}>
          <FlatList
            data={alerts}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => <AlertaItem item={item} currentLocation={currentLocation} />}
            ListEmptyComponent={<Text style={[styles.emptyListText, { color: colors.muted }]}>No hay alertas de emergencia activas.</Text>}
            onScroll={({ nativeEvent }) => {
              const y = nativeEvent.contentOffset?.y || 0;
              // if user scrolls down (swipes up on content, y decreases to 0) and they are at top, expand sheet
              // if user scrolls up inside the list (y increases) and sheet is expanded, collapse to show map
              if (y <= 0 && !isExpanded.current) {
                // user pulled-to-refresh/scroll-up at top -> expand sheet
                Animated.timing(animProgress, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => { lastProgress.current = 0; isExpanded.current = true; });
              } else if (y > 5 && isExpanded.current) {
                // user scrolling down the list, collapse sheet to reveal map
                Animated.timing(animProgress, { toValue: 1, duration: 200, useNativeDriver: false }).start(() => { lastProgress.current = 1; isExpanded.current = false; });
              }
            }}
            scrollEventThrottle={16}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const HTML_MAP = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; }
    </style>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const map = L.map('map').setView([0,0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const markers = {};

      function setPoints(points, currentLocation) {
        Object.values(markers).forEach(m => map.removeLayer(m));
        for (const p of points) {
          if (p.lat == null || p.lng == null) continue;
          const m = L.marker([p.lat, p.lng]).addTo(map).bindPopup(p.tipo + (p.timestamp ? ('\n' + new Date(p.timestamp).toLocaleString()) : ''));
          markers[p.id] = m;
        }
        const latlngs = points.filter(p => p.lat != null && p.lng != null).map(p => [p.lat, p.lng]);
        if (latlngs.length > 0) {
          map.fitBounds(latlngs, { padding: [50,50] });
        } else if (currentLocation && currentLocation.latitude) {
          map.setView([currentLocation.latitude, currentLocation.longitude], 13);
        }
      }

      function handleMessage(data) {
        if (!data) return;
        try {
          const msg = typeof data === 'string' ? JSON.parse(data) : data;
          if (msg.type === 'SET_POINTS') {
            setPoints(msg.points || [], msg.currentLocation || null);
          }
        } catch (err) { /* ignore */ }
      }

      document.addEventListener('message', function(e) { handleMessage(e.data); });
      window.addEventListener('message', function(e) { handleMessage(e.data); });
    </script>
  </body>
</html>
`;