import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { RFValue } from "react-native-responsive-fontsize";
import Alertas from "../../app/Screens/Alertas";
import NavBar from "../../app/Screens/NavBar";
import SOSOptions from "../../app/Screens/SOSOptions";
import DenunciaVisualizar from "../Screens/DenunciaVisualizar";
import Principal from "../Screens/Principal";

const TABS = {
  alertas: Alertas,
  // We can't render Principal directly anymore if we want to show DenunciaVisualizar in the same tab
} as const;

type ActiveTab = keyof typeof TABS;

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<ActiveTab | 'denuncias'>('denuncias');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDelitoId, setSelectedDelitoId] = useState<string | null>(null);

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const handleToggleSOS = () => {
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const handleCloseSOS = () => {
    scale.value = withTiming(0, { duration: 150 });
    opacity.value = withTiming(0, { duration: 200 }, (isFinished) => {
      if (isFinished) {
        runOnJS(closeModal)();
      }
    });
  };

  useEffect(() => {
    if (isModalVisible) {
      opacity.value = withTiming(1, { duration: 100 });
      scale.value = withSpring(1, { damping: 15, stiffness: 120 });
    } else {
      opacity.value = 0;
      scale.value = 0;
    }
  }, [isModalVisible, opacity, scale]);

  const animatedModalContainerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const animatedModalContentStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleDelitoPress = (id: string) => {
    setSelectedDelitoId(id);
  };

  const handleCloseDenuncia = () => {
    setSelectedDelitoId(null);
  };

  const renderContent = () => {
    if (activeTab === 'denuncias') {
      if (selectedDelitoId) {
        return <DenunciaVisualizar id={selectedDelitoId} onClose={handleCloseDenuncia} />;
      }
      return <Principal onDelitoPress={handleDelitoPress} />;
    }
    const ActiveScreen = TABS[activeTab];
    return <ActiveScreen />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.UIContainer}>
        {renderContent()}
      </View>
      <NavBar activeTab={activeTab} onSelectTab={(tab) => { setActiveTab(tab); setSelectedDelitoId(null); }} onToggleSOS={handleToggleSOS} />
      <Modal animationType="none" transparent={true} visible={isModalVisible} onRequestClose={handleCloseSOS}>
        <Animated.View style={[styles.modalContainer, animatedModalContainerStyle, animatedModalContentStyle]}>
          <SOSOptions onClose={handleCloseSOS} />
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0c",
  },
  UIContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: RFValue(64), // espacio para NavBar fijo
    backgroundColor: "transparent",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
});