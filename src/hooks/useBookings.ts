import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, deleteDoc, serverTimestamp, getDocs, runTransaction, getDoc, writeBatch, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking, Customer, Boiler } from '../types';
import { toast } from 'sonner';

export const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), limit(100)); // CHANGED: Added limit(100) to constrain the live query
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data.sort((a, b) => new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime()));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const rejectBooking = async (bookingId: string, date: string, time: string) => {
    try {
      const batch = writeBatch(db);
      // Delete booking entirely
      batch.delete(doc(db, 'bookings', bookingId));
      // Free the slot
      const slotId = `${date}_${time.replace(':', '')}`;
      batch.delete(doc(db, 'slots', slotId));
      await batch.commit();
      toast.success('Objednávka zamietnutá a termín uvoľnený');
      return true;
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error('Chyba pri zamietnutí');
      return false;
    }
  };

  const confirmBooking = async (booking: Booking) => {
    try {
      const bookingRef = doc(db, 'bookings', booking.id);

      await runTransaction(db, async (transaction) => {
        transaction.update(bookingRef, {
          status: 'confirmed',
          confirmedAt: serverTimestamp()
        });
      });

      // 2. Check if customer exists by phone
      const customerId = booking.phone.replace(/\s+/g, '');
      const customerRef = doc(db, 'customers', customerId);
      const customerSnap = await getDocs(query(collection(db, 'customers'), where('phone', '==', booking.phone)));
      
      const customerData: Partial<Customer> = {
        name: booking.name,
        phone: booking.phone,
        email: booking.email || '',
        notes: `Z web objednávky ${booking.id}. ${booking.notes || ''}`.trim(),
        updatedAt: serverTimestamp()
      };

      if (customerSnap.empty) {
        (customerData as any).createdAt = new Date().toISOString();
      }
      
      await setDoc(customerRef, customerData, { merge: true });

      // 3. Create or update boiler
      const boilerId = `boiler_${booking.boilerBrand.toLowerCase().replace(/\s+/g, '_')}_${customerId}`;
      const boilerData: Partial<Boiler> = {
        customerId: customerId,
        name: `Kotol ${booking.boilerBrand}`,
        brand: booking.boilerBrand,
        model: booking.boilerModel || '',
        address: booking.address,
        nextServiceDate: booking.preferredDate,
        lastServiceDate: new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'boilers', boilerId), boilerData, { merge: true });

      return true;
    } catch (error) {
      console.error('Error confirming booking:', error);
      return false;
    }
  };

  const cancelBooking = async (id: string) => {
    try {
      const bookingDocRef = doc(db, 'bookings', id);
      const bookingSnap = await getDoc(bookingDocRef);
      
      let preferredDate = '';
      let preferredTime = '';

      if (bookingSnap.exists()) {
        const data = bookingSnap.data();
        preferredDate = data.preferredDate;
        preferredTime = data.preferredTime;
      } else {
        const localBooking = bookings.find(b => b.id === id);
        if (localBooking) {
          preferredDate = localBooking.preferredDate;
          preferredTime = localBooking.preferredTime;
        }
      }

      await updateDoc(bookingDocRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp()
      });

      if (preferredDate && preferredTime) {
        const slotId = `${preferredDate}_${preferredTime.replace(':', '')}`;
        await deleteDoc(doc(db, 'slots', slotId));
      }

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

  const deleteBooking = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'bookings', id));
      return true;
    } catch (error) {
      console.error('Error deleting booking:', error);
      return false;
    }
  };

  return { bookings, confirmBooking, cancelBooking, deleteBooking, updateBookingTime, rejectBooking, loading };
};
