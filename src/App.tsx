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
import MeasurementHistory from './components/MeasurementHistory';

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
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  ref, 
  getDownloadURL,
  uploadBytes
} from 'firebase/storage';
import { Html5Qrcode } from 'html5-qrcode';
import { AppState, Customer, Boiler, ServiceRecord, ServiceStatus, Contact } from './types';

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
        <div className="min-h-screen flex items-center justify-center bg-[#121212] p-4">
          <div className="card max-w-md w-full p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-[#C14F4F]/20 text-[#C14F4F] rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-white">Ups! Niečo sa pokazilo</h2>
            <p className="text-white/60">{errorMessage}</p>
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card max-w-md w-full p-8 text-center space-y-8"
      >
        <div className="space-y-2">
          <div className="w-16 h-16 bg-[#3A87AD] rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-[#3A87AD]/20">
            <Wrench size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#3A87AD] pt-4">SP Therm s.r.o.</h1>
          <p className="text-white/60">Prihláste sa pre prístup k správe zákazníkov a servisných záznamov.</p>
        </div>

        <button 
          onClick={onLogin}
          className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white font-semibold py-3 px-4 rounded-xl hover:bg-white/10 transition-all shadow-sm active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Prihlásiť sa cez Google
        </button>

        <p className="text-xs text-white/40">
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

const Sidebar = ({ activeTab, setActiveTab, isVisible }: { activeTab: string, setActiveTab: (tab: string) => void, isVisible: boolean }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Prehľad', icon: LayoutDashboard },
    { id: 'customers', label: 'Zákazníci', icon: Users },
    { id: 'services', label: 'Zásahy', icon: History },
    { id: 'contacts', label: 'Kontakty', icon: Phone },
  ];

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-[#121212] backdrop-blur-md border-t border-white/5 px-6 py-1.5 flex justify-around items-center md:relative md:w-64 md:h-screen md:flex-col md:justify-start md:border-t-0 md:border-r md:pt-8 md:gap-2 z-[40] transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'} md:bg-transparent md:border-r-white/10`}>
      <div className="hidden md:flex items-center gap-3 px-4 mb-8 w-full">
        <img 
          src="/logo.png" 
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/logo/200/200'; }}
          alt="Logo" 
          className="h-10 w-auto object-contain" 
          referrerPolicy="no-referrer" 
        />
        <span className="font-bold text-xl tracking-tight text-[#3A87AD]">SP Therm s.r.o.</span>
      </div>
      
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex flex-col md:flex-row items-center gap-0.5 md:gap-3 px-4 py-1.5 md:w-full rounded-xl transition-all ${
            activeTab === item.id 
              ? 'text-[#3A87AD] md:bg-[#3A87AD]/10' 
              : 'text-white/40 hover:text-white/60 md:hover:bg-white/5'
          }`}
        >
          <item.icon size={20} className="md:w-6 md:h-6" />
          <span className="text-[9px] md:text-sm font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

const MapBounds = ({ boilers }: { boilers: Boiler[] }) => {
  const map = useMap();
  
  useEffect(() => {
    const validBoilers = boilers.filter(b => b.lat && b.lng);
    if (validBoilers.length > 0) {
      const bounds = L.latLngBounds(validBoilers.map(b => [b.lat!, b.lng!]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [boilers, map]);

  return null;
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
  const [filter, setFilter] = useState<'overdue' | 'upcoming' | 'ontime' | null>(null);
  
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

  const filteredBoilers = useMemo(() => {
    if (filter === 'overdue') return overdueBoilers;
    if (filter === 'upcoming') return upcomingBoilers;
    if (filter === 'ontime') return onTimeBoilers;
    return [];
  }, [filter, overdueBoilers, upcomingBoilers, onTimeBoilers]);

  const brandData = useMemo(() => {
    const counts: Record<string, number> = {};
    boilers.forEach(b => {
      counts[b.brand] = (counts[b.brand] || 0) + 1;
    });
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
    
    return sorted;
  }, [boilers]);

  const top6Brands = useMemo(() => brandData.slice(0, 6), [brandData]);

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
          <h1 className="text-2xl font-bold text-white">Dobrý deň!</h1>
          <p className="text-white/60">Tu je prehľad dnešných úloh.</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-white/40 uppercase tracking-wider">Dnes</p>
          <p className="text-lg font-bold text-white/80">{today.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </header>

      {/* Small cards at the top */}
      <div className="grid grid-cols-3 gap-3">
        <button 
          onClick={() => setFilter(filter === 'overdue' ? null : 'overdue')}
          className={`card p-3 border-l-4 transition-all text-left ${filter === 'overdue' ? 'border-l-[#C14F4F] bg-[#C14F4F]/10 ring-2 ring-[#C14F4F]/20' : 'border-l-[#C14F4F]/50 hover:bg-white/5'}`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-white/40 uppercase">Po termíne</span>
            <span className="text-xl font-bold text-[#C14F4F]">{overdueBoilers.length}</span>
          </div>
        </button>
        
        <button 
          onClick={() => setFilter(filter === 'upcoming' ? null : 'upcoming')}
          className={`card p-3 border-l-4 transition-all text-left ${filter === 'upcoming' ? 'border-l-[#3A87AD] bg-[#3A87AD]/10 ring-2 ring-[#3A87AD]/20' : 'border-l-[#3A87AD]/50 hover:bg-white/5'}`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-white/40 uppercase">Blížiace sa</span>
            <span className="text-xl font-bold text-[#3A87AD]">{upcomingBoilers.length}</span>
          </div>
        </button>

        <button 
          onClick={() => setFilter(filter === 'ontime' ? null : 'ontime')}
          className={`card p-3 border-l-4 transition-all text-left ${filter === 'ontime' ? 'border-l-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20' : 'border-l-emerald-500/50 hover:bg-white/5'}`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-white/40 uppercase">V termíne</span>
            <span className="text-xl font-bold text-emerald-500">{onTimeBoilers.length}</span>
          </div>
        </button>
      </div>

      {/* Filtered List */}
      <AnimatePresence>
        {filter && (
          <motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {filter === 'overdue' && <AlertCircle size={20} className="text-[#C14F4F]" />}
                {filter === 'upcoming' && <Clock size={20} className="text-[#3A87AD]" />}
                {filter === 'ontime' && <CheckCircle2 size={20} className="text-emerald-500" />}
                {filter === 'overdue' ? 'Zariadenia po termíne' : filter === 'upcoming' ? 'Blížiace sa prehliadky' : 'Zariadenia v termíne'}
              </h2>
              <button onClick={() => setFilter(null)} className="text-xs font-bold text-white/40 hover:text-white/60 uppercase tracking-widest">Zatvoriť</button>
            </div>
            <div className="space-y-3">
              {filteredBoilers.map(boiler => {
                const customer = customers.find(c => c.id === boiler.customerId);
                return (
                  <div 
                    key={boiler.id} 
                    onClick={() => onSelectCustomer(boiler.customerId)}
                    className="card p-4 flex items-center justify-between hover:border-[#3A87AD]/30 hover:bg-[#3A87AD]/5 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 text-white/60 rounded-full flex items-center justify-center font-bold text-sm">
                        {customer?.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{customer?.name}</h3>
                        <p className="text-xs text-white/40">{boiler.brand} {boiler.model} • {boiler.address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-bold uppercase ${filter === 'overdue' ? 'text-[#C14F4F]' : filter === 'upcoming' ? 'text-[#3A87AD]' : 'text-emerald-500'}`}>
                        {filter === 'overdue' ? 'Termín uplynul' : 'Nasledujúci termín'}
                      </p>
                      <p className="text-xs font-medium text-white/60">{new Date(boiler.nextServiceDate!).toLocaleDateString('sk-SK')}</p>
                    </div>
                    <ChevronRight size={16} className="text-white/20 group-hover:text-[#3A87AD] ml-4" />
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Critical Inspections */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <AlertCircle size={20} className="text-[#C14F4F]" />
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
                  className="card p-4 flex items-center justify-between hover:border-[#C14F4F]/30 hover:bg-[#C14F4F]/5 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#C14F4F]/10 text-[#C14F4F] rounded-full flex items-center justify-center font-bold">
                      {customer?.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{customer?.name}</h3>
                      <p className="text-sm text-white/40">{boiler.brand} {boiler.model} • {boiler.address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#C14F4F] uppercase">Termín uplynul</p>
                    <p className="text-sm font-medium text-white/60">{new Date(boiler.nextServiceDate!).toLocaleDateString('sk-SK')}</p>
                  </div>
                  <ChevronRight size={20} className="text-white/20 group-hover:text-[#C14F4F] ml-4" />
                </div>
              );
            })
          ) : (
            <div className="card p-8 text-center text-white/20 italic">
              Žiadne prehliadky po termíne. Skvelá práca!
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Distribution */}
        <div className="card p-6 relative">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PieChartIcon size={20} className="text-[#3A87AD]" />
              Zastúpenie značiek
            </h2>
            <div className="text-right">
              <p className="text-[10px] font-bold text-white/40 uppercase">Celkom kotlov</p>
              <p className="text-xl font-bold text-[#3A87AD]">{boilers.length}</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={brandData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ percent, index }) => {
                    if (index < 6) {
                      return `${(percent * 100).toFixed(0)}%`;
                    }
                    return null;
                  }}
                >
                  {brandData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1E1E1E', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ color: '#E0E0E0' }}
                />
                <Legend 
                  {...({ 
                    verticalAlign: "bottom", 
                    height: 36,
                    payload: top6Brands.map((item, index) => ({
                      value: `${item.name} (${item.value})`,
                      type: 'circle',
                      id: item.name,
                      color: COLORS[index % COLORS.length]
                    }))
                  } as any)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Type Distribution */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <History size={20} className="text-[#3A87AD]" />
            Typy zásahov (%)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
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
                  contentStyle={{ backgroundColor: '#1E1E1E', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ color: '#E0E0E0' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Map moved to bottom */}
      <div className="card p-0 overflow-hidden min-h-[350px]">
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapIcon size={20} className="text-[#3A87AD]" />
            Mapa inštalácií
          </h2>
        </div>
        <div className="h-[350px] w-full relative z-0">
          <MapContainer center={[48.6690, 19.6990]} zoom={7} style={{ height: '100%', width: '100%' }} className="dark-map">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapBounds boilers={boilers} />
            {boilers.filter(b => b.lat && b.lng).map(boiler => (
              <Marker key={boiler.id} position={[boiler.lat!, boiler.lng!]}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-slate-900 mb-1">{boiler.name}</p>
                    <p className="text-xs text-slate-500 mb-2">{boiler.address}</p>
                    <button 
                      onClick={() => onSelectCustomer(boiler.customerId)}
                      className="text-xs font-bold text-[#3A87AD] hover:underline"
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

const AddressSearch = ({ 
  value, 
  onChange, 
  onSelect,
  autoOpen = true
}: { 
  value: string, 
  onChange: (v: string) => void, 
  onSelect: (addr: string, lat: number, lng: number) => void,
  autoOpen?: boolean
}) => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ignoreNext, setIgnoreNext] = useState(false);

  useEffect(() => {
    if (!autoOpen) return;
    // No auto-open logic needed here if we just want to prevent it in BoilerForm
  }, [autoOpen]);

  useEffect(() => {
    if (autoOpen && !value && !results.length) {
      // Trigger a search or just open the dropdown if we had a way to force it
      // For now, we'll just ensure the dropdown logic is ready
    }
  }, [autoOpen, value]);

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
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E1E1E] border border-white/10 rounded-xl shadow-2xl z-[110] max-h-[200px] overflow-y-auto backdrop-blur-md">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm border-b border-white/5 last:border-0 text-white/80 transition-colors"
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
  existingBoilers,
  setIsScannerOpen
}: { 
  boilerData: any, 
  setBoilerData: any, 
  existingBoilers: Boiler[],
  setIsScannerOpen: (v: boolean) => void
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoType, setActivePhotoType] = useState<string | null>(null);

  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [scanning, setScanning] = useState(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);

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
      const type = activePhotoType; // Capture current type
      // Create local preview immediately
      const previewUrl = URL.createObjectURL(file);
      setPreviews(prev => ({ ...prev, [type]: previewUrl }));
      setUploading(prev => ({ ...prev, [type]: true }));
      
      try {
        const storageRef = ref(storage, `boilers/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        setBoilerData((prev: any) => ({
          ...prev,
          photos: { ...(prev.photos || {}), [type]: downloadURL }
        }));
      } catch (error) {
        console.error("Upload failed", error);
        alert("Nahrávanie fotky zlyhalo. Skúste to prosím znova.");
      } finally {
        setUploading(prev => ({ ...prev, [type]: false }));
      }
    }
  };

  const handleScanClick = () => {
    scannerInputRef.current?.click();
  };

  const onScanFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScanning(true);
      try {
        const { data: { text } } = await Tesseract.recognize(file, 'slk+eng', {
          logger: m => console.log(m)
        });
        
        // Try to find a serial number pattern (e.g., alphanumeric, 8+ chars)
        const lines = text.split('\n');
        let foundSerial = '';
        
        // Simple heuristic: look for lines that look like serial numbers
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length >= 8 && /^[A-Z0-9-]+$/i.test(trimmed)) {
            foundSerial = trimmed;
            break;
          }
        }

        if (foundSerial) {
          setBoilerData((prev: any) => ({ ...prev, serialNumber: foundSerial }));
          alert(`Rozpoznané sériové číslo: ${foundSerial}`);
        } else {
          // If no pattern found, just take the first non-empty line or first 15 chars
          const firstLine = lines.find(l => l.trim().length > 5)?.trim() || text.substring(0, 20).trim();
          setBoilerData((prev: any) => ({ ...prev, serialNumber: firstLine }));
          alert(`Rozpoznaný text: ${firstLine}`);
        }
      } catch (error) {
        console.error("OCR failed", error);
        alert("Rozpoznávanie textu zlyhalo.");
      } finally {
        setScanning(false);
      }
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-white/5">
      <h3 className="font-bold text-[#3A87AD] flex items-center gap-2">
        <Wrench size={18} /> Údaje o zariadení
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-bold text-white/70">Meno zariadenia</label>
          <input 
            required
            type="text" 
            className="input-field" 
            value={boilerData.name}
            onChange={e => setBoilerData({...boilerData, name: e.target.value})}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-white/70">Adresa inštalácie</label>
          <AddressSearch 
            value={boilerData.address} 
            onChange={v => setBoilerData({...boilerData, address: v})}
            onSelect={(addr, lat, lng) => setBoilerData({...boilerData, address: addr, lat, lng})}
            autoOpen={!boilerData.address}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1 relative">
          <label className="text-sm font-bold text-white/70">Značka</label>
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
          <label className="text-sm font-bold text-white/70">Model</label>
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
          <label className="text-sm font-bold text-white/70">Sériové číslo</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="input-field" 
              value={boilerData.serialNumber}
              onChange={e => setBoilerData({...boilerData, serialNumber: e.target.value})}
            />
            <button 
              type="button" 
              onClick={() => setIsScannerOpen(true)}
              className="p-2 bg-[#3A87AD]/10 rounded-xl hover:bg-[#3A87AD] text-[#3A87AD] hover:text-white transition-all" 
              title="Skenovať"
            >
              <Scan size={20} />
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-white/70">Dátum montáže</label>
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
            <label className="text-[10px] font-bold text-white/40 uppercase">
              {type === 'overall' ? 'Celkové' : type === 'connection' ? 'Napojenie' : 'Komín'}
            </label>
            <button 
              type="button"
              onClick={() => handlePhotoClick(type)}
              disabled={uploading[type]}
              className="w-full aspect-square bg-white/5 border border-dashed border-white/10 rounded-xl flex items-center justify-center overflow-hidden relative group"
            >
              {previews[type] || boilerData.photos?.[type] ? (
                <>
                  <img src={previews[type] || boilerData.photos[type]} className="w-full h-full object-cover" />
                  {uploading[type] && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-[#3A87AD]/30 border-t-[#3A87AD] rounded-full animate-spin" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                </>
              ) : (
                uploading[type] ? (
                  <div className="w-6 h-6 border-2 border-[#3A87AD]/30 border-t-[#3A87AD] rounded-full animate-spin" />
                ) : (
                  <Camera size={20} className="text-white/20" />
                )
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-bold text-white/70">Poznámka k zariadeniu</label>
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
  onAddCustomer,
  onEditCustomer
}: { 
  customers: Customer[], 
  boilers: Boiler[],
  onSelectCustomer: (id: string) => void,
  onAddCustomer: () => void,
  onEditCustomer: (customer: Customer) => void
}) => {
  const [search, setSearch] = useState('');

  const handleOpenEdit = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    onEditCustomer(customer);
  };

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    const normalizedSearch = removeDiacritics(search).toLowerCase();
    return customers.filter(c => {
      const customerBoilers = boilers.filter(b => b.customerId === c.id);
      const matchesName = removeDiacritics(c.name || '').toLowerCase().includes(normalizedSearch);
      const matchesPhone = (c.phone || '').includes(search);
      const matchesCompany = c.company ? removeDiacritics(c.company).toLowerCase().includes(normalizedSearch) : false;
      const matchesBoiler = customerBoilers.some(b => 
        removeDiacritics(b.model || '').toLowerCase().includes(normalizedSearch) || 
        removeDiacritics(b.brand || '').toLowerCase().includes(normalizedSearch) ||
        removeDiacritics(b.name || '').toLowerCase().includes(normalizedSearch)
      );
      return matchesName || matchesPhone || matchesCompany || matchesBoiler;
    });
  }, [customers, boilers, search]);

  const customerTrendData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        name: d.toLocaleString('sk-SK', { month: 'short' }),
        month: d.getMonth(),
        year: d.getFullYear()
      });
    }

    return months.map(m => {
      const count = customers.filter(c => {
        if (!c.createdAt) return false;
        const createdDate = new Date(c.createdAt);
        return createdDate.getMonth() === m.month && createdDate.getFullYear() === m.year;
      }).length;
      return { name: m.name, value: count };
    });
  }, [customers]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Zákazníci</h1>
        <button onClick={onAddCustomer} className="btn-primary">
          <Plus size={20} />
          <span className="hidden sm:inline">Nový zákazník</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6 md:col-span-2">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-[#3A87AD]" />
              Prírastok zákazníkov (12m)
            </h2>
          </div>
          <div className="h-[150px] w-full">
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={customerTrendData}>
                <defs>
                  <linearGradient id="colorCust" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3A87AD" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3A87AD" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                />
                <YAxis hide />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1E1E1E', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                  itemStyle={{ color: '#3A87AD' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3A87AD" 
                  fillOpacity={1} 
                  fill="url(#colorCust)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-bold text-white/40 uppercase tracking-wider mb-1">Celkový počet zákazníkov</p>
          <p className="text-5xl font-bold text-[#3A87AD]">{customers.length}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-xs font-bold">
            <TrendingUp size={14} />
            <span>Aktívne rastúce</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
        <input 
          type="text" 
          placeholder="Hľadať v zozname zákazníkov" 
          className="input-field pl-12"
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
              className="card p-4 flex items-center justify-between hover:border-[#3A87AD]/30 hover:bg-[#3A87AD]/5 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 text-white/60 rounded-full flex items-center justify-center font-bold">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white leading-tight">{customer.name}</h3>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(customerBoilers.map(b => b.brand))).map(brand => (
                        <span key={brand} className="text-[10px] bg-[#3A87AD]/10 text-[#3A87AD] px-1.5 py-0.5 rounded-md font-bold uppercase">{brand}</span>
                      ))}
                    </div>
                  </div>
                  {customer.company && <p className="text-xs text-white/40 mt-0.5">{customer.company}</p>}
                  
                  <div className="flex items-center gap-3 text-sm text-white/60 mt-1">
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
                              className={isOverdue ? 'text-[#C14F4F]' : 'text-emerald-500'} 
                            />
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight size={20} className="text-white/20 group-hover:text-[#3A87AD]" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CustomerModal = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  onUpdate,
  onDelete,
  editingCustomer,
  customers,
  boilers,
  setIsScannerOpen
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onAdd: (customer: Omit<Customer, 'id'>, boiler?: Omit<Boiler, 'id' | 'customerId'>) => void, 
  onUpdate: (id: string, customer: Partial<Customer>) => void,
  onDelete: (id: string) => void,
  editingCustomer: Customer | null,
  customers: Customer[],
  boilers: Boiler[],
  setIsScannerOpen: (v: boolean) => void
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', company: '', phone: '', email: '', notes: '' });
  const [addBoiler, setAddBoiler] = useState(true);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
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
    if (isOpen) {
      if (editingCustomer) {
        setNewCustomer({
          name: editingCustomer.name,
          company: editingCustomer.company || '',
          phone: editingCustomer.phone,
          email: editingCustomer.email || '',
          notes: editingCustomer.notes || ''
        });
        setAddBoiler(false);
      } else {
        setNewCustomer({ name: '', company: '', phone: '', email: '', notes: '' });
        setAddBoiler(false);
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
      }
      setDuplicateError(null);
    }
  }, [isOpen, editingCustomer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateError(null);

    // Duplicate check
    const isDuplicate = customers.some(c => {
      if (editingCustomer && c.id === editingCustomer.id) return false;
      return (
        c.name.toLowerCase() === newCustomer.name.toLowerCase() ||
        (newCustomer.phone && c.phone === newCustomer.phone) ||
        (newCustomer.email && c.email && c.email.toLowerCase() === newCustomer.email.toLowerCase())
      );
    });

    if (isDuplicate) {
      setDuplicateError('Zákazník s týmto menom, telefónom alebo emailom už existuje.');
      return;
    }

    if (editingCustomer) {
      onUpdate(editingCustomer.id, newCustomer);
    } else {
      onAdd(newCustomer, addBoiler ? newBoiler : undefined);
    }
  };

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="card w-full max-w-2xl p-6 space-y-6"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {editingCustomer ? 'Upraviť zákazníka' : 'Nový zákazník'}
          </h2>
          {editingCustomer && (
            <button 
              type="button"
              onClick={() => onDelete(editingCustomer.id)}
              className="p-2 text-white hover:bg-red-500 rounded-xl transition-all"
              title="Vymazať zákazníka"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {duplicateError && (
          <div className="p-3 bg-[#C14F4F]/10 border border-[#C14F4F]/20 rounded-xl flex items-center gap-3 text-[#C14F4F] text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            {duplicateError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-white/70">Meno a priezvisko</label>
              <input 
                required
                type="text" 
                className="input-field" 
                value={newCustomer.name}
                onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-white/70">Firma</label>
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
              <label className="text-sm font-bold text-white/70">Telefón</label>
              <input 
                type="tel" 
                className="input-field" 
                value={newCustomer.phone}
                onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-white/70">Email</label>
              <input 
                type="email" 
                className="input-field" 
                value={newCustomer.email}
                onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Poznámka</label>
            <textarea 
              className="input-field min-h-[60px]" 
              value={newCustomer.notes}
              onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})}
            />
          </div>

          {!editingCustomer && (
            <div className="flex items-center gap-2 py-2">
              <input 
                type="checkbox" 
                id="add-boiler" 
                checked={addBoiler} 
                onChange={e => setAddBoiler(e.target.checked)}
                className="w-4 h-4 text-[#3A87AD] rounded bg-black/40 border-white/10"
              />
              <label htmlFor="add-boiler" className="text-sm font-bold text-white/70 cursor-pointer">Pridať prvé zariadenie</label>
            </div>
          )}

          {!editingCustomer && addBoiler && (
            <BoilerFormFields 
              boilerData={newBoiler} 
              setBoilerData={setNewBoiler} 
              existingBoilers={boilers} 
              setIsScannerOpen={setIsScannerOpen}
            />
          )}

          <div className="flex gap-3 pt-4 border-t border-white/5">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Zrušiť</button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              {editingCustomer ? 'Uložiť zmeny' : 'Vytvoriť zákazníka'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const ServiceDetailModal = ({ 
  service, 
  boiler, 
  customer,
  onClose,
  onEdit,
  onDelete
}: { 
  service: ServiceRecord, 
  boiler: Boiler, 
  customer: Customer,
  onClose: () => void,
  onEdit: () => void,
  onDelete: (id: string) => void
}) => {
  if (!service) return null;
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      await generateServicePDF(service, boiler, customer);
    } catch (error) {
      console.error("PDF generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="card w-full max-w-2xl p-0 overflow-hidden"
      >
        <div className="bg-[#3A87AD] p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Detail zásahu</p>
              <h2 className="text-2xl font-bold">{service.taskPerformed}</h2>
              <p className="text-white/80 text-sm mt-1">
                {new Date(service.date).toLocaleDateString('sk-SK')} • {boiler.brand} {boiler.model}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onDelete(service.id)} 
                className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-xl transition-colors"
                title="Vymazať záznam"
              >
                <Trash2 size={18} />
              </button>
              <button 
                onClick={handleDownloadPDF} 
                disabled={isGenerating}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
                title="Stiahnuť PDF"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                PDF
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <ArrowLeft size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/40 uppercase">CO2 Hodnota</p>
              <p className="text-lg font-bold text-white">{service.co2Value}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/40 uppercase">CO</p>
              <p className="text-lg font-bold text-white">{service.coValue} ppm</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/40 uppercase">Tlak</p>
              <p className="text-lg font-bold text-white">{service.pressureValue} bar</p>
            </div>
          </div>

          {service.taskPerformed === 'Ročná prehliadka' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-white/5 p-4 rounded-2xl space-y-4 border border-white/5">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Analýza spalín a tlaky</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'CO2 Max', val: service.co2Max, unit: '%' },
                    { label: 'CO2 Min', val: service.co2Min, unit: '%' },
                    { label: 'CO', val: service.coValue, unit: ' ppm' },
                    { label: 'O2 Max', val: service.o2Max, unit: '%' },
                    { label: 'O2 Min', val: service.o2Min, unit: '%' },
                    { label: 'Účinnosť', val: service.efficiency, unit: '%' },
                    { label: 'Tlak plynu', val: service.gasPressure, unit: ' mbar' },
                    { label: 'Tlak exp. ÚK', val: service.expansionTankPressureCH, unit: ' bar' },
                    { label: 'Tlak exp. TÚV', val: service.expansionTankPressureDHW, unit: ' bar', show: service.hasDHWExpansionTank },
                  ].map(item => (item.show !== false && (
                    <div key={item.label}>
                      <p className="text-[10px] font-bold text-white/40 uppercase">{item.label}</p>
                      <p className="text-sm font-bold text-white">{item.val ?? '-'}{item.unit}</p>
                    </div>
                  )))}
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl space-y-4 border border-white/5">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Chemické hodnoty ÚK</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Konduktivita', val: service.conductivity, unit: ' mS/cm' },
                    { label: 'PH ÚK', val: service.phCH, unit: '' },
                    { label: 'Tvrdosť ÚK', val: service.hardnessCH, unit: ' °dH' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-[10px] font-bold text-white/40 uppercase">{item.label}</p>
                      <p className="text-sm font-bold text-white">{item.val ?? '-'}{item.unit}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl space-y-4 border border-white/5">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Kontrolný zoznam</h3>
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
                      <span className="text-xs text-white/60">{item.label}</span>
                      {service[item.key as keyof ServiceRecord] ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : (
                        <AlertCircle size={14} className="text-[#C14F4F]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {service.technicianNotes && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase">Poznámky technika</p>
              <div className="p-4 bg-white/5 rounded-2xl text-white/60 text-sm italic border border-white/5">
                {service.technicianNotes}
              </div>
            </div>
          )}

          {service.photo && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase">Fotodokumentácia</p>
              <div className="aspect-video rounded-2xl overflow-hidden border border-white/10">
                <img src={service.photo} alt="Service" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          {service.signature && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase">Podpis zákazníka</p>
              <div className="aspect-video bg-white p-4 rounded-2xl border border-white/10 flex items-center justify-center">
                <img src={service.signature} alt="Signature" className="max-w-full max-h-full object-contain mix-blend-multiply" />
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-white/5 flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Zavrieť</button>
            <button onClick={onEdit} className="btn-primary flex-1 justify-center bg-amber-500 hover:bg-amber-600 border-amber-500 shadow-amber-500/20">
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
  onEditCustomer,
  onSelectService,
  setSelectedBoilerId
}: { 
  customer: Customer, 
  boilers: Boiler[], 
  services: ServiceRecord[], 
  onBack: () => void,
  onAddService: (boilerId: string) => void,
  onAddBoiler: (customerId: string) => void,
  onEditBoiler: (boilerId: string) => void,
  onEditCustomer: (customer: Customer) => void,
  onSelectService: (serviceId: string) => void,
  setSelectedBoilerId: (id: string) => void
}) => {
  const customerBoilers = boilers.filter(b => b.customerId === customer.id);
  const [expandedBoilers, setExpandedBoilers] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});

  const toggleExpand = (boilerId: string) => {
    setExpandedBoilers(prev => ({ ...prev, [boilerId]: !prev[boilerId] }));
  };

  const toggleHistory = (boilerId: string) => {
    setShowHistory(prev => ({ ...prev, [boilerId]: !prev[boilerId] }));
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

      <div className="card p-6 bg-[#3A87AD] text-white border-none relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 group">
              <h1 className="text-3xl font-bold">{customer.name}</h1>
              <button 
                onClick={() => onEditCustomer(customer)}
                className="p-1.5 text-white/40 hover:text-white transition-colors rounded-lg"
                title="Upraviť údaje"
              >
                <PenTool size={18} />
              </button>
            </div>
            {customer.company && <p className="text-white/80 font-medium">{customer.company}</p>}
            <div className="mt-4 space-y-2">
              <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                <Phone size={18} />
                {customer.phone}
              </a>
              {customer.email && (
                <p className="flex items-center gap-2 text-white/80">
                  <Info size={18} />
                  {customer.email}
                </p>
              )}
            </div>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shrink-0">
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
          <h2 className="text-xl font-bold text-white">Zariadenia</h2>
          <button onClick={() => onAddBoiler(customer.id)} className="text-[#3A87AD] font-medium flex items-center gap-1 hover:underline">
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
            <div key={boiler.id} className="card p-0 overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{boiler.name}</h3>
                      <button 
                        onClick={() => handleNavigate(boiler.address)}
                        className="p-1.5 bg-[#3A87AD]/10 text-[#3A87AD] rounded-lg hover:bg-[#3A87AD] hover:text-white transition-colors"
                        title="Navigovať"
                      >
                        <MapPin size={14} />
                      </button>
                      <button 
                        onClick={() => setSelectedBoilerId(boiler.id)}
                        className="p-1.5 bg-white/5 text-white/40 rounded-lg hover:bg-white/10 hover:text-[#3A87AD] transition-colors"
                        title="Detail zariadenia"
                      >
                        <Info size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-[#3A87AD] font-medium mt-0.5">
                      {boiler.address}
                    </p>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isOverdue ? 'bg-[#C14F4F]/20 text-[#C14F4F]' : isWarning ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
                  }`}>
                    {isOverdue ? 'Termín' : isWarning ? 'Blíži sa' : 'OK'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Posledný</p>
                    <p className="text-sm font-bold text-white">{boiler.lastServiceDate ? new Date(boiler.lastServiceDate).toLocaleDateString('sk-SK') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Nasledujúci</p>
                    <p className={`text-sm font-black ${isOverdue ? 'text-[#C14F4F]' : 'text-[#3A87AD]'}`}>
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
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Značka / Model</p>
                            <p className="text-xs font-medium text-white/80">{boiler.brand} {boiler.model}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Sériové číslo</p>
                            <p className="text-xs font-medium text-white/80">{boiler.serialNumber}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Dátum montáže</p>
                            <p className="text-xs font-medium text-white/80">{new Date(boiler.installDate).toLocaleDateString('sk-SK')}</p>
                          </div>
                          <div className="flex items-end justify-end">
                            <button 
                              onClick={() => onEditBoiler(boiler.id)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-white/60 rounded-xl text-xs font-bold hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <PenTool size={14} />
                              Upraviť údaje
                            </button>
                          </div>
                        </div>
                        {boiler.notes && (
                          <div className="p-3 bg-amber-500/10 rounded-xl text-xs text-amber-500 border border-amber-500/20">
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
                    className="btn-primary flex-1 justify-center py-2.5 text-sm shadow-md shadow-[#3A87AD]/20"
                  >
                    <Wrench size={16} />
                    Vykonať servis
                  </button>
                  <button 
                    onClick={() => toggleExpand(boiler.id)}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isExpanded ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-white/40 hover:border-[#3A87AD]/50 hover:text-[#3A87AD]'
                    }`}
                  >
                    <Info size={20} />
                  </button>
                </div>
              </div>

              <div className="bg-white/5 p-4 border-t border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <History size={14} /> História servisov
                    <span className="bg-white/10 text-white/60 px-1.5 py-0.5 rounded-md text-[10px]">
                      {boilerServices.length}
                    </span>
                  </h4>
                  <button 
                    onClick={() => toggleHistory(boiler.id)}
                    className="text-[10px] font-bold text-[#3A87AD] hover:bg-[#3A87AD]/10 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                  >
                    {showHistory[boiler.id] ? (
                      <>Skryť grafy <ChevronUp size={12} /></>
                    ) : (
                      <>História meraní <ChevronDown size={12} /></>
                    )}
                  </button>
                </div>
                
                <AnimatePresence>
                  {showHistory[boiler.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-6 overflow-hidden"
                    >
                      <MeasurementHistory services={boilerServices} />
                    </motion.div>
                  )}
                </AnimatePresence>
                
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
                            className="bg-white/5 p-2.5 rounded-lg border border-white/5 shadow-sm hover:border-[#3A87AD]/50 hover:bg-white/10 cursor-pointer transition-all"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white/80">{new Date(service.date).toLocaleDateString('sk-SK')}</span>
                                <Wrench 
                                  size={12} 
                                  className={isTimely ? 'text-emerald-400' : 'text-[#C14F4F]'} 
                                />
                              </div>
                              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-bold uppercase">
                                {service.status}
                              </span>
                            </div>
                            <p className="text-xs text-white/60 line-clamp-1">{service.taskPerformed}</p>
                          </div>
                        );
                      })}
                      
                      {boilerServices.length > 3 && (
                        <button 
                          onClick={() => toggleExpand(boiler.id)}
                          className="w-full py-1.5 text-[11px] font-bold text-[#3A87AD] hover:bg-[#3A87AD]/10 rounded-lg transition-colors flex items-center justify-center gap-1"
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
                    <p className="text-[11px] text-white/40 italic">Žiadna história záznamov.</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Map */}
      <div className="card p-0 overflow-hidden min-h-[300px] mt-8">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapIcon size={20} className="text-[#3A87AD]" />
            Mapa zariadení zákazníka
          </h2>
        </div>
        <div className="h-[300px] w-full relative z-0">
          <MapContainer 
            center={customerBoilers.length > 0 && customerBoilers[0].lat ? [customerBoilers[0].lat, customerBoilers[0].lng!] : [48.6690, 19.6990]} 
            zoom={customerBoilers.length > 0 ? 12 : 7} 
            style={{ height: '100%', width: '100%' }}
            className="dark-map"
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
    coValue: initialData?.coValue || 0,
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
    // New dynamic fields
    faultDescription: initialData?.faultDescription || '',
    faultFixed: initialData?.faultFixed || false,
    hasFlueGasAnalysis: initialData?.hasFlueGasAnalysis || (initialData?.taskPerformed === 'Porucha' || initialData?.taskPerformed === 'Iné'),
    spareParts: initialData?.spareParts || [],
    useAsInstallDate: false,
    showSpareParts: false,
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
  const [photoBefore, setPhotoBefore] = useState<string | null>(initialData?.photoBefore || null);
  const [photoAfter, setPhotoAfter] = useState<string | null>(initialData?.photoAfter || null);
  const [photoBoiler, setPhotoBoiler] = useState<string | null>(initialData?.photoBoiler || null);
  const [photoConnection, setPhotoConnection] = useState<string | null>(initialData?.photoConnection || null);
  const [photoChimney, setPhotoChimney] = useState<string | null>(initialData?.photoChimney || null);
  const [signed, setSigned] = useState(!!initialData);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.scrollTop = 0;
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = (type: string = 'photo') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          const path = `services/${boiler.id}/${Date.now()}_${file.name}`;
          const downloadURL = await uploadFile(file, path);
          if (type === 'photo') setPhoto(downloadURL);
          else if (type === 'photoBefore') setPhotoBefore(downloadURL);
          else if (type === 'photoAfter') setPhotoAfter(downloadURL);
          else if (type === 'photoBoiler') setPhotoBoiler(downloadURL);
          else if (type === 'photoConnection') setPhotoConnection(downloadURL);
          else if (type === 'photoChimney') setPhotoChimney(downloadURL);
        } catch (error) {
          console.error("Upload failed", error);
          alert("Nahrávanie zlyhalo. Skontrolujte pripojenie.");
        }
      }
    };
    input.click();
  };

  const removePhoto = (type: string) => {
    if (type === 'photo') setPhoto(null);
    else if (type === 'photoBefore') setPhotoBefore(null);
    else if (type === 'photoAfter') setPhotoAfter(null);
    else if (type === 'photoBoiler') setPhotoBoiler(null);
    else if (type === 'photoConnection') setPhotoConnection(null);
    else if (type === 'photoChimney') setPhotoChimney(null);
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
        <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-white">Nový servisný záznam</h1>
      </header>

      <div className="card p-6 space-y-6">
        <div className="bg-[#3A87AD]/10 p-4 rounded-xl flex items-start gap-3">
          <Info className="text-[#3A87AD] mt-0.5" size={20} />
          <div>
            <p className="font-bold text-[#3A87AD]">{boiler.brand} {boiler.model}</p>
            <p className="text-sm text-[#3A87AD]/70">S/N: {boiler.serialNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white/70">Dátum servisu</label>
            <input 
              type="date" 
              className="input-field" 
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-white/70">Vykonaná práca</label>
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
                      ? 'bg-[#3A87AD] border-[#3A87AD] text-white shadow-md shadow-[#3A87AD]/20' 
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-[#3A87AD]/50 hover:text-white'
                  }`}
                >
                  {task.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {formData.taskPerformed === 'Porucha' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-2">
              <label className="text-sm font-bold text-white/70">Popis poruchy</label>
              <textarea 
                className="input-field min-h-[80px]" 
                placeholder="Popíšte zistenú poruchu..."
                value={formData.faultDescription}
                onChange={(e) => setFormData({...formData, faultDescription: e.target.value})}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-[#3A87AD] bg-black/40 border-white/10" 
                  checked={formData.faultFixed} 
                  onChange={e => setFormData({...formData, faultFixed: e.target.checked})} 
                />
                <span className="text-sm font-bold text-white/70">Porucha odstránená</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-[#3A87AD] bg-black/40 border-white/10" 
                  checked={formData.hasFlueGasAnalysis} 
                  onChange={e => setFormData({...formData, hasFlueGasAnalysis: e.target.checked})} 
                />
                <span className="text-sm font-bold text-white/70">Analýza spalín</span>
              </label>
            </div>

            {formData.hasFlueGasAnalysis && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Max (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.co2Max} onChange={e => setFormData({...formData, co2Max: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">O2 Max (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.o2Max} onChange={e => setFormData({...formData, o2Max: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Min (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.co2Min} onChange={e => setFormData({...formData, co2Min: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">O2 Min (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.o2Min} onChange={e => setFormData({...formData, o2Min: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">CO (ppm)</label>
                  <input type="number" step="1" className="input-field py-1.5" value={formData.coValue} onChange={e => setFormData({...formData, coValue: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Tlak plynu (bar)</label>
                  <input type="number" step="0.01" className="input-field py-1.5" value={formData.gasPressure} onChange={e => setFormData({...formData, gasPressure: parseFloat(e.target.value)})} />
                </div>
              </div>
            )}

            {/* Spare Parts Accordion */}
            <div className="border border-white/10 rounded-2xl overflow-hidden">
              <button 
                type="button"
                onClick={() => setFormData({...formData, showSpareParts: !formData.showSpareParts})}
                className="w-full p-4 flex justify-between items-center bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="font-bold text-white flex items-center gap-2">
                  <Wrench size={18} className="text-[#3A87AD]" />
                  Použité náhradné diely
                </span>
                {formData.showSpareParts ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {formData.showSpareParts && (
                <div className="p-4 space-y-4 bg-black/20">
                  {formData.spareParts.map((part, index) => (
                    <div key={index} className="flex gap-2">
                      <input 
                        className="input-field flex-1" 
                        placeholder="Názov dielu" 
                        value={part.name}
                        onChange={e => {
                          const newParts = [...formData.spareParts];
                          newParts[index].name = e.target.value;
                          setFormData({...formData, spareParts: newParts});
                        }}
                      />
                      <input 
                        type="number" 
                        className="input-field w-20" 
                        placeholder="Ks" 
                        value={part.quantity}
                        onChange={e => {
                          const newParts = [...formData.spareParts];
                          newParts[index].quantity = parseInt(e.target.value) || 0;
                          setFormData({...formData, spareParts: newParts});
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const newParts = formData.spareParts.filter((_, i) => i !== index);
                          setFormData({...formData, spareParts: newParts});
                        }}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, spareParts: [...formData.spareParts, { name: '', quantity: 1 }]})}
                    className="w-full py-2 border border-dashed border-white/20 rounded-xl text-xs font-bold text-white/40 hover:text-white hover:border-white/40 transition-all"
                  >
                    + Pridať diel
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Foto Pred</label>
                <div className="relative aspect-video bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden">
                  {photoBefore ? (
                    <div className="relative w-full h-full group">
                      <img src={photoBefore} className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); removePhoto('photoBefore'); }} 
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => handlePhotoClick('photoBefore')} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Camera size={20} className="text-white/20" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Foto Po</label>
                <div className="relative aspect-video bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden">
                  {photoAfter ? (
                    <div className="relative w-full h-full group">
                      <img src={photoAfter} className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); removePhoto('photoAfter'); }} 
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => handlePhotoClick('photoAfter')} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Camera size={20} className="text-white/20" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {formData.taskPerformed === 'Inštalácia' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-[#3A87AD] bg-black/40 border-white/10" 
                  checked={formData.useAsInstallDate} 
                  onChange={e => setFormData({...formData, useAsInstallDate: e.target.checked})} 
                />
                <span className="text-sm font-bold text-white/70">Použiť ako dátum montáže</span>
              </label>
              <p className="text-[10px] text-white/30 mt-1 ml-6 italic">Prepíše pôvodný dátum inštalácie v dokumente zariadenia.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">Foto Kotol</label>
                <div className="relative aspect-square bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden">
                  {photoBoiler ? (
                    <>
                      <img src={photoBoiler} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto('photoBoiler')} className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <div onClick={() => handlePhotoClick('photoBoiler')} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Camera size={20} className="text-white/20" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">Foto Napojenie</label>
                <div className="relative aspect-square bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden">
                  {photoConnection ? (
                    <>
                      <img src={photoConnection} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto('photoConnection')} className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <div onClick={() => handlePhotoClick('photoConnection')} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Camera size={20} className="text-white/20" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">Foto Komín</label>
                <div className="relative aspect-square bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden">
                  {photoChimney ? (
                    <>
                      <img src={photoChimney} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto('photoChimney')} className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <div onClick={() => handlePhotoClick('photoChimney')} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Camera size={20} className="text-white/20" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {formData.taskPerformed === 'Iné' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="border-t border-white/5 pt-6">
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-[#3A87AD] bg-black/40 border-white/10" 
                  checked={formData.hasFlueGasAnalysis} 
                  onChange={e => setFormData({...formData, hasFlueGasAnalysis: e.target.checked})} 
                />
                <span className="text-sm font-bold text-white/70">Analýza spalín</span>
              </label>

              {formData.hasFlueGasAnalysis && (
                <div className="animate-in fade-in duration-300">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <PieChartIcon size={20} className="text-[#3A87AD]" />
                    Analýza spalín a tlaky
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Max (%)</label>
                      <input type="number" step="0.1" className="input-field py-1.5" value={formData.co2Max} onChange={e => setFormData({...formData, co2Max: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Min (%)</label>
                      <input type="number" step="0.1" className="input-field py-1.5" value={formData.co2Min} onChange={e => setFormData({...formData, co2Min: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">CO (ppm)</label>
                      <input type="number" step="1" className="input-field py-1.5" value={formData.coValue} onChange={e => setFormData({...formData, coValue: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">Účinnosť (%)</label>
                      <input type="number" step="0.1" className="input-field py-1.5" value={formData.efficiency} onChange={e => setFormData({...formData, efficiency: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">O2 Max (%)</label>
                      <input type="number" step="0.1" className="input-field py-1.5" value={formData.o2Max} onChange={e => setFormData({...formData, o2Max: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">O2 Min (%)</label>
                      <input type="number" step="0.1" className="input-field py-1.5" value={formData.o2Min} onChange={e => setFormData({...formData, o2Min: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">Tlak plynu (mbar)</label>
                      <input type="number" step="0.1" className="input-field py-1.5" value={formData.gasPressure} onChange={e => setFormData({...formData, gasPressure: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">Tlak exp. ÚK (bar)</label>
                      <input type="number" step="0.1" className="input-field py-1.5" value={formData.expansionTankPressureCH} onChange={e => setFormData({...formData, expansionTankPressureCH: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {formData.taskPerformed === 'Ročná prehliadka' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="border-t border-white/5 pt-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <PieChartIcon size={20} className="text-[#3A87AD]" />
                Analýza spalín a tlaky
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Max (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.co2Max} onChange={e => setFormData({...formData, co2Max: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Min (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.co2Min} onChange={e => setFormData({...formData, co2Min: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">CO (ppm)</label>
                  <input type="number" step="1" className="input-field py-1.5" value={formData.coValue} onChange={e => setFormData({...formData, coValue: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Účinnosť (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.efficiency} onChange={e => setFormData({...formData, efficiency: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">O2 Max (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.o2Max} onChange={e => setFormData({...formData, o2Max: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">O2 Min (%)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.o2Min} onChange={e => setFormData({...formData, o2Min: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Tlak plynu (mbar)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.gasPressure} onChange={e => setFormData({...formData, gasPressure: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Tlak exp. ÚK (bar)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.expansionTankPressureCH} onChange={e => setFormData({...formData, expansionTankPressureCH: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded text-[#3A87AD] bg-black/40 border-white/10" checked={formData.hasDHWExpansionTank} onChange={e => setFormData({...formData, hasDHWExpansionTank: e.target.checked})} />
                  <span className="text-sm font-bold text-white/70">Má TÚV exp.</span>
                </label>
                {formData.hasDHWExpansionTank && (
                  <div className="flex-1 flex items-center gap-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Tlak (bar)</label>
                    <input type="number" step="0.1" className="input-field py-1.5 w-24" value={formData.expansionTankPressureDHW} onChange={e => setFormData({...formData, expansionTankPressureDHW: parseFloat(e.target.value)})} />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-white/5 pt-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Info size={20} className="text-[#3A87AD]" />
                Chemické hodnoty ÚK
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Konduktivita (mS/cm)</label>
                  <input type="number" step="1" className="input-field py-1.5" value={formData.conductivity} onChange={e => setFormData({...formData, conductivity: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">PH ÚK</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.phCH} onChange={e => setFormData({...formData, phCH: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Tvrdosť ÚK (°dH)</label>
                  <input type="number" step="0.1" className="input-field py-1.5" value={formData.hardnessCH} onChange={e => setFormData({...formData, hardnessCH: parseFloat(e.target.value)})} />
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-[#3A87AD]" />
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
                  <div key={item.key} className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-xs font-bold text-white/80">{item.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, [item.key]: true})}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          formData[item.key as keyof typeof formData] === true 
                            ? 'bg-emerald-500 text-white shadow-sm' 
                            : 'bg-white/5 text-white/40 border border-white/10'
                        }`}
                      >
                        ÁNO
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, [item.key]: false})}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          formData[item.key as keyof typeof formData] === false 
                            ? 'bg-[#C14F4F] text-white shadow-sm' 
                            : 'bg-white/5 text-white/40 border border-white/10'
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
          <label className="text-sm font-bold text-white/70">Poznámky technika</label>
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
            <label className="text-sm font-bold text-white/70 flex items-center gap-2">
              <Camera size={18} /> Fotografia stavu
            </label>
            <div 
              onClick={() => handlePhotoClick('photo')}
              className="aspect-video bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all overflow-hidden"
            >
              {photo ? (
                <img src={photo} alt="Boiler" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="text-white/20 mb-2" size={32} />
                  <span className="text-xs font-medium text-white/40">Kliknite pre odfotenie</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-white/70 flex items-center gap-2">
              <PenTool size={18} /> Podpis zákazníka
            </label>
            <div className="bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden h-48">
              <SignatureCanvas 
                ref={sigCanvas}
                penColor="#3A87AD"
                canvasProps={{ className: "w-full h-full cursor-crosshair" }}
                onEnd={() => setSigned(true)}
              />
              <div className="absolute bottom-4 left-4 right-4 h-px bg-white/10 pointer-events-none"></div>
              <button 
                type="button"
                onClick={() => { sigCanvas.current?.clear(); setSigned(false); }}
                className="absolute top-2 right-2 p-1 bg-black/40 rounded-md text-xs font-bold text-white/40 hover:text-white transition-colors"
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
              const canvas = sigCanvas.current?.getCanvas();
              const signature = canvas ? trimCanvas(canvas).toDataURL('image/png') : undefined;
              onSubmit({
                ...formData, 
                status: ServiceStatus.COMPLETED, 
                photo: photo || undefined,
                photoBefore: photoBefore || undefined,
                photoAfter: photoAfter || undefined,
                photoBoiler: photoBoiler || undefined,
                photoConnection: photoConnection || undefined,
                photoChimney: photoChimney || undefined,
                signature
              });
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
        <h1 className="text-2xl font-bold text-white">Zásahy</h1>
        <p className="text-white/40">História všetkých servisných úkonov.</p>
      </header>

      <div className="bg-[#3A87AD] rounded-2xl p-6 text-white shadow-lg shadow-[#3A87AD]/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/60 text-sm font-medium uppercase tracking-wider">Celkový počet zásahov</p>
            <h2 className="text-4xl font-bold mt-1">{services.length}</h2>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <TrendingUp size={24} />
          </div>
        </div>
        
        <div className="h-24 w-full mt-4">
          <ResponsiveContainer width="100%" height={96}>
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
                      <div className="bg-[#1E1E1E] p-2 rounded-lg shadow-xl text-white text-xs font-bold border border-white/10">
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
        <div className="flex justify-between mt-2 text-[10px] text-white/40 font-bold uppercase tracking-widest">
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
              className="card p-4 flex items-center justify-between hover:border-[#3A87AD]/30 hover:bg-[#3A87AD]/5 cursor-pointer transition-all group"
            >
              <div 
                className="flex items-center gap-4 flex-1"
                onClick={() => onSelectService(service.id)}
              >
                <div className="w-12 h-12 bg-white/5 text-[#3A87AD] rounded-full flex items-center justify-center">
                  <Wrench size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        customer && onSelectCustomer(customer.id);
                      }}
                      className="font-bold text-white hover:text-[#3A87AD] transition-colors"
                    >
                      {customer?.name}
                    </button>
                    <span className="text-[10px] bg-[#3A87AD]/10 text-[#3A87AD] px-1.5 py-0.5 rounded-md font-bold uppercase">{boiler?.brand}</span>
                  </div>
                  <p className="text-sm text-white/40">{service.taskPerformed} • {new Date(service.date).toLocaleDateString('sk-SK')}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div className="hidden sm:block" onClick={() => onSelectService(service.id)}>
                  <p className="text-[10px] font-bold text-white/20 uppercase">Stav</p>
                  <span className="text-xs font-bold text-emerald-500">{service.status}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    customer && onSelectCustomer(customer.id);
                  }}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/20 hover:text-[#3A87AD]"
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

// --- Scanner Modal ---

const ScannerModal = ({ 
  onScan, 
  onClose 
}: { 
  onScan: (text: string) => void, 
  onClose: () => void 
}) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        
        const config = { fps: 10, qrbox: { width: 250, height: 150 } };
        
        await html5QrCode.start(
          { facingMode: "environment" }, 
          config, 
          (decodedText) => {
            onScan(decodedText);
            html5QrCode.stop().then(() => onClose());
          },
          (errorMessage) => {
            // Silently ignore scan errors
          }
        );
      } catch (err) {
        console.error("Scanner error:", err);
        setError("Nepodarilo sa spustiť kameru. Skontrolujte povolenia.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Stop error:", err));
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-md bg-[#1E1E1E] rounded-3xl overflow-hidden border border-white/10">
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Scan size={20} className="text-[#3A87AD]" />
            Skenovať S/N alebo čiarový kód
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div id="reader" className="w-full aspect-video bg-black rounded-2xl overflow-hidden"></div>
          {error && <p className="text-red-400 text-xs mt-4 text-center">{error}</p>}
          <p className="text-white/40 text-[10px] mt-4 text-center italic">
            Namierte kameru na čiarový kód alebo výrobné číslo na štítku.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Boiler Detail Modal ---

const BoilerDetailModal = ({ 
  boiler, 
  services,
  onClose,
  onSelectService
}: { 
  boiler: Boiler, 
  services: ServiceRecord[],
  onClose: () => void,
  onSelectService: (id: string) => void
}) => {
  const boilerServices = services
    .filter(s => s.boilerId === boiler.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-[#1E1E1E] rounded-3xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#3A87AD]/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#3A87AD]/20 rounded-2xl flex items-center justify-center text-[#3A87AD]">
              <Wrench size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{boiler.brand} {boiler.model}</h2>
              <p className="text-sm text-white/40">S/N: {boiler.serialNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Photos Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Kotol</p>
              <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                {boiler.photos?.overall ? (
                  <img src={boiler.photos.overall} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10 italic text-xs">Bez foto</div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Napojenie</p>
              <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                {boiler.photos?.connection ? (
                  <img src={boiler.photos.connection} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10 italic text-xs">Bez foto</div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Komín</p>
              <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                {boiler.photos?.chimney ? (
                  <img src={boiler.photos.chimney} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10 italic text-xs">Bez foto</div>
                )}
              </div>
            </div>
          </div>

          {/* History Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <History size={20} className="text-[#3A87AD]" />
              História servisov
            </h3>
            <div className="space-y-3">
              {boilerServices.length > 0 ? (
                boilerServices.map(service => (
                  <div 
                    key={service.id} 
                    onClick={() => onSelectService(service.id)}
                    className="card p-4 flex items-center justify-between hover:border-[#3A87AD]/30 hover:bg-[#3A87AD]/5 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 text-white/60 rounded-xl flex items-center justify-center font-bold text-xs">
                        {new Date(service.date).toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' })}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{service.taskPerformed}</h4>
                        <p className="text-xs text-white/40">{service.status} • {service.technicianNotes?.substring(0, 50)}...</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-white/20 group-hover:text-[#3A87AD]" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/20 italic text-center py-8">Žiadne servisné záznamy.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContactsList = ({ 
  contacts,
  onAddContact,
  onEditContact
}: { 
  contacts: Contact[],
  onAddContact: () => void,
  onEditContact: (contact: Contact) => void
}) => {
  const [search, setSearch] = useState('');

  const filteredContacts = contacts.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.specialization || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Kontakty</h1>
        <button onClick={onAddContact} className="btn-primary">
          <Plus size={20} />
          <span>Nový kontakt</span>
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
        <input 
          type="text" 
          placeholder="Hľadať v kontaktoch..." 
          className="input-field pl-12"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map(contact => (
          <div 
            key={contact.id} 
            className="card p-5 space-y-4 hover:border-[#3A87AD]/30 transition-all group"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#3A87AD]/10 text-[#3A87AD] rounded-xl flex items-center justify-center font-bold">
                  {contact.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-white">{contact.name}</h3>
                  <p className="text-xs text-[#3A87AD] font-medium uppercase tracking-wider">{contact.specialization}</p>
                </div>
              </div>
              <button 
                onClick={() => onEditContact(contact)}
                className="p-2 text-white/20 hover:text-white/60 hover:bg-white/5 rounded-lg transition-all"
              >
                <PenTool size={16} />
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-sm text-white/60 hover:text-[#3A87AD] transition-colors">
                <Phone size={16} className="text-white/20" />
                {contact.phone}
              </a>
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm text-white/60 hover:text-[#3A87AD] transition-colors">
                  <Info size={16} className="text-white/20" />
                  {contact.email}
                </a>
              )}
              {contact.address && (
                <div className="flex items-start gap-3 text-sm text-white/60">
                  <MapPin size={16} className="text-white/20 mt-0.5" />
                  <span>{contact.address}</span>
                </div>
              )}
            </div>

            {contact.notes && (
              <div className="bg-white/5 rounded-lg p-3 text-xs text-white/40 italic">
                {contact.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ContactModal = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  onUpdate,
  onDelete,
  editingContact
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onAdd: (contact: Omit<Contact, 'id'>) => void, 
  onUpdate: (id: string, contact: Partial<Contact>) => void,
  onDelete: (id: string) => void,
  editingContact: Contact | null
}) => {
  const [contact, setContact] = useState({ name: '', specialization: '', phone: '', email: '', address: '', notes: '' });

  useEffect(() => {
    if (isOpen) {
      if (editingContact) {
        setContact({
          name: editingContact.name,
          specialization: editingContact.specialization,
          phone: editingContact.phone,
          email: editingContact.email || '',
          address: editingContact.address || '',
          notes: editingContact.notes || ''
        });
      } else {
        setContact({ name: '', specialization: '', phone: '', email: '', address: '', notes: '' });
      }
    }
  }, [isOpen, editingContact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContact) {
      onUpdate(editingContact.id, contact);
    } else {
      onAdd(contact);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="card w-full max-w-md p-6 relative z-10 overflow-y-auto max-h-[90vh]"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {editingContact ? 'Upraviť kontakt' : 'Nový kontakt'}
          </h2>
          {editingContact && (
            <button 
              type="button"
              onClick={() => onDelete(editingContact.id)}
              className="p-2 text-white hover:bg-red-500 rounded-xl transition-all"
              title="Vymazať kontakt"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Meno / Názov</label>
            <input 
              required
              className="input-field" 
              value={contact.name}
              onChange={e => setContact({...contact, name: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Špecializácia (značka/odbor)</label>
            <input 
              required
              placeholder="napr. Servisný technik, Predajňa..."
              className="input-field" 
              value={contact.specialization}
              onChange={e => setContact({...contact, specialization: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-white/70">Telefón</label>
              <input 
                required
                className="input-field" 
                value={contact.phone}
                onChange={e => setContact({...contact, phone: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-white/70">Email</label>
              <input 
                type="email"
                className="input-field" 
                value={contact.email}
                onChange={e => setContact({...contact, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Adresa</label>
            <input 
              className="input-field" 
              value={contact.address}
              onChange={e => setContact({...contact, address: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Poznámka</label>
            <textarea 
              className="input-field min-h-[80px]" 
              value={contact.notes}
              onChange={e => setContact({...contact, notes: e.target.value})}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Zrušiť</button>
            <button type="submit" className="btn-primary flex-1">Uložiť</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const DeleteConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void,
  title: string,
  message: string
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card w-full max-w-md p-6 space-y-6"
      >
        <div className="flex items-center gap-4 text-[#C14F4F]">
          <div className="w-12 h-12 bg-[#C14F4F]/10 rounded-full flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        
        <p className="text-white/60">{message}</p>

        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Zrušiť</button>
          <button onClick={onConfirm} className="btn-primary bg-[#C14F4F] hover:bg-[#C14F4F]/80 border-[#C14F4F] flex-1 justify-center shadow-[#C14F4F]/20">
            Odstrániť
          </button>
        </div>
      </motion.div>
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
  const lastScrollY = useRef(0);

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

  const [data, setData] = useState<{
    customers: Customer[],
    boilers: Boiler[],
    services: ServiceRecord[],
    contacts: Contact[]
  }>({
    customers: [],
    boilers: [],
    services: [],
    contacts: []
  });

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
      // Clean data to remove undefined values
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
          status: serviceData.status || ServiceStatus.COMPLETED,
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

        // If task is installation and useAsInstallDate is true, update installDate
        if (newService.taskPerformed === 'Inštalácia' && (newService as any).useAsInstallDate) {
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
      
      // Clean customer data
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
        
        // Clean boiler data
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

  const handleDeleteCustomer = async (id: string) => {
    setCustomerToDeleteId(id);
    setIsDeleteConfirmOpen(true);
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
      setEditingContactId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'contacts');
    }
  };

  const handleUpdateContact = async (id: string, contactData: Partial<Contact>) => {
    try {
      const contactRef = doc(db, 'contacts', id);
      await updateDoc(contactRef, contactData);
      setIsContactModalOpen(false);
      setEditingContactId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'contacts');
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
        
        await deleteDoc(doc(db, 'customers', id));
        const customerBoilers = data.boilers.filter(b => b.customerId === id);
        for (const boiler of customerBoilers) {
          await deleteDoc(doc(db, 'boilers', boiler.id));
          const boilerServices = data.services.filter(s => s.boilerId === boiler.id);
          for (const service of boilerServices) {
            await deleteDoc(doc(db, 'services', service.id));
          }
        }
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

        await deleteDoc(doc(db, 'boilers', id));
        const boilerServices = data.services.filter(s => s.boilerId === id);
        for (const service of boilerServices) {
          await deleteDoc(doc(db, 'services', service.id));
        }
      } else if (contactToDeleteId) {
        const id = contactToDeleteId;
        setContactToDeleteId(null);
        setIsContactModalOpen(false);
        setEditingContactId(null);
        setIsDeleteConfirmOpen(false);

        await deleteDoc(doc(db, 'contacts', id));
      } else if (serviceToDeleteId) {
        const id = serviceToDeleteId;
        setServiceToDeleteId(null);
        setSelectedServiceId(null);
        setIsDeleteConfirmOpen(false);

        await deleteDoc(doc(db, 'services', id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'data');
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
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar 
          activeTab={activeTab === 'customerDetail' || activeTab === 'serviceForm' ? 'customers' : activeTab} 
          setActiveTab={setActiveTab} 
          isVisible={shouldShowSidebar}
        />
        
        <main className="flex-1 p-4 sm:p-6 md:p-10 pb-24 md:pb-10 max-w-5xl mx-auto w-full overflow-y-auto relative">
          {/* Mobile Logo Visibility */}
          <div className="md:hidden flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <img 
                src="/logo.png" 
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/logo/200/200'; }}
                alt="Logo" 
                className="h-8 w-auto object-contain" 
                referrerPolicy="no-referrer" 
              />
              <span className="text-[#3A87AD] font-bold text-lg">SP Therm s.r.o.</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-white/60 hover:text-white transition-colors"
              title="Odhlásiť sa"
            >
              <ArrowLeft size={20} />
            </button>
          </div>

          <div className="hidden md:flex justify-end md:absolute md:top-6 md:right-10">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors text-sm font-medium"
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
