import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { VideoView, useVideoPlayer } from 'expo-video';
import { db } from '@/firebaseConfig';
import { Image } from 'expo-image';

interface Props {
  id: string;
  onClose: () => void;
}

const VideoPlayer = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer({ uri }, (player) => {
    player.play();
  });

  return (
    <VideoView
      style={styles.fullscreenMedia}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
};

const DenunciaVisualizar = ({ id, onClose }: Props) => {
  const [denuncia, setDenuncia] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);

  useEffect(() => {
    const fetchDenuncia = async () => {
      if (id) {
        try {
                    const docRef = doc(db, 'Delitos', id as string);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setDenuncia(docSnap.data());
          } else {
            console.log('No such document!');
          }
        } catch (error) {
          console.error("Error fetching document: ", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchDenuncia();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!denuncia) {
    return (
      <View style={styles.centered}>
        <Text>No se encontró la denuncia.</Text>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mediaToShow = denuncia.mediaUrl ? [denuncia.mediaUrl] : denuncia.mediaUrls || [];

  const openMedia = (url: string) => {
    const isVideo = denuncia.tipo === 'video' || url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov');
    setSelectedMedia({ uri: url, type: isVideo ? 'video' : 'image' });
    setModalVisible(true);
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={onClose} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>
      
      {denuncia.timestamp && (
        <Text style={styles.dateText}>
          {denuncia.timestamp.toDate().toLocaleString()}
        </Text>
      )}

      <Text style={styles.header}>{denuncia.encabezado || denuncia.tipo}</Text>

      <Text style={styles.body}>{denuncia.cuerpo || denuncia.descripcion}</Text>
      
      {mediaToShow.length > 0 && (
        <View style={styles.mediaContainer}>
          {mediaToShow.map((url: string, index: number) => {
            const isVideo = denuncia.tipo === 'video' || url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov');
            return (
              <TouchableOpacity key={index} onPress={() => openMedia(url)}>
                {isVideo ? (
                  <View style={styles.media}>
                    <Text>Ver Video</Text>
                  </View>
                ) : (
                  <Image source={{ uri: url }} style={styles.media} contentFit="cover" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      
      {denuncia.ubicacion && (
        <Text style={styles.infoText}>Ubicación: {denuncia.ubicacion}</Text>
      )}

      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </TouchableOpacity>
          {selectedMedia && (
            selectedMedia.type === 'video' ? (
              <VideoPlayer uri={selectedMedia.uri} />
            ) : (
              <Image
                source={{ uri: selectedMedia.uri }}
                style={styles.fullscreenMedia}
                contentFit="contain"
              />
            )
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    marginBottom: 16,
  },
  mediaContainer: {
    marginBottom: 16,
  },
  media: {
    width: '100%',
    height: 200,
    marginBottom: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    margin: RFValue(20),
    marginLeft: RFValue(5),
    backgroundColor: '#007AFF',
    padding: RFValue(10),
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  fullscreenMedia: {
    width: '100%',
    height: '90%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
    zIndex: 1,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default DenunciaVisualizar;