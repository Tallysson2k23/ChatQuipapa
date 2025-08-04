import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Cadastro'>;

export default function CadastroScreen({ navigation }: Props) {
  const [nome, setNome] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState(''); // novo campo
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const cadastrar = async () => {
    const nomeTrim = nome.trim();
    const nomeUsuarioTrim = nomeUsuario.trim();
    const emailTrim = email.trim();

    if (!nomeTrim || !nomeUsuarioTrim || !emailTrim || !senha) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    // validação simples de username
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(nomeUsuarioTrim)) {
      Alert.alert('Atenção', 'O nome de usuário deve ter 3–20 caracteres e conter apenas letras, números, ponto, hífen ou underscore.');
      return;
    }

    const nomeUsuarioLower = nomeUsuarioTrim.toLowerCase();

    try {
      // 1) Checar duplicidade
      const q = query(
        collection(db, 'usuarios'),
        where('nomeUsuarioLower', '==', nomeUsuarioLower)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        Alert.alert('Erro', 'Este nome de usuário já está em uso. Escolha outro.');
        return;
      }

      // 2) Criar usuário no Auth
      const cred = await createUserWithEmailAndPassword(auth, emailTrim, senha);
      const uid = cred.user.uid;

      // 3) Salvar perfil no Firestore
      await setDoc(doc(db, 'usuarios', uid), {
        nome: nomeTrim,
        email: emailTrim,
        nomeUsuario: nomeUsuarioTrim,
        nomeUsuarioLower,
        criadoEm: new Date()
      });

      Alert.alert('Sucesso', 'Usuário cadastrado com sucesso!');
      navigation.replace('Login');
    } catch (e: any) {
      Alert.alert('Erro ao cadastrar', e?.message ?? 'Ocorreu um erro.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Cadastro</Text>

      <TextInput
        placeholder="Nome"
        value={nome}
        onChangeText={setNome}
        style={styles.input}
      />

      <TextInput
        placeholder="Nome de usuário (ex.: joao_silva)"
        value={nomeUsuario}
        onChangeText={setNomeUsuario}
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        style={styles.input}
      />

      <Button title="Cadastrar" onPress={cadastrar} />
      <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
        Já tem uma conta? Entrar
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center' },
  titulo: { fontSize: 28, marginBottom: 20, textAlign: 'center' },
  input: {
    backgroundColor: '#f0f0f0',
    marginBottom: 10,
    padding: 12,
    borderRadius: 8
  },
  link: { marginTop: 16, color: 'blue', textAlign: 'center' }
});
