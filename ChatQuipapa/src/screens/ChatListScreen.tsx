import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { onSnapshot, collection, query, where, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useNavigation } from '@react-navigation/native';

export default function ChatListScreen() {
  const [conversas, setConversas] = useState<any[]>([]);
  const navigation = useNavigation();
  const usuarioAtual = auth.currentUser;

  useEffect(() => {
    if (!usuarioAtual?.uid) return;

    const q = query(
      collection(db, 'conversas'),
      where('usuarios', 'array-contains', usuarioAtual.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const dados = await Promise.all(
        snapshot.docs.map(async (docItem) => {
          const dadosConversa = docItem.data();
          const outroUid = dadosConversa.usuarios.find((uid: string) => uid !== usuarioAtual.uid);

          let nomeOutro = 'Usuário';
          if (outroUid) {
            const snap = await getDoc(doc(db, 'usuarios', outroUid));
            if (snap.exists()) {
              nomeOutro = snap.data().nome || 'Usuário';
            }
          }

          return {
            id: docItem.id,
            ...dadosConversa,
            nomeOutroUsuario: nomeOutro
          };
        })
      );

      setConversas(dados);
    });

    return () => unsubscribe();
  }, [usuarioAtual]);

  const abrirConversa = (conversa: any) => {
    navigation.navigate('Chat', {
      conversaId: conversa.id,
      usuarios: conversa.usuarios
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Suas Conversas</Text>

      <FlatList
        data={conversas}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => abrirConversa(item)} style={styles.itemConversa}>
            <Text style={styles.nome}>
              {item.nomeOutroUsuario}
            </Text>
            <Text>{item.ultimaMensagem || 'Sem mensagens ainda'}</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.botaoFlutuante}
        onPress={() => navigation.navigate('ListaUsuarios')}
      >
        <Text style={styles.botaoTexto}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  itemConversa: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  nome: {
    fontWeight: 'bold',
  },
  botaoFlutuante: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#2196F3',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  botaoTexto: {
    fontSize: 30,
    color: '#fff',
  },
});
