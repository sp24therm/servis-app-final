import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  Customer, 
  Boiler, 
  ServiceRecord, 
  Contact, 
  ServiceStatus,
  PriceListItem
} from '../types';
import { User } from 'firebase/auth';
import { seedPriceList } from '../utils/seedPriceList';

export const useAppData = (user: User | null) => {
  const [data, setData] = useState<{
    customers: Customer[],
    boilers: Boiler[],
    services: ServiceRecord[],
    contacts: Contact[],
    priceList: PriceListItem[]
  }>({
    customers: [],
    boilers: [],
    services: [],
    contacts: [],
    priceList: []
  });

  // Firestore Listeners
  useEffect(() => {
    if (!user) return;

    // Seed price list if empty
    seedPriceList();

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customers = snapshot.docs.map(doc => doc.data() as Customer);
      setData(prev => ({ ...prev, customers }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'customers'));

    const unsubBoilers = onSnapshot(collection(db, 'boilers'), (snapshot) => {
      const boilers = snapshot.docs.map(doc => doc.data() as Boiler);
      setData(prev => ({ ...prev, boilers }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'boilers'));

    const unsubServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      const services = snapshot.docs.map(doc => doc.data() as ServiceRecord);
      setData(prev => ({ ...prev, services }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'services'));

    const unsubContacts = onSnapshot(collection(db, 'contacts'), (snapshot) => {
      const contacts = snapshot.docs.map(doc => doc.data() as Contact);
      setData(prev => ({ ...prev, contacts }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'contacts'));

    const unsubPriceList = onSnapshot(collection(db, 'priceList'), (snapshot) => {
      const priceList = snapshot.docs.map(doc => doc.data() as PriceListItem);
      setData(prev => ({ ...prev, priceList }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'priceList'));

    return () => {
      unsubCustomers();
      unsubBoilers();
      unsubServices();
      unsubContacts();
      unsubPriceList();
    };
  }, [user]);

  const handleServiceSubmit = async (activeServiceBoilerId: string | null, editingServiceId: string | null, serviceData: Partial<ServiceRecord>) => {
    if (!activeServiceBoilerId) return;

    try {
      const cleanServiceData = Object.fromEntries(
        Object.entries(serviceData).filter(([_, v]) => v !== undefined)
      );

      if (editingServiceId) {
        const serviceRef = doc(db, 'services', editingServiceId);
        await updateDoc(serviceRef, cleanServiceData);

        if (serviceData.date) {
          const boilerRef = doc(db, 'boilers', activeServiceBoilerId);
          const boilerUpdate: any = {};

          // BUG B: Logic for lastServiceDate and nextServiceDate
          const existingService = data.services.find(s => s.id === editingServiceId);
          const task = serviceData.taskPerformed || existingService?.taskPerformed;
          
          const boilerServices = data.services.filter(s => s.boilerId === activeServiceBoilerId && s.id !== editingServiceId);
          
          if (task === 'Ročná prehliadka') {
            boilerUpdate.lastServiceDate = serviceData.date;
            const nextDate = new Date(serviceData.date);
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            boilerUpdate.nextServiceDate = nextDate.toISOString().split('T')[0];
          } else if (task === 'Inštalácia') {
            // nextServiceDate changes only on first record
            if (boilerServices.length === 0) {
              const nextDate = new Date(serviceData.date);
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              boilerUpdate.nextServiceDate = nextDate.toISOString().split('T')[0];
            }
            if ((serviceData as any).useAsInstallDate) {
              boilerUpdate.installDate = serviceData.date;
            }
          }

          if (Object.keys(boilerUpdate).length > 0) {
            await updateDoc(boilerRef, boilerUpdate);
          }
        }
      } else {
        const serviceId = `s${Date.now()}`;
        const newService: ServiceRecord = {
          id: serviceId,
          boilerId: activeServiceBoilerId,
          date: serviceData.date || new Date().toISOString().split('T')[0],
          taskPerformed: serviceData.taskPerformed || '',
          co2Value: serviceData.co2Value || 0,
          pressureValue: serviceData.pressureValue || 0,
          status: serviceData.status || ServiceStatus.COMPLETED,
          ...cleanServiceData
        } as ServiceRecord;

        await setDoc(doc(db, 'services', serviceId), newService);

        const boilerRef = doc(db, 'boilers', activeServiceBoilerId);
        const boilerUpdate: any = {};

        // BUG B: Logic for lastServiceDate and nextServiceDate
        const task = newService.taskPerformed;
        const boilerServices = data.services.filter(s => s.boilerId === activeServiceBoilerId);
        
        if (task === 'Ročná prehliadka') {
          boilerUpdate.lastServiceDate = newService.date;
          const nextDate = new Date(newService.date);
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          boilerUpdate.nextServiceDate = nextDate.toISOString().split('T')[0];
        } else if (task === 'Inštalácia') {
          // nextServiceDate changes only on first record
          if (boilerServices.length === 0) {
            const nextDate = new Date(newService.date);
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            boilerUpdate.nextServiceDate = nextDate.toISOString().split('T')[0];
          }
          if ((newService as any).useAsInstallDate) {
            boilerUpdate.installDate = newService.date;
          }
        }

        if (Object.keys(boilerUpdate).length > 0) {
          await updateDoc(boilerRef, boilerUpdate);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'services');
      throw error;
    }
  };

  const handleAddCustomer = async (newCust: Omit<Customer, 'id'>, boilerData?: Omit<Boiler, 'id' | 'customerId'>, preGeneratedIds?: { customerId?: string, boilerId?: string }) => {
    try {
      const customerId = preGeneratedIds?.customerId || `c${Date.now()}`;
      const cleanCust = Object.fromEntries(
        Object.entries(newCust).filter(([_, v]) => v !== undefined && v !== '')
      );

      const customer: Customer = { 
        ...cleanCust, 
        id: customerId,
        createdAt: new Date().toISOString()
      } as Customer;
      
      await setDoc(doc(db, 'customers', customerId), customer);

      if (boilerData) {
        const boilerId = preGeneratedIds?.boilerId || `b${Date.now()}`;
        const cleanBoiler = Object.fromEntries(
          Object.entries(boilerData).filter(([_, v]) => v !== undefined)
        );

        const boiler: Boiler = { 
          ...cleanBoiler, 
          id: boilerId, 
          customerId 
        } as Boiler;
        await setDoc(doc(db, 'boilers', boilerId), boiler);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'customers/boilers');
      throw error;
    }
  };

  const handleUpdateCustomer = async (id: string, customerData: Partial<Customer>) => {
    try {
      const customerRef = doc(db, 'customers', id);
      await updateDoc(customerRef, customerData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'customers');
      throw error;
    }
  };

  const handleAddContact = async (newContact: Omit<Contact, 'id'>) => {
    try {
      const contactId = `con${Date.now()}`;
      const contact: Contact = { 
        ...newContact, 
        id: contactId,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'contacts', contactId), contact);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'contacts');
      throw error;
    }
  };

  const handleUpdateContact = async (id: string, contactData: Partial<Contact>) => {
    try {
      const contactRef = doc(db, 'contacts', id);
      await updateDoc(contactRef, contactData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'contacts');
      throw error;
    }
  };

  const handleAddBoiler = async (selectedCustomerId: string | null, editingBoilerId: string | null, boilerData: Omit<Boiler, 'id' | 'customerId'>, preGeneratedBoilerId?: string) => {
    if (!selectedCustomerId) return;
    
    try {
      if (editingBoilerId) {
        const boilerRef = doc(db, 'boilers', editingBoilerId);
        await updateDoc(boilerRef, { ...boilerData });
      } else {
        const boilerId = preGeneratedBoilerId || `b${Date.now()}`;
        const boiler: Boiler = { 
          ...boilerData, 
          id: boilerId, 
          customerId: selectedCustomerId 
        };
        await setDoc(doc(db, 'boilers', boilerId), boiler);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'boilers');
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    await deleteDoc(doc(db, 'customers', id));
    const customerBoilers = data.boilers.filter(b => b.customerId === id);
    for (const boiler of customerBoilers) {
      await deleteDoc(doc(db, 'boilers', boiler.id));
      const boilerServices = data.services.filter(s => s.boilerId === boiler.id);
      for (const service of boilerServices) {
        await deleteDoc(doc(db, 'services', service.id));
      }
    }
  };

  const deleteBoiler = async (id: string) => {
    await deleteDoc(doc(db, 'boilers', id));
    const boilerServices = data.services.filter(s => s.boilerId === id);
    for (const service of boilerServices) {
      await deleteDoc(doc(db, 'services', service.id));
    }
  };

  const deleteContact = async (id: string) => {
    await deleteDoc(doc(db, 'contacts', id));
  };

  const deleteService = async (id: string) => {
    const serviceToDelete = data.services.find(s => s.id === id);
    if (!serviceToDelete) return;
    
    const boilerId = serviceToDelete.boilerId;

    try {
      await deleteDoc(doc(db, 'services', id));
      
      // Calculate new dates based on remaining services
      const remainingServices = data.services
        .filter(s => s.boilerId === boilerId && s.id !== id)
        .sort((a, b) => b.date.localeCompare(a.date));
        
      const boilerRef = doc(db, 'boilers', boilerId);
      
      if (remainingServices.length > 0) {
        const lastDate = remainingServices[0].date;
        const nextDate = new Date(lastDate);
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        
        await updateDoc(boilerRef, {
          lastServiceDate: lastDate,
          nextServiceDate: nextDate.toISOString().split('T')[0]
        });
      } else {
        await updateDoc(boilerRef, {
          lastServiceDate: null,
          nextServiceDate: null
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'services');
      throw error;
    }
  };

  return {
    data,
    handleServiceSubmit,
    handleAddCustomer,
    handleUpdateCustomer,
    handleAddContact,
    handleUpdateContact,
    handleAddBoiler,
    deleteCustomer,
    deleteBoiler,
    deleteContact,
    deleteService
  };
};
