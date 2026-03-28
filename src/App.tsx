/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, Component, lazy, Suspense } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ArrowLeft,
  Camera,
  PenTool,
  Wrench,
  History,
  Info,
  Map as MapIcon,
  PieChart as PieChartIcon,
  TrendingUp,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  X,
  Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import SignatureCanvas from 'react-signature-canvas';
import { generateServicePDF } from './utils/pdf';
import { MeasurementHistory } from './components/MeasurementHistory';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { Login } from './components/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ContactModal } from './components/ContactModal';
import { ScannerModal } from './components/ScannerModal';
import { Sidebar } from './components/Sidebar';
import { AddressSearch } from './components/AddressSearch';
import { MapBounds } from './components/MapBounds';
import { ContactsList } from './components/ContactsList';
import { BoilerDetailModal } from './components/BoilerDetailModal';
import { ServicesList } from './components/ServicesList';
import { CustomerList } from './components/CustomerList';
import { CustomerModal } from './components/CustomerModal';
import { ServiceDetailModal } from './components/ServiceDetailModal';
import { BoilerFormFields } from './components/BoilerFormFields';
import { BG_URL } from './config/constants';

// Fix for default marker icons in Leaflet with Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;
import Tesseract from 'tesseract.js';
import { 
  auth, 
  db, 
  storage,
  handleFirestoreError, 
  OperationType,
  uploadFile
} from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut
} from 'firebase/auth';
import { 
  doc, 
  getDocFromServer,
  onSnapshot,
  collection
} from 'firebase/firestore';
import { useAppData } from './hooks/useAppData';
import { 
  ref, 
  getDownloadURL,
  uploadBytes
} from 'firebase/storage';
import { Html5Qrcode } from 'html5-qrcode';
import { AppState, Customer, Boiler, ServiceRecord, ServiceStatus, Contact } from './types';
import { Settings } from './components/Settings';

// --- Helper Functions ---

const removeDiacritics = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const trimCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const l = pixels.data.length;
  const bound = {
    top: null as number | null,
    left: null as number | null,
    right: null as number | null,
    bottom: null as number | null
  };
  let i, x, y;

  for (i = 0; i < l; i += 4) {
    if (pixels.data[i + 3] !== 0) {
      x = (i / 4) % canvas.width;
      y = Math.floor((i / 4) / canvas.width);

      if (bound.top === null) bound.top = y;
      if (bound.left === null) bound.left = x;
      else if (x < bound.left) bound.left = x;
      if (bound.right === null) bound.right = x;
      else if (bound.right < x) bound.right = x;
      if (bound.bottom === null || bound.bottom < y) bound.bottom = y;
    }
  }

  if (bound.top === null) return canvas;

  const trimHeight = bound.bottom! - bound.top! + 1;
  const trimWidth = bound.right! - bound.left! + 1;
  const trimmed = ctx.getImageData(bound.left!, bound.top!, trimWidth, trimHeight);

  const copy = document.createElement('canvas');
  copy.width = trimWidth;
  copy.height = trimHeight;
  const copyCtx = copy.getContext('2d');
  if (copyCtx) copyCtx.putImageData(trimmed, 0, 0);

  return copy;
};

// --- Error Boundary ---





// Fix for Leaflet default icon
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Components ---

const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const CustomerDetail = lazy(() => import('./components/CustomerDetail').then(m => ({ default: m.CustomerDetail })));
const ServiceForm = lazy(() => import('./components/ServiceForm').then(m => ({ default: m.ServiceForm })));
const NewBookings = lazy(() => import('./components/NewBookings').then(m => ({ default: m.NewBookings })));

// --- Main App ---
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user, loading } = useAuth();
  const { 
    data, 
    handleServiceSubmit: _handleServiceSubmit,
    handleAddCustomer: _handleAddCustomer,
    handleUpdateCustomer: _handleUpdateCustomer,
    handleAddContact: _handleAddContact,
    handleUpdateContact: _handleUpdateContact,
    handleAddBoiler: _handleAddBoiler,
    deleteCustomer,
    deleteBoiler,
    deleteContact,
    deleteService
  } = useAppData(user);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeServiceBoilerId, setActiveServiceBoilerId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [editingBoilerId, setEditingBoilerId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDeleteId, setCustomerToDeleteId] = useState<string | null>(null);
  const [boilerToDeleteId, setBoilerToDeleteId] = useState<string | null>(null);
  const [contactToDeleteId, setContactToDeleteId] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [serviceToDeleteId, setServiceToDeleteId] = useState<string | null>(null);
  const [selectedBoilerId, setSelectedBoilerId] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const lastScrollY = useRef(0);

  const [isOnline, setIsOnline] = useState(
    navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Scroll to hide sidebar logic
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsSidebarVisible(false);
      } else {
        setIsSidebarVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [isBoilerModalOpen, setIsBoilerModalOpen] = useState(false);

  const newBoilerId = useMemo(() => {
    if (isBoilerModalOpen && !editingBoilerId) {
      return doc(collection(db, 'boilers')).id;
    }
    return '';
  }, [isBoilerModalOpen, editingBoilerId]);

  const shouldShowSidebar = isSidebarVisible && !isCustomerModalOpen && !isBoilerModalOpen && !isDeleteConfirmOpen;
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
    photos: {}
  });

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

  // Load Background Settings
  useEffect(() => {
    if (!user) return;
    
    const unsub = onSnapshot(doc(db, 'appConfig', 'appearance'), (doc) => {
      if (doc.exists()) {
        setBackgroundUrl(doc.data().backgroundUrl);
      }
    });

    return () => unsub();
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

  const handleEditService = (serviceId: string) => {
    const service = data.services.find(s => s.id === serviceId);
    if (service) {
      setActiveServiceBoilerId(service.boilerId);
      setEditingServiceId(serviceId);
      setActiveTab('serviceForm');
    }
  };

  const handleServiceSubmit = async (serviceData: Partial<ServiceRecord>) => {
    try {
      await _handleServiceSubmit(activeServiceBoilerId, editingServiceId, serviceData);
      setActiveTab('customerDetail');
      setActiveServiceBoilerId(null);
      setEditingServiceId(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleAddCustomer = async (newCust: Omit<Customer, 'id'>, boilerData?: Omit<Boiler, 'id' | 'customerId'>, preGeneratedIds?: { customerId?: string, boilerId?: string }) => {
    try {
      await _handleAddCustomer(newCust, boilerData, preGeneratedIds);
      setIsCustomerModalOpen(false);
      setEditingCustomerId(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleUpdateCustomer = async (id: string, customerData: Partial<Customer>) => {
    try {
      await _handleUpdateCustomer(id, customerData);
      setIsCustomerModalOpen(false);
      setEditingCustomerId(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setCustomerToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleAddContact = async (newContact: Omit<Contact, 'id'>) => {
    try {
      await _handleAddContact(newContact);
      setIsContactModalOpen(false);
      setEditingContactId(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleUpdateContact = async (id: string, contactData: Partial<Contact>) => {
    try {
      await _handleUpdateContact(id, contactData);
      setIsContactModalOpen(false);
      setEditingContactId(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteContact = async (id: string) => {
    setContactToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteBoiler = async (id: string) => {
    setBoilerToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (customerToDeleteId) {
        const id = customerToDeleteId;
        setCustomerToDeleteId(null);
        setIsCustomerModalOpen(false);
        setEditingCustomerId(null);
        setIsDeleteConfirmOpen(false);
        
        await deleteCustomer(id);
        
        if (selectedCustomerId === id) {
          setSelectedCustomerId(null);
          setActiveTab('customers');
        }
      } else if (boilerToDeleteId) {
        const id = boilerToDeleteId;
        setBoilerToDeleteId(null);
        setIsBoilerModalOpen(false);
        setEditingBoilerId(null);
        setIsDeleteConfirmOpen(false);

        await deleteBoiler(id);
      } else if (contactToDeleteId) {
        const id = contactToDeleteId;
        setContactToDeleteId(null);
        setIsContactModalOpen(false);
        setEditingContactId(null);
        setIsDeleteConfirmOpen(false);

        await deleteContact(id);
      } else if (serviceToDeleteId) {
        const id = serviceToDeleteId;
        setServiceToDeleteId(null);
        setSelectedServiceId(null);
        setIsDeleteConfirmOpen(false);

        await deleteService(id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'data');
    }
  };

  const handleAddBoiler = async (boilerData: Omit<Boiler, 'id' | 'customerId'>) => {
    try {
      await _handleAddBoiler(selectedCustomerId, editingBoilerId, boilerData, newBoilerId);
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
        photos: {}
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEditBoiler = (boilerId: string) => {
    const boiler = data.boilers.find(b => b.id === boilerId);
    if (boiler) {
      setEditingBoilerId(boilerId);
      setNewBoilerData({
        name: boiler.name,
        address: boiler.address,
        lat: boiler.lat || 0,
        lng: boiler.lng || 0,
        brand: boiler.brand,
        model: boiler.model,
        serialNumber: boiler.serialNumber,
        installDate: boiler.installDate,
        notes: boiler.notes || '',
        photos: boiler.photos || {}
      });
      setIsBoilerModalOpen(true);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            boilers={data.boilers} 
            customers={data.customers} 
            services={data.services}
            onSelectCustomer={handleSelectCustomer} 
          />
        );
      case 'bookings':
        return <NewBookings />;
      case 'customers':
        return (
          <CustomerList 
            customers={data.customers} 
            boilers={data.boilers}
            onSelectCustomer={handleSelectCustomer} 
            onAddCustomer={() => {
              setEditingCustomerId(null);
              setIsCustomerModalOpen(true);
            }}
            onEditCustomer={(c) => {
              setEditingCustomerId(c.id);
              setIsCustomerModalOpen(true);
            }}
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
            onAddContact={() => {
              setEditingContactId(null);
              setIsContactModalOpen(true);
            }}
            onEditContact={(c) => {
              setEditingContactId(c.id);
              setIsContactModalOpen(true);
            }}
          />
        );
      case 'customerDetail':
        const customer = data.customers.find(c => c.id === selectedCustomerId);
        if (!customer) return null;
        return (
          <CustomerDetail 
            customer={customer} 
            boilers={data.boilers} 
            services={data.services} 
            onBack={() => setActiveTab('customers')}
            onAddService={handleAddService}
            onAddBoiler={() => { setEditingBoilerId(null); setIsBoilerModalOpen(true); }}
            onEditBoiler={handleEditBoiler}
            onEditCustomer={(c) => {
              setEditingCustomerId(c.id);
              setIsCustomerModalOpen(true);
            }}
            onSelectService={setSelectedServiceId}
            setSelectedBoilerId={setSelectedBoilerId}
          />
        );
      case 'serviceForm':
        const boilerForService = data.boilers.find(b => b.id === activeServiceBoilerId);
        if (!boilerForService) return null;
        const initialServiceData = editingServiceId ? data.services.find(s => s.id === editingServiceId) : undefined;
        return (
          <ServiceForm 
            boiler={boilerForService} 
            initialData={initialServiceData}
            onCancel={() => setActiveTab('customerDetail')}
            onSubmit={handleServiceSubmit}
          />
        );
      case 'settings':
        return (
          <Settings 
            onBackgroundUpdate={(url) => setBackgroundUrl(url)}
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

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary>
      <div 
        className="min-h-screen flex flex-col bg-[#0A0A0A] relative overflow-hidden w-full"
        style={{
          backgroundImage: `url(${backgroundUrl || BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 
            bg-yellow-600/90 text-white text-center 
            text-xs py-1 z-[200]">
            Offline režim — dáta sa synchronizujú 
            po obnovení spojenia
          </div>
        )}

        <Sidebar 
          activeTab={activeTab === 'customerDetail' || activeTab === 'serviceForm' ? 'customers' : activeTab} 
          setActiveTab={setActiveTab} 
          isVisible={shouldShowSidebar}
        />
        
        <main className="flex-1 p-4 sm:p-6 pb-24 max-w-5xl mx-auto w-full overflow-y-auto relative z-10">
          <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (selectedCustomerId || '') + (activeServiceBoilerId || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-white/50 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#3A87AD] border-t-transparent rounded-full animate-spin"></div>
                  Načítavam...
                </div>
              </div>
            }>
              {renderContent()}
            </Suspense>
          </motion.div>
        </AnimatePresence>

        {/* Boiler Modal */}
        {isBoilerModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="card w-full max-w-2xl p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#3A87AD]">
                  {editingBoilerId ? 'Upraviť zariadenie' : 'Pridať nové zariadenie'}
                </h2>
                {editingBoilerId && (
                  <button 
                    type="button"
                    onClick={() => handleDeleteBoiler(editingBoilerId)}
                    className="p-2 text-white hover:bg-red-500 rounded-xl transition-all shadow-lg"
                    title="Vymazať zariadenie"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleAddBoiler(newBoilerData); }} className="space-y-4">
                <BoilerFormFields 
                  boilerData={newBoilerData} 
                  setBoilerData={setNewBoilerData} 
                  existingBoilers={data.boilers} 
                  setIsScannerOpen={setIsScannerOpen}
                  customerId={selectedCustomerId || ''}
                  boilerId={editingBoilerId || newBoilerId}
                />
                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button type="button" onClick={() => { setIsBoilerModalOpen(false); setEditingBoilerId(null); }} className="btn-secondary flex-1 justify-center">Zrušiť</button>
                  <button type="submit" className="btn-primary flex-1 justify-center">Uložiť zariadenie</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Scanner Modal */}
        {isScannerOpen && (
          <ScannerModal 
            onScan={(text) => {
              setNewBoilerData(prev => ({ ...prev, serialNumber: text }));
              setIsScannerOpen(false);
            }}
            onClose={() => setIsScannerOpen(false)}
          />
        )}

        {/* Boiler Detail Modal */}
        {selectedBoilerId && (
          <BoilerDetailModal 
            boiler={data.boilers.find(b => b.id === selectedBoilerId)!}
            services={data.services}
            onClose={() => setSelectedBoilerId(null)}
            onSelectService={setSelectedServiceId}
          />
        )}

        {/* Service Detail Modal */}
        {selectedServiceId && (
          <ServiceDetailModal 
            service={data.services.find(s => s.id === selectedServiceId)!}
            boiler={data.boilers.find(b => b.id === data.services.find(s => s.id === selectedServiceId)?.boilerId)!}
            customer={data.customers.find(c => c.id === data.boilers.find(b => b.id === data.services.find(s => s.id === selectedServiceId)?.boilerId)?.customerId)!}
            onClose={() => setSelectedServiceId(null)}
            onEdit={() => {
              handleEditService(selectedServiceId);
              setSelectedServiceId(null);
            }}
            onDelete={(id) => {
              setServiceToDeleteId(id);
              setIsDeleteConfirmOpen(true);
            }}
          />
        )}

        {/* Customer Modal */}
        <CustomerModal 
          isOpen={isCustomerModalOpen}
          onClose={() => {
            setIsCustomerModalOpen(false);
            setEditingCustomerId(null);
          }}
          onAdd={handleAddCustomer}
          onUpdate={handleUpdateCustomer}
          onDelete={handleDeleteCustomer}
          editingCustomer={editingCustomerId ? data.customers.find(c => c.id === editingCustomerId) || null : null}
          customers={data.customers}
          boilers={data.boilers}
          setIsScannerOpen={setIsScannerOpen}
        />

        {/* Contact Modal */}
        <ContactModal 
          isOpen={isContactModalOpen}
          onClose={() => {
            setIsContactModalOpen(false);
            setEditingContactId(null);
          }}
          onAdd={handleAddContact}
          onUpdate={handleUpdateContact}
          onDelete={handleDeleteContact}
          editingContact={editingContactId ? data.contacts.find(c => c.id === editingContactId) || null : null}
          contacts={data.contacts}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal 
          isOpen={isDeleteConfirmOpen}
          onClose={() => {
            setIsDeleteConfirmOpen(false);
            setCustomerToDeleteId(null);
            setBoilerToDeleteId(null);
            setContactToDeleteId(null);
            setServiceToDeleteId(null);
          }}
          onConfirm={confirmDelete}
          title={customerToDeleteId ? "Odstrániť zákazníka" : boilerToDeleteId ? "Odstrániť zariadenie" : serviceToDeleteId ? "Odstrániť záznam" : "Odstrániť kontakt"}
          message={customerToDeleteId 
            ? "Naozaj chcete odstrániť tohto zákazníka? Táto akcia odstráni aj všetky jeho zariadenia a servisné záznamy a je nevratná." 
            : boilerToDeleteId 
            ? "Naozaj chcete odstrániť toto zariadenie? Táto akcia odstráni aj všetky jeho servisné záznamy a je nevratná."
            : serviceToDeleteId
            ? "Naozaj chcete odstrániť tento servisný záznam? Táto akcia je nevratná."
            : "Naozaj chcete odstrániť tento kontakt? Táto akcia je nevratná."}
        />
      </main>
    </div>
    </ErrorBoundary>
  );
}
