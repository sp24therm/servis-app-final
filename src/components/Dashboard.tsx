import React, { useState, useMemo } from 'react';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  PieChart as PieChartIcon,
  History,
  Map as MapIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

interface DashboardProps {
  boilers: Boiler[];
  customers: Customer[];
  services: ServiceRecord[];
  onSelectCustomer: (id: string) => void;
}

export const Dashboard = ({ 
  boilers, 
  customers, 
  services,
  onSelectCustomer 
}: DashboardProps) => {
  const today = new Date();
  const [activeFilter, setActiveFilter] = useState<BoilerStatus | null>(null);
  const [showAllOverdue, setShowAllOverdue] = useState(false);
  
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

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
                        <p className="text-sm text-white/40">{boiler.brand} {boiler.model} • {boiler.address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase" style={{ color: statusColor }}>
                        {getStatusLabel(status)}
                      </p>
                      <p className="text-sm font-medium text-white/60">
                        {boiler.nextServiceDate ? new Date(boiler.nextServiceDate).toLocaleDateString('sk-SK') : 'Bez termínu'}
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-white/20 group-hover:text-white/40 ml-4" />
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
          <div className="h-[200px] sm:h-[300px] w-full">
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
          <div className="h-[200px] sm:h-[300px] w-full">
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
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {serviceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1E1E1E', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ color: '#E0E0E0' }}
                />
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
