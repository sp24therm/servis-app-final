import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface TermSettings {
  upcomingDays: number;
  dormantDays: number;
}

const DEFAULT_SETTINGS: TermSettings = {
  upcomingDays: 30,
  dormantDays: 183
};

export const useTermSettings = () => {
  const [termSettings, setTermSettings] = useState<TermSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'appConfig', 'termSettings');
    const unsub = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setTermSettings(snapshot.data() as TermSettings);
      } else {
        // Initialize with defaults if not exists
        setDoc(docRef, DEFAULT_SETTINGS);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const saveTermSettings = async (settings: TermSettings) => {
    try {
      await setDoc(doc(db, 'appConfig', 'termSettings'), settings);
      return true;
    } catch (error) {
      console.error('Error saving term settings:', error);
      return false;
    }
  };

  return { termSettings, saveTermSettings, loading };
};
