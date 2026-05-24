import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface CompanyInfo {
  name: string;
  ico: string;
  dic: string;
  icDph: string;
  street: string;
  city: string;
  zip: string;
  phone: string;
  email: string;
  iban: string;
  analyzerModel: string;
  analyzerSerial: string;
  gasDetectorModel: string;
  stampUrl: string;
}

const INITIAL_STATE: CompanyInfo = {
  name: '',
  ico: '',
  dic: '',
  icDph: '',
  street: '',
  city: '',
  zip: '',
  phone: '',
  email: '',
  iban: '',
  analyzerModel: '',
  analyzerSerial: '',
  gasDetectorModel: '',
  stampUrl: '',
};

export const useCompanyInfo = () => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'appConfig', 'companyInfo'),
      (docSnap) => {
        if (docSnap.exists()) {
          setCompanyInfo({ ...INITIAL_STATE, ...docSnap.data() } as CompanyInfo);
        }
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'appConfig/companyInfo');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const saveCompanyInfo = async (info: CompanyInfo) => {
    try {
      await setDoc(doc(db, 'appConfig', 'companyInfo'), info);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'appConfig/companyInfo');
      throw error;
    }
  };

  return { companyInfo, saveCompanyInfo, loading };
};
