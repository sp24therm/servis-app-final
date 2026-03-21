import React from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Wrench, 
  ChevronRight, 
  Plus, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Edit2,
  Camera,
  FileText,
  User
} from 'lucide-react';
import { motion } from 'motion/react';
import { Customer, Boiler, ServiceRecord } from '../types';

interface CustomerDetailProps {
  customer: Customer;
  boilers: Boiler[];
  services: ServiceRecord[];
  onEditCustomer: (customer: Customer) => void;
  onAddBoiler: () => void;
  onEditBoiler: (boiler: Boiler) => void;
  onRecordService: (boilerId: string) => void;
  onViewService: (service: ServiceRecord) => void;
  onDeleteBoiler: (id: string) => void;
}

export const CustomerDetail = ({ 
  customer, 
  boilers, 
  services,
  onEditCustomer,
  onAddBoiler,
  onEditBoiler,
  onRecordService,
  onViewService,
  onDeleteBoiler
}: CustomerDetailProps) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      {/* Customer Header */}
      <div className="card p-6 space-y-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#3A87AD]/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[#3A87AD]/20 transition-all duration-700" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 relative z-10">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-white tracking-tight">{customer.name}</h2>
            {customer.company && <p className="text-[#3A87AD] font-bold text-sm uppercase tracking-widest">{customer.company}</p>}
          </div>
          <button 
            onClick={() => onEditCustomer(customer)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/60 hover:text-white transition-all border border-white/5"
          >
            <Edit2 size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-white/5">
          <a href={`tel:${customer.phone}`} className="flex items-center gap-4 group/item">
            <div className="w-10 h-10 bg-[#3A87AD]/10 rounded-xl flex items-center justify-center text-[#3A87AD] group-hover/item:bg-[#3A87AD] group-hover/item:text-white transition-all">
              <Phone size={18} />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Telefón</p>
              <p className="text-white font-medium">{customer.phone}</p>
            </div>
          </a>
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="flex items-center gap-4 group/item">
              <div className="w-10 h-10 bg-[#3A87AD]/10 rounded-xl flex items-center justify-center text-[#3A87AD] group-hover/item:bg-[#3A87AD] group-hover/item:text-white transition-all">
                <Mail size={18} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Email</p>
                <p className="text-white font-medium">{customer.email}</p>
              </div>
            </a>
          )}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#3A87AD]/10 rounded-xl flex items-center justify-center text-[#3A87AD]">
              <Calendar size={18} />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Zákazník od</p>
              <p className="text-white font-medium">{new Date(customer.createdAt).toLocaleDateString('sk-SK')}</p>
            </div>
          </div>
        </div>

        {customer.notes && (
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Poznámka</p>
            <p className="text-sm text-white/70 leading-relaxed">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Boilers Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Wrench size={20} className="text-[#3A87AD]" /> Zariadenia
          </h3>
          <button 
            onClick={onAddBoiler}
            className="flex items-center gap-2 text-[#3A87AD] font-bold text-xs uppercase tracking-widest hover:underline"
          >
            <Plus size={16} /> Pridať zariadenie
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {boilers.map((boiler) => {
            const boilerServices = services
              .filter(s => s.boilerId === boiler.id)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            const lastService = boilerServices[0];
            const nextDate = boiler.nextServiceDate ? new Date(boiler.nextServiceDate) : null;
            const isOverdue = nextDate ? nextDate < new Date() : false;
            const isUpcoming = nextDate ? (nextDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30 : false;

            return (
              <div key={boiler.id} className="card p-6 space-y-6 hover:border-[#3A87AD]/30 transition-all group">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold text-white group-hover:text-[#3A87AD] transition-colors">{boiler.brand} {boiler.model}</h4>
                    <p className="text-sm text-white/60 flex items-center gap-2">
                      <MapPin size={14} /> {boiler.address}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onEditBoiler(boiler)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Naozaj chcete vymazať toto zariadenie?')) {
                          onDeleteBoiler(boiler.id);
                        }
                      }}
                      className="p-2 bg-white/5 hover:bg-red-500/20 rounded-xl text-white/40 hover:text-[#C14F4F] transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border ${
                    isOverdue ? 'bg-[#C14F4F]/10 border-[#C14F4F]/20' : 
                    isUpcoming ? 'bg-[#C1A44F]/10 border-[#C1A44F]/20' : 
                    'bg-emerald-500/10 border-emerald-500/20'
                  }`}>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Nasledujúci servis</p>
                    <div className="flex items-center gap-2">
                      {isOverdue ? <AlertCircle size={16} className="text-[#C14F4F]" /> : 
                       isUpcoming ? <Clock size={16} className="text-[#C1A44F]" /> : 
                       <CheckCircle2 size={16} className="text-emerald-500" />}
                      <span className={`font-bold ${
                        isOverdue ? 'text-[#C14F4F]' : 
                        isUpcoming ? 'text-[#C1A44F]' : 
                        'text-emerald-500'
                      }`}>
                        {boiler.nextServiceDate ? new Date(boiler.nextServiceDate).toLocaleDateString('sk-SK') : 'Neuvedené'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Sériové číslo</p>
                    <p className="text-white font-bold">{boiler.serialNumber || 'Neuvedené'}</p>
                  </div>
                </div>

                {boiler.photos && Object.keys(boiler.photos).length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {Object.entries(boiler.photos).map(([type, url]: [string, any]) => (
                      <div key={type} className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-white/10">
                        <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <History size={14} /> História zásahov
                    </h5>
                    <button 
                      onClick={() => onRecordService(boiler.id)}
                      className="btn-primary py-1.5 px-4 text-xs"
                    >
                      <Wrench size={14} /> Zaznamenať úkon
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {boilerServices.length > 0 ? (
                      boilerServices.slice(0, 3).map((service) => (
                        <button
                          key={service.id}
                          onClick={() => onViewService(service)}
                          className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all group/service"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white/40 group-hover/service:text-[#3A87AD] transition-colors">
                              <FileText size={16} />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-white/80">{service.taskPerformed}</p>
                              <p className="text-[10px] text-white/40">{new Date(service.date).toLocaleDateString('sk-SK')}</p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-white/20 group-hover/service:text-white transition-all" />
                        </button>
                      ))
                    ) : (
                      <p className="text-center py-4 text-sm text-white/20 italic">Žiadne záznamy</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
