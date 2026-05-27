import { useState } from 'react';
import { getApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function usePushNotifications() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const registerPush = async () => {
    setIsRegistering(true);
    try {
      const supported = await isSupported();
      if (!supported) {
        toast.error('Push notifikácie nie sú podporované v tomto prehliadači');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notifikácie boli zamietnuté');
        return;
      }

      const app = getApp();
      const messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });

      if (!token) {
        toast.error('Nepodarilo sa získať push token');
        return;
      }

      await setDoc(doc(db, 'pushTokens', token), {
        token,
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent
      }, { merge: true });

      setIsRegistered(true);
      toast.success('Push notifikácie aktivované ✓');
    } catch (error) {
      console.error('Push registration error:', error);
      toast.error('Chyba pri aktivácii notifikácií');
    } finally {
      setIsRegistering(false);
    }
  };

  return { registerPush, isRegistering, isRegistered };
}
