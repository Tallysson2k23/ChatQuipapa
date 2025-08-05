import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import ListaUsuariosScreen from '../screens/ListaUsuariosScreen';
import PerfilUsuarioScreen from '../screens/PerfilUsuarioScreen';
import CriarGrupoScreen from '../screens/CriarGrupoScreen'; // ✅ ajuste o caminho conforme sua pasta

import { auth } from '../../firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ActivityIndicator, View } from 'react-native';

export type RootStackParamList = {
  Login: undefined;
  Cadastro: undefined;
  ChatList: undefined;
  ListaUsuarios: undefined;
  PerfilUsuario: undefined;
  CriarGrupo: undefined; // ✅ nova rota
  Chat: {
    conversaId: string;
    usuarios: string[];
    tipo?: 'direta' | 'grupo'; // ✅ permite grupo
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCarregando(false);
    });
    return unsubscribe;
  }, []);

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#075E54" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={usuario ? 'ChatList' : 'Login'}>
        {!usuario ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Cadastro"
              component={CadastroScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="ChatList"
              component={ChatListScreen}
              options={{ headerShown: true }}
            />
            <Stack.Screen
              name="ListaUsuarios"
              component={ListaUsuariosScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PerfilUsuario"
              component={PerfilUsuarioScreen}
              options={{ title: 'Meu Perfil' }}
            />
            <Stack.Screen
              name="CriarGrupo"                 // ✅ AGORA DENTRO DO STACK
              component={CriarGrupoScreen}
              options={{ title: 'Criar grupo' }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{
                headerShown: true,
                headerTitle: '',
                headerStyle: { backgroundColor: '#075E54' },
                headerTintColor: '#fff',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
