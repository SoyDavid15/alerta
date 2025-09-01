
import { Image } from 'expo-image';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RFValue } from "react-native-responsive-fontsize";
import FormularioNuevoDelito from '@/components/formularioNuevoDelito';
import { db } from '@/firebaseConfig';


// Definimos una interfaz para tipar los objetos de delito.
// Es una buena práctica para asegurar la consistencia de los datos.
export interface Delito {
  id: string;
  timestamp?: Timestamp;
  // Campos nuevos
  encabezado?: string;
  cuerpo?: string;
  mediaUrl?: string; // Campo para una sola URL
  mediaUrls?: string[]; // Campo antiguo para múltiples URLs
  // Campos antiguos para retrocompatibilidad
  tipo?: string;
  descripcion?: string;
  ubicacion?: string;
}

interface DelitoItemProps {
  item: Delito;
  onPress: () => void;
}

const DelitoItem = ({ item, onPress }: DelitoItemProps) => {
  const media = item.mediaUrl || (item.mediaUrls && item.mediaUrls[0]);
  // Simple check for video URLs, you might want to make this more robust
  const isVideo = media && (media.toLowerCase().includes('.mp4') || media.toLowerCase().includes('.mov'));

  return (
    <TouchableOpacity onPress={onPress} style={styles.delitoItem}>
      <Text style={styles.delitoTipo}>{item.encabezado || item.tipo}</Text>
      <Text style={styles.delitoDescripcion} numberOfLines={2}>
        {item.cuerpo || item.descripcion}
      </Text>
      {media && (
        <View style={styles.mediaContainer}>
          {isVideo ? (
            <View style={[styles.mediaImage, styles.videoPlaceholder]}>
              <Text style={styles.videoPlaceholderText}>Video</Text>
            </View>
          ) : (
            <Image source={{ uri: media }} style={styles.mediaImage} contentFit="cover" />
          )}
        </View>
      )}
      <Text style={styles.delitoTimestamp}>
        {item.timestamp ? item.timestamp.toDate().toLocaleString() : ''}
      </Text>
    </TouchableOpacity>
  );
};

interface PrincipalProps {
  onDelitoPress: (id: string) => void;
}

export default function Principal({ onDelitoPress }: PrincipalProps) {
  // Estado para controlar la visibilidad del modal
  const [modalVisible, setModalVisible] = useState(false);
  const [delitos, setDelitos] = useState<Delito[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <View style={styles.container}>
        <View style={styles.navBar}>
        <Text style={styles.Titulo}>Hola!</Text>
        <Text style={styles.Subtitulo}>Aqui puedes ver las ultimas denuncias hechas por usuarios</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />
        ) : (
          <FlatList
            style={styles.list}
            data={delitos}
            renderItem={({ item }) => <DelitoItem item={item} onPress={() => onDelitoPress(item.id)} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100 }} // Espacio para que el último item no quede detrás del botón
            ListEmptyComponent={<Text style={styles.emptyListText}>Aún no hay delitos reportados.</Text>}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
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
    fontSize: 50,
    fontWeight: 'bold',
    color: "white",
  },
  Subtitulo: {
    fontSize: 20,
    color: '#e0e0e0',
  },
  list: {
    flex: 1,
  },
  delitoItem: {
    backgroundColor: '#2c2c2e',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
  },
  delitoTipo: {
    fontSize: RFValue(16),
    fontWeight: 'bold',
    color: 'white',
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
  mediaImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    margin: 5,
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
});
