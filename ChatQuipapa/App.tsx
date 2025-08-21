import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { Provider as PaperProvider } from 'react-native-paper';

// Mantive seus imports originais
import { pedirPermissao } from './src/utils/notificacoes';
import { configurarNotificacoes } from './src/utils/notificacoes';

export default function App() {
  useEffect(() => {
    let unsubscribeNotifs: null | (() => void) = null;

    (async () => {
      try {
        // Garante pedido de permissão (iOS/Android)
        await pedirPermissao();

        // Configura canais/listeners; se retornar função de cleanup, guardamos
        const maybeCleanup = typeof configurarNotificacoes === 'function'
          ? await configurarNotificacoes()
          : undefined;

        if (typeof maybeCleanup === 'function') {
          unsubscribeNotifs = maybeCleanup;
        }
      } catch (e) {
        console.log('Erro ao configurar notificações:', e);
      }
    })();

    // Cleanup ao desmontar o App (remove listeners/canais se aplicável)
    return () => {
      try {
        if (typeof unsubscribeNotifs === 'function') {
          unsubscribeNotifs();
        }
      } catch {
        // evita crash em caso de múltiplos unmounts
      }
    };
  }, []);

  return (
    <PaperProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </PaperProvider>
  );
}
