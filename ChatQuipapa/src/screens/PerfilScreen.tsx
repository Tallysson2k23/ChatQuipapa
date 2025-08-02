import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function PerfilScreen() {
  const [imagem, setImagem] = useState<string | null>(null);

  const escolherImagem = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImagem(uri);

      const response = await fetch(uri);
      const blob = await response.blob();

      const uid = auth.currentUser?.uid;
      const caminho = `perfil/${uid}.jpg`;
      const storageRef = ref(storage, caminho);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'usuarios', uid), { foto: url });
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={escolherImagem}>
        {imagem ? (
          <Image source={{ uri: imagem }} style={styles.imagem} />
        ) : (
          <View style={styles.placeholder}>
            <Text>Selecionar Foto</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imagem: { width: 120, height: 120, borderRadius: 60 },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
