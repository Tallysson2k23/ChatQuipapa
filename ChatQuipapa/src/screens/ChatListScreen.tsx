import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image
} from 'react-native';
import {
  onSnapshot, collection, query, where, doc, getDoc
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { Menu, Provider, IconButton } from 'react-native-paper';

type Conversa = {
  id: string;
  usuarios: string[];
  ultimaMensagem?: string;
  nomeOutroUsuario: string;
  fotoOutroUsuario?: string;
};

export default function ChatListScreen() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const navigation = useNavigation();
  const usuarioAtual = auth.currentUser;

  const abrirMenu = () => setMenuVisible(true);
  const fecharMenu = () => setMenuVisible(false);

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
          let fotoOutro = '';

          if (outroUid) {
            try {
              const snap = await getDoc(doc(db, 'usuarios', outroUid));
              if (snap.exists()) {
                const data = snap.data();
                nomeOutro = data?.nome || 'Usuário';
                fotoOutro = data?.foto || '';
              }
            } catch (e) {
              console.log('Erro ao buscar usuário:', e);
            }
          }

          return {
            id: docItem.id,
            usuarios: dadosConversa.usuarios,
            ultimaMensagem: dadosConversa.ultimaMensagem,
            nomeOutroUsuario: nomeOutro,
            fotoOutroUsuario: fotoOutro
          };
        })
      );

      setConversas(dados);
    });

    return () => unsubscribe();
  }, [usuarioAtual]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Menu
          visible={menuVisible}
          onDismiss={fecharMenu}
          anchor={
            <View style={{ paddingRight: 8 }}>
              <IconButton
                icon="dots-vertical"
                onPress={abrirMenu}
                size={24}
              />
            </View>
          }
        >
          <Menu.Item
            onPress={() => {
              fecharMenu();
              navigation.navigate('PerfilUsuario');
            }}
            title="Perfil"
          />
        </Menu>
      ),
      headerTitle: 'Suas Conversas',
    });
  }, [navigation, menuVisible]);

  const abrirConversa = (conversa: Conversa) => {
    navigation.navigate('Chat', {
      conversaId: conversa.id,
      usuarios: conversa.usuarios
    });
  };

  return (
    <Provider>
      <View style={styles.container}>
        <Text style={styles.titulo}>Suas Conversas</Text>

        <FlatList
          data={conversas}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#777' }}>
              Nenhuma conversa encontrada.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => abrirConversa(item)} style={styles.itemConversa}>
              <View style={styles.linha}>
                {item.fotoOutroUsuario ? (
                  <Image source={{ uri: item.fotoOutroUsuario }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={{ color: '#999' }}>👤</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.nome}>{item.nomeOutroUsuario}</Text>
                  <Text>{item.ultimaMensagem || 'Sem mensagens ainda'}</Text>
                </View>
              </View>
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
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  itemConversa: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nome: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ddd',
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
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
