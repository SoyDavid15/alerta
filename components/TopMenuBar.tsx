import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TopMenuBarProps {
  onMenu: () => void;
}

const TopMenuBar: React.FC<TopMenuBarProps> = ({ onMenu }) => {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.iconBtn} onPress={onMenu} accessibilityLabel="Abrir menú">
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    backgroundColor: 'transparent',
  },
  container: {
    height: 56,
    width: '100%',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8, // un poco más abajo del notch/estatus bar
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TopMenuBar;
