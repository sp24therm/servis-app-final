import React, { useState, useMemo } from 'react';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, Boiler, ServiceRecord } from '../types';
import { DashboardCharts } from './DashboardCharts';

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

      <DashboardCharts boilers={boilers} />

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
                    <div className="w-10 h-10 bg-[#C14F4F]/10 text-[#C14F4F] rounded-full flex items-center justify-center">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{customer?.name}</h3>
                      <p className="text-xs text-white/40">{boiler.brand} {boiler.model} • {boiler.address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-[#C14F4F] uppercase">Termín uplynul</p>
                    <p className="text-xs font-medium text-white/60">{new Date(boiler.nextServiceDate!).toLocaleDateString('sk-SK')}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="card p-8 text-center space-y-2 bg-emerald-500/5 border-emerald-500/10">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-white/60 font-medium">Všetky zariadenia sú v termíne!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
