import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView
} from 'react-native';
import {
  collection, addDoc, onSnapshot, orderBy,
  query, serverTimestamp, doc, updateDoc, getDoc
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function ChatScreen() {
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [nomeOutroUsuario, setNomeOutroUsuario] = useState('');

  const flatListRef = useRef<FlatList>(null); // Referência para a lista

  const route = useRoute<any>();
  const { conversaId, usuarios } = route.params;
  const usuarioAtual = auth.currentUser;
  const navigation = useNavigation();

  useEffect(() => {
    const mensagensRef = collection(db, `conversas/${conversaId}/mensagens`);
    const q = query(mensagensRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMensagens(lista);

      // Scroll automático após atualizar mensagens
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [conversaId]);

  useEffect(() => {
    const carregarOutroUsuario = async () => {
      const uidOutro = usuarios.find((uid: string) => uid !== usuarioAtual?.uid);
      if (!uidOutro) return;

      const docRef = doc(db, 'usuarios', uidOutro);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const dados = snapshot.data();
        setNomeOutroUsuario(dados.nome || 'Usuário');
        navigation.setOptions({ title: dados.nome || 'Chat' });
      }
    };

    carregarOutroUsuario();
  }, [usuarios, usuarioAtual]);

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !usuarioAtual) return;

    const mensagensRef = collection(db, `conversas/${conversaId}/mensagens`);

    await addDoc(mensagensRef, {
      texto: novaMensagem,
      remetente: usuarioAtual.uid,
      timestamp: serverTimestamp()
    });

    const conversaRef = doc(db, 'conversas', conversaId);
    await updateDoc(conversaRef, {
      ultimaMensagem: novaMensagem,
      timestamp: Date.now()
    });

    setNovaMensagem('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={mensagens}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listaMensagens}
          renderItem={({ item }) => (
            <View style={[
              styles.mensagem,
              item.remetente === usuarioAtual?.uid ? styles.eu : styles.outro
            ]}>
              <Text style={styles.texto}>{item.texto}</Text>
            </View>
          )}
        />

        <View style={styles.areaInput}>
          <TextInput
            value={novaMensagem}
            onChangeText={setNovaMensagem}
            placeholder="Digite uma mensagem"
            placeholderTextColor="#888"
            style={styles.input}
          />
          <TouchableOpacity onPress={enviarMensagem} style={styles.botaoEnviar}>
            <Text style={styles.enviarTexto}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ece5dd',
  },
  container: {
    flex: 1,
  },
  listaMensagens: {
    padding: 10,
    paddingBottom: 20,
  },
  mensagem: {
    padding: 10,
    borderRadius: 16,
    marginVertical: 5,
    maxWidth: '75%',
  },
  eu: {
    alignSelf: 'flex-end',
    backgroundColor: '#d9fdd3',
    borderTopRightRadius: 0,
  },
  outro: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderTopLeftRadius: 0,
  },
  texto: {
    fontSize: 16,
    color: '#111'
  },
  areaInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    height: 45,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  botaoEnviar: {
    backgroundColor: '#128c7e',
    marginLeft: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center'
  },
  enviarTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15
  }
});
