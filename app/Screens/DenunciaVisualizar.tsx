import { doc, getDoc, collection, onSnapshot, orderBy, query, Timestamp, addDoc, deleteDoc, increment, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { VideoView, useVideoPlayer } from 'expo-video';
import { db } from '@/firebaseConfig';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { useTheme } from '@/theme/Theme';

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

// Vista previa de video integrada en el contenido (sin reproducir automáticamente para evitar ruido)
const VideoPreview = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer({ uri });
  return (
    <VideoView
      style={styles.media}
      player={player}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
};

const DenunciaVisualizar = ({ id, onClose }: Props) => {
  const { colors, theme } = useTheme();
  const [denuncia, setDenuncia] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
  const [comments, setComments] = useState<Array<{ id: string; userName?: string; text?: string; createdAt?: Timestamp }>>([]);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState<number>(0);
  const [commentText, setCommentText] = useState('');

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

  useEffect(() => {
    if (!id) return;
    const unsubPost = onSnapshot(doc(db, 'Delitos', id), (snap) => {
      if (snap.exists()) {
        const data: any = snap.data();
        setDenuncia((prev: any) => ({ ...(prev || {}), ...data }));
        setLikes(data?.likesCount || 0);
      }
    });
    return () => unsubPost();
  }, [id]);

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!id || !uid) return;
    (async () => {
      try {
        const likeRef = doc(db, 'Delitos', id, 'likes', uid);
        const snap = await getDoc(likeRef);
        setLiked(!!snap.exists());
      } catch {}
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'Delitos', id, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setComments(arr);
    });
    return () => unsub();
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
    const lower = url.toLowerCase();
    const isVideo = (denuncia.mediaType === 'video') || lower.endsWith('.mp4') || lower.endsWith('.mov');
    setSelectedMedia({ uri: url, type: isVideo ? 'video' : 'image' });
    setModalVisible(true);
  };

  const toggleLike = async () => {
    const uid = getAuth().currentUser?.uid;
    if (!uid || !id) return;
    try {
      const likeRef = doc(db, 'Delitos', id, 'likes', uid);
      const postRef = doc(db, 'Delitos', id);
      const snap = await getDoc(likeRef);
      if (snap.exists()) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
        setLiked(false);
        setLikes((c) => Math.max(0, c - 1));
      } else {
        await setDoc(likeRef, { uid, createdAt: Timestamp.now() });
        await updateDoc(postRef, { likesCount: increment(1) });
        setLiked(true);
        setLikes((c) => c + 1);
      }
    } catch (e) {
      console.warn('No se pudo alternar like:', e);
    }
  };

  const sendComment = async () => {
    const uid = getAuth().currentUser?.uid;
    const userName = getAuth().currentUser?.displayName || getAuth().currentUser?.email || 'Anónimo';
    if (!id || !commentText.trim()) return;
    try {
      await addDoc(collection(db, 'Delitos', id, 'comments'), {
        text: commentText.trim(),
        userId: uid || null,
        userName,
        createdAt: Timestamp.now(),
      });
      await updateDoc(doc(db, 'Delitos', id), { commentsCount: increment(1) });
      setCommentText('');
    } catch (e) {
      console.warn('No se pudo agregar comentario:', e);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      <TouchableOpacity onPress={onClose} style={[styles.backButton, { backgroundColor: colors.accent }]}>
        <Text style={[styles.backButtonText, { color: '#fff' }]}>Volver</Text>
      </TouchableOpacity>
      
      <Text style={[styles.authorText, { color: colors.muted }]}>Por: {denuncia.userName || 'Anónimo'}</Text>
      
      {denuncia.timestamp && (
        <Text style={[styles.dateText, { color: colors.muted }]}>
          {denuncia.timestamp.toDate().toLocaleString()}
        </Text>
      )}

      <Text style={[styles.header, { color: colors.text }]}>{denuncia.encabezado || denuncia.tipo}</Text>

      <Text style={[styles.body, { color: colors.text }]}>{denuncia.cuerpo || denuncia.descripcion}</Text>
      
      {/* Barra de acciones */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={toggleLike} accessibilityLabel="Me gusta">
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#ff3040' : '#333'} />
        </TouchableOpacity>
        {/* Botón de comentar solo hace focus al input */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => {}} accessibilityLabel="Comentar">
          <Ionicons name={'chatbubble-outline'} size={22} color={'#333'} />
        </TouchableOpacity>
      </View>
      <View style={styles.countsRow}>
        <Text style={styles.countText}>{likes} Me gusta</Text>
        <Text style={styles.countText}>{denuncia?.commentsCount || comments.length} comentarios</Text>
      </View>

      {mediaToShow.length > 0 && (
        <View style={styles.mediaContainer}>
          {mediaToShow.map((url: string, index: number) => {
            const lower = url.toLowerCase();
            const isVideo = (denuncia.mediaType === 'video') || lower.endsWith('.mp4') || lower.endsWith('.mov');
            return (
              <TouchableOpacity key={index} onPress={() => openMedia(url)}>
                {isVideo ? (
                  <VideoPreview uri={url} />
                ) : (
                  <Image source={{ uri: url }} style={[styles.media, { backgroundColor: theme==='dark' ? colors.card : '#eee' }]} contentFit="cover" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      
      {denuncia.ubicacion && (
        <Text style={[styles.infoText, { color: colors.muted }]}>Ubicación: {denuncia.ubicacion}</Text>
      )}

      <View style={[styles.commentsSection, { borderTopColor: colors.divider }]}>
        <Text style={[styles.commentsTitle, { color: colors.text }]}>Comentarios</Text>
        {comments.length === 0 ? (
          <Text style={[styles.noComments, { color: colors.muted }]}>Aún no hay comentarios.</Text>
        ) : (
          comments.map((c) => (
            <View key={c.id} style={styles.commentItem}>
              <Text style={[styles.commentAuthor, { color: colors.text }]}>{c.userName || 'Anónimo'}</Text>
              <Text style={[styles.commentText, { color: colors.text }]}>{c.text}</Text>
            </View>
          ))
        )}
        <View style={styles.commentInputRow}>
          <TextInput
            style={[styles.commentInput, { backgroundColor: theme==='dark' ? '#1c1c1e' : colors.inputBg, color: colors.inputText }]}
            placeholder="Agregar un comentario..."
            placeholderTextColor={colors.muted}
            value={commentText}
            onChangeText={setCommentText}
          />
          <TouchableOpacity style={[styles.sendCommentBtn, { backgroundColor: colors.accent }]} onPress={sendComment}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

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
  authorText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
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
  commentsSection: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  noComments: {
    color: '#666',
  },
  commentItem: {
    marginBottom: 10,
  },
  commentAuthor: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  commentText: {
    color: '#444',
  },
  actionsRow: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  actionBtn: {
    marginRight: 12,
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  countText: {
    color: '#333',
    fontSize: RFValue(12),
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#000',
    marginRight: 8,
  },
  sendCommentBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DenunciaVisualizar;