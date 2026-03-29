import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export interface ErrorCode {
  id?: string;
  brand: string;
  code: string;
  category: 'DIY' | 'Restart' | 'Dangerous';
  description: string;
  instruction: string;
  createdAt: string;
}

export const useErrorCodes = () => {
  const [errorCodes, setErrorCodes] = useState<ErrorCode[]>([]);
  const [brands, setBrands] = useState<string[]>(['Atag', 'Quantum', 'Intergas', 'Immergas', 'Viessmann', 'Warmhouse']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sync error codes
    const q = query(collection(db, 'errorCodes'), orderBy('createdAt', 'desc'));
    const unsubCodes = onSnapshot(q, (snapshot) => {
      const codes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ErrorCode));
      setErrorCodes(codes);
      setLoading(false);
    });

    // Sync brands list
    const unsubBrands = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists() && snapshot.data().errorBrands) {
        setBrands(snapshot.data().errorBrands as string[]);
      }
    });

    return () => {
      unsubCodes();
      unsubBrands();
    };
  }, []);

  const addErrorCode = async (code: ErrorCode) => {
    try {
      await addDoc(collection(db, 'errorCodes'), {
        ...code,
        createdAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error adding error code:', error);
      return false;
    }
  };

  const addBrand = async (newBrand: string) => {
    if (brands.includes(newBrand)) return true;
    const newBrands = [...brands, newBrand];
    try {
      await setDoc(doc(db, 'settings', 'global'), { errorBrands: newBrands }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error adding brand:', error);
      return false;
    }
  };

  return { errorCodes, brands, addErrorCode, addBrand, loading };
};
