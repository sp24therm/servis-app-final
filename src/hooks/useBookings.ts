import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking, Customer } from '../types';

export const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data.sort((a, b) => new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime()));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const confirmBooking = async (booking: Booking) => {
    try {
      // 1. Update booking status
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'confirmed',
        confirmedAt: serverTimestamp()
      });

      // 2. Update/Create customer (ID is phone number)
      const customerId = booking.phone.replace(/\s+/g, '');
      const customerData: Partial<Customer> = {
        name: booking.name,
        phone: booking.phone,
        email: booking.email || '',
        notes: `Automaticky vytvorené z objednávky ${booking.id}. ${booking.notes || ''}`.trim(),
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'customers', customerId), customerData, { merge: true });

      return true;
    } catch (error) {
      console.error('Error confirming booking:', error);
      return false;
    }
  };

  return { bookings, confirmBooking, loading };
};
