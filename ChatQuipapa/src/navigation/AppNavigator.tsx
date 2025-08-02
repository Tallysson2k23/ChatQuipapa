import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import ChatListScreen from '../screens/ChatListScreen'; 
import ChatScreen from '../screens/ChatScreen';
import ListaUsuariosScreen from '../screens/ListaUsuariosScreen';

export type RootStackParamList = {
  Login: undefined;
  Cadastro: undefined;
  ChatList: undefined;
  ListaUsuarios: undefined;
  Chat: {
    conversaId: string;
    usuarios: string[];
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Cadastro" component={CadastroScreen} />
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen name="ListaUsuarios" component={ListaUsuariosScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
