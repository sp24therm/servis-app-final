import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PriceListItem } from '../types';

export const usePriceList = () => {
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'priceList'), orderBy('order', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const priceItems = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as PriceListItem));
      setItems(priceItems);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'priceList');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updatePrice = async (id: string, price: number, priceMax: number | null = null) => {
    try {
      const itemRef = doc(db, 'priceList', id);
      await updateDoc(itemRef, {
        price,
        priceMax
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `priceList/${id}`);
      throw error;
    }
  };

  const addItem = async (newItem: Omit<PriceListItem, 'id'>) => {
    try {
      const priceListRef = collection(db, 'priceList');
      const docRef = await addDoc(priceListRef, newItem);
      // Update the document with its own ID for consistency if needed, 
      // but usually doc.id is enough. SEED data used custom IDs.
      await updateDoc(docRef, { id: docRef.id });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'priceList');
      throw error;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const itemRef = doc(db, 'priceList', id);
      await deleteDoc(itemRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `priceList/${id}`);
      throw error;
    }
  };

  return { items, updatePrice, addItem, deleteItem, loading };
};
