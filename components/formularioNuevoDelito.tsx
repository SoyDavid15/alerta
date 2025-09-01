
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { db } from '@/firebaseConfig';

interface FormularioNuevoDelitoProps {
    onClose: () => void;
}

const FormularioNuevoDelito: React.FC<FormularioNuevoDelitoProps> = ({ onClose }) => {
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');

    const handleSubmit = async () => {
        if (!titulo.trim() || !descripcion.trim()) {
            alert('Por favor, complete todos los campos.');
            return;
        }

        try {
                        await addDoc(collection(db, 'Delitos'), {
                tipo: titulo,
                descripcion: descripcion,
                timestamp: serverTimestamp(),
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
            <Text style={styles.title}>Nueva Denuncia</Text>
            <TextInput
                style={styles.input}
                placeholder="Título"
                value={titulo}
                onChangeText={setTitulo}
            />
            <TextInput
                style={styles.input}
                placeholder="Descripción"
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
            />
            <Button title="Agregar Denuncia" onPress={handleSubmit} />
            <Button title="Cancelar" onPress={onClose} color="red" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
    },
});

export default FormularioNuevoDelito;
