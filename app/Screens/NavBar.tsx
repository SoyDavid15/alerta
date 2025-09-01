import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';


type NavBarProps = {
  activeTab: 'denuncias' | 'alertas';
  onSelectTab: (tab: 'denuncias' | 'alertas') => void;
  onToggleSOS: () => void;
};

const NavBar: React.FC<NavBarProps> = ({ activeTab, onSelectTab, onToggleSOS }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.nav, activeTab === 'alertas' ? styles.activeNav : null]}
        onPress={() => onSelectTab('alertas')}
        accessibilityLabel="Ir a alertas"
      >
        <Text style={styles.navText}>Alertas</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.nav, styles.SOS]}
        onPress={onToggleSOS}
        accessibilityLabel="Abrir SOS"
      >
        <Text style={[styles.navText, styles.SOSButton]}>SOS</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.nav, activeTab === 'denuncias' ? styles.activeNav : null]}
        onPress={() => onSelectTab('denuncias')}
        accessibilityLabel="Ir a denuncias"
      >
        <Text style={styles.navText}>Denuncias</Text>
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
  height: RFValue(56),
  backgroundColor: '#1a1a1b',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: RFValue(12),
  zIndex: 100,
  borderTopWidth: 0.5,
  borderTopColor: 'rgba(255,255,255,0.04)',
  },
  SOSButton:{
    backgroundColor: "#ff0000",
    borderRadius: 12,
    paddingHorizontal: RFValue(25),
    paddingVertical: RFValue(15),
  },

  nav: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: RFValue(6),
  paddingHorizontal: RFValue(8),
  },
  navText: {
  color: '#e8e8ea',
  fontSize: RFValue(14),
  fontWeight: '600',
  textAlign: 'center',
  includeFontPadding: false,
  },
  SOS: {
    backgroundColor: 'transparent',
  },
  activeNav: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: RFValue(12),
    paddingVertical: RFValue(6),
  }
});

export default NavBar;
