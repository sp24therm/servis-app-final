import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface CalendarConfig {
  workingDays: number[]; // 0-6 (Sun-Sat)
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

const DEFAULT_CONFIG: CalendarConfig = {
  workingDays: [1, 2, 3, 4, 5], // Mon-Fri
  startTime: '08:00',
  endTime: '16:00',
};

export const useCalendarConfig = () => {
  const [config, setConfig] = useState<CalendarConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists() && snapshot.data().calendarConfig) {
        setConfig(snapshot.data().calendarConfig as CalendarConfig);
      } else {
        // Initialize if not exists
        setDoc(doc(db, 'settings', 'global'), { calendarConfig: DEFAULT_CONFIG }, { merge: true });
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const saveCalendarConfig = async (newConfig: CalendarConfig) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), { calendarConfig: newConfig }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving calendar config:', error);
      return false;
    }
  };

  return { config, saveCalendarConfig, loading };
};
