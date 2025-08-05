import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator
} from 'react-native';
import {
  collection, doc, setDoc, getDocs, query, orderBy, startAt, endAt, limit
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

type Usuario = { id: string; nome?: string; nomeUsuario?: string; nomeUsuarioLower?: string; email?: string; foto?: string };

export default function CriarGrupoScreen({ navigation }: any) {
  const user = auth.currentUser;
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [resultados, setResultados] = useState<Usuario[]>([]);
  const [selecionados, setSelecionados] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<any>(null);

  const isSelected = (id: string) => selecionados.some(s => s.id === id);

  const toggle = (u: Usuario) => {
    if (u.id === user?.uid) return; // não adiciona a si mesmo (já entra automaticamente)
    setSelecionados(prev =>
      prev.some(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]
    );
  };

  // Busca com debounce
  useEffect(() => {
    let isMounted = true;

    const buscar = async (termo: string) => {
      if (!isMounted) return;
      if (!termo.trim()) {
        setResultados([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const termoLower = termo.trim().toLowerCase();

        // 1) busca por nomeUsuarioLower
        let qLower = query(
          collection(db, 'usuarios'),
          orderBy('nomeUsuarioLower'),
          startAt(termoLower),
          endAt(termoLower + '\uf8ff'),
          limit(20)
        );

        let snap = await getDocs(qLower);
        let list = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Usuario))
          .filter(u => u.id !== user?.uid);

        // 2) fallback por nomeUsuario (para docs antigos)
        if (list.length === 0) {
          const qLegacy = query(
            collection(db, 'usuarios'),
            orderBy('nomeUsuario'),
            startAt(termo),
            endAt(termo + '\uf8ff'),
            limit(20)
          );
          snap = await getDocs(qLegacy);
          list = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Usuario))
            .filter(u => u.id !== user?.uid);
        }

        if (isMounted) setResultados(list);
      } catch (e: any) {
        console.log('Erro na busca:', e);
        Alert.alert('Erro na busca', e?.message ?? 'Tente novamente. Se aparecer link de índice no console, crie-o.');
        if (isMounted) setResultados([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setLoading(!!searchTerm.trim());
    debounceTimer.current = setTimeout(() => buscar(searchTerm), 300);

    return () => {
      isMounted = false;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm, user?.uid]);

  const criar = async () => {
    if (!user) return;
    const nome = nomeGrupo.trim();
    if (!nome) return Alert.alert('Atenção', 'Informe o nome do grupo.');
    if (selecionados.length === 0) return Alert.alert('Atenção', 'Selecione pelo menos 1 membro.');

    const membros = Array.from(new Set([user.uid, ...selecionados.map(s => s.id)]));

    try {
      const ref = doc(collection(db, 'conversas')); // cria ID
      await setDoc(ref, {
        tipo: 'grupo',
        nomeGrupo: nome,
        fotoGrupo: '',          // opcional
        usuarios: membros,
        admins: [user.uid],
        ultimaMensagem: '',
        timestamp: Date.now()
      });

      // vai direto para o chat do grupo
      navigation.replace('Chat', { conversaId: ref.id, usuarios: membros, tipo: 'grupo' });
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível criar o grupo.');
    }
  };

  const renderResultado = ({ item }: { item: Usuario }) => {
    const selected = isSelected(item.id);
    return (
      <TouchableOpacity
        onPress={() => toggle(item)}
        style={{
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: '#eee',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={{ fontWeight: 'bold' }}>{item.nomeUsuario || item.nome || 'Usuário'}</Text>
          {!!item.email && <Text style={{ color: '#666' }}>{item.email}</Text>}
        </View>
        <Text style={{ color: selected ? '#2E7D32' : '#007AFF', fontWeight: 'bold' }}>
          {selected ? 'Remover' : 'Adicionar'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSelecionado = ({ item }: { item: Usuario }) => (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 14,
        marginRight: 8,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
      }}
    >
      <Text>{item.nomeUsuario || item.nome || 'Usuário'}</Text>
      <TouchableOpacity onPress={() => toggle(item)}>
        <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>Criar grupo</Text>

      {/* Nome do grupo */}
      <TextInput
        placeholder="Nome do grupo"
        value={nomeGrupo}
        onChangeText={setNomeGrupo}
        style={{
          borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
          padding: 10, marginBottom: 12
        }}
      />

      {/* Busca de membros */}
      <View
        style={{
          borderWidth: 1, borderColor: '#ccc', borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8
        }}
      >
        <TextInput
          placeholder="Pesquisar usuário para adicionar"
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize="none"
          style={{ fontSize: 16 }}
        />
      </View>

      {loading && (
        <View style={{ paddingVertical: 8 }}>
          <ActivityIndicator />
        </View>
      )}

      {/* Selecionados (chips) */}
      {selecionados.length > 0 && (
        <>
          <Text style={{ fontWeight: 'bold', marginTop: 6, marginBottom: 6 }}>Membros selecionados</Text>
          <FlatList
            data={selecionados}
            keyExtractor={(i) => i.id}
            renderItem={renderSelecionado}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4 }}
          />
        </>
      )}

      {/* Resultados da busca */}
      <FlatList
        data={resultados}
        keyExtractor={(i) => i.id}
        renderItem={renderResultado}
        ListEmptyComponent={
          searchTerm.trim() !== '' && !loading ? (
            <Text style={{ textAlign: 'center', marginTop: 12, color: '#777' }}>
              Nenhum usuário encontrado.
            </Text>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
      />

      <TouchableOpacity
        onPress={criar}
        style={{
          backgroundColor: '#2196F3', padding: 14, borderRadius: 8, marginTop: 16
        }}
        disabled={!nomeGrupo.trim() || selecionados.length === 0}
      >
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
          Criar grupo
        </Text>
      </TouchableOpacity>
    </View>
  );
}
