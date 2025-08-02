import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Cadastro'>;

export default function CadastroScreen({ navigation }: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const cadastrar = async () => {
    if (!nome || !email || !senha) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    try {
      const credenciais = await createUserWithEmailAndPassword(auth, email, senha);
      const uid = credenciais.user.uid;

      await setDoc(doc(db, 'usuarios', uid), {
        nome,
        email,
        criadoEm: new Date()
      });

      Alert.alert('Sucesso', 'Usuário cadastrado com sucesso!');
      navigation.replace('Login'); // voltar pra tela de login
    } catch (erro: any) {
      Alert.alert('Erro ao cadastrar', erro.message);
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
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
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
  link: {
    marginTop: 16,
    color: 'blue',
    textAlign: 'center'
  }
});
