import { collection, getDocs, setDoc, doc, query, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PriceListItem } from '../types';

const SEED_DATA: PriceListItem[] = [
  { id: 'vyjazd_okolie', category: 'Výjazd', name: 'Výjazd - okolie', price: 25, priceMax: null, unit: '€', emergency: false, order: 1 },
  { id: 'sadzba_bezna', category: 'Hodinové sadzby', name: 'Bežná sadzba', price: 30, priceMax: null, unit: '€/hod', emergency: false, order: 2 },
  { id: 'sadzba_havaria', category: 'Hodinové sadzby', name: 'Havarijná sadzba', price: 40, priceMax: null, unit: '€/hod', emergency: true, order: 3 },
  { id: 'servis_zakladny', category: 'Servis kotla', name: 'Základný servis', price: 90, priceMax: null, unit: '€', emergency: false, order: 4 },
  { id: 'servis_rozsireny', category: 'Servis kotla', name: 'Rozšírený servis', price: 120, priceMax: null, unit: '€', emergency: false, order: 5 },
  { id: 'diagnostika', category: 'Diagnostika', name: 'Diagnostika', price: 50, priceMax: null, unit: '€', emergency: false, order: 6 },
  { id: 'havaria_vyjazd', category: 'Havarijné', name: 'Havarijný výjazd', price: 60, priceMax: 80, unit: '€', emergency: true, order: 7 },
];

export async function seedPriceList() {
  try {
    const priceListRef = collection(db, 'priceList');
    const q = query(priceListRef, limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('Price list is empty, seeding data...');
      for (const item of SEED_DATA) {
        await setDoc(doc(db, 'priceList', item.id), item);
      }
      console.log('Price list seeded successfully.');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'priceList');
  }
}
