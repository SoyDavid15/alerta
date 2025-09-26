import { useTheme } from '@/theme/Theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';

type NavBarProps = {
  activeTab: 'denuncias' | 'alertas';
  onSelectTab: (tab: 'denuncias' | 'alertas') => void;
  onToggleSOS: () => void;
};

const NavBar: React.FC<NavBarProps> = ({ activeTab, onSelectTab, onToggleSOS }) => {
  const { colors, theme } = useTheme();

  const isAlertas = activeTab === 'alertas';
  const isDenuncias = activeTab === 'denuncias';

  const activeBg = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e7e7ea';

  return (
    <View style={[styles.container, { backgroundColor: colors.header, borderTopColor: colors.border }]}> 
      {/* Alertas */}
      <TouchableOpacity
        style={[styles.navBtn, isAlertas && { backgroundColor: activeBg }]}
        onPress={() => onSelectTab('alertas')}
        accessibilityLabel="Ir a alertas"
        activeOpacity={0.85}
      >
        <Ionicons name="notifications-outline" size={22} color={isAlertas ? colors.text : colors.muted} />
        <Text style={[styles.navText, { color: isAlertas ? colors.text : colors.muted }]}>Alertas</Text>
      </TouchableOpacity>

      {/* SOS */}
      <TouchableOpacity
        style={[styles.navBtn, styles.sosBg]}
        onPress={onToggleSOS}
        accessibilityLabel="Añadir alertas"
        activeOpacity={0.9}
      >
        <Ionicons name="alert-circle" size={20} color="#fff" />
        <Text style={[styles.navText, { color: '#fff' }]}>Nuevo</Text>
      </TouchableOpacity>

      {/* Denuncias */}
      <TouchableOpacity
        style={[styles.navBtn, isDenuncias && { backgroundColor: activeBg }]}
        onPress={() => onSelectTab('denuncias')}
        accessibilityLabel="Ir a publicaciones"
        activeOpacity={0.85}
      >
        <Ionicons name="list-outline" size={22} color={isDenuncias ? colors.text : colors.muted} />
        <Text style={[styles.navText, { color: isDenuncias ? colors.text : colors.muted }]}>Publicaciones</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: RFValue(64),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: RFValue(8),
    paddingBottom: 0, // pegado al borde inferior
    zIndex: 100,
    borderTopWidth: 1,
  },
  navBtn: {
    flexGrow: 1,
    flexBasis: 0,
    height: RFValue(48),
    marginHorizontal: RFValue(4),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navText: {
    fontSize: RFValue(11),
    fontWeight: '700',
    includeFontPadding: false,
  },
  sosBg: {
    backgroundColor: '#ff3040',
  },
});

export default NavBar;
