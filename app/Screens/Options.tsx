import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RFValue } from 'react-native-responsive-fontsize';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme/Theme';

export default function OptionsScreen() {
  const router = useRouter();
    const [privateAccount, setPrivateAccount] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const { setTheme } = useTheme();

  // Cargar y aplicar tema guardado
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('theme');
        const isDark = saved !== 'light';
        setDarkMode(isDark);
        try { await SystemUI.setBackgroundColorAsync(isDark ? '#1c1c1e' : '#ffffff'); } catch {}
      } catch {}
    })();
  }, []);

  const applyTheme = async (isDark: boolean) => {
    try { await AsyncStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch {}
    try { await SystemUI.setBackgroundColorAsync(isDark ? '#1c1c1e' : '#ffffff'); } catch {}
  };

  const colors = darkMode
    ? { bg: '#1c1c1e', header: '#2c2c2e', card: '#2c2c2e', border: 'rgba(255,255,255,0.06)', text: '#fff', muted: '#bdbdbd', icon: '#fff', divider: 'rgba(255,255,255,0.06)' }
    : { bg: '#ffffff', header: '#f4f4f4', card: '#ffffff', border: '#e5e5ea', text: '#111', muted: '#666', icon: '#111', divider: '#e5e5ea' };

  const onEditProfile = () => {
    Alert.alert('Próximamente', 'Editar perfil estará disponible pronto.');
  };

  const onChangeLanguage = () => {
    Alert.alert('Próximamente', 'Selección de idioma estará disponible pronto.');
  };

  const onAbout = () => {
    Alert.alert('Acerca de', 'Alerta v1.0.0');
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.bg }] }>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Volver">
          <Ionicons name="chevron-back" size={24} color={colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Opciones</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Cuenta */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Cuenta</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.item, { borderBottomColor: colors.divider }]} onPress={onEditProfile}>
            <View style={styles.itemLeft}>
              <Ionicons name="person-circle-outline" size={22} color={colors.icon} />
              <Text style={[styles.itemText, { color: colors.text }]}>Editar perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>

          <View style={[styles.item, { borderBottomColor: colors.divider }]}>
            <View style={styles.itemLeft}>
              <Ionicons name="lock-closed-outline" size={22} color={colors.icon} />
              <Text style={[styles.itemText, { color: colors.text }]}>Cuenta privada</Text>
            </View>
            <Switch
              value={privateAccount}
              onValueChange={setPrivateAccount}
              thumbColor={privateAccount ? '#007AFF' : '#f4f3f4'}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
            />
          </View>
        </View>

        {/* Preferencias */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Preferencias</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          
          <View style={[styles.item, { borderBottomColor: colors.divider }]}>
            <View style={styles.itemLeft}>
              <Ionicons name="moon-outline" size={22} color={colors.icon} />
              <Text style={[styles.itemText, { color: colors.text }]}>Modo oscuro</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={(v) => { setDarkMode(v); applyTheme(v); try { setTheme(v ? 'dark' : 'light'); } catch {} }}
              thumbColor={darkMode ? '#007AFF' : '#f4f3f4'}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
            />
          </View>

          <TouchableOpacity style={[styles.item, { borderBottomColor: colors.divider }]} onPress={onChangeLanguage}>
            <View style={styles.itemLeft}>
              <Ionicons name="language-outline" size={22} color={colors.icon} />
              <Text style={[styles.itemText, { color: colors.text }]}>Idioma</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Acerca de */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Acerca de</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.item, { borderBottomColor: colors.divider }]} onPress={onAbout}>
            <View style={styles.itemLeft}>
              <Ionicons name="information-circle-outline" size={22} color={colors.icon} />
              <Text style={[styles.itemText, { color: colors.text }]}>Acerca de la app</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    height: 56,
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
    fontSize: RFValue(16),
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemText: {
    fontSize: RFValue(14),
    fontWeight: '600',
  },
});
