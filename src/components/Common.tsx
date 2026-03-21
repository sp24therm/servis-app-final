import React, { Component, useState, useEffect, useRef } from 'react';
import { 
  AlertCircle, 
  Wrench, 
  LayoutDashboard, 
  Users, 
  History, 
  Phone, 
  Search, 
  MapPin, 
  X, 
  Camera 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Boiler } from '../types';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { Html5Qrcode } from 'html5-qrcode';

// --- Error Boundary ---
export class ErrorBoundary extends Component<any, any> {
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
export const Login = ({ onLogin }: { onLogin: () => void }) => {
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

// --- Sidebar Component ---
export const Sidebar = ({ activeTab, setActiveTab, isVisible }: { activeTab: string, setActiveTab: (tab: string) => void, isVisible: boolean }) => {
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

// --- MapBounds Component ---
export const MapBounds = ({ boilers }: { boilers: Boiler[] }) => {
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

// --- AddressSearch Component ---
export const AddressSearch = ({ 
  value, 
  onChange, 
  onSelect,
  autoOpen = false
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
    if (ignoreNext) {
      setIgnoreNext(false);
      return;
    }

    if (value.length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&countrycodes=sk`);
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative">
      <div className="relative">
        <input 
          type="text" 
          className="input-field pr-10" 
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Hľadať adresu..."
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20">
          {loading ? (
            <div className="w-4 h-4 border-2 border-[#3A87AD]/30 border-t-[#3A87AD] rounded-full animate-spin" />
          ) : (
            <Search size={16} />
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E1E1E] border border-white/10 rounded-xl shadow-2xl z-[110] max-h-[200px] overflow-y-auto">
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

// --- ScannerModal Component ---
export const ScannerModal = ({ onScan, onClose }: { onScan: (text: string) => void, onClose: () => void }) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            onScan(decodedText);
            scanner.stop();
          },
          () => {} // Ignore errors
        );
      } catch (err) {
        console.error(err);
        setError("Nepodarilo sa spustiť kameru. Skontrolujte povolenia.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-between items-center text-white">
          <h3 className="font-bold">Skenovať čiarový kód</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X size={24} />
          </button>
        </div>
        
        <div id="reader" className="w-full aspect-square bg-black rounded-2xl overflow-hidden border border-white/10"></div>
        
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-500 text-sm text-center">
            {error}
          </div>
        )}
        
        <p className="text-white/40 text-xs text-center">
          Namierte kameru na čiarový kód alebo sériové číslo na štítku kotla.
        </p>
      </div>
    </div>
  );
};
