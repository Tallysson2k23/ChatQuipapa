// src/utils/notificacoes.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert, Linking } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';

const ANDROID_CHANNEL_ID = 'mensagens';

// Handler global: mostra alerta, toca som e seta badge mesmo em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function garantirCanalAndroid() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Mensagens',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }
}

/** Pede permissão do SO e retorna true/false */
export async function pedirPermissaoNotificacao(): Promise<boolean> {
  // Emulador muitas vezes não suporta push real
  if (!Device.isDevice) {
    console.log('Aviso: notificações push exigem um dispositivo físico.');
  }

  // Verifica/solicita permissão (Android 13+ e iOS)
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const ask = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
      // no Android, requestPermissionsAsync cobre POST_NOTIFICATIONS quando necessário
    });
    status = ask.status;
  }

  if (status !== 'granted') {
    Alert.alert(
      'Permissão necessária',
      'Para receber avisos de novas mensagens, ative as notificações do ChatQuipapa nas configurações do sistema.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir configurações', onPress: () => Linking.openSettings() },
      ],
    );
    return false;
  }

  await garantirCanalAndroid();
  return true;
}

/** Registra tokens (Expo Push e FCM/APNs) no doc do usuário (coleção `usuarios`) */
export async function registrarTokensDoDispositivo(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const ok = await pedirPermissaoNotificacao();
  if (!ok) return;

  await garantirCanalAndroid();

  // 1) Expo Push Token
  let expoPushToken: string | null = null;
  try {
    const resp = await Notifications.getExpoPushTokenAsync();
    expoPushToken = resp?.data ?? null;
  } catch (e) {
    console.log('Expo push token falhou:', e);
  }

  // 2) Device Push Token (Android: FCM / iOS: APNs)
  let fcmOrApns: string | null = null;
  try {
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    fcmOrApns = deviceToken?.data ?? null;
  } catch (e) {
    console.log('Device push token falhou:', e);
  }

  // Garante doc do usuário e adiciona tokens em array (sem sobrescrever outros dados)
  const ref = doc(db, 'usuarios', user.uid);
  await setDoc(ref, { uid: user.uid }, { merge: true });

  const patch: Record<string, any> = {};
  if (expoPushToken) patch.expoPushTokens = arrayUnion(expoPushToken);
  if (fcmOrApns)    patch.fcmTokens      = arrayUnion(fcmOrApns);

  if (Object.keys(patch).length > 0) {
    await updateDoc(ref, patch);
  }
}

/** Notificação local (útil quando o app está em primeiro plano) */
export async function enviarNotificacaoLocal(titulo: string, corpo: string) {
  await garantirCanalAndroid();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: corpo,
      sound: 'default',
      android: { channelId: ANDROID_CHANNEL_ID },
    },
    trigger: null,
  });
}

/** Instala listeners para receber/abrir notificações em foreground */
export function instalarListenersNotificacao() {
  // Recebida em foreground
  const sub1 = Notifications.addNotificationReceivedListener(() => {
    // você pode atualizar contadores/badges aqui, se quiser
  });

  // Usuário tocou na notificação
  const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
    // Se quiser navegar: ler response.notification.request.content.data (ex.: conversaId)
    // e usar seu sistema de navegação para ir direto ao chat
  });

  // Função de cleanup (para usar no unmount)
  return () => {
    try { sub1.remove(); } catch {}
    try { sub2.remove(); } catch {}
  };
}

/* ===========
   Aliases para manter compatibilidade com seu App.tsx
   - Seu App.tsx importa pedirPermissao e configurarNotificacoes
   - Aqui, mapeamos para as funções acima SEM mudar o comportamento do app
   =========== */

/** Alias compatível com App.tsx */
export async function pedirPermissao(): Promise<boolean> {
  return pedirPermissaoNotificacao();
}

/** Alias compatível com App.tsx — configura canal e listeners; retorna cleanup */
export async function configurarNotificacoes(): Promise<null | (() => void)> {
  await garantirCanalAndroid();
  // Instala listeners e retorna função de cleanup
  const cleanup = instalarListenersNotificacao();
  return cleanup;
}
