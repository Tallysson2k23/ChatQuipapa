import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Image
} from 'react-native';
import {
  collection, addDoc, onSnapshot, orderBy,
  query, serverTimestamp, doc, updateDoc, getDoc
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useRoute, useNavigation } from '@react-navigation/native';

import { format } from 'date-fns';
import pt from 'date-fns/locale/pt-BR';

type Mensagem = {
  id: string;
  texto: string;
  remetente: string;
  timestamp?: any;
  tipo?: 'mensagem' | 'data';
  data?: string;
};

type UsuarioMin = { nome?: string; foto?: string };

function formatarHora(timestamp: any) {
  if (!timestamp || !timestamp.toDate) return '';
  const data = timestamp.toDate();
  return format(data, 'HH:mm');
}

function formatarDataDia(timestamp: any) {
  if (!timestamp || !timestamp.toDate) return '';
  const data = timestamp.toDate();
  return format(data, "dd 'de' MMMM 'de' yyyy", { locale: pt });
}

export default function ChatScreen() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [nomeOutroUsuario, setNomeOutroUsuario] = useState('');     // usado em conversa direta
  const [fotoOutroUsuario, setFotoOutroUsuario] = useState('');     // usado em conversa direta

  const [conversaInfo, setConversaInfo] = useState<any>(null);      // ⬅️ ADIÇÃO: dados da conversa (tipo, nomeGrupo, fotoGrupo, usuarios)
  const [membrosCache, setMembrosCache] = useState<Record<string, UsuarioMin>>({}); // ⬅️ ADIÇÃO: cache de membros (nome/foto) p/ grupos

  const flatListRef = useRef<FlatList>(null);

  const route = useRoute<any>();
  const { conversaId, usuarios: usuariosParam, tipo: tipoParam } = route.params || {};
  const usuarioAtual = auth.currentUser;
  const navigation = useNavigation();

  // ⬇️ ADIÇÃO: obter informações da conversa (para saber se é grupo e montar header)
  useEffect(() => {
    (async () => {
      if (!conversaId) return;
      const ref = doc(db, 'conversas', conversaId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = { id: conversaId, ...snap.data() };
        setConversaInfo(data);
      } else {
        // fallback: se vier pelos params
        setConversaInfo({ id: conversaId, tipo: tipoParam ?? 'direta', usuarios: usuariosParam ?? [] });
      }
    })();
  }, [conversaId, tipoParam, usuariosParam]);

  // ⬇️ Mantém seu listener de mensagens (inalterado na essência)
  useEffect(() => {
    if (!conversaId) return;
    const mensagensRef = collection(db, `conversas/${conversaId}/mensagens`);
    const q = query(mensagensRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaBase = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Mensagem[];

      const agrupadas: Mensagem[] = [];
      let ultimaData = '';

      listaBase.forEach(msg => {
        const dataFormatada = msg.timestamp ? formatarDataDia(msg.timestamp) : '';
        if (dataFormatada && dataFormatada !== ultimaData) {
          agrupadas.push({
            id: `data-${dataFormatada}`,
            tipo: 'data',
            data: dataFormatada,
            texto: '',
            remetente: ''
          });
          ultimaData = dataFormatada;
        }
        agrupadas.push({ ...msg, tipo: 'mensagem' });
      });

      setMensagens(agrupadas);
    });

    return () => unsubscribe();
  }, [conversaId]);

  // ⬇️ Scroll automático ao final
  useLayoutEffect(() => {
    if (mensagens.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [mensagens]);

  // ⬇️ Header: conversa direta OU grupo
  useLayoutEffect(() => {
    (async () => {
      if (!conversaInfo || !usuarioAtual) return;

      // Conversa em grupo
      if (conversaInfo?.tipo === 'grupo') {
        const nome = conversaInfo?.nomeGrupo || 'Grupo';
        const foto = conversaInfo?.fotoGrupo || '';

        navigation.setOptions({
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -9 }}>
              {foto ? (
                <Image source={{ uri: foto }} style={styles.headerFoto} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={{ fontSize: 18 }}>👥</Text>
                </View>
              )}
              <Text style={styles.headerNome}>{nome}</Text>
            </View>
          ),
          headerTitleAlign: 'left',
        });

        // Pré-carregar nomes/fotos dos membros (exceto eu) para mostrar por mensagem
        const uids: string[] = Array.isArray(conversaInfo?.usuarios) ? conversaInfo.usuarios : (usuariosParam || []);
        const faltando = uids.filter((u) => u !== usuarioAtual.uid && !membrosCache[u]);

        if (faltando.length) {
          const novos: Record<string, UsuarioMin> = {};
          await Promise.all(
            faltando.map(async (uid) => {
              try {
                const snap = await getDoc(doc(db, 'usuarios', uid));
                if (snap.exists()) {
                  const d = snap.data() as any;
                  novos[uid] = { nome: d?.nome || d?.nomeUsuario || 'Usuário', foto: d?.foto || '' };
                }
              } catch {}
            })
          );
          if (Object.keys(novos).length) {
            setMembrosCache((prev) => ({ ...prev, ...novos }));
          }
        }
        return;
      }

      // Conversa direta (1:1) — sua lógica original
      const uidOutro = (usuariosParam || conversaInfo?.usuarios || []).find((uid: string) => uid !== usuarioAtual.uid);
      if (!uidOutro) return;

      const snap = await getDoc(doc(db, 'usuarios', uidOutro));
      if (!snap.exists()) return;

      const dados = snap.data() as any;
      const nome = dados?.nome || 'Usuário';
      const foto = dados?.foto || '';

      setNomeOutroUsuario(nome);
      setFotoOutroUsuario(foto);

      navigation.setOptions({
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -9 }}>
            {foto ? (
              <Image source={{ uri: foto }} style={styles.headerFoto} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={{ fontSize: 20 }}>👤</Text>
              </View>
            )}
            <Text style={styles.headerNome}>{nome}</Text>
          </View>
        ),
        headerTitleAlign: 'left',
      });
    })();
  }, [navigation, conversaInfo, usuariosParam, usuarioAtual]);

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
      remetente: usuarioAtual.uid, // evita notificação para si mesmo
      timestamp: Date.now()
    });

    setNovaMensagem('');
  };

  const renderItem = ({ item }: { item: Mensagem }) => {
    if (item.tipo === 'data') {
      return (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTexto}>{item.data}</Text>
        </View>
      );
    }

    const isMinhaMensagem = item.remetente === usuarioAtual?.uid;

    // ⬇️ Em grupo, quando a mensagem é de outra pessoa, mostrar nome/foto do remetente:
    const isGrupo = conversaInfo?.tipo === 'grupo';
    const infoRemetente: UsuarioMin | undefined = isGrupo && !isMinhaMensagem ? membrosCache[item.remetente] : undefined;
    const nomeRemetente = infoRemetente?.nome || (isGrupo && !isMinhaMensagem ? 'Usuário' : '');
    const fotoRemetente = infoRemetente?.foto || (isGrupo ? '' : fotoOutroUsuario);

    return (
      <View
        style={[
          styles.linhaMensagem,
          { justifyContent: isMinhaMensagem ? 'flex-end' : 'flex-start' }
        ]}
      >
        {!isMinhaMensagem && (isGrupo ? !!fotoRemetente : !!fotoOutroUsuario) ? (
          <Image source={{ uri: isGrupo ? (fotoRemetente || '') : (fotoOutroUsuario || '') }} style={styles.fotoMensagem} />
        ) : null}

        <View style={[styles.mensagem, isMinhaMensagem ? styles.eu : styles.outro]}>
          {/* Nome do remetente no grupo */}
          {isGrupo && !isMinhaMensagem ? (
            <Text style={{ fontSize: 12, color: '#2a6', marginBottom: 2 }}>
              {nomeRemetente}
            </Text>
          ) : null}

          <Text style={styles.texto}>{item.texto}</Text>
          <Text style={styles.hora}>{formatarHora(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={mensagens}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listaMensagens}
        />

        <View style={styles.areaInput}>
          <TextInput
            value={novaMensagem}
            onChangeText={setNovaMensagem}
            placeholder="Digite uma mensagem"
            placeholderTextColor="#888"
            style={styles.input}
          />
          <TouchableOpacity
            onPress={enviarMensagem}
            style={[styles.botaoEnviar, { opacity: novaMensagem.trim() ? 1 : 0.5 }]}
            disabled={!novaMensagem.trim()}
          >
            <Text style={styles.enviarTexto}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ece5dd' },
  container: { flex: 1 },
  listaMensagens: { padding: 10, paddingBottom: 20 },
  mensagem: { padding: 10, borderRadius: 16, marginVertical: 5, maxWidth: '75%' },
  eu: { alignSelf: 'flex-end', backgroundColor: '#d9fdd3', borderTopRightRadius: 0 },
  outro: { alignSelf: 'flex-start', backgroundColor: '#fff', borderTopLeftRadius: 0 },
  texto: { fontSize: 16, color: '#111' },
  hora: { fontSize: 11, color: '#555', textAlign: 'right', marginTop: 4 },
  areaInput: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#ddd',
  },
  input: { flex: 1, height: 45, backgroundColor: '#f0f0f0', borderRadius: 25, paddingHorizontal: 15, fontSize: 16 },
  botaoEnviar: {
    backgroundColor: '#128c7e', marginLeft: 8, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 25, justifyContent: 'center', alignItems: 'center',
  },
  enviarTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  avatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee',
    justifyContent: 'center', alignItems: 'center',
  },
  linhaMensagem: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 },
  fotoMensagem: { width: 36, height: 36, borderRadius: 18, marginRight: 6 },
  headerFoto: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  headerNome: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  dataContainer: { alignItems: 'center', marginVertical: 10 },
  dataTexto: { backgroundColor: '#d0d0d0', color: '#333', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, fontSize: 13 },
});
