import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface TermSettings {
  upcomingDays: number; // dni_bliziace_sa
  dormantDays: number;  // dni_zaspate
  nowDaysBefore: number; // dni_teraz_pred
  nowDaysAfter: number;  // dni_teraz_po
  overdueDays: number;   // dni_po_termine
}

const DEFAULT_SETTINGS: TermSettings = {
  upcomingDays: 30,
  dormantDays: 183,
  nowDaysBefore: 7,
  nowDaysAfter: 5,
  overdueDays: 6
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
