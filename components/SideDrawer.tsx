import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
  widthPct?: number; // 0..1, default 0.75
  children?: React.ReactNode;
}

const SideDrawer: React.FC<SideDrawerProps> = ({ visible, onClose, widthPct = 0.75, children }) => {
  const screenWidth = Dimensions.get('window').width;
  const drawerWidth = Math.round(screenWidth * Math.min(Math.max(widthPct, 0.3), 0.9));
  const router = useRouter();

  const anim = useRef(new Animated.Value(0)).current; // 0 hidden, 1 shown

  const handleSignOut = async () => {
    try {
      await signOut(getAuth());
    } catch (e) {
      console.warn('Error al cerrar sesi��n:', e);
    } finally {
      onClose();
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: handleSignOut },
    ]);
  };

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
    extrapolate: 'clamp',
  });
  const overlayOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });

  return (
    <View pointerEvents={visible ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      {/* Overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      {/* Drawer */}
      <Animated.View style={[styles.drawer, { width: drawerWidth, transform: [{ translateX }] }]}> 
        <View style={styles.drawerHeader}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Cerrar menú">
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => { onClose(); router.push('/Screens/Profile'); }}
          accessibilityLabel="Ir al perfil"
          activeOpacity={0.85}
        >
          <Ionicons name="person-circle" size={84} color="#fff" />
          <Text style={styles.profileText}>Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionsBtn}
          onPress={() => { onClose(); router.push('/Screens/Options'); }}
          accessibilityLabel="Ir a opciones"
          activeOpacity={0.85}
        >
          <Ionicons name="settings-outline" size={24} color="#fff" />
          <Text style={styles.optionsText}>Opciones</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmSignOut} accessibilityLabel="Cerrar sesión">
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#1f1f21',
    paddingTop: 48,
    paddingHorizontal: 12,
    zIndex: 1000,
  },
  drawerHeader: {
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    marginTop: 12,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c20000',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#c20000',
    fontWeight: '600',
    fontSize: 14,
  },
  profileBtn: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    color: '#fff',
    marginTop: 6,
    fontWeight: '600',
  },
  optionsBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  optionsText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default SideDrawer;
