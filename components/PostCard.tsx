import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { RFValue } from 'react-native-responsive-fontsize';
import { useTheme } from '@/theme/Theme';
import { db } from '@/firebaseConfig';
import { Timestamp, deleteDoc, doc, getDoc, increment, setDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Tipo local para una publicación (delito) mostrado en el feed
export interface Delito {
  id: string;
  timestamp?: Timestamp;
  encabezado?: string;
  cuerpo?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  mediaUrls?: string[];
  tipo?: string;
  descripcion?: string;
  ubicacion?: string;
  userName?: string;
  userId?: string;
  likesCount?: number;
  commentsCount?: number;
}

export type PostCardProps = {
  item: Delito;
  usernames: Record<string, string>;
  onPress: () => void;
  onCommentPress: (item: Delito) => void;
};

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

const PostCard: React.FC<PostCardProps> = ({ item, usernames, onPress, onCommentPress }) => {
  const { colors, theme } = useTheme();
  const media = item.mediaUrl || (item.mediaUrls && item.mediaUrls[0]);
  const isVideo = !!media && (item.mediaType === 'video' || media.toLowerCase().includes('.mp4') || media.toLowerCase().includes('.mov'));

  const author = (item.userId && usernames[item.userId]) ? usernames[item.userId] : (item.userName || 'Anónimo');
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
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#3a3a3c' : '#e5e5ea' }]}>
            <Text style={[styles.avatarText, { color: colors.text }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.authorName, { color: colors.text }]}>{author}</Text>
            {timeText ? (
              <Text style={[styles.timestampText, { color: colors.muted }]}>{timeText}</Text>
            ) : null}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2c2c2e',
    padding: 14,
    marginVertical: 10,
    marginHorizontal: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    width: '100%',
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
    fontSize: RFValue(12),
    fontWeight: '600',
  },
  timestampText: {
    fontSize: RFValue(10),
  },
  cardTitle: {
    fontSize: RFValue(16),
    fontWeight: 'bold',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: RFValue(14),
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  media: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: '#000',
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
    fontSize: RFValue(12),
  },
});

export default PostCard;
