import React, { useState, useMemo } from 'react';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  PieChart as PieChartIcon,
  History,
  MapPin,
  Map as MapIcon,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Boiler, Customer, ServiceRecord } from '../types';
import { MapBounds } from './MapBounds';
import { getBoilerStatus, getStatusColor, getStatusLabel, BoilerStatus } from '../utils/boilerUtils';
import { formatAddress } from '../utils/addressUtils';

interface DashboardProps {
  boilers: Boiler[];
  customers: Customer[];
  services: ServiceRecord[];
  onSelectCustomer: (id: string) => void;
  onNavigateToCustomersWithSearch: (search: string) => void;
}

export const Dashboard = React.memo(({ 
  boilers, 
  customers, 
  services,
  onSelectCustomer,
  onNavigateToCustomersWithSearch
}: DashboardProps) => {
  const today = new Date();
  const [activeFilter, setActiveFilter] = useState<BoilerStatus | null>(null);
  const [showAllOverdue, setShowAllOverdue] = useState(false);
  
  // DRILL-DOWN state
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number, y: number } | null>(null);

  // DRILL-DOWN close listeners
  React.useEffect(() => {
    if (!selectedBrand) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const popoverEl = document.getElementById('brand-drilldown-popover');
      if (popoverEl && !popoverEl.contains(e.target as Node)) {
        const isChartClick = (e.target as HTMLElement).closest('.recharts-wrapper');
        if (!isChartClick) {
          setSelectedBrand(null);
          setPopoverAnchor(null);
        }
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedBrand(null);
        setPopoverAnchor(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedBrand]);

  // DRILL-DOWN memo for brand customers
  const brandCustomers = useMemo(() => {
    if (!selectedBrand) return [];
    return customers.filter(c => {
      const hasLocalBoilers = (c as any).boilers?.some((b: any) => b.brand === selectedBrand);
      if (hasLocalBoilers) return true;
      return boilers.some(b => b.customerId === c.id && b.brand === selectedBrand);
    });
  }, [customers, boilers, selectedBrand]);

  // DRILL-DOWN helper for city extraction
  const getCustomerCity = (customer: Customer) => {
    const customerBoilers = boilers.filter(b => b.customerId === customer.id);
    const primaryAddress = customerBoilers[0]?.address || '';
    if (!primaryAddress) return 'Neznáme mesto';
    const formatted = formatAddress(primaryAddress);
    const parts = formatted.split(',');
    return parts[parts.length - 1]?.trim() || formatted;
  };

  // DRILL-DOWN clamp anchor position for popover
  const clampAnchor = useMemo(() => {
    if (!popoverAnchor) return null;
    const width = 288; // w-72 is 18rem = 288px
    const height = 350; // estimate max height
    
    const x = Math.max(16, Math.min(popoverAnchor.x - 144, window.innerWidth - width - 16));
    const y = Math.max(16, Math.min(popoverAnchor.y + 12, window.innerHeight - height - 16));
    
    return { x, y };
  }, [popoverAnchor]);
  
  const mapCenter = useMemo<[number, number]>(() => [48.6690, 19.6990], []);
  const mapZoom = 7;

  const openNavigation = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(
      `https://maps.google.com/?q=${encoded}`,
      '_blank'
    );
  };

  const sendServiceReminderSms = (customer: Customer) => {
    const text = `Dobrý deň ${customer.name}, blíži sa termín Vašej ročnej prehliadky kotla. Termín si môžete rezervovať na www.sptherm.sk alebo Vás v najbližších dňoch budeme kontaktovať. Váš spoľahlivý partner pre vykurovanie – SP Therm s.r.o.`;
    const phone = customer.phone?.replace(/\s+/g, '') || '';
    if (!phone) {
      toast.warning('Zákazník nemá telefónne číslo');
      return;
    }
    const isIphone = /iPhone/i.test(navigator.userAgent);
    window.location.href = `sms:${phone}${isIphone ? '&' : '?'}body=${encodeURIComponent(text)}`;
  };

  const categorizedBoilers = useMemo(() => {
    const groups: Record<BoilerStatus, Boiler[]> = {
      dormant: [],
      overdue: [],
      upcoming: [],
      ontime: [],
      unscheduled: []
    };
    
    boilers.forEach(b => {
      const status = getBoilerStatus(b.nextServiceDate);
      groups[status].push(b);
    });
    
    return groups;
  }, [boilers]);

  const filteredBoilers = useMemo(() => {
    if (activeFilter) return categorizedBoilers[activeFilter];
    return categorizedBoilers.overdue;
  }, [activeFilter, categorizedBoilers]);

  const displayBoilers = useMemo(() => {
    if (activeFilter) return filteredBoilers;
    if (showAllOverdue) return filteredBoilers;
    return filteredBoilers.slice(0, 5);
  }, [activeFilter, filteredBoilers, showAllOverdue]);

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

  const COLORS = [
    '#4A90D9', '#E05C5C', '#5CB85C', '#F0A500',
    '#9B59B6', '#1ABC9C', '#E67E22', '#2980B9',
    '#E74C3C', '#27AE60', '#F39C12', '#8E44AD',
    '#16A085', '#D35400', '#7F8C8D', '#2C3E50'
  ];

  const adjustColor = (hex: string, amount: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return `rgb(${r},${g},${b})`;
  };

  const renderCustomLabel = ({ 
    cx, cy, midAngle, innerRadius, outerRadius, 
    percent 
  }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 0.65;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={14} fontWeight="800"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0];
      return (
        <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 shadow-2xl">
          <p className="text-white font-bold text-sm">
            {name}
          </p>
          <p className="text-white/70 text-xs">
            Počet: {value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">Dobrý deň!</h1>
          <p className="text-white/60 text-lg">Tu je prehľad dnešných úloh.</p>
        </div>
        <div className="text-right hidden lg:block">
          <p className="text-base font-medium text-white/40 uppercase tracking-wider">Dnes</p>
          <p className="text-xl font-bold text-white/80">{today.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </header>

      {/* Small cards at the top */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button 
          onClick={() => setActiveFilter(activeFilter === 'overdue' ? null : 'overdue')}
          className={`card p-4 border-l-4 transition-all text-left min-h-[60px] ${activeFilter === 'overdue' ? 'border-l-[#C14F4F] bg-[#C14F4F]/10 ring-2 ring-[#C14F4F]/20' : 'border-l-[#C14F4F]/50 hover:bg-white/5'}`}
        >
          <div className="flex flex-col justify-between h-full">
            <span className="text-[11px] font-bold text-white/40 uppercase">Po termíne</span>
            <span className="text-2xl font-bold text-[#C14F4F]">{categorizedBoilers.overdue.length}</span>
          </div>
        </button>

        <button 
          onClick={() => setActiveFilter(activeFilter === 'dormant' ? null : 'dormant')}
          className={`card p-4 border-l-4 transition-all text-left min-h-[60px] ${activeFilter === 'dormant' ? 'border-l-[#9CA3AF] bg-[#9CA3AF]/10 ring-2 ring-[#9CA3AF]/20' : 'border-l-[#9CA3AF]/50 hover:bg-white/5'}`}
        >
          <div className="flex flex-col justify-between h-full">
            <span className="text-[11px] font-bold text-white/40 uppercase">Zaspätý</span>
            <span className="text-2xl font-bold text-[#9CA3AF]">{categorizedBoilers.dormant.length}</span>
          </div>
        </button>
        
        <button 
          onClick={() => setActiveFilter(activeFilter === 'upcoming' ? null : 'upcoming')}
          className={`card p-4 border-l-4 transition-all text-left min-h-[60px] ${activeFilter === 'upcoming' ? 'border-l-[#F59E0B] bg-[#F59E0B]/10 ring-2 ring-[#F59E0B]/20' : 'border-l-[#F59E0B]/50 hover:bg-white/5'}`}
        >
          <div className="flex flex-col justify-between h-full">
            <span className="text-[11px] font-bold text-white/40 uppercase">Blížiace sa</span>
            <span className="text-2xl font-bold text-[#F59E0B]">{categorizedBoilers.upcoming.length}</span>
          </div>
        </button>

        <button 
          onClick={() => setActiveFilter(activeFilter === 'ontime' ? null : 'ontime')}
          className={`card p-4 border-l-4 transition-all text-left min-h-[60px] ${activeFilter === 'ontime' ? 'border-l-[#10B981] bg-[#10B981]/10 ring-2 ring-[#10B981]/20' : 'border-l-[#10B981]/50 hover:bg-white/5'}`}
        >
          <div className="flex flex-col justify-between h-full">
            <span className="text-[11px] font-bold text-white/40 uppercase">V termíne</span>
            <span className="text-2xl font-bold text-[#10B981]">{categorizedBoilers.ontime.length}</span>
          </div>
        </button>
      </div>

      {/* Critical Inspections / Filtered List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle size={20} style={{ color: activeFilter ? getStatusColor(activeFilter) : '#C14F4F' }} />
            {activeFilter ? getStatusLabel(activeFilter) : 'Kritické prehliadky'}
          </h2>
          {activeFilter && (
            <button onClick={() => setActiveFilter(null)} className="text-xs font-bold text-white/40 hover:text-white/60 uppercase tracking-widest">Zrušiť filter</button>
          )}
        </div>
        
        <div className="space-y-3">
          {displayBoilers.length > 0 ? (
            <>
              {displayBoilers.map(boiler => {
                const customer = customers.find(c => c.id === boiler.customerId);
                const status = getBoilerStatus(boiler.nextServiceDate);
                const statusColor = getStatusColor(status);
                
                return (
                  <div 
                    key={boiler.id} 
                    onClick={() => onSelectCustomer(boiler.customerId)}
                    className="card p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-all group"
                    style={{ borderLeft: `4px solid ${statusColor}20` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: `${statusColor}10`, color: statusColor }}>
                        {customer?.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{customer?.name}</h3>
                        <div className="flex items-center gap-1.5 text-sm text-white/40">
                          <span>{boiler.brand} {boiler.model} •</span>
                          <span 
                            title="Navigovať"
                            className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={(e) => { e.stopPropagation(); openNavigation(boiler.address); }}
                          >
                            <MapPin size={12} />
                            <span className="truncate">{formatAddress(boiler.address)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
                      {status === 'upcoming' && customer && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            sendServiceReminderSms(customer);
                          }}
                          className="p-2 rounded-lg text-white/20 hover:text-[#3A87AD] hover:bg-[#3A87AD]/10 transition-all"
                          title="Pripomienka SMS"
                        >
                          <MessageSquare size={18} />
                        </button>
                      )}
                      <div className="flex flex-col items-end flex-shrink-0">
                        <div 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                        >
                          {getStatusLabel(status)}
                        </div>
                        <p className="text-xs font-medium text-white/40 mt-1">
                          {boiler.nextServiceDate ? new Date(boiler.nextServiceDate).toLocaleDateString('sk-SK') : 'Bez termínu'}
                        </p>
                      </div>
                      <ChevronRight size={20} className="text-white/20 group-hover:text-white/40" />
                    </div>
                  </div>
                );
              })}
              
              {!activeFilter && filteredBoilers.length > 5 && !showAllOverdue && (
                <button 
                  onClick={() => setShowAllOverdue(true)}
                  className="w-full py-3 card border-dashed border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-all text-sm font-bold uppercase tracking-widest"
                >
                  Zobraziť všetky ({filteredBoilers.length})
                </button>
              )}
            </>
          ) : (
            <div className="card p-8 text-center text-white/20 italic">
              Žiadne záznamy v tejto kategórii.
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
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <defs>
                  {COLORS.map((color, index) => (
                    <radialGradient 
                      key={index}
                      id={`gradient-brand-${index}`}
                      cx="50%" cy="40%" r="60%">
                      <stop offset="0%" stopColor={adjustColor(color, 50)} />
                      <stop offset="100%" stopColor={adjustColor(color, -50)} />
                    </radialGradient>
                  ))}
                </defs>
                <Pie
                  data={brandData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  label={renderCustomLabel}
                  labelLine={false}
                  className="cursor-pointer"
                  onClick={(data, index, event) => {
                    // DRILL-DOWN
                    if (selectedBrand === data.name) {
                      setSelectedBrand(null);
                      setPopoverAnchor(null);
                    } else {
                      setSelectedBrand(data.name);
                      setPopoverAnchor({ x: event.clientX, y: event.clientY });
                    }
                  }}
                >
                  {brandData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#gradient-brand-${index})`} stroke="rgba(255,255,255,0.1)" />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Type Distribution */}
        <div className="card p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History size={20} className="text-[#3A87AD]" />
              Typy zásahov (%)
            </h2>
            <div className="text-right">
              <p className="text-[10px] font-bold text-white/40 uppercase">Celkom zásahov</p>
              <p className="text-xl font-bold text-[#3A87AD]">
                {serviceTypeData.reduce((acc, curr) => acc + curr.value, 0)}
              </p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <defs>
                  {COLORS.map((color, index) => (
                    <radialGradient 
                      key={index}
                      id={`gradient-service-${index}`}
                      cx="50%" cy="40%" r="60%">
                      <stop offset="0%" stopColor={adjustColor(color, 50)} />
                      <stop offset="100%" stopColor={adjustColor(color, -50)} />
                    </radialGradient>
                  ))}
                </defs>
                <Pie
                  data={serviceTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  label={renderCustomLabel}
                  labelLine={false}
                >
                  {serviceTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#gradient-service-${index})`} stroke="rgba(255,255,255,0.1)" />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
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
          <MapContainer 
            key="dashboard-map"
            center={mapCenter} 
            zoom={mapZoom} 
            style={{ height: '100%', width: '100%' }} 
            className="dark-map"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
              keepBuffer={2}
            />
            <MapBounds boilers={boilers} />
            {boilers.filter(b => b.lat && b.lng).map(boiler => (
              <Marker key={boiler.id} position={[boiler.lat!, boiler.lng!]}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-slate-900 mb-1">{boiler.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                      <span 
                        title="Navigovať"
                        className="cursor-pointer hover:text-[#3A87AD] transition-colors"
                        onClick={() => openNavigation(boiler.address)}
                      >
                        <MapPin size={12} />
                      </span>
                      <span className="truncate">{formatAddress(boiler.address)}</span>
                    </div>
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

      {/* DRILL-DOWN Popover markup */}
      {selectedBrand && clampAnchor && (
        <div 
          id="brand-drilldown-popover"
          className="fixed bg-[#1D1D20]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl w-72 z-50 text-white space-y-3"
          style={{
            left: `${clampAnchor.x}px`,
            top: `${clampAnchor.y}px`
          }}
        >
          {/* Popover Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wider text-[#3A87AD]">{selectedBrand}</h3>
              <p className="text-xs text-white/50">
                {brandCustomers.length} {brandCustomers.length === 1 ? 'kotol' : brandCustomers.length >= 2 && brandCustomers.length <= 4 ? 'kotly' : 'kotlov'}
              </p>
            </div>
            <button 
              type="button" 
              onClick={() => { setSelectedBrand(null); setPopoverAnchor(null); }}
              className="text-white/40 hover:text-white transition-colors text-xs font-bold font-mono px-1.5 py-0.5 bg-white/5 rounded-md"
            >
              ESC/X
            </button>
          </div>

          {/* Customer List */}
          <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/5">
            {brandCustomers.length > 0 ? (
              brandCustomers.slice(0, 5).map(customer => {
                const city = getCustomerCity(customer);
                return (
                  <div 
                    key={customer.id}
                    onClick={() => {
                      setSelectedBrand(null);
                      setPopoverAnchor(null);
                      onSelectCustomer(customer.id);
                    }}
                    className="pt-1.5 first:pt-0 group cursor-pointer flex items-center justify-between hover:bg-white/5 p-1 rounded-lg transition-all"
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="text-sm font-semibold truncate text-white/90 group-hover:text-white transition-colors">{customer.name}</span>
                      <span className="text-[10px] text-white/40 truncate flex items-center gap-1">
                        <MapPin size={10} /> {city}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-white/30 italic p-2 text-center">Žiadni priradení zákazníci</p>
            )}
          </div>

          {/* Button bottom */}
          {brandCustomers.length > 5 && (
            <button
              type="button"
              onClick={() => {
                const brand = selectedBrand;
                setSelectedBrand(null);
                setPopoverAnchor(null);
                onNavigateToCustomersWithSearch(brand);
              }}
              className="w-full py-2 bg-[#3A87AD]/20 hover:bg-[#3A87AD]/35 border border-[#3A87AD]/30 text-[#3A87AD] font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
            >
              Zobraziť všetkých ({brandCustomers.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
});
