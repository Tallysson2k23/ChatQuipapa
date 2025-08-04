// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBDALSzMLyrCVgnJ5cHxN_Z-6Knl8Pah-A",
  authDomain: "chatquipapa.firebaseapp.com",
  projectId: "chatquipapa",
  storageBucket: "chatquipapa.appspot.com", // corrigido
  messagingSenderId: "402117718571",
  appId: "1:402117718571:web:4aba2eec0938a89ad4706e"
};

const app = initializeApp(firebaseConfig);

// 🔒 Persistência de login
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
