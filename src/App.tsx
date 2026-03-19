/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, Component } from 'react';
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
  TrendingUp
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
  Area
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import SignatureCanvas from 'react-signature-canvas';

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
import { 
  auth, 
  db, 
  storage,
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
  Timestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { Customer, Boiler, ServiceRecord, ServiceStatus } from './types';

// --- Error Boundary ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Vyskytla sa neočakávaná chyba.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        errorMessage = `Chyba Firestore (${parsedError.operationType}): ${parsedError.error}`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="card max-w-md w-full p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Ups! Niečo sa pokazilo</h2>
            <p className="text-slate-600">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary w-full justify-center"
            >
              Obnoviť stránku
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Login Component ---

const Login = ({ onLogin }: { onLogin: () => void }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card max-w-md w-full p-8 text-center space-y-8"
      >
        <div className="space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-200">
            <Wrench size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-900 pt-4">Servis Plyn</h1>
          <p className="text-slate-500">Prihláste sa pre prístup k správe zákazníkov a servisných záznamov.</p>
        </div>

        <button 
          onClick={onLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Prihlásiť sa cez Google
        </button>

        <p className="text-xs text-slate-400">
          Všetky dáta sú synchronizované v reálnom čase pre váš tím.
        </p>
      </motion.div>
    </div>
  );
};

// Fix for Leaflet default icon
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Prehľad', icon: LayoutDashboard },
    { id: 'customers', label: 'Zákazníci', icon: Users },
    { id: 'services', label: 'Zásahy', icon: History },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center md:relative md:w-64 md:h-screen md:flex-col md:justify-start md:border-t-0 md:border-r md:pt-8 md:gap-2 z-[1001]">
      <div className="hidden md:flex items-center gap-3 px-4 mb-8 w-full">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
          <Wrench size={24} />
        </div>
        <span className="font-bold text-xl tracking-tight text-blue-900">Servis Plyn</span>
      </div>
      
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-4 py-2 md:w-full rounded-xl transition-all ${
            activeTab === item.id 
              ? 'text-blue-600 md:bg-blue-50' 
              : 'text-slate-400 hover:text-slate-600 md:hover:bg-slate-50'
          }`}
        >
          <item.icon size={24} />
          <span className="text-[10px] md:text-sm font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

const Dashboard = ({ 
  boilers, 
  customers, 
  services,
  onSelectCustomer 
}: { 
  boilers: Boiler[], 
  customers: Customer[], 
  services: ServiceRecord[],
  onSelectCustomer: (id: string) => void 
}) => {
  const today = new Date();
  
  const overdueBoilers = useMemo(() => {
    return boilers.filter(b => {
      if (!b.nextServiceDate) return false;
      return new Date(b.nextServiceDate) < today;
    });
  }, [boilers, today]);

  const upcomingBoilers = useMemo(() => {
    return boilers.filter(b => {
      if (!b.nextServiceDate) return false;
      const nextDate = new Date(b.nextServiceDate);
      const diffMonths = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return nextDate >= today && diffMonths <= 1;
    });
  }, [boilers, today]);

  const onTimeBoilers = useMemo(() => {
    return boilers.filter(b => {
      if (!b.nextServiceDate) return false;
      const nextDate = new Date(b.nextServiceDate);
      const diffMonths = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return nextDate > today && diffMonths > 1;
    });
  }, [boilers, today]);

  const brandData = useMemo(() => {
    const counts: Record<string, number> = {};
    boilers.forEach(b => {
      counts[b.brand] = (counts[b.brand] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: `${name} (${value})`, value, originalName: name }));
  }, [boilers]);

  const serviceTypeData = useMemo(() => {
    const counts: Record<string, number> = {
      'Ročná prehliadka': 0,
      'Porucha': 0,
      'Iné': 0,
      'Inštalácia': 0
    };
    services.forEach(s => {
      if (counts[s.taskPerformed] !== undefined) {
        counts[s.taskPerformed]++;
      } else {
        counts['Iné']++;
      }
    });
    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [services]);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dobrý deň!</h1>
          <p className="text-slate-500">Tu je prehľad dnešných úloh.</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Dnes</p>
          <p className="text-lg font-bold text-slate-700">{today.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </header>

      {/* Small cards at the top */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 border-l-4 border-l-red-500">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Po termíne</span>
            <span className="text-xl font-bold text-red-600">{overdueBoilers.length}</span>
          </div>
        </div>
        
        <div className="card p-3 border-l-4 border-l-blue-500">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Blížiace sa</span>
            <span className="text-xl font-bold text-blue-600">{upcomingBoilers.length}</span>
          </div>
        </div>

        <div className="card p-3 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase">V termíne</span>
            <span className="text-xl font-bold text-emerald-600">{onTimeBoilers.length}</span>
          </div>
        </div>
      </div>

      {/* Critical Inspections */}
      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <AlertCircle size={20} className="text-red-500" />
          Kritické prehliadky
        </h2>
        <div className="space-y-3">
          {overdueBoilers.length > 0 ? (
            overdueBoilers.map(boiler => {
              const customer = customers.find(c => c.id === boiler.customerId);
              return (
                <div 
                  key={boiler.id} 
                  onClick={() => onSelectCustomer(boiler.customerId)}
                  className="card p-4 flex items-center justify-between hover:border-red-200 hover:bg-red-50/30 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">
                      {customer?.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{customer?.name}</h3>
                      <p className="text-sm text-slate-500">{boiler.brand} {boiler.model} • {boiler.address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-red-600 uppercase">Termín uplynul</p>
                    <p className="text-sm font-medium text-slate-600">{new Date(boiler.nextServiceDate!).toLocaleDateString('sk-SK')}</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-red-400 ml-4" />
                </div>
              );
            })
          ) : (
            <div className="card p-8 text-center text-slate-400 italic">
              Žiadne prehliadky po termíne. Skvelá práca!
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Distribution */}
        <div className="card p-6 relative">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PieChartIcon size={20} className="text-blue-500" />
              Zastúpenie značiek
            </h2>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Celkom kotlov</p>
              <p className="text-xl font-bold text-blue-600">{boilers.length}</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={brandData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {brandData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => [value, name.split(' (')[0]]}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Type Distribution */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <History size={20} className="text-blue-500" />
            Typy zásahov (%)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {serviceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Map moved to bottom */}
      <div className="card p-0 overflow-hidden min-h-[350px]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MapIcon size={20} className="text-blue-500" />
            Mapa inštalácií
          </h2>
        </div>
        <div className="h-[350px] w-full relative z-0">
          <MapContainer center={[48.6690, 19.6990]} zoom={7} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {boilers.filter(b => b.lat && b.lng).map(boiler => (
              <Marker key={boiler.id} position={[boiler.lat!, boiler.lng!]}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-slate-900 mb-1">{boiler.name}</p>
                    <p className="text-xs text-slate-500 mb-2">{boiler.address}</p>
                    <button 
                      onClick={() => onSelectCustomer(boiler.customerId)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Zobraziť zákazníka
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

const AddressSearch = ({ value, onChange, onSelect }: { value: string, onChange: (v: string) => void, onSelect: (addr: string, lat: number, lng: number) => void }) => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ignoreNext, setIgnoreNext] = useState(false);

  useEffect(() => {
    if (value.length < 3 || ignoreNext) {
      setResults([]);
      if (ignoreNext) setIgnoreNext(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&countrycodes=sk`);
        const data = await res.json();
        setResults(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative">
      <input 
        type="text" 
        className="input-field" 
        placeholder="Zadajte adresu (napr. Lipová 20, Lab)..."
        value={value}
        onChange={(e) => {
          setIgnoreNext(false);
          onChange(e.target.value);
        }}
        onBlur={() => setTimeout(() => setResults([]), 200)}
      />
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[110] max-h-[200px] overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0"
              onClick={() => {
                setIgnoreNext(true);
                onSelect(r.display_name, parseFloat(r.lat), parseFloat(r.lon));
                setResults([]);
              }}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const BoilerFormFields = ({ 
  boilerData, 
  setBoilerData, 
  existingBoilers 
}: { 
  boilerData: any, 
  setBoilerData: any, 
  existingBoilers: Boiler[] 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoType, setActivePhotoType] = useState<string | null>(null);

  const brands = useMemo(() => Array.from(new Set(existingBoilers.map(b => b.brand))), [existingBoilers]);
  const modelsForBrand = useMemo(() => {
    if (!boilerData.brand) return [];
    return Array.from(new Set(existingBoilers.filter(b => b.brand === boilerData.brand).map(b => b.model)));
  }, [boilerData.brand, existingBoilers]);

  const handlePhotoClick = (type: string) => {
    setActivePhotoType(type);
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activePhotoType) {
      try {
        const storageRef = ref(storage, `boilers/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        setBoilerData({
          ...boilerData,
          photos: { ...boilerData.photos, [activePhotoType]: downloadURL }
        });
      } catch (error) {
        console.error("Upload failed", error);
      }
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-slate-100">
      <h3 className="font-bold text-blue-600 flex items-center gap-2">
        <Wrench size={18} /> Údaje o zariadení
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">Meno zariadenia</label>
          <input 
            type="text" 
            className="input-field" 
            value={boilerData.name}
            onChange={e => setBoilerData({...boilerData, name: e.target.value})}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">Adresa inštalácie</label>
          <AddressSearch 
            value={boilerData.address} 
            onChange={v => setBoilerData({...boilerData, address: v})}
            onSelect={(addr, lat, lng) => setBoilerData({...boilerData, address: addr, lat, lng})}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1 relative">
          <label className="text-sm font-bold text-slate-700">Značka</label>
          <input 
            type="text" 
            className="input-field" 
            list="brands-list"
            value={boilerData.brand}
            onChange={e => setBoilerData({...boilerData, brand: e.target.value})}
          />
          <datalist id="brands-list">
            {brands.map(b => <option key={b} value={b} />)}
          </datalist>
        </div>
        <div className="space-y-1 relative">
          <label className="text-sm font-bold text-slate-700">Model</label>
          <input 
            type="text" 
            className="input-field" 
            list="models-list"
            value={boilerData.model}
            onChange={e => setBoilerData({...boilerData, model: e.target.value})}
          />
          <datalist id="models-list">
            {modelsForBrand.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">Sériové číslo</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="input-field" 
              value={boilerData.serialNumber}
              onChange={e => setBoilerData({...boilerData, serialNumber: e.target.value})}
            />
            <button type="button" className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 text-slate-600" title="Skenovať">
              <Camera size={20} />
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">Dátum montáže</label>
          <input 
            type="date" 
            className="input-field" 
            value={boilerData.installDate}
            onChange={e => setBoilerData({...boilerData, installDate: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={onFileChange}
        />
        {['overall', 'connection', 'chimney'].map(type => (
          <div key={type} className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              {type === 'overall' ? 'Celkové' : type === 'connection' ? 'Napojenie' : 'Komín'}
            </label>
            <button 
              type="button"
              onClick={() => handlePhotoClick(type)}
              className="w-full aspect-square bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden"
            >
              {boilerData.photos?.[type] ? (
                <img src={boilerData.photos[type]} className="w-full h-full object-cover" />
              ) : (
                <Camera size={20} className="text-slate-300" />
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-bold text-slate-700">Poznámka k zariadeniu</label>
        <textarea 
          className="input-field min-h-[60px]" 
          value={boilerData.notes}
          onChange={e => setBoilerData({...boilerData, notes: e.target.value})}
        />
      </div>
    </div>
  );
};

const CustomerList = ({ 
  customers, 
  boilers,
  onSelectCustomer,
  onAddCustomer
}: { 
  customers: Customer[], 
  boilers: Boiler[],
  onSelectCustomer: (id: string) => void,
  onAddCustomer: (customer: Omit<Customer, 'id'>, boiler?: Omit<Boiler, 'id' | 'customerId'>) => void
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', company: '', phone: '', email: '', notes: '' });
  const [addBoiler, setAddBoiler] = useState(true);
  const [newBoiler, setNewBoiler] = useState({
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

  useEffect(() => {
    if (isModalOpen && modalRef.current) {
      modalRef.current.scrollTop = 0;
    }
  }, [isModalOpen]);

  const filteredCustomers = customers.filter(c => {
    const searchLower = search.toLowerCase();
    const customerBoilers = boilers.filter(b => b.customerId === c.id);
    const hasMatchingBoilerBrand = customerBoilers.some(b => b.brand.toLowerCase().includes(searchLower));
    
    return c.name.toLowerCase().includes(searchLower) || 
      c.phone.includes(search) ||
      (c.company && c.company.toLowerCase().includes(searchLower)) ||
      hasMatchingBoilerBrand;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCustomer(newCustomer, addBoiler ? newBoiler : undefined);
    setIsModalOpen(false);
    setNewCustomer({ name: '', company: '', phone: '', email: '', notes: '' });
    setNewBoiler({
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
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Zákazníci</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={20} />
          <span className="hidden sm:inline">Nový zákazník</span>
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Hľadať..." 
          className="input-field pl-14"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredCustomers.map(customer => {
          const customerBoilers = boilers.filter(b => b.customerId === customer.id);
          const mainBoiler = customerBoilers.find(b => b.name === 'Hlavný kotol') || customerBoilers[0];
          
          return (
            <div 
              key={customer.id} 
              onClick={() => onSelectCustomer(customer.id)}
              className="card p-4 flex items-center justify-between hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 leading-tight">{customer.name}</h3>
                    {mainBoiler && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-bold uppercase">{mainBoiler.brand}</span>}
                  </div>
                  {customer.company && <p className="text-xs text-slate-400 mt-0.5">{customer.company}</p>}
                  
                  <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Phone size={14} /> {customer.phone}</span>
                    <div className="flex gap-1">
                      {customerBoilers.map(b => {
                        const isOverdue = b.nextServiceDate && new Date(b.nextServiceDate) < new Date();
                        return (
                          <span 
                            key={b.id} 
                            title={isOverdue ? `Kotol ${b.name} - Po termíne` : `Kotol ${b.name} - V poriadku`}
                          >
                            <CheckCircle2 
                              size={14} 
                              className={isOverdue ? 'text-red-500' : 'text-emerald-500'} 
                            />
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-400" />
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div ref={modalRef} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="card w-full max-w-2xl p-6 space-y-6"
          >
            <h2 className="text-xl font-bold text-slate-900">Nový zákazník</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Meno a priezvisko</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Firma</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={newCustomer.company}
                    onChange={e => setNewCustomer({...newCustomer, company: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Telefón</label>
                  <input 
                    required
                    type="tel" 
                    className="input-field" 
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Email</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    value={newCustomer.email}
                    onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Poznámka</label>
                <textarea 
                  className="input-field min-h-[60px]" 
                  value={newCustomer.notes}
                  onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  id="add-boiler" 
                  checked={addBoiler} 
                  onChange={e => setAddBoiler(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="add-boiler" className="text-sm font-bold text-slate-700 cursor-pointer">Pridať prvé zariadenie</label>
              </div>

              {addBoiler && (
                <BoilerFormFields 
                  boilerData={newBoiler} 
                  setBoilerData={setNewBoiler} 
                  existingBoilers={boilers} 
                />
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1 justify-center">Zrušiť</button>
                <button type="submit" className="btn-primary flex-1 justify-center">Uložiť zákazníka</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const ServiceDetailModal = ({ 
  service, 
  boiler, 
  onClose,
  onEdit
}: { 
  service: ServiceRecord, 
  boiler: Boiler, 
  onClose: () => void,
  onEdit: () => void
}) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="card w-full max-w-2xl p-0 overflow-hidden"
      >
        <div className="bg-blue-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Detail zásahu</p>
              <h2 className="text-2xl font-bold">{service.taskPerformed}</h2>
              <p className="text-blue-100 text-sm mt-1">
                {new Date(service.date).toLocaleDateString('sk-SK')} • {boiler.brand} {boiler.model}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <ArrowLeft size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">CO2 Hodnota</p>
              <p className="text-lg font-bold text-slate-700">{service.co2Value}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tlak</p>
              <p className="text-lg font-bold text-slate-700">{service.pressureValue} bar</p>
            </div>
          </div>

          {service.taskPerformed === 'Ročná prehliadka' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Analýza spalín a tlaky</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'CO2 Max', val: service.co2Max, unit: '%' },
                    { label: 'CO2 Min', val: service.co2Min, unit: '%' },
                    { label: 'O2 Max', val: service.o2Max, unit: '%' },
                    { label: 'O2 Min', val: service.o2Min, unit: '%' },
                    { label: 'Účinnosť', val: service.efficiency, unit: '%' },
                    { label: 'Tlak plynu', val: service.gasPressure, unit: ' mbar' },
                    { label: 'Tlak exp. ÚK', val: service.expansionTankPressureCH, unit: ' bar' },
                    { label: 'Tlak exp. TÚV', val: service.expansionTankPressureDHW, unit: ' bar', show: service.hasDHWExpansionTank },
                  ].map(item => (item.show !== false && (
                    <div key={item.label}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</p>
                      <p className="text-sm font-bold text-slate-700">{item.val ?? '-'}{item.unit}</p>
                    </div>
                  )))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chemické hodnoty ÚK</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Konduktivita', val: service.conductivity, unit: ' mS/cm' },
                    { label: 'PH ÚK', val: service.phCH, unit: '' },
                    { label: 'Tvrdosť ÚK', val: service.hardnessCH, unit: ' °dH' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</p>
                      <p className="text-sm font-bold text-slate-700">{item.val ?? '-'}{item.unit}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kontrolný zoznam</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    { key: 'burnerCheck', label: 'Kontrola horáka' },
                    { key: 'combustionChamberCleaning', label: 'Čistenie spaľovacej komory' },
                    { key: 'electrodesCheck', label: 'Kontrola elektród' },
                    { key: 'exchangerCheck', label: 'Kontrola výmenníka' },
                    { key: 'fanCheck', label: 'Kontrola ventilátora' },
                    { key: 'filtersCleaning', label: 'Čistenie filtrov' },
                    { key: 'siphonCleaning', label: 'Čistenie sifónu' },
                    { key: 'gasCircuitTightness', label: 'Tesnosť plynového okruhu' },
                    { key: 'flueGasOutletTightness', label: 'Tesnosť odvodu spalín' },
                    { key: 'pumpCheck', label: 'Kontrola čerpadla' },
                    { key: 'threeWayValveCheck', label: 'Kontrola 3-cestného ventilu' },
                    { key: 'airSupplyVentilation', label: 'Prívod vzduchu a vetranie' },
                    { key: 'emergencyStatesCheck', label: 'Kontrola havarijných stavov' },
                    { key: 'bondingProtection', label: 'Ochrana pospojovaním' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">{item.label}</span>
                      {service[item.key as keyof ServiceRecord] ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : (
                        <AlertCircle size={14} className="text-red-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {service.technicianNotes && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Poznámky technika</p>
              <div className="p-4 bg-slate-50 rounded-2xl text-slate-600 text-sm italic border border-slate-100">
                {service.technicianNotes}
              </div>
            </div>
          )}

          {service.photo && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Fotodokumentácia</p>
              <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200">
                <img src={service.photo} alt="Service" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          {service.signature && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Podpis zákazníka</p>
              <div className="aspect-video bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center p-4">
                <img src={service.signature} alt="Signature" className="max-w-full max-h-full object-contain mix-blend-multiply" />
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Zavrieť</button>
            <button onClick={onEdit} className="btn-primary flex-1 justify-center bg-amber-500 hover:bg-amber-600 border-amber-500 shadow-amber-100">
              <PenTool size={18} /> Upraviť záznam
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const CustomerDetail = ({ 
  customer, 
  boilers, 
  services, 
  onBack,
  onAddService,
  onAddBoiler,
  onEditBoiler,
  onSelectService
}: { 
  customer: Customer, 
  boilers: Boiler[], 
  services: ServiceRecord[], 
  onBack: () => void,
  onAddService: (boilerId: string) => void,
  onAddBoiler: (customerId: string) => void,
  onEditBoiler: (boilerId: string) => void,
  onSelectService: (serviceId: string) => void
}) => {
  const customerBoilers = boilers.filter(b => b.customerId === customer.id);
  const [expandedBoilers, setExpandedBoilers] = useState<Record<string, boolean>>({});

  const toggleExpand = (boilerId: string) => {
    setExpandedBoilers(prev => ({ ...prev, [boilerId]: !prev[boilerId] }));
  };

  const handleNavigate = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <button onClick={onBack} className="btn-secondary mb-2">
        <ArrowLeft size={20} />
        Späť
      </button>

      <div className="card p-6 bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            {customer.company && <p className="text-blue-100 font-medium">{customer.company}</p>}
            <div className="mt-4 space-y-2">
              <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-blue-100 hover:text-white transition-colors">
                <Phone size={18} />
                {customer.phone}
              </a>
              {customer.email && (
                <p className="flex items-center gap-2 text-blue-100">
                  <Info size={18} />
                  {customer.email}
                </p>
              )}
            </div>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Users size={32} />
          </div>
        </div>
        {customer.notes && (
          <div className="mt-4 p-3 bg-white/10 rounded-xl text-sm italic">
            {customer.notes}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Zariadenia</h2>
          <button onClick={() => onAddBoiler(customer.id)} className="text-blue-600 font-medium flex items-center gap-1 hover:underline">
            <Plus size={18} /> Pridať zariadenie
          </button>
        </div>

        {customerBoilers.map(boiler => {
          const boilerServices = services.filter(s => s.boilerId === boiler.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const isOverdue = boiler.nextServiceDate && new Date(boiler.nextServiceDate) < new Date();
          const isWarning = boiler.nextServiceDate && !isOverdue && (new Date(boiler.nextServiceDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30) <= 1;
          
          const isExpanded = expandedBoilers[boiler.id];
          const visibleServices = isExpanded ? boilerServices : boilerServices.slice(0, 3);

          return (
            <div key={boiler.id} className="card p-0 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{boiler.name}</h3>
                      <button 
                        onClick={() => handleNavigate(boiler.address)}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Navigovať"
                      >
                        <MapPin size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-blue-600 font-medium mt-0.5">
                      {boiler.address}
                    </p>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isOverdue ? 'bg-red-100 text-red-600' : isWarning ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {isOverdue ? 'Termín' : isWarning ? 'Blíži sa' : 'OK'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Posledný</p>
                    <p className="text-sm font-bold text-slate-700">{boiler.lastServiceDate ? new Date(boiler.lastServiceDate).toLocaleDateString('sk-SK') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nasledujúci</p>
                    <p className={`text-sm font-black ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
                      {boiler.nextServiceDate ? new Date(boiler.nextServiceDate).toLocaleDateString('sk-SK') : '-'}
                    </p>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Značka / Model</p>
                            <p className="text-xs font-medium text-slate-700">{boiler.brand} {boiler.model}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sériové číslo</p>
                            <p className="text-xs font-medium text-slate-700">{boiler.serialNumber}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dátum montáže</p>
                            <p className="text-xs font-medium text-slate-700">{new Date(boiler.installDate).toLocaleDateString('sk-SK')}</p>
                          </div>
                          <div className="flex items-end justify-end">
                            <button 
                              onClick={() => onEditBoiler(boiler.id)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                            >
                              <PenTool size={14} />
                              Upraviť údaje
                            </button>
                          </div>
                        </div>
                        {boiler.notes && (
                          <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 border border-amber-100">
                            <p className="font-bold uppercase text-[9px] mb-1 opacity-60 tracking-widest">Poznámka k zariadeniu</p>
                            {boiler.notes}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => onAddService(boiler.id)}
                    className="btn-primary flex-1 justify-center py-2.5 text-sm shadow-md shadow-blue-100"
                  >
                    <Wrench size={16} />
                    Vykonať servis
                  </button>
                  <button 
                    onClick={() => toggleExpand(boiler.id)}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isExpanded ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-600'
                    }`}
                  >
                    <Info size={20} />
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <History size={14} /> História servisov
                    <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md text-[10px]">
                      {boilerServices.length}
                    </span>
                  </h4>
                </div>
                
                <div className="space-y-2">
                  {visibleServices.length > 0 ? (
                    <>
                      {visibleServices.map((service, index) => {
                        let isTimely = true;
                        const nextService = boilerServices[index + 1];
                        if (nextService) {
                          const currDate = new Date(service.date);
                          const prevDate = new Date(nextService.date);
                          const diffMonths = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
                          isTimely = diffMonths <= 13;
                        }

                        return (
                          <div 
                            key={service.id} 
                            onClick={() => onSelectService(service.id)}
                            className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700">{new Date(service.date).toLocaleDateString('sk-SK')}</span>
                                <Wrench 
                                  size={12} 
                                  className={isTimely ? 'text-emerald-500' : 'text-red-500'} 
                                />
                              </div>
                              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-bold uppercase">
                                {service.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-1">{service.taskPerformed}</p>
                          </div>
                        );
                      })}
                      
                      {boilerServices.length > 3 && (
                        <button 
                          onClick={() => toggleExpand(boiler.id)}
                          className="w-full py-1.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          {isExpanded ? (
                            <>Zobraziť menej</>
                          ) : (
                            <>Zobraziť všetky ({boilerServices.length})</>
                          )}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Žiadna história záznamov.</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Map */}
      <div className="card p-0 overflow-hidden min-h-[300px] mt-8">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MapIcon size={20} className="text-blue-500" />
            Mapa zariadení zákazníka
          </h2>
        </div>
        <div className="h-[300px] w-full relative z-0">
          <MapContainer 
            center={customerBoilers.length > 0 && customerBoilers[0].lat ? [customerBoilers[0].lat, customerBoilers[0].lng!] : [48.6690, 19.6990]} 
            zoom={customerBoilers.length > 0 ? 12 : 7} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {customerBoilers.filter(b => b.lat && b.lng).map(boiler => (
              <Marker key={boiler.id} position={[boiler.lat!, boiler.lng!]}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-slate-900 mb-1">{boiler.name}</p>
                    <p className="text-xs text-slate-500">{boiler.address}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

const ServiceForm = ({ 
  boiler, 
  initialData,
  onCancel, 
  onSubmit 
}: { 
  boiler: Boiler, 
  initialData?: ServiceRecord,
  onCancel: () => void, 
  onSubmit: (data: Partial<ServiceRecord>) => void 
}) => {
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    taskPerformed: initialData?.taskPerformed || 'Ročná prehliadka',
    co2Value: initialData?.co2Value || 9.2,
    pressureValue: initialData?.pressureValue || 1.5,
    technicianNotes: initialData?.technicianNotes || '',
    // Detailed fields
    co2Max: initialData?.co2Max || 9.2,
    co2Min: initialData?.co2Min || 8.8,
    o2Max: initialData?.o2Max || 4.5,
    o2Min: initialData?.o2Min || 5.2,
    efficiency: initialData?.efficiency || 98.5,
    gasPressure: initialData?.gasPressure || 20,
    expansionTankPressureCH: initialData?.expansionTankPressureCH || 1.2,
    hasDHWExpansionTank: initialData?.hasDHWExpansionTank || false,
    expansionTankPressureDHW: initialData?.expansionTankPressureDHW || 3.5,
    conductivity: initialData?.conductivity || 250,
    phCH: initialData?.phCH || 8.2,
    hardnessCH: initialData?.hardnessCH || 0.1,
    burnerCheck: initialData?.burnerCheck ?? null,
    combustionChamberCleaning: initialData?.combustionChamberCleaning ?? null,
    electrodesCheck: initialData?.electrodesCheck ?? null,
    exchangerCheck: initialData?.exchangerCheck ?? null,
    fanCheck: initialData?.fanCheck ?? null,
    filtersCleaning: initialData?.filtersCleaning ?? null,
    siphonCleaning: initialData?.siphonCleaning ?? null,
    gasCircuitTightness: initialData?.gasCircuitTightness ?? null,
    flueGasOutletTightness: initialData?.flueGasOutletTightness ?? null,
    pumpCheck: initialData?.pumpCheck ?? null,
    threeWayValveCheck: initialData?.threeWayValveCheck ?? null,
    airSupplyVentilation: initialData?.airSupplyVentilation ?? null,
    emergencyStatesCheck: initialData?.emergencyStatesCheck ?? null,
    bondingProtection: initialData?.bondingProtection ?? null,
  });
  const [photo, setPhoto] = useState<string | null>(initialData?.photo || null);
  const [signed, setSigned] = useState(!!initialData);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.scrollTop = 0;
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const storageRef = ref(storage, `services/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        setPhoto(downloadURL);
      } catch (error) {
        console.error("Upload failed", error);
      }
    }
  };

  return (
    <div ref={modalRef} className="space-y-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto p-1">
      <header className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Nový servisný záznam</h1>
      </header>

      <div className="card p-6 space-y-6">
        <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
          <Info className="text-blue-600 mt-0.5" size={20} />
          <div>
            <p className="font-bold text-blue-900">{boiler.brand} {boiler.model}</p>
            <p className="text-sm text-blue-700">S/N: {boiler.serialNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Dátum servisu</label>
            <input 
              type="date" 
              className="input-field" 
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Vykonaná práca</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'Ročná prehliadka', label: 'Ročná prehliadka' },
                { id: 'Porucha', label: 'Porucha' },
                { id: 'Inštalácia', label: 'Inštalácia' },
                { id: 'Iné', label: 'Iné' }
              ].map(task => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setFormData({...formData, taskPerformed: task.id})}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border-2 ${
                    formData.taskPerformed === task.id 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' 
                      : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'
                  }`}
                >
                  {task.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {formData.taskPerformed !== 'Ročná prehliadka' && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">CO2 Hodnota (%)</label>
              <input 
                type="number" 
                step="0.1" 
                className="input-field"
                value={formData.co2Value}
                onChange={(e) => setFormData({...formData, co2Value: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Tlak (bar)</label>
              <input 
                type="number" 
                step="0.1" 
                className="input-field"
                value={formData.pressureValue}
                onChange={(e) => setFormData({...formData, pressureValue: parseFloat(e.target.value)})}
              />
            </div>
          </div>
        )}

        {formData.taskPerformed === 'Ročná prehliadka' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <PieChartIcon size={20} className="text-blue-600" />
                Analýza spalín a tlaky
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">CO2 Max (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.co2Max} onChange={e => setFormData({...formData, co2Max: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">CO2 Min (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.co2Min} onChange={e => setFormData({...formData, co2Min: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">O2 Max (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.o2Max} onChange={e => setFormData({...formData, o2Max: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">O2 Min (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.o2Min} onChange={e => setFormData({...formData, o2Min: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Účinnosť (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.efficiency} onChange={e => setFormData({...formData, efficiency: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tlak plynu (mbar)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.gasPressure} onChange={e => setFormData({...formData, gasPressure: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tlak exp. ÚK (bar)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.expansionTankPressureCH} onChange={e => setFormData({...formData, expansionTankPressureCH: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 p-3 bg-slate-50 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded text-blue-600" checked={formData.hasDHWExpansionTank} onChange={e => setFormData({...formData, hasDHWExpansionTank: e.target.checked})} />
                  <span className="text-sm font-bold text-slate-700">Má TÚV exp.</span>
                </label>
                {formData.hasDHWExpansionTank && (
                  <div className="flex-1 flex items-center gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tlak (bar)</label>
                    <input type="number" step="0.1" className="input-field py-1.5 w-24" value={formData.expansionTankPressureDHW} onChange={e => setFormData({...formData, expansionTankPressureDHW: parseFloat(e.target.value)})} />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Info size={20} className="text-blue-600" />
                Chemické hodnoty ÚK
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Konduktivita (mS/cm)</label>
                  <input type="number" step="1" className="input-field py-1.5" value={formData.conductivity} onChange={e => setFormData({...formData, conductivity: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">PH ÚK</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.phCH} onChange={e => setFormData({...formData, phCH: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tvrdosť ÚK (°dH)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.hardnessCH} onChange={e => setFormData({...formData, hardnessCH: parseFloat(e.target.value)})} />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-blue-600" />
                Kontrolný zoznam
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { key: 'burnerCheck', label: 'Kontrola horáka' },
                  { key: 'combustionChamberCleaning', label: 'Čistenie spaľovacej komory' },
                  { key: 'electrodesCheck', label: 'Kontrola elektród' },
                  { key: 'exchangerCheck', label: 'Kontrola výmenníka' },
                  { key: 'fanCheck', label: 'Kontrola ventilátora' },
                  { key: 'filtersCleaning', label: 'Čistenie filtrov' },
                  { key: 'siphonCleaning', label: 'Čistenie sifónu' },
                  { key: 'gasCircuitTightness', label: 'Tesnosť plynového okruhu' },
                  { key: 'flueGasOutletTightness', label: 'Tesnosť odvodu spalín' },
                  { key: 'pumpCheck', label: 'Kontrola čerpadla' },
                  { key: 'threeWayValveCheck', label: 'Kontrola 3-cestného ventilu' },
                  { key: 'airSupplyVentilation', label: 'Prívod vzduchu a vetranie' },
                  { key: 'emergencyStatesCheck', label: 'Kontrola havarijných stavov' },
                  { key: 'bondingProtection', label: 'Ochrana pospojovaním' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, [item.key]: true})}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          formData[item.key as keyof typeof formData] === true 
                            ? 'bg-emerald-500 text-white shadow-sm' 
                            : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        ÁNO
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, [item.key]: false})}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          formData[item.key as keyof typeof formData] === false 
                            ? 'bg-red-500 text-white shadow-sm' 
                            : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        NIE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Poznámky technika</label>
          <textarea 
            className="input-field min-h-[100px]" 
            placeholder="Doplňujúce informácie o stave kotla..."
            value={formData.technicianNotes}
            onChange={(e) => setFormData({...formData, technicianNotes: e.target.value})}
          ></textarea>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={onFileChange}
            />
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Camera size={18} /> Fotografia stavu
            </label>
            <div 
              onClick={handlePhotoClick}
              className="aspect-video bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200 transition-all overflow-hidden"
            >
              {photo ? (
                <img src={photo} alt="Boiler" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="text-slate-400 mb-2" size={32} />
                  <span className="text-xs font-medium text-slate-500">Kliknite pre odfotenie</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <PenTool size={18} /> Podpis zákazníka
            </label>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 relative overflow-hidden h-48">
              <SignatureCanvas 
                ref={sigCanvas}
                penColor="blue"
                canvasProps={{ className: "w-full h-full cursor-crosshair" }}
                onEnd={() => setSigned(true)}
              />
              <div className="absolute bottom-4 left-4 right-4 h-px bg-slate-300 pointer-events-none"></div>
              <button 
                type="button"
                onClick={() => { sigCanvas.current?.clear(); setSigned(false); }}
                className="absolute top-2 right-2 p-1 bg-white/80 rounded-md text-xs font-bold text-slate-500 hover:bg-white transition-colors"
              >
                Vymazať
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Zrušiť</button>
          <button 
            onClick={() => {
              const signature = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
              onSubmit({...formData, status: ServiceStatus.COMPLETED, photo: photo || undefined, signature});
            }}
            className="btn-primary flex-1 justify-center"
            disabled={
              !formData.taskPerformed || 
              !signed || 
              (formData.taskPerformed === 'Ročná prehliadka' && [
                'burnerCheck', 'combustionChamberCleaning', 'electrodesCheck', 'exchangerCheck', 
                'fanCheck', 'filtersCleaning', 'siphonCleaning', 'gasCircuitTightness', 
                'flueGasOutletTightness', 'pumpCheck', 'threeWayValveCheck', 
                'airSupplyVentilation', 'emergencyStatesCheck', 'bondingProtection'
              ].some(key => formData[key as keyof typeof formData] === null))
            }
          >
            Uložiť záznam
          </button>
        </div>
      </div>
    </div>
  );
};

const ServicesList = ({ 
  services, 
  boilers, 
  customers,
  onSelectCustomer,
  onSelectService
}: { 
  services: ServiceRecord[], 
  boilers: Boiler[], 
  customers: Customer[],
  onSelectCustomer: (id: string) => void,
  onSelectService: (id: string) => void
}) => {
  const sortedServices = [...services].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const trendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: d.toLocaleDateString('sk-SK', { month: 'short' }),
        month: d.getMonth(),
        year: d.getFullYear(),
        count: 0
      });
    }

    services.forEach(s => {
      const d = new Date(s.date);
      const monthIndex = months.findIndex(m => m.month === d.getMonth() && m.year === d.getFullYear());
      if (monthIndex !== -1) {
        months[monthIndex].count++;
      }
    });

    return months;
  }, [services]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Zásahy</h1>
        <p className="text-slate-500">História všetkých servisných úkonov.</p>
      </header>

      <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Celkový počet zásahov</p>
            <h2 className="text-4xl font-bold mt-1">{services.length}</h2>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <TrendingUp size={24} />
          </div>
        </div>
        
        <div className="h-24 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#ffffff" 
                fillOpacity={1} 
                fill="url(#colorCount)" 
                strokeWidth={2}
              />
              <RechartsTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-2 rounded-lg shadow-xl text-slate-900 text-xs font-bold">
                        {payload[0].payload.name}: {payload[0].value}
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-blue-100 font-bold uppercase tracking-widest">
          <span>Pred rokom</span>
          <span>Súčasnosť</span>
        </div>
      </div>

      <div className="space-y-3">
        {sortedServices.map(service => {
          const boiler = boilers.find(b => b.id === service.boilerId);
          const customer = customers.find(c => c.id === boiler?.customerId);
          
          return (
            <div 
              key={service.id} 
              className="card p-4 flex items-center justify-between hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all group"
            >
              <div 
                className="flex items-center gap-4 flex-1"
                onClick={() => onSelectService(service.id)}
              >
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <Wrench size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">{customer?.name}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold uppercase">{boiler?.brand}</span>
                  </div>
                  <p className="text-sm text-slate-500">{service.taskPerformed} • {new Date(service.date).toLocaleDateString('sk-SK')}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div className="hidden sm:block" onClick={() => onSelectService(service.id)}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Stav</p>
                  <span className="text-xs font-bold text-emerald-600">{service.status}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    customer && onSelectCustomer(customer.id);
                  }}
                  className="p-2 hover:bg-blue-100 rounded-xl transition-colors text-slate-300 hover:text-blue-600"
                  title="Prejsť na zákazníka"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeServiceBoilerId, setActiveServiceBoilerId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [editingBoilerId, setEditingBoilerId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  
  const [data, setData] = useState<{
    customers: Customer[],
    boilers: Boiler[],
    services: ServiceRecord[]
  }>({
    customers: [],
    boilers: [],
    services: []
  });
  const [isBoilerModalOpen, setIsBoilerModalOpen] = useState(false);
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

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listeners
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

    return () => {
      unsubCustomers();
      unsubBoilers();
      unsubServices();
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

  const handleEditService = (serviceId: string) => {
    const service = data.services.find(s => s.id === serviceId);
    if (service) {
      setActiveServiceBoilerId(service.boilerId);
      setEditingServiceId(serviceId);
      setActiveTab('serviceForm');
    }
  };

  const handleServiceSubmit = async (serviceData: Partial<ServiceRecord>) => {
    if (!activeServiceBoilerId) return;

    try {
      if (editingServiceId) {
        const serviceRef = doc(db, 'services', editingServiceId);
        await updateDoc(serviceRef, { ...serviceData });
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
          technicianNotes: serviceData.technicianNotes,
          photo: serviceData.photo,
          // Include other detailed fields if present
          ...serviceData
        };

        await setDoc(doc(db, 'services', serviceId), newService);

        // Update boiler's service dates
        const nextDate = new Date(newService.date);
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        
        const boilerRef = doc(db, 'boilers', activeServiceBoilerId);
        await updateDoc(boilerRef, {
          lastServiceDate: newService.date,
          nextServiceDate: nextDate.toISOString().split('T')[0]
        });
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
      const customer: Customer = { ...newCust, id: customerId };
      
      await setDoc(doc(db, 'customers', customerId), customer);

      if (boilerData) {
        const boilerId = `b${Date.now()}`;
        const boiler: Boiler = { 
          ...boilerData, 
          id: boilerId, 
          customerId 
        };
        await setDoc(doc(db, 'boilers', boilerId), boiler);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'customers/boilers');
    }
  };

  const handleAddBoiler = async (boilerData: Omit<Boiler, 'id' | 'customerId'>) => {
    if (!selectedCustomerId) return;
    
    try {
      if (editingBoilerId) {
        const boilerRef = doc(db, 'boilers', editingBoilerId);
        await updateDoc(boilerRef, { ...boilerData });
      } else {
        const boilerId = `b${Date.now()}`;
        const boiler: Boiler = { 
          ...boilerData, 
          id: boilerId, 
          customerId: selectedCustomerId 
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
        photos: {}
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'boilers');
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
      case 'customers':
        return (
          <CustomerList 
            customers={data.customers} 
            boilers={data.boilers}
            onSelectCustomer={handleSelectCustomer} 
            onAddCustomer={handleAddCustomer}
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
            onSelectService={setSelectedServiceId}
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
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Načítavam aplikáciu...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
        <Sidebar activeTab={activeTab === 'customerDetail' || activeTab === 'serviceForm' ? 'customers' : activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 p-4 sm:p-6 md:p-10 pb-24 md:pb-10 max-w-5xl mx-auto w-full overflow-y-auto">
          <div className="flex justify-end mb-4 md:mb-0 md:absolute md:top-6 md:right-10">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Odhlásiť sa ({user.displayName?.split(' ')[0]})
            </button>
          </div>

          <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (selectedCustomerId || '') + (activeServiceBoilerId || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

        {/* Boiler Modal */}
        {isBoilerModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="card w-full max-w-2xl p-6 space-y-6"
            >
              <h2 className="text-xl font-bold text-slate-900">
                {editingBoilerId ? 'Upraviť zariadenie' : 'Pridať nové zariadenie'}
              </h2>
              <form onSubmit={(e) => { e.preventDefault(); handleAddBoiler(newBoilerData); }} className="space-y-4">
                <BoilerFormFields 
                  boilerData={newBoilerData} 
                  setBoilerData={setNewBoilerData} 
                  existingBoilers={data.boilers} 
                />
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => { setIsBoilerModalOpen(false); setEditingBoilerId(null); }} className="btn-secondary flex-1 justify-center">Zrušiť</button>
                  <button type="submit" className="btn-primary flex-1 justify-center">Uložiť zariadenie</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Service Detail Modal */}
        {selectedServiceId && (
          <ServiceDetailModal 
            service={data.services.find(s => s.id === selectedServiceId)!}
            boiler={data.boilers.find(b => b.id === data.services.find(s => s.id === selectedServiceId)?.boilerId)!}
            onClose={() => setSelectedServiceId(null)}
            onEdit={() => {
              handleEditService(selectedServiceId);
              setSelectedServiceId(null);
            }}
          />
        )}
      </main>
    </div>
    </ErrorBoundary>
  );
}
