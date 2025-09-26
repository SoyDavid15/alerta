import { db } from '@/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface FormularioNuevoDelitoProps {
    onClose: () => void;
}

const FormularioNuevoDelito: React.FC<FormularioNuevoDelitoProps> = ({ onClose }) => {
    const [tipo, setTipo] = useState<'Emergencia' | 'Eventos' | 'Recomendación'>('Emergencia');
    const [descripcion, setDescripcion] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);

    const handleSubmit = async () => {
        if (!descripcion.trim()) {
            alert('Por favor, complete todos los campos.');
            return;
        }

        try {
            const { currentUser } = getAuth();
            const userId = isAnonymous ? null : (currentUser?.uid || null);
            const userName = isAnonymous ? 'Anónimo' : (currentUser?.displayName || currentUser?.email || 'Anónimo');

            await addDoc(collection(db, 'Delitos'), {
                tipo: tipo,
                descripcion: descripcion,
                timestamp: serverTimestamp(),
                anonymous: isAnonymous,
                userId,
                userName,
            });
            console.log('Denuncia agregada correctamente');
            onClose();
        } catch (error) {
            console.error('Error al agregar la denuncia: ', error);
            alert('Hubo un error al agregar la denuncia. Por favor, intente de nuevo.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Nueva Publicacion</Text>
            <View style={styles.typeSelector}>
                <TouchableOpacity onPress={() => setTipo('Emergencia')} style={[styles.typeButton, tipo === 'Emergencia' && styles.typeButtonSelected]}>
                    <Text style={styles.typeButtonText}>Emergencia</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTipo('Eventos')} style={[styles.typeButton, tipo === 'Eventos' && styles.typeButtonSelected]}>
                    <Text style={styles.typeButtonText}>Eventos</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTipo('Recomendación')} style={[styles.typeButton, tipo === 'Recomendación' && styles.typeButtonSelected]}>
                    <Text style={styles.typeButtonText}>Recomendación</Text>
                </TouchableOpacity>
            </View>
            <TextInput
                style={[styles.input, styles.inputArea]}
                placeholder="Descripción"
                placeholderTextColor="#8e8e93"
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
            />
            <View style={styles.anonRow}>
                <Text style={styles.anonLabel}>Publicacion anónima</Text>
                <Switch
                    value={isAnonymous}
                    onValueChange={setIsAnonymous}
                    thumbColor={isAnonymous ? '#007AFF' : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                />
            </View>
            <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
                    <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
                    <Text style={styles.primaryButtonText}>Publicar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#2c2c2e',
        padding: 20,
        borderRadius: 16,
        width: '90%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)'
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        color: '#fff'
    },
    input: {
        borderWidth: 1,
        borderColor: '#3a3a3c',
        backgroundColor: '#1c1c1e',
        color: '#fff',
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
    },
    inputArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    anonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    anonLabel: {
        fontSize: 14,
        color: '#e5e5ea',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
    },
    primaryButton: {
        flex: 1,
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#ff453a',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: '#ff453a',
        fontWeight: 'bold',
        fontSize: 16,
    },
    typeSelector: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    typeButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3a3a3c',
    },
    typeButtonSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    typeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default FormularioNuevoDelito;