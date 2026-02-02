import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- BURAYI KENDİ BİLGİLERİNLE DOLDUR ---
// Not defterindeki { ... } içindeki bilgileri buraya tek tek yapıştır.
const firebaseConfig = {
  apiKey: "AIzaSyAMgXrrc7HZcxTu1NCTtAkRMPPOdo1P8WY",
  authDomain: "mywatchlist-9db08.firebaseapp.com",
  projectId: "mywatchlist-9db08",
  storageBucket: "mywatchlist-9db08.firebasestorage.app",
  messagingSenderId: "376229449400",
  appId: "1:376229449400:web:bf1b391e85b616403a2e4d"
};

const app = initializeApp(firebaseConfig);

// Giriş işlemleri ve Veritabanı araçlarını dışarı aktarıyoruz
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);