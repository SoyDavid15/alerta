
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { addDoc, collection, deleteDoc, doc, getDoc, increment, onSnapshot, orderBy, query, Timestamp, updateDoc, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import SideDrawer from '@/components/SideDrawer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from '@/theme/Theme';
import FormularioNuevoDelito from '@/components/formularioNuevoDelito';
import { db } from '@/firebaseConfig';
import { getAuth } from 'firebase/auth';


// Definimos una interfaz para tipar los objetos de delito.
// Es una buena práctica para asegurar la consistencia de los datos.
export interface Delito {
  id: string;
  timestamp?: Timestamp;
  // Campos nuevos
  encabezado?: string;
  cuerpo?: string;
  mediaUrl?: string; // Campo para una sola URL
  mediaType?: 'image' | 'video';
  mediaUrls?: string[]; // Campo antiguo para múltiples URLs
  // Campos antiguos para retrocompatibilidad
  tipo?: string;
  descripcion?: string;
  ubicacion?: string;
  userName?: string;
  userId?: string;
  likesCount?: number;
  commentsCount?: number;
}

interface DelitoItemProps {
  item: Delito;
  onPress: () => void;
  onCommentPress: (item: Delito) => void;
  usernames: Record<string, string>;
}

const getInitials = (name: string | undefined) => {
  if (!name) return 'A';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

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

const DelitoItem = ({ item, onPress, onCommentPress, usernames }: DelitoItemProps) => {
  const { colors, theme } = useTheme();
  const media = item.mediaUrl || (item.mediaUrls && item.mediaUrls[0]);
  const isVideo = !!media && (item.mediaType === 'video' || media.toLowerCase().includes('.mp4') || media.toLowerCase().includes('.mov'));

  const author = (item.userId && usernames[item.userId]) ? usernames[item.userId] : 'Anónimo';
  const initials = getInitials(author);
  const timeText = item.timestamp ? item.timestamp.toDate().toLocaleString() : '';

  const auth = getAuth();
  const uid = auth.currentUser?.uid || null;
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState<number>(item.likesCount || 0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!uid) return;
      try {
        const likeRef = doc(db, 'Delitos', item.id, 'likes', uid);
        const snap = await getDoc(likeRef);
        if (mounted) setLiked(snap.exists());
      } catch {}
    })();
    return () => { mounted = false };
  }, [uid, item.id]);

  const toggleLike = async () => {
    if (!uid) return;
    try {
      const likeRef = doc(db, 'Delitos', item.id, 'likes', uid);
      const postRef = doc(db, 'Delitos', item.id);
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

  return (
    <View style={[styles.delitoItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: theme==='dark' ? '#3a3a3c' : '#e5e5ea' }]}><Text style={[styles.avatarText, { color: colors.text }]}>{initials}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.authorName, { color: colors.text }]}>{author}</Text>
          {timeText ? <Text style={[styles.timestampText, { color: colors.muted }]}>{timeText}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </View>

      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.encabezado || item.tipo}</Text>
      <Text style={[styles.cardDesc, { color: colors.muted }]} numberOfLines={3}>
        {item.cuerpo || item.descripcion}
      </Text>

      {media && (
        <View style={styles.mediaContainer}>
          {isVideo ? (
            <VideoPreview uri={media} />
          ) : (
            <Image source={{ uri: media }} style={styles.media} contentFit="cover" />
          )}
        </View>
      )}

      </TouchableOpacity>

      {/* Action bar like Instagram */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={toggleLike} accessibilityLabel="Me gusta">
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#ff3040' : colors.icon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onCommentPress(item)} accessibilityLabel="Comentar">
          <Ionicons name={'chatbubble-outline'} size={22} color={colors.icon} />
        </TouchableOpacity>
      </View>
      <View style={styles.countsRow}>
        <Text style={[styles.countText, { color: colors.muted }]}>{likes} Me gusta</Text>
        <Text style={[styles.countText, { color: colors.muted }]}>{item.commentsCount || 0} comentarios</Text>
      </View>
    </View>
  );
};

interface PrincipalProps {
  onDelitoPress: (id: string) => void;
}

export default function Principal({ onDelitoPress }: PrincipalProps) {
  const { colors, theme } = useTheme();
  // Estado para controlar la visibilidad del modal
  const [modalVisible, setModalVisible] = useState(false);
  const [delitos, setDelitos] = useState<Delito[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [activePost, setActivePost] = useState<Delito | null>(null);
  const [comments, setComments] = useState<Array<{ id: string; userName: string; text: string; createdAt?: Timestamp }>>([]);
  const [commentText, setCommentText] = useState('');
  const [activeSection, setActiveSection] = useState<'recent' | 'popular'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const openModal = useCallback(() => setModalVisible(true), []);
  const closeModal = useCallback(() => setModalVisible(false), []);

  // useEffect para cargar los delitos desde Firestore en tiempo real
  useEffect(() => {
    // Creamos una consulta para obtener los delitos, ordenados por fecha (timestamp) descendente.
        const q = query(collection(db, "Delitos"), orderBy("timestamp", "desc"));

    // onSnapshot establece un listener que se ejecuta cada vez que hay cambios en la colección.
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const delitosData: Delito[] = [];
      querySnapshot.forEach((doc) => {
        // Creamos un objeto Delito con los datos del documento y su ID.
        delitosData.push({ id: doc.id, ...doc.data() } as Delito);
      });
      // Actualizamos el estado con los nuevos datos.
      setDelitos(delitosData);
      setLoading(false);
    });

    // La función de limpieza se ejecuta cuando el componente se desmonta.
    // Esto es crucial para evitar fugas de memoria.
    return () => unsubscribe();
  }, []);

  // Cargar usernames de autores para mostrar @usuario en lugar del nombre completo
  useEffect(() => {
    const fetchUsernames = async () => {
      const missing = new Set<string>();
      delitos.forEach(d => { if (d.userId && !usernames[d.userId]) missing.add(d.userId); });
      if (missing.size === 0) return;
      const entries: Array<[string, string]> = [];
      for (const uid of missing) {
        try {
          const snap = await getDoc(doc(db, 'Users', uid));
          const data = snap.data() as any;
          if (data?.username) entries.push([uid, String(data.username)]);
        } catch {}
      }
      if (entries.length) {
        setUsernames(prev => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    };
    fetchUsernames();
  }, [delitos]);

  const recentList = [...delitos].sort(
    (a, b) => (((b.timestamp as any)?.toDate?.()?.getTime?.() || 0) - ((a.timestamp as any)?.toDate?.()?.getTime?.() || 0))
  );
  const popularList = [...delitos].sort(
    (a, b) => (b.likesCount || 0) - (a.likesCount || 0)
  );
  const filterByQuery = (arr: Delito[]) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter(it => ((it.encabezado || it.tipo || '') as string).toLowerCase().includes(q));
  };
  const displayedList = activeSection === 'recent' ? filterByQuery(recentList) : filterByQuery(popularList);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Barra superior con icono de menú y título */}
        <SafeAreaView edges={['top']} style={[styles.headerSafe, { backgroundColor: colors.header }]}>
          <View style={[styles.header, { backgroundColor: colors.header }]}>
            <TouchableOpacity style={styles.headerMenuBtn} onPress={() => setDrawerOpen(true)} accessibilityLabel="Abrir menú">
              <Ionicons name="menu" size={24} color={colors.icon} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Denuncias</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.inputBg, color: colors.inputText }]}
            placeholder="Buscar por título..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity style={[styles.tabBtn, { backgroundColor: theme==='dark' ? 'rgba(255,255,255,0.06)' : '#e5e5ea' }, activeSection==='recent' && { backgroundColor: theme==='dark' ? '#3a3a3c' : '#d9d9dc' }]} onPress={() => setActiveSection('recent')}>
            <Text style={[styles.tabText, { color: colors.muted }, activeSection==='recent' && { color: colors.text }]}>Más reciente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, { backgroundColor: theme==='dark' ? 'rgba(255,255,255,0.06)' : '#e5e5ea' }, activeSection==='popular' && { backgroundColor: theme==='dark' ? '#3a3a3c' : '#d9d9dc' }]} onPress={() => setActiveSection('popular')}>
            <Text style={[styles.tabText, { color: colors.muted }, activeSection==='popular' && { color: colors.text }]}>Más popular</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />
        ) : (
          <FlatList
            style={styles.list}
            data={displayedList}
            renderItem={({ item }) => <DelitoItem item={item} usernames={usernames} onPress={() => onDelitoPress(item.id)} onCommentPress={(p) => { setActivePost(p); setCommentsVisible(true); }} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 0 }} // Sin padding lateral; ocupa todo el ancho
            ListEmptyComponent={<Text style={[styles.emptyListText, { color: colors.text }]}>Aún no hay delitos reportados.</Text>}
          />
        )}

        {/* Botón flotante para agregar un nuevo delito */}
        <TouchableOpacity style={styles.nuevoDelitoButton} onPress={openModal}>
          <Text style={styles.nuevoDelitoText}>+</Text> 
        </TouchableOpacity>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.centeredView}>
            <FormularioNuevoDelito onClose={() => setModalVisible(false)} />
          </View>
        </Modal>

        {/* Drawer lateral vacío */}
        <SideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

        {/* Modal de comentarios */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={commentsVisible}
          onRequestClose={() => setCommentsVisible(false)}
        >
          <View style={styles.commentsModalBackdrop}>
            <View style={styles.commentsModal}>
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comentarios</Text>
                <TouchableOpacity onPress={() => setCommentsVisible(false)} style={styles.closeCommentsBtn}>
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.commentsList}>
                <FlatList
                  data={comments}
                  keyExtractor={(i) => i.id}
                  renderItem={({ item }) => (
                    <View style={styles.commentItem}>
                      <Text style={styles.commentAuthor}>{item.userName || 'Anónimo'}</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                  )}
                  ListEmptyComponent={<Text style={styles.emptyListText}>Sé el primero en comentar.</Text>}
                />
              </View>
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Agregar un comentario..."
                  placeholderTextColor="#999"
                  value={commentText}
                  onChangeText={setCommentText}
                />
                <TouchableOpacity
                  style={styles.sendCommentBtn}
                  onPress={async () => {
                    if (!activePost || !commentText.trim()) return;
                    try {
                      await addDoc(collection(db, 'Delitos', activePost.id, 'comments'), {
                        text: commentText.trim(),
                        userId: currentUser?.uid || null,
                        userName: currentUser?.displayName || currentUser?.email || 'Anónimo',
                        createdAt: Timestamp.now(),
                      });
                      await updateDoc(doc(db, 'Delitos', activePost.id), { commentsCount: increment(1) });
                      setCommentText('');
                    } catch (e) {
                      console.warn('No se pudo agregar comentario:', e);
                    }
                  }}
                >
                  <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    width: '100%',
  },
  navBar: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 16,
    backgroundColor: '#2c2c2e',
  },
  Titulo: {
    fontSize: RFValue(24),
    fontWeight: 'bold',
    color: 'white',
  },
  Subtitulo: {
    fontSize: RFValue(13),
    color: '#bdbdbd',
    marginTop: 6,
  },
  list: {
    flex: 1,
  },
  delitoItem: {
    backgroundColor: '#2c2c2e',
    padding: 14,
    marginVertical: 10,
    marginHorizontal: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    width: '100%',
  },
  autor: {
    fontSize: RFValue(12),
    color: '#a0a0a0',
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3a3a3c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  authorName: {
    color: '#e5e5ea',
    fontSize: RFValue(12),
    fontWeight: '600',
  },
  timestampText: {
    color: '#8e8e93',
    fontSize: RFValue(10),
  },
  cardTitle: {
    fontSize: RFValue(16),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: RFValue(14),
    color: '#e0e0e0',
    marginTop: 0,
  },
  delitoDescripcion: {
    fontSize: RFValue(14),
    color: '#e0e0e0',
    marginTop: 5,
  },
  delitoUbicacion: {
    fontSize: RFValue(12),
    color: '#a0a0a0',
    marginTop: 10,
    fontStyle: 'italic',
  },
  delitoTimestamp: {
    fontSize: RFValue(10),
    color: '#888',
    textAlign: 'right',
    marginTop: 5,
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
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
    color: '#e5e5ea',
    fontSize: RFValue(12),
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
  },
  clearSearchBtn: {
    padding: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: '#3a3a3c',
  },
  tabText: {
    color: '#bdbdbd',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  media: {
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: 12,
    marginTop: 10,
  },
  videoPlaceholder: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  nuevoDelitoButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  nuevoDelitoText: {
    color: 'white',
    fontSize: RFValue(30),
    lineHeight: RFValue(32),
  },
  // Estilos para el modal
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fondo semitransparente
  },
  emptyListText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
  commentsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  commentsModal: {
    backgroundColor: '#2c2c2e',
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 12,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  commentsTitle: {
    color: '#fff',
    fontSize: RFValue(14),
    fontWeight: '700',
  },
  closeCommentsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentItem: {
    marginBottom: 12,
  },
  commentAuthor: {
    color: '#e5e5ea',
    fontWeight: '600',
    marginBottom: 2,
  },
  commentText: {
    color: '#fff',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
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
  headerSafe: {
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: RFValue(16),
    fontWeight: 'bold',
  },
});
