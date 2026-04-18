import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface SeasonConfig {
  autoMode: boolean;
  manualOverride: boolean;
  manualSeason: 'winter' | 'summer';
  winterStartMonth: number; // 1-12
  summerStartMonth: number; // 1-12
}

const DEFAULT_CONFIG: SeasonConfig = {
  autoMode: true,
  manualOverride: false,
  manualSeason: 'winter',
  winterStartMonth: 10, // October
  summerStartMonth: 4,  // April
};

export const useSeasonConfig = () => {
  const [config, setConfig] = useState<SeasonConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists() && snapshot.data().seasonConfig) {
        setConfig(snapshot.data().seasonConfig as SeasonConfig);
      } else {
        // Initialize if not exists
        setDoc(doc(db, 'settings', 'global'), { seasonConfig: DEFAULT_CONFIG }, { merge: true });
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const saveSeasonConfig = async (newConfig: SeasonConfig) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), { seasonConfig: newConfig }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving season config:', error);
      return false;
    }
  };

  const getCurrentAutoSeason = (): 'winter' | 'summer' => {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    
    // Simple logic: if winter starts in Oct (10) and summer in Apr (4)
    // Winter is 10, 11, 12, 1, 2, 3
    // Summer is 4, 5, 6, 7, 8, 9
    
    if (config.winterStartMonth > config.summerStartMonth) {
      // Normal case (Winter starts later in the year)
      if (currentMonth >= config.winterStartMonth || currentMonth < config.summerStartMonth) {
        return 'winter';
      }
      return 'summer';
    } else {
      // Inverse case (unlikely but possible)
      if (currentMonth >= config.winterStartMonth && currentMonth < config.summerStartMonth) {
        return 'winter';
      }
      return 'summer';
    }
  };

  const currentSeason = config.manualOverride ? config.manualSeason : getCurrentAutoSeason();

  return { config, saveSeasonConfig, loading, currentSeason, autoSeason: getCurrentAutoSeason() };
};
