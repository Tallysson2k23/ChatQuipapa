// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBDALSzMLyrCVgnJ5cHxN_Z-6Knl8Pah-A",
  authDomain: "chatquipapa.firebaseapp.com",
  projectId: "chatquipapa",
  storageBucket: "chatquipapa.firebasestorage.app",
  messagingSenderId: "402117718571",
  appId: "1:402117718571:web:4aba2eec0938a89ad4706e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
