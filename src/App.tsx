/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Snowflake, 
  MapPin, 
  Wrench, 
  Phone, 
  Mail, 
  ChevronRight, 
  X,
  CheckCircle2,
  AlertCircle,
  Droplets,
  Zap,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Navigation,
  Search,
  MessageSquare,
  CalendarPlus,
  Trash2,
  Edit3,
  Bell,
  LogOut,
  User,
  Clock,
  Settings
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  onSnapshot, 
  doc, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  getDocFromServer,
  serverTimestamp,
  writeBatch,
  orderBy,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth } from './firebase';
import { Toaster, toast } from 'sonner';
import { BookingStep1 } from './components/BookingStep1';
import { DiagnosticSection } from './components/DiagnosticSection';
import { useLeadCapture } from './hooks/useLeadCapture';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Constants
const LAB_COORDS: [number, number] = [48.36, 16.97];
const STUPAVA_COORDS: [number, number] = [48.27, 17.03];

type Season = 'summer' | 'winter';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [view, setView] = useState<'user' | 'admin'>('user');
  
  const [hasLead, setHasLead] = useState(() => !!localStorage.getItem('leadId'));
  const { updateLead, clearLeadId } = useLeadCapture();

  const [currentView, setCurrentView] = useState<'user' | 'admin'>('user');
  const [season, setSeason] = useState<Season>('summer');
  const [isWinter, setIsWinter] = useState<boolean>(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [transportPrice, setTransportPrice] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Digital Technician State
  const [techStep, setTechStep] = useState(0); // 0: Welcome, 1: Input, 2: Result
  const [errorCode, setErrorCode] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Atag');
  const [techResult, setTechResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Booking State
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingAddress, setBookingAddress] = useState('');
  const [bookingBrand, setBookingBrand] = useState('');
  const [bookingDescription, setBookingDescription] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const DEFAULT_CALENDAR_CONFIG = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  const [calendarConfig, setCalendarConfig] = useState<string[]>(DEFAULT_CALENDAR_CONFIG);
  const [takenSlots, setTakenSlots] = useState<{date: string, time: string}[]>([]);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Flushing Calculator State
  const [circuits, setCircuits] = useState(1);

  // Auto-detect season on mount & Listen to Firebase
  useEffect(() => {
    // Auth listener
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && u.email === 'scepanpeter@gmail.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        setView('user');
      }
    });

    // Local auto-detection as fallback - Default to summer as requested
    setSeason('summer');

    // Firebase Real-time listener for season and calendar
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.isWinter !== undefined) {
          setIsWinter(data.isWinter);
          setSeason(data.isWinter ? 'winter' : 'summer');
        }
        if (data.calendarConfig && Array.isArray(data.calendarConfig)) {
          setCalendarConfig(data.calendarConfig);
        } else {
          setCalendarConfig(DEFAULT_CALENDAR_CONFIG);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    // Listen to taken slots
    const unsubSlots = onSnapshot(collection(db, 'slots'), (snapshot) => {
      const slots = snapshot.docs.map(doc => doc.data() as {date: string, time: string});
      setTakenSlots(slots);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'slots');
    });

    // Listen to bookings if admin
    let unsubBookings = () => {};
    if (isAdmin) {
      const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
      unsubBookings = onSnapshot(q, (snapshot) => {
        const b = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBookings(b);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'bookings');
      });
    }

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    return () => {
      unsubAuth();
      unsubSettings();
      unsubSlots();
      unsubBookings();
    };
  }, [isAdmin]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Prihlásenie úspešné');
    } catch (error) {
      console.error(error);
      toast.error('Chyba pri prihlásení');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Odhlásenie úspešné');
    } catch (error) {
      console.error(error);
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { status });
      toast.success('Aktualizované');
    } catch (error) {
      console.error(error);
      toast.error('Chyba pri aktualizácii');
    }
  };

  const cancelBooking = async (id: string, date: string, time: string) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'bookings', id), { status: 'cancelled' });
      
      // Find and delete the slot
      const slotsRef = collection(db, 'slots');
      const q = query(slotsRef, where('date', '==', date), where('time', '==', time));
      const snapshot = await getDocs(q);
      snapshot.forEach((d) => {
        batch.delete(d.ref);
      });
      
      await batch.commit();
      toast.success('Objednávka zrušená a slot uvoľnený');
    } catch (error) {
      console.error(error);
      toast.error('Chyba pri rušení');
    }
  };

  const sendConfirmationSms = (booking: any) => {
    const text = `Dobrý deň ${booking.name}, potvrdzujeme Váš termín servisu na ${booking.preferredDate} o ${booking.preferredTime}. S pozdravom, SP Therm.`;
    window.location.href = `sms:${booking.phone}?&body=${encodeURIComponent(text)}`;
    updateBookingStatus(booking.id, 'confirmed');
  };

  const addToCalendar = (booking: any) => {
    const start = booking.preferredDate.replace(/-/g, '') + 'T' + booking.preferredTime.replace(':', '') + '00';
    const end = booking.preferredDate.replace(/-/g, '') + 'T' + (parseInt(booking.preferredTime.split(':')[0]) + 1).toString().padStart(2, '0') + booking.preferredTime.split(':')[1].replace(':', '') + '00';
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:Servis kotla - ${booking.name}`,
      `DESCRIPTION:Servis pre ${booking.name}\\nTel: ${booking.phone}\\nAdresa: ${booking.address}\\nZnačka: ${booking.boilerBrand}\\nPoznámka: ${booking.notes}`,
      `LOCATION:${booking.address}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `servis_${booking.preferredDate}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Udalosť vygenerovaná');
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Upozornenia povolené');
      } else {
        toast.error('Upozornenia zamietnuté');
      }
    } catch (error) {
      console.error(error);
      toast.error('Chyba pri povolení upozornení');
    }
  };

  const seasonConfig = {
    summer: {
      accent: 'text-flame-red',
      bgAccent: 'bg-flame-red',
      borderAccent: 'border-flame-red/30',
      icon: <Sun className="w-6 h-6 text-flame-red" />,
      price: 85,
      label: 'Letná sezóna',
      blueDetail: 'text-light-blue'
    },
    winter: {
      accent: 'text-light-blue',
      bgAccent: 'bg-light-blue',
      borderAccent: 'border-light-blue/30',
      icon: <Snowflake className="w-6 h-6 text-light-blue" />,
      price: 105,
      label: 'Zimná sezóna'
    }
  };

  const currentTheme = seasonConfig[season];

  // ATAG Error Categories
  const ATAG_CATEGORIES = {
    pressure: {
      codes: ['108', '109', '1P4'],
      title: 'Problém s tlakom vody.',
      instruction: 'Skontrolujte tlakomer (ideálne 1.5 bar). Pri nízkom tlaku opatrne dopustite vodu ventilom pod kotlom. Pri vysokom odvzdušnite radiátor. Potom stlačte RESET.',
      action: 'Resetované, skúsiť znova',
      type: 'warning'
    },
    ignition: {
      codes: ['304', '501', '504', '5P1', '5P2', '5P3'],
      title: 'Dočasná chyba zapaľovania.',
      instruction: 'Kotol sa nepodarilo zapáliť. Stlačte tlačidlo RESET. Pozor: Ak ste RESET stlačili 5x za 15 minút (kód 304), systém sa zablokoval. Počkajte 15 minút na automatické uvoľnenie.',
      action: 'Resetované, skúsiť znova',
      type: 'warning'
    },
    sensors: {
      codes: ['102', '110', '112', '114', '201', '203', '205'],
      title: 'Porucha interného snímača.',
      instruction: 'Detegovaná technická chyba merania. Vlastná oprava nie je možná. Odporúčame kotol vypnúť a objednať náš autorizovaný servis.',
      action: 'OBJEDNAŤ SERVIS',
      type: 'error'
    },
    hardware: {
      codes: ['101', '104', '105', '142', '143', '144', '209', '303', '306', '309', '411', '612'],
      title: 'Závažná technická porucha komponentu.',
      instruction: 'Zlyhanie kľúčového dielu (ventilátor, čerpadlo alebo doska). Prosím, nepokúšajte sa o opravu, vypnite prívod elektriny a kontaktujte technika.',
      action: 'OBJEDNAŤ SERVIS',
      type: 'critical'
    }
  };

  const handleTechCheck = async () => {
    setIsSearching(true);
    const code = errorCode.toUpperCase().trim();
    
    try {
      const q = query(
        collection(db, 'errorCodes'), 
        where('code', '==', code),
        where('brand', '==', selectedBrand),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setTechResult(querySnapshot.docs[0].data());
      } else {
        setTechResult(null);
      }
      setTechStep(2);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'errorCodes');
    } finally {
      setIsSearching(false);
    }
  };

  const brands = [
    { name: 'ATAG' },
    { name: 'QUANTUM' },
    { name: 'BAXI' },
    { name: 'IMMERGAS' },
    { name: 'INTERGAS' },
    { name: 'VIESSMANN' },
    { name: 'WARMHAUS' }
  ];

  // Haversine formula for distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    const distLab = calculateDistance(lat, lng, LAB_COORDS[0], LAB_COORDS[1]);
    const distStupava = calculateDistance(lat, lng, STUPAVA_COORDS[0], STUPAVA_COORDS[1]);
    const minDistance = Math.min(distLab, distStupava);
    setDistance(minDistance);

    let price = 0;
    if (minDistance <= 15) price = 10;
    else if (minDistance <= 20) price = 20;
    else if (minDistance <= 30) price = 20 + (minDistance - 20) * 1;
    else price = 30 + (minDistance - 30) * 2;

    setTransportPrice(Math.round(price));
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert('Geolokácia nie je podporovaná vaším prehliadačom.');
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      handleLocationSelect(latitude, longitude);
      setIsMapOpen(true);
    }, (error) => {
      console.error('Geolocation error:', error);
      setIsMapOpen(true); // Still open map if geolocation fails
    });
  };

  return (
    <div className="min-h-screen relative selection:bg-white/20">
      <Toaster position="top-center" theme="dark" richColors />
      <div className="mesh-gradient" />
      
      {currentView === 'admin' && isAdmin ? (
        <AdminDashboard 
          bookings={bookings} 
          onClose={() => setCurrentView('user')}
          onConfirm={sendConfirmationSms}
          onCancel={cancelBooking}
          onUpdateStatus={updateBookingStatus}
          onAddToCalendar={addToCalendar}
          onNotify={requestNotificationPermission}
          onLogout={handleLogout}
        />
      ) : (
        <>
          {/* Navigation */}
          <nav className="fixed top-0 w-full z-50 p-6 flex justify-between items-center backdrop-blur-md border-b border-white/5 bg-dark-blue/80">
            <div className="flex items-center gap-2">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl bg-flame-red text-white")}>
                SP
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Therm</span>
            </div>
            
            <div className="flex items-center gap-4">
              <a href="tel:0944591521" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-light-blue" />
                <span className="text-sm font-bold hidden sm:inline">0944 591 521</span>
              </a>
              <a href="#order" className={cn("px-6 py-2 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 bg-flame-red text-white")}>
                Rezervovať termín
              </a>
            </div>
          </nav>

          {/* Hero Section */}
          <section className="pt-48 pb-20 px-6 max-w-7xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl mx-auto"
            >
              <h1 className="text-5xl sm:text-7xl font-bold leading-tight mb-6 text-white">
                Váš partner pre <br />
                <span className="text-flame-red">tepelnú pohodu.</span>
              </h1>
              <p className="text-xl text-white/60 mb-10 leading-relaxed">
                Pripravujeme pre vás novú webovú stránku. Sme vám však plne k dispozícii pre servis, opravy a inštalácie v regióne Láb, Stupava a okolie.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href="#order" className="px-10 py-5 rounded-2xl font-bold flex items-center gap-2 bg-flame-red text-white shadow-lg shadow-flame-red/20 hover:scale-105 transition-transform">
                  Rezervovať termín
                </a>
                <a href="tel:0944591521" className="glass-card px-10 py-5 rounded-2xl font-bold flex items-center gap-2 hover:bg-white/10 transition-colors border-light-blue/30 text-light-blue">
                  📞 0944 591 521
                </a>
              </div>
            </motion.div>
          </section>

          {/* Brands Section */}
          <section className="py-16 px-6 border-y border-white/5 bg-white/[0.02]">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-xs font-bold mb-10 text-center text-white/30 uppercase tracking-[0.3em]">Servisujeme značky</h2>
              <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12">
                {brands.map(brand => (
                  <div key={brand.name} className="px-6 py-3 rounded-xl border border-white/5 bg-white/5">
                    <span className="text-lg font-bold tracking-tighter text-white/60">{brand.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Our Services */}
          <section id="services" className="py-24 px-6 max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 tracking-tight text-white">Naše služby</h2>
              <p className="text-light-blue text-lg">Profesionálna starostlivosť o váš vykurovací systém.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Servis kotlov', desc: 'Pravidelné revízie a opravy pre bezpečnú prevádzku.', icon: <Wrench className="w-6 h-6" /> },
                { title: 'Preplach kúrenia', desc: 'Zvyšovanie efektivity sústavy a úspora nákladov.', icon: <Droplets className="w-6 h-6" /> },
                { title: 'Montáž regulácie', desc: 'Inteligentné riadenie teploty pre váš komfort.', icon: <Zap className="w-6 h-6" /> },
                { title: 'Inštalácia a výmeny', desc: 'Odborná montáž nových kotlov a výmena starých.', icon: <CheckCircle2 className="w-6 h-6" /> }
              ].map((service, i) => (
                <div key={i} className="glass-card p-8 border-light-blue/20 hover:border-light-blue/40 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-light-blue/10 flex items-center justify-center mb-6 text-light-blue group-hover:bg-light-blue group-hover:text-white transition-all">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{service.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{service.desc}</p>
                </div>
              ))}
            </div>
          </section>

      {/* Pricing Section */}
      <section id="pricing" className="whitespace-section px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">Transparentný Cenník</h2>
          <p className="text-white/50 text-lg">Prémiové služby za férové ceny.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Service Card */}
          <div className="glass-card p-10 flex flex-col relative group">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-2xl font-bold tracking-tight">Letný servis</h3>
              <Sun className="w-6 h-6 text-flame-red" />
            </div>
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-5xl font-bold tracking-tighter text-white">85 €</span>
                <span className="text-xl text-white/20 line-through">105 €</span>
                <div className="bg-light-blue text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  Letná AKCIA
                </div>
              </div>
              <span className="text-white/40 block">Kompletná prehliadka pred sezónou</span>
            </div>
            <ul className="space-y-5 mb-10 flex-1">
              {['Čistenie horáka', 'Kontrola expanznej nádoby', 'Nastavenie parametrov', 'Kontrola tesnosti'].map(item => (
                <li key={item} className="flex items-center gap-4 text-white/70">
                  <CheckCircle2 className="w-5 h-5 text-light-blue shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="pt-8 border-t border-white/5">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-sm">Doprava: od 10 €</span>
                  <button 
                    onClick={handleGeolocation}
                    className="text-sm font-bold flex items-center gap-2 text-light-blue hover:opacity-80 transition-opacity"
                  >
                    <Navigation className="w-4 h-4" /> Vypočítať dopravu
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Installation Card */}
          <div className="glass-card p-10 flex flex-col border-white/20">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-2xl font-bold tracking-tight">Inštalácia kotla</h3>
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <div className="mb-10">
              <span className="text-white/40 block mb-1">Cena od</span>
              <span className="text-5xl font-bold tracking-tighter">1400 €</span>
            </div>
            <ul className="space-y-5 mb-10 flex-1">
              {['Demontáž starého kotla', 'Montáž nového zariadenia', 'Pripojenie na systém', 'Uvedenie do prevádzky'].map(item => (
                <li key={item} className="flex items-center gap-4 text-white/70">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <a href="#order" className="w-full py-4 rounded-2xl bg-white text-black font-bold text-center hover:bg-white/90 transition-colors">
              Nezáväzný dopyt
            </a>
          </div>

          {/* Flushing Card */}
          <div className="glass-card p-10 flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-2xl font-bold tracking-tight">Preplach kúrenia</h3>
              <Droplets className="w-6 h-6 text-blue-400" />
            </div>
            <div className="mb-10">
              <span className="text-5xl font-bold tracking-tighter">{circuits * 15} €</span>
              <span className="text-white/40 ml-3 text-lg">({circuits} okruhov)</span>
            </div>
            <div className="space-y-8 mb-10 flex-1">
              <div className="space-y-4">
                <div className="flex justify-between text-sm font-bold uppercase tracking-widest text-white/40">
                  <span>Počet okruhov</span>
                  <span className="text-white">{circuits}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  value={circuits}
                  onChange={(e) => setCircuits(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
              <p className="text-sm text-white/50 leading-relaxed">
                Nánosy kalu znižujú účinnosť až o 15% a preplach predlžuje životnosť čerpadla v kotli.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section id="order" className="whitespace-section px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">Objednať servis</h2>
            <p className="text-white/50 text-lg">Vyberte si termín, ktorý vám vyhovuje.</p>
          </div>
          
          <div className="glass-card p-8 sm:p-12 relative overflow-hidden">
            <div className={cn("absolute top-0 left-0 w-1 h-full", currentTheme.bgAccent)} />
            
            {bookingStatus === 'success' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-3xl font-bold">Požiadavka bola odoslaná</h3>
                <p className="text-white/60 max-w-md mx-auto text-lg">
                  Náš technik Vám čoskoro potvrdí termín SMS správou. Ďakujeme za prejavenú dôveru.
                </p>
                <button 
                  onClick={() => setBookingStatus('idle')}
                  className="px-8 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  Nová objednávka
                </button>
              </motion.div>
            ) : !hasLead ? (
              <BookingStep1 
                onComplete={() => setHasLead(true)}
                setBookingName={setBookingName}
                setBookingPhone={setBookingPhone}
              />
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!bookingName || !bookingPhone || !bookingDate || !bookingTime) return;
                setBookingStatus('submitting');
                setBookingError(null);

                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('TIMEOUT')), 10000)
                );

                try {
                  const batch = writeBatch(db);
                  const bookingRef = doc(collection(db, 'bookings'));
                  const slotRef = doc(collection(db, 'slots'));
                  
                  batch.set(bookingRef, {
                    name: bookingName,
                    phone: bookingPhone,
                    address: bookingAddress,
                    boilerBrand: bookingBrand,
                    notes: bookingDescription,
                    preferredDate: bookingDate,
                    preferredTime: bookingTime,
                    serviceType: 'Oprava/Servis',
                    status: 'pending',
                    createdAt: new Date().toISOString()
                  });
                  
                  batch.set(slotRef, {
                    date: bookingDate,
                    time: bookingTime
                  });
                  
                  await Promise.race([
                    batch.commit(),
                    timeoutPromise
                  ]);

                  setBookingStatus('success');
                  
                  // Update lead status
                  try {
                    const lId = localStorage.getItem('leadId');
                    if (lId) {
                      await updateLead(lId, {
                        address: bookingAddress,
                        boilerBrand: bookingBrand,
                        date: bookingDate,
                        time: bookingTime,
                        issue: bookingDescription,
                        status: 'completed'
                      });
                      clearLeadId();
                    }
                  } catch (e) {
                    console.error('Failed to update lead:', e);
                  }

                  // Reset form
                  setBookingName('');
                  setBookingPhone('');
                  setBookingAddress('');
                  setBookingBrand('');
                  setBookingDescription('');
                  setBookingDate('');
                  setBookingTime('');
                } catch (error: any) {
                  setBookingStatus('idle');
                  if (error.message === 'TIMEOUT') {
                    setBookingError('Chyba spojenia so serverom. Skontrolujte pripojenie alebo nás kontaktujte telefonicky.');
                  } else {
                    setBookingError('Vyskytla sa neočakávaná chyba. Skúste to neskôr.');
                    handleFirestoreError(error, OperationType.CREATE, 'bookings');
                  }
                }
              }} className="grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  {bookingError && (
                    <div className="md:col-span-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-medium">{bookingError}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-widest text-white/40">Meno a priezvisko *</label>
                    <input 
                      required
                      type="text" 
                      value={bookingName}
                      onChange={(e) => setBookingName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-white/30 transition-colors"
                      placeholder="Ján Novák"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-widest text-white/40">Telefónne číslo *</label>
                    <input 
                      required
                      type="tel" 
                      value={bookingPhone}
                      onChange={(e) => setBookingPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-white/30 transition-colors"
                      placeholder="+421 900 000 000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-widest text-white/40">Adresa</label>
                    <input 
                      type="text" 
                      value={bookingAddress}
                      onChange={(e) => setBookingAddress(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-white/30 transition-colors"
                      placeholder="Ulica, Mesto"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-widest text-white/40">Značka kotla</label>
                    <select 
                      value={bookingBrand}
                      onChange={(e) => setBookingBrand(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-white/30 transition-colors appearance-none"
                    >
                      <option value="" className="bg-black">Vyberte značku</option>
                      {brands.map(b => <option key={b.name} value={b.name} className="bg-black">{b.name}</option>)}
                      <option value="Iná" className="bg-black">Iná</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold uppercase tracking-widest text-white/40">Dátum *</label>
                      <input 
                        required
                        type="date" 
                        min={new Date().toISOString().split('T')[0]}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-white/30 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold uppercase tracking-widest text-white/40">Čas *</label>
                      <select 
                        required
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-white/30 transition-colors appearance-none"
                      >
                        <option value="" className="bg-black">Vyberte čas</option>
                        {(Array.isArray(calendarConfig) ? calendarConfig : DEFAULT_CALENDAR_CONFIG).map(time => {
                          const isTaken = takenSlots.some(s => s.date === bookingDate && s.time === time);
                          return (
                            <option 
                              key={time} 
                              value={time} 
                              disabled={isTaken}
                              className={cn("bg-black", isTaken && "text-white/20")}
                            >
                              {time} {isTaken ? '(Obsadené)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-widest text-white/40">Popis problému</label>
                    <textarea 
                      value={bookingDescription}
                      onChange={(e) => setBookingDescription(e.target.value)}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-white/30 transition-colors resize-none"
                      placeholder="Stručne popíšte problém..."
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={bookingStatus === 'submitting'}
                    className={cn(
                      "w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]",
                      currentTheme.bgAccent, "text-black",
                      bookingStatus === 'submitting' && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {bookingStatus === 'submitting' ? (
                      <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Calendar className="w-5 h-5" /> Objednať servis
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      <DiagnosticSection />

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 bg-black/50">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold", currentTheme.bgAccent, "text-black")}>SP</div>
              <span className="text-lg font-bold">Therm</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">
              Váš partner pre tepelnú pohodu a údržbu technológií. Pôsobíme v regióne Záhoria a Bratislavy.
            </p>
          </div>
          
          <div className="space-y-6">
            <h4 className="font-bold text-white">Kontakt</h4>
            <ul className="space-y-6 text-sm text-white/60">
              <li className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full glass-card flex items-center justify-center shrink-0 border-light-blue/20">
                  <Phone className="w-6 h-6 text-light-blue" />
                </div>
                <span className="text-lg text-white">0944 591 521</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full glass-card flex items-center justify-center shrink-0 border-light-blue/20">
                  <Mail className="w-6 h-6 text-light-blue" />
                </div>
                <span className="text-lg text-white">info@sptherm.sk</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full glass-card flex items-center justify-center shrink-0 border-light-blue/20">
                  <MapPin className="w-6 h-6 text-light-blue" />
                </div>
                <span className="text-lg text-white">Láb, Stupava a okolie</span>
              </li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold">Služby</h4>
            <ul className="space-y-4 text-sm text-white/60">
              <li>Servis kotlov</li>
              <li>Preplach kúrenia</li>
              <li>Montáž regulácie</li>
              <li>Inštalácia kotlov</li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold">Otváracie hodiny</h4>
            <ul className="space-y-4 text-sm text-white/60">
              <li className="flex justify-between">
                <span>Po - Pi</span>
                <span>8:00 - 17:00</span>
              </li>
              <li className="flex justify-between">
                <span>So</span>
                <span>9:00 - 12:00</span>
              </li>
              <li className="flex justify-between text-red-400">
                <span>Ne</span>
                <span>Zatvorené</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 text-center text-white/20 text-xs flex flex-col items-center gap-4">
          <p>© {new Date().getFullYear()} SP Therm. Všetky práva vyhradené.</p>
          {isAdmin && (
            <button 
              onClick={() => setCurrentView('admin')}
              className="text-white/40 hover:text-white transition-colors flex items-center gap-2"
            >
              <Settings className="w-3 h-3" />
              Administrácia objednávok
            </button>
          )}
        </div>
      </footer>

      {/* Map Modal */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMapOpen(false)} />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-4xl h-[80vh] flex flex-col relative overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">Výpočet dopravy</h3>
                  <p className="text-sm text-white/60">Označte vašu polohu na mape pre výpočet ceny dopravy.</p>
                </div>
                <button onClick={() => setIsMapOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 relative">
                <MapContainer 
                  center={[48.31, 17.0]} 
                  zoom={11} 
                  scrollWheelZoom={true}
                  className="z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapInvalidator />
                  <LocationMarker onSelect={handleLocationSelect} />
                  <Marker position={LAB_COORDS} />
                  <Marker position={STUPAVA_COORDS} />
                </MapContainer>
              </div>

              <div className="p-6 border-t border-white/10 bg-black/40 flex flex-wrap gap-6 items-center justify-between">
                {transportPrice !== null ? (
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", currentTheme.bgAccent, "text-black")}>
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase font-bold tracking-widest">Cena dopravy</p>
                      <p className="text-3xl font-bold">{transportPrice} €</p>
                      <p className="text-xs text-white/60">Vzdialenosť: {distance?.toFixed(1)} km</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/40 italic">Kliknite na mapu pre výpočet...</p>
                )}
                <button 
                  onClick={() => setIsMapOpen(false)}
                  className={cn("px-8 py-4 rounded-xl font-bold", currentTheme.bgAccent, "text-black")}
                >
                  Potvrdiť
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )}
</div>
  );
}

function AdminDashboard({ 
  bookings, 
  onClose, 
  onConfirm, 
  onCancel, 
  onUpdateStatus, 
  onAddToCalendar,
  onNotify,
  onLogout
}: any) {
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const pending = bookings.filter((b: any) => b.status === 'pending');
  const confirmed = bookings.filter((b: any) => b.status === 'confirmed');

  const handleUpdateDateTime = async () => {
    if (!editingBooking) return;
    try {
      await updateDoc(doc(db, 'bookings', editingBooking.id), {
        preferredDate: newDate,
        preferredTime: newTime
      });
      toast.success('Termín aktualizovaný');
      setEditingBooking(null);
    } catch (error) {
      console.error(error);
      toast.error('Chyba pri aktualizácii');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      {/* Admin Header */}
      <header className="h-20 border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Správa objednávok</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onNotify}
            className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button 
            onClick={onLogout}
            className="p-3 hover:bg-white/10 rounded-xl transition-colors text-red-400"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-12 max-w-4xl mx-auto w-full pb-24">
        {/* New Requests */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Nové požiadavky ({pending.length})
            </h2>
          </div>
          
          <div className="grid gap-4">
            {pending.length === 0 ? (
              <div className="glass-card p-12 text-center text-white/20 italic">
                Žiadne nové požiadavky
              </div>
            ) : (
              pending.map((booking: any) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
                  type="pending"
                  onConfirm={() => onConfirm(booking)}
                  onCancel={() => onCancel(booking.id, booking.preferredDate, booking.preferredTime)}
                  onEdit={() => {
                    setEditingBooking(booking);
                    setNewDate(booking.preferredDate);
                    setNewTime(booking.preferredTime);
                  }}
                />
              ))
            )}
          </div>
        </section>

        {/* Confirmed Appointments */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-green-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Potvrdené termíny ({confirmed.length})
            </h2>
          </div>

          <div className="grid gap-4">
            {confirmed.length === 0 ? (
              <div className="glass-card p-12 text-center text-white/20 italic">
                Žiadne potvrdené termíny
              </div>
            ) : (
              confirmed.map((booking: any) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
                  type="confirmed"
                  onCancel={() => onCancel(booking.id, booking.preferredDate, booking.preferredTime)}
                  onAddToCalendar={() => onAddToCalendar(booking)}
                  onEdit={() => {
                    setEditingBooking(booking);
                    setNewDate(booking.preferredDate);
                    setNewTime(booking.preferredTime);
                  }}
                />
              ))
            )}
          </div>
        </section>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingBooking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEditingBooking(null)} />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-md p-8 space-y-6 relative"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Upraviť termín</h3>
                <button onClick={() => setEditingBooking(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">Nový dátum</label>
                  <input 
                    type="date" 
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">Nový čas</label>
                  <input 
                    type="time" 
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <button 
                onClick={handleUpdateDateTime}
                className="w-full py-4 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors"
              >
                Uložiť zmeny
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-xl border-t border-white/10 px-8 flex items-center justify-around md:hidden">
        <button onClick={onClose} className="flex flex-col items-center gap-1 text-white/40">
          <User className="w-6 h-6" />
          <span className="text-[10px] uppercase font-bold tracking-widest">Web</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-white">
          <Clock className="w-6 h-6" />
          <span className="text-[10px] uppercase font-bold tracking-widest">Objednávky</span>
        </button>
        <button onClick={onNotify} className="flex flex-col items-center gap-1 text-white/40">
          <Bell className="w-6 h-6" />
          <span className="text-[10px] uppercase font-bold tracking-widest">Notif.</span>
        </button>
      </div>
    </div>
  );
}

function BookingCard({ booking, type, onConfirm, onCancel, onAddToCalendar, onEdit }: any) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 space-y-4 relative overflow-hidden group"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">{booking.name}</h3>
          <a 
            href={`tel:${booking.phone}`} 
            className="text-white/60 hover:text-white transition-colors flex items-center gap-2 text-sm"
          >
            <Phone className="w-4 h-4" />
            {booking.phone}
          </a>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{booking.preferredTime}</p>
          <p className="text-xs text-white/40 uppercase tracking-widest">{booking.preferredDate}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-widest text-white/20">Adresa</p>
          <p className="line-clamp-1">{booking.address || 'Neuvedená'}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-widest text-white/20">Značka</p>
          <p>{booking.boilerBrand || 'Neuvedená'}</p>
        </div>
      </div>

      {booking.notes && (
        <div className="p-3 rounded-lg bg-white/5 text-xs text-white/60 italic">
          "{booking.notes}"
        </div>
      )}

      <div className="pt-4 flex flex-wrap gap-2">
        {type === 'pending' ? (
          <>
            <button 
              onClick={onConfirm}
              className="flex-1 bg-green-500 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-400 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Potvrdiť (SMS)
            </button>
            <button 
              onClick={onEdit}
              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button 
              onClick={onCancel}
              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={onAddToCalendar}
              className="flex-1 bg-white/10 hover:bg-white/20 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <CalendarPlus className="w-4 h-4" />
              Do kalendára
            </button>
            <button 
              onClick={onEdit}
              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button 
              onClick={onCancel}
              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            >
              Zrušiť
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    // Small delay to ensure modal animation is finishing
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function LocationMarker({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();
  
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, 13, { duration: 1.5 });
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position} />
  );
}
