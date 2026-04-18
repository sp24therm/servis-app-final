import { doc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface LeadData {
  name: string;
  phone: string;
  address?: string;
  boilerBrand?: string;
  issue?: string;
  date?: string;
  time?: string;
  status: 'partial' | 'completed';
}

export const useLeadCapture = () => {
  const getLeadId = (): string | null => {
    return localStorage.getItem('leadId');
  };

  const saveLeadId = (id: string): void => {
    localStorage.setItem('leadId', id);
  };

  const clearLeadId = (): void => {
    localStorage.removeItem('leadId');
  };

  const createLead = async (name: string, phone: string): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, 'leads'), {
        name,
        phone,
        status: 'partial',
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  };

  const updateLead = async (leadId: string, data: Partial<Omit<LeadData, 'name' | 'phone' | 'status'>> & { status: 'completed' }): Promise<void> => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      // Log error but don't block
    }
  };

  return {
    getLeadId,
    saveLeadId,
    clearLeadId,
    createLead,
    updateLead,
  };
};
