import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { collection, getDocs, query, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useNavigation } from '@react-navigation/native';

export default function ListaUsuariosScreen() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const navigation = useNavigation();
  const usuarioAtual = auth.currentUser;

  useEffect(() => {
    const carregarUsuarios = async () => {
      const q = query(collection(db, 'usuarios'));
      const snapshot = await getDocs(q);
      const lista = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.id !== usuarioAtual?.uid); // Remove o próprio usuário
      setUsuarios(lista);
    };

    carregarUsuarios();
  }, []);

  const abrirOuCriarConversa = async (destinatario: any) => {
    if (!usuarioAtual) return;

    const id1 = usuarioAtual.uid;
    const id2 = destinatario.id;
    const conversaId = id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;

    const docRef = doc(db, 'conversas', conversaId);
    const conversaDoc = await getDoc(docRef);

    if (!conversaDoc.exists()) {
      await setDoc(docRef, {
        usuarios: [id1, id2],
        ultimaMensagem: '',
        timestamp: Date.now()
      });
    }

    navigation.navigate('Chat', {
      conversaId,
      usuarios: [id1, id2]
    });
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Usuários Disponíveis</Text>
      <FlatList
        data={usuarios}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => abrirOuCriarConversa(item)} style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text>{item.nome || item.email}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
