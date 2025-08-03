import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function PerfilUsuarioScreen() {
  const [nome, setNome] = useState('');
  const [foto, setFoto] = useState('');

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;

    const carregarDados = async () => {
      const docRef = doc(db, 'usuarios', uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setNome(data.nome || '');
        setFoto(data.foto || '');
      }
    };

    carregarDados();
  }, []);

  const salvar = async () => {
    if (!uid) return;

    const docRef = doc(db, 'usuarios', uid);
    await updateDoc(docRef, {
      nome: nome.trim(),
      foto: foto.trim()
    });

    Alert.alert('Sucesso', 'Perfil atualizado!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Perfil do Usuário</Text>

      {foto ? <Image source={{ uri: foto }} style={styles.avatar} /> : null}

      <TextInput
        placeholder="URL da foto de perfil"
        value={foto}
        onChangeText={setFoto}
        style={styles.input}
      />

      <TextInput
        placeholder="Seu nome"
        value={nome}
        onChangeText={setNome}
        style={styles.input}
      />

      <TouchableOpacity style={styles.botao} onPress={salvar}>
        <Text style={styles.botaoTexto}>Salvar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flex: 1,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
  },
  botao: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 20,
  },
});
