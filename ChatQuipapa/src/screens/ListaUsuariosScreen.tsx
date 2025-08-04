import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import {
  collection,
  getDocs,
  query,
  doc,
  getDoc,
  setDoc,
  orderBy,
  startAt,
  endAt,
  limit
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'react-native';

export default function ListaUsuariosScreen() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const usuarioAtual = auth.currentUser;

  // debounce simples
  const debounceTimer = useRef<any>(null);
  const termoFiltrado = useMemo(() => searchTerm.trim(), [searchTerm]);

  useEffect(() => {
    let isMounted = true;

    const carregarUsuarios = async (termo: string) => {
      if (!isMounted) return;
      if (termo === '') {
        setUsuarios([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 1) nomeUsuarioLower (case-insensitive)
        const termoLower = termo.toLowerCase();
        let qLower = query(
          collection(db, 'usuarios'),
          orderBy('nomeUsuarioLower'),
          startAt(termoLower),
          endAt(termoLower + '\uf8ff'),
          limit(20)
        );

        let snapshot = await getDocs(qLower);
        let lista = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(user => user.id !== usuarioAtual?.uid);

        // 2) fallback para nomeUsuario (docs antigos)
        if (lista.length === 0) {
          const qLegacy = query(
            collection(db, 'usuarios'),
            orderBy('nomeUsuario'),
            startAt(termo),
            endAt(termo + '\uf8ff'),
            limit(20)
          );
          snapshot = await getDocs(qLegacy);
          lista = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(user => user.id !== usuarioAtual?.uid);
        }

        if (isMounted) setUsuarios(lista);
      } catch (e: any) {
        console.log('Erro ao pesquisar usuários:', e);
        Alert.alert(
          'Erro ao pesquisar',
          e?.message ?? 'Verifique a conexão. Se o console mostrar um link para criar índice, clique nele.'
        );
        if (isMounted) setUsuarios([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // aplica debounce de 300ms
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setLoading(termoFiltrado !== '');
    debounceTimer.current = setTimeout(() => carregarUsuarios(termoFiltrado), 300);

    return () => {
      isMounted = false;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [termoFiltrado, usuarioAtual?.uid]);

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

    // @ts-ignore
    navigation.navigate('Chat', { conversaId, usuarios: [id1, id2] });
  };

  const limparBusca = () => setSearchTerm('');

  const RenderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => abrirOuCriarConversa(item)}
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
      }}
    >
      {item.foto ? (
        <Image
          source={{ uri: item.foto }}
          style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#ddd' }}
        />
      ) : (
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: '#eee',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Text>👤</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
          {item.nomeUsuario || item.nome || 'Usuário'}
        </Text>
        <Text style={{ color: '#666' }}>{item.email || ''}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>
        Usuários
      </Text>

      {/* Campo de busca com botão limpar */}
      <View
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center'
        }}
      >
        <TextInput
          placeholder="Buscar por nome de usuário"
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize="none"
          style={{ flex: 1, paddingRight: 8 }}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={limparBusca}>
            <Text style={{ fontSize: 16, color: '#007AFF' }}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && (
        <View style={{ paddingVertical: 12 }}>
          <ActivityIndicator />
        </View>
      )}

      <FlatList
        data={usuarios}
        keyExtractor={item => item.id}
        renderItem={RenderItem}
        ListEmptyComponent={
          termoFiltrado !== '' && !loading ? (
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#777' }}>
              Nenhum usuário encontrado.
            </Text>
          ) : (
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#777' }}>
              Digite para pesquisar.
            </Text>
          )
        }
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}
