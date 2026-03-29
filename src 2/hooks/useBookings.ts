import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking, Customer } from '../types';

export const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'bookings'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data.sort((a, b) => new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime()));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const confirmBooking = async (booking: Booking) => {
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'confirmed',
        confirmedAt: serverTimestamp()
      });

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

  const cancelBooking = async (id: string) => {
    try {
      await updateDoc(doc(db, 'bookings', id), {
        status: 'cancelled',
        cancelledAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return false;
    }
  };

  const updateBookingTime = async (id: string, date: string, time: string) => {
    try {
      await updateDoc(doc(db, 'bookings', id), {
        preferredDate: date,
        preferredTime: time,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating booking:', error);
      return false;
    }
  };

  return { bookings, confirmBooking, cancelBooking, updateBookingTime, loading };
};
