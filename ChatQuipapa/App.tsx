import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { Provider as PaperProvider } from 'react-native-paper';
import { pedirPermissao } from './src/utils/notificacoes';
import { configurarNotificacoes } from './src/utils/notificacoes';


export default function App() {
  useEffect(() => {
    pedirPermissao();
    configurarNotificacoes();
  }, []);

  return (
    <PaperProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </PaperProvider>
  );
}
