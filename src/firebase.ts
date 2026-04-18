import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCZhn6jxoUR1zHXsYzTGgOpoqBwUFkB0pQ",
  authDomain: "gen-lang-client-0463998550.firebaseapp.com",
  projectId: "gen-lang-client-0463998550",
  storageBucket: "gen-lang-client-0463998550.firebasestorage.app",
  messagingSenderId: "138673940716",
  appId: "1:138673940716:web:626554c369bf44eee45dc9"
};

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-f0fbd47e-303b-40fe-88c1-505382c75ba3");
export const auth = getAuth();

console.log('Firestore úspešne prepojený na databázu ai-studio-f0fbd47e-303b-40fe-88c1-505382c75ba3');
