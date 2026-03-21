/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  getDocFromServer,
  deleteDoc
} from 'firebase/firestore';

// Types
import { Customer, Boiler, ServiceRecord, ServiceStatus, Contact } from './types';

// Components
import { ErrorBoundary, Login, Sidebar, ScannerModal } from './components/Common';
import { Dashboard } from './components/Dashboard';
import { CustomerList } from './components/CustomerList';
import { CustomerDetail } from './components/CustomerDetail';
import { CustomerModal } from './components/CustomerModal';
import { BoilerModal } from './components/BoilerModal';
import { ServiceForm } from './components/ServiceForm';
import { ServiceDetailModal } from './components/ServiceDetailModal';
import { ServicesList } from './components/ServicesList';
import { ContactsList } from './components/ContactsList';
import { ContactModal, DeleteConfirmModal } from './components/Modals';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    customers: [] as Customer[],
    boilers: [] as Boiler[],
    services: [] as ServiceRecord[],
    contacts: [] as Contact[]
  });

  // UI State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isBoilerModalOpen, setIsBoilerModalOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Editing State
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editingBoilerId, setEditingBoilerId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [activeServiceBoilerId, setActiveServiceBoilerId] = useState<string | null>(null);

  // Deletion State
  const [customerToDeleteId, setCustomerToDeleteId] = useState<string | null>(null);
  const [boilerToDeleteId, setBoilerToDeleteId] = useState<string | null>(null);
  const [contactToDeleteId, setContactToDeleteId] = useState<string | null>(null);
  const [serviceToDeleteId, setServiceToDeleteId] = useState<string | null>(null);

  const [newBoilerData, setNewBoilerData] = useState({
    name: 'Hlavný kotol',
    address: '',
    lat: 0,
    lng: 0,
    brand: '',
    model: '',
    serialNumber: '',
    installDate: new Date().toISOString().split('T')[0],
    notes: '',
    photos: {},
    useAsInstallDate: false
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

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

    return () => {
      unsubCustomers();
      unsubBoilers();
      unsubServices();
      unsubContacts();
    };
  }, [user]);

  // Connection Test
  useEffect(() => {
    if (!user) return;
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase configuration error: client is offline.");
        }
      }
    };
    testConnection();
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('dashboard');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setActiveTab('customerDetail');
  };

  const handleAddService = (boilerId: string) => {
    setActiveServiceBoilerId(boilerId);
    setEditingServiceId(null);
    setActiveTab('serviceForm');
  };

  const handleServiceSubmit = async (serviceData: Partial<ServiceRecord>) => {
    if (!activeServiceBoilerId) return;

    try {
      const cleanServiceData = Object.fromEntries(
        Object.entries(serviceData).filter(([_, v]) => v !== undefined)
      );

      if (editingServiceId) {
        const serviceRef = doc(db, 'services', editingServiceId);
        await updateDoc(serviceRef, cleanServiceData);
      } else {
        const serviceId = `s${Date.now()}`;
        const newService: ServiceRecord = {
          id: serviceId,
          boilerId: activeServiceBoilerId,
          date: serviceData.date || new Date().toISOString().split('T')[0],
          taskPerformed: serviceData.taskPerformed || '',
          co2Value: serviceData.co2Value || 0,
          pressureValue: serviceData.pressureValue || 0,
          status: ServiceStatus.COMPLETED,
          ...cleanServiceData
        } as ServiceRecord;

        await setDoc(doc(db, 'services', serviceId), newService);

        // Update boiler's service dates
        const nextDate = new Date(newService.date);
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        
        const boilerRef = doc(db, 'boilers', activeServiceBoilerId);
        const boilerUpdate: any = {
          lastServiceDate: newService.date,
          nextServiceDate: nextDate.toISOString().split('T')[0]
        };

        if ((newService as any).useAsInstallDate) {
          boilerUpdate.installDate = newService.date;
        }

        await updateDoc(boilerRef, boilerUpdate);
      }

      setActiveTab('customerDetail');
      setActiveServiceBoilerId(null);
      setEditingServiceId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'services');
    }
  };

  const handleAddCustomer = async (newCust: Omit<Customer, 'id'>, boilerData?: Omit<Boiler, 'id' | 'customerId'>) => {
    try {
      const customerId = `c${Date.now()}`;
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
        const boilerId = `b${Date.now()}`;
        const cleanBoiler = Object.fromEntries(
          Object.entries(boilerData).filter(([_, v]) => v !== undefined)
        );

        const boiler: Boiler = { 
          ...cleanBoiler, 
          id: boilerId, 
          customerId,
          nextServiceDate: boilerData.installDate ? (() => {
            const d = new Date(boilerData.installDate);
            d.setFullYear(d.getFullYear() + 1);
            return d.toISOString().split('T')[0];
          })() : undefined
        } as Boiler;
        await setDoc(doc(db, 'boilers', boilerId), boiler);
      }

      setIsCustomerModalOpen(false);
      setEditingCustomerId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'customers/boilers');
    }
  };

  const handleUpdateCustomer = async (id: string, customerData: Partial<Customer>) => {
    try {
      const customerRef = doc(db, 'customers', id);
      await updateDoc(customerRef, customerData);
      setIsCustomerModalOpen(false);
      setEditingCustomerId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'customers');
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
      setIsContactModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'contacts');
    }
  };

  const handleUpdateContact = async (id: string, contactData: Partial<Contact>) => {
    try {
      const contactRef = doc(db, 'contacts', id);
      await updateDoc(contactRef, contactData);
      setIsContactModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'contacts');
    }
  };

  const handleAddBoiler = async (boilerData: Omit<Boiler, 'id' | 'customerId'>) => {
    if (!selectedCustomerId) return;
    
    try {
      if (editingBoilerId) {
        const boilerRef = doc(db, 'boilers', editingBoilerId);
        const update: any = { ...boilerData };
        if ((boilerData as any).useAsInstallDate) {
          const nextDate = new Date(boilerData.installDate);
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          update.nextServiceDate = nextDate.toISOString().split('T')[0];
        }
        await updateDoc(boilerRef, update);
      } else {
        const boilerId = `b${Date.now()}`;
        const nextDate = new Date(boilerData.installDate);
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        
        const boiler: Boiler = { 
          ...boilerData, 
          id: boilerId, 
          customerId: selectedCustomerId,
          nextServiceDate: nextDate.toISOString().split('T')[0]
        };
        await setDoc(doc(db, 'boilers', boilerId), boiler);
      }
      
      setIsBoilerModalOpen(false);
      setEditingBoilerId(null);
      setNewBoilerData({
        name: 'Hlavný kotol',
        address: '',
        lat: 0,
        lng: 0,
        brand: '',
        model: '',
        serialNumber: '',
        installDate: new Date().toISOString().split('T')[0],
        notes: '',
        photos: {},
        useAsInstallDate: false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'boilers');
    }
  };

  const confirmDelete = async () => {
    try {
      if (customerToDeleteId) {
        await deleteDoc(doc(db, 'customers', customerToDeleteId));
        const customerBoilers = data.boilers.filter(b => b.customerId === customerToDeleteId);
        for (const boiler of customerBoilers) {
          await deleteDoc(doc(db, 'boilers', boiler.id));
          const boilerServices = data.services.filter(s => s.boilerId === boiler.id);
          for (const service of boilerServices) {
            await deleteDoc(doc(db, 'services', service.id));
          }
        }
        setCustomerToDeleteId(null);
        if (selectedCustomerId === customerToDeleteId) {
          setSelectedCustomerId(null);
          setActiveTab('customers');
        }
      } else if (boilerToDeleteId) {
        await deleteDoc(doc(db, 'boilers', boilerToDeleteId));
        const boilerServices = data.services.filter(s => s.boilerId === boilerToDeleteId);
        for (const service of boilerServices) {
          await deleteDoc(doc(db, 'services', service.id));
        }
        setBoilerToDeleteId(null);
      } else if (contactToDeleteId) {
        await deleteDoc(doc(db, 'contacts', contactToDeleteId));
        setContactToDeleteId(null);
      } else if (serviceToDeleteId) {
        await deleteDoc(doc(db, 'services', serviceToDeleteId));
        setServiceToDeleteId(null);
      }
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'data');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard boilers={data.boilers} customers={data.customers} services={data.services} onSelectCustomer={handleSelectCustomer} />;
      case 'customers':
        return (
          <CustomerList 
            customers={data.customers} 
            boilers={data.boilers}
            onSelectCustomer={handleSelectCustomer} 
            onAddCustomer={() => { setEditingCustomerId(null); setIsCustomerModalOpen(true); }}
            onEditCustomer={(c) => { setEditingCustomerId(c.id); setIsCustomerModalOpen(true); }}
          />
        );
      case 'services':
        return (
          <ServicesList 
            services={data.services} 
            boilers={data.boilers} 
            customers={data.customers}
            onSelectCustomer={handleSelectCustomer}
            onSelectService={setSelectedServiceId}
          />
        );
      case 'contacts':
        return (
          <ContactsList 
            contacts={data.contacts}
            onAddContact={() => { setEditingContactId(null); setIsContactModalOpen(true); }}
            onEditContact={(c) => { setEditingContactId(c.id); setIsContactModalOpen(true); }}
          />
        );
      case 'customerDetail':
        const customer = data.customers.find(c => c.id === selectedCustomerId);
        if (!customer) return null;
        return (
          <CustomerDetail 
            customer={customer} 
            boilers={data.boilers.filter(b => b.customerId === customer.id)} 
            services={data.services} 
            onEditCustomer={(c) => { setEditingCustomerId(c.id); setIsCustomerModalOpen(true); }}
            onAddBoiler={() => { setEditingBoilerId(null); setIsBoilerModalOpen(true); }}
            onEditBoiler={(b) => {
              setEditingBoilerId(b.id);
              setNewBoilerData({
                name: b.name,
                address: b.address,
                lat: b.lat || 0,
                lng: b.lng || 0,
                brand: b.brand,
                model: b.model,
                serialNumber: b.serialNumber,
                installDate: b.installDate,
                notes: b.notes || '',
                photos: b.photos || {},
                useAsInstallDate: false
              });
              setIsBoilerModalOpen(true);
            }}
            onRecordService={handleAddService}
            onViewService={(s) => setSelectedServiceId(s.id)}
            onDeleteBoiler={(id) => { setBoilerToDeleteId(id); setIsDeleteConfirmOpen(true); }}
          />
        );
      case 'serviceForm':
        const boiler = data.boilers.find(b => b.id === activeServiceBoilerId);
        if (!boiler) return null;
        return (
          <ServiceForm 
            boiler={boiler} 
            initialData={editingServiceId ? data.services.find(s => s.id === editingServiceId) : undefined}
            onCancel={() => setActiveTab('customerDetail')}
            onSubmit={handleServiceSubmit}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#3A87AD] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white/50 font-medium">Načítavam aplikáciu SP Therm...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar 
          activeTab={activeTab === 'customerDetail' || activeTab === 'serviceForm' ? 'customers' : activeTab} 
          setActiveTab={setActiveTab} 
          isVisible={true}
        />
        
        <main className="flex-1 p-4 sm:p-6 md:p-10 pb-24 md:pb-10 max-w-5xl mx-auto w-full overflow-y-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedCustomerId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>

          {/* Modals */}
          <CustomerModal 
            isOpen={isCustomerModalOpen}
            onClose={() => { setIsCustomerModalOpen(false); setEditingCustomerId(null); }}
            onAdd={handleAddCustomer}
            onUpdate={handleUpdateCustomer}
            onDelete={(id) => { setCustomerToDeleteId(id); setIsDeleteConfirmOpen(true); }}
            editingCustomer={editingCustomerId ? data.customers.find(c => c.id === editingCustomerId) || null : null}
            customers={data.customers}
            boilers={data.boilers}
            setIsScannerOpen={setIsScannerOpen}
          />

          <BoilerModal 
            isOpen={isBoilerModalOpen}
            onClose={() => { setIsBoilerModalOpen(false); setEditingBoilerId(null); }}
            onAdd={handleAddBoiler}
            onDelete={(id) => { setBoilerToDeleteId(id); setIsDeleteConfirmOpen(true); }}
            editingBoilerId={editingBoilerId}
            newBoilerData={newBoilerData}
            setNewBoilerData={setNewBoilerData}
            existingBoilers={data.boilers}
            setIsScannerOpen={setIsScannerOpen}
          />

          <ServiceDetailModal 
            isOpen={!!selectedServiceId}
            onClose={() => setSelectedServiceId(null)}
            service={selectedServiceId ? data.services.find(s => s.id === selectedServiceId) || null : null}
            boiler={selectedServiceId ? data.boilers.find(b => b.id === data.services.find(s => s.id === selectedServiceId)?.boilerId) || null : null}
            onDelete={(id) => { setServiceToDeleteId(id); setIsDeleteConfirmOpen(true); }}
          />

          <ContactModal 
            isOpen={isContactModalOpen}
            onClose={() => { setIsContactModalOpen(false); setEditingContactId(null); }}
            onAdd={handleAddContact}
            onUpdate={handleUpdateContact}
            onDelete={(id) => { setContactToDeleteId(id); setIsDeleteConfirmOpen(true); }}
            editingContact={editingContactId ? data.contacts.find(c => c.id === editingContactId) || null : null}
          />

          <DeleteConfirmModal 
            isOpen={isDeleteConfirmOpen}
            onClose={() => setIsDeleteConfirmOpen(false)}
            onConfirm={confirmDelete}
            title={customerToDeleteId ? "Odstrániť zákazníka" : boilerToDeleteId ? "Odstrániť zariadenie" : serviceToDeleteId ? "Odstrániť záznam" : "Odstrániť kontakt"}
            message="Naozaj chcete odstrániť túto položku? Táto akcia je nevratná."
          />

          {isScannerOpen && (
            <ScannerModal 
              onScan={(text) => {
                setNewBoilerData(prev => ({ ...prev, serialNumber: text }));
                setIsScannerOpen(false);
              }}
              onClose={() => setIsScannerOpen(false)}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
