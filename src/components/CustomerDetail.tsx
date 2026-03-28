import React, { useState, useMemo } from 'react';
import { 
  Phone, 
  MapPin, 
  Wrench, 
  Plus, 
  History, 
  Info,
  Map as MapIcon,
  PenTool,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Users,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Customer, Boiler, ServiceRecord } from '../types';
import { MeasurementHistory } from './MeasurementHistory';
import { getBoilerStatus, getStatusColor, getStatusLabel } from '../utils/boilerUtils';
import { BoilerInfoModal } from './BoilerInfoModal';
import { ImageOverlay } from './ImageOverlay';
import { useTermSettings } from '../hooks/useTermSettings';

interface CustomerDetailProps {
  customer: Customer;
  boilers: Boiler[];
  services: ServiceRecord[];
  onBack: () => void;
  onAddService: (boilerId: string) => void;
  onAddBoiler: (customerId: string) => void;
  onEditBoiler: (boilerId: string) => void;
  onEditCustomer: (customer: Customer) => void;
  onSelectService: (serviceId: string) => void;
  setSelectedBoilerId: (id: string) => void;
}

export const CustomerDetail = React.memo(({ 
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
}: CustomerDetailProps) => {
  const customerBoilers = boilers.filter(b => b.customerId === customer.id);
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [selectedBoilerInfo, setSelectedBoilerInfo] = useState<Boiler | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { termSettings } = useTermSettings();

  const mapCenter = useMemo<[number, number]>(() => 
    customerBoilers.length > 0 && customerBoilers[0].lat 
      ? [customerBoilers[0].lat, customerBoilers[0].lng!] 
      : [48.6690, 19.6990], 
    [customerBoilers]
  );

  const mapZoom = useMemo(() => 
    customerBoilers.length > 0 ? 12 : 7, 
    [customerBoilers]
  );

  const toggleHistory = (boilerId: string) => {
    setShowHistory(prev => ({ ...prev, [boilerId]: !prev[boilerId] }));
  };

  const toggleHistoryExpand = (boilerId: string) => {
    setExpandedHistory(prev => ({ ...prev, [boilerId]: !prev[boilerId] }));
  };

  const handleNavigate = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(
      `https://maps.google.com/?q=${encoded}`,
      '_blank'
    );
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 hover:bg-white/5 rounded-full text-white/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white leading-tight">{customer.name}</h1>
          <p className="text-lg text-white/40">{customer.company || 'Súkromná osoba'}</p>
        </div>
      </div>

      <div className="card p-6 bg-[#3A87AD] text-white border-none relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 group">
              <h1 className="text-3xl font-bold">{customer.name}</h1>
              <button 
                onClick={() => onEditCustomer(customer)}
                className="p-3 text-white/40 hover:text-white transition-colors rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Upraviť údaje"
              >
                <PenTool size={22} />
              </button>
            </div>
            {customer.company && <p className="text-white/80 font-medium">{customer.company}</p>}
            <div className="mt-4 space-y-3">
              <a href={`tel:${customer.phone}`} className="flex items-center gap-3 text-white/80 hover:text-white transition-colors text-lg min-h-[44px]">
                <Phone size={22} />
                {customer.phone}
              </a>
              {customer.secondaryContact && (
                <div className="space-y-1 pl-1">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-8">Pomocný kontakt</p>
                  <a href={`tel:${customer.secondaryContact.phone}`} className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-sm min-h-[32px]">
                    <User size={18} className="ml-1" />
                    <span className="font-medium">{customer.secondaryContact.name}:</span>
                    {customer.secondaryContact.phone}
                  </a>
                </div>
              )}
              {customer.email && (
                <p className="flex items-center gap-3 text-white/80 text-lg">
                  <Info size={22} />
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
          const status = getBoilerStatus(boiler.nextServiceDate, termSettings.upcomingDays, termSettings.dormantDays);
          const statusColor = getStatusColor(status);
          
          const isHistoryExpanded = expandedHistory[boiler.id];
          const visibleServices = isHistoryExpanded ? boilerServices : boilerServices.slice(0, 3);

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
                    </div>
                    <p className="text-xs text-[#3A87AD] font-medium mt-0.5">
                      {boiler.address}
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 ml-auto">
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1"
                      style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                    >
                      {getStatusLabel(status)}
                    </span>
                    <span className="text-xs font-bold text-white/60">
                      {boiler.nextServiceDate ? new Date(boiler.nextServiceDate).toLocaleDateString('sk-SK') : '-'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Posledný servis</p>
                    <p className="text-sm font-bold text-white">{boiler.lastServiceDate ? new Date(boiler.lastServiceDate).toLocaleDateString('sk-SK') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Značka / Model</p>
                    <p className="text-sm font-bold text-white">{boiler.brand} {boiler.model}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => onAddService(boiler.id)}
                    className="btn-primary flex-1 justify-center py-2.5 text-sm shadow-md shadow-[#3A87AD]/20"
                  >
                    <Wrench size={16} />
                    Vykonať servis
                  </button>
                  <button 
                    onClick={() => setSelectedBoilerInfo(boiler)}
                    className="p-2.5 rounded-xl border border-white/10 text-white/40 hover:border-[#3A87AD]/50 hover:text-[#3A87AD] transition-all bg-transparent"
                    title="Informácie o zariadení"
                  >
                    <Info size={20} />
                  </button>
                  <button 
                    onClick={() => onEditBoiler(boiler.id)}
                    className="p-2.5 rounded-xl border border-white/10 text-white/40 hover:border-[#3A87AD]/50 hover:text-[#3A87AD] transition-all bg-transparent"
                    title="Upraviť údaje"
                  >
                    <PenTool size={20} />
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
                          onClick={() => toggleHistoryExpand(boiler.id)}
                          className="w-full py-1.5 text-[11px] font-bold text-[#3A87AD] hover:bg-[#3A87AD]/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          {isHistoryExpanded ? (
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
            key={`customer-map-${customer.id}`}
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

      <AnimatePresence>
        {selectedBoilerInfo && (
          <BoilerInfoModal 
            boiler={selectedBoilerInfo}
            services={services}
            onClose={() => setSelectedBoilerInfo(null)}
            upcomingDays={termSettings.upcomingDays}
            dormantDays={termSettings.dormantDays}
          />
        )}
      </AnimatePresence>

      <ImageOverlay 
        src={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
    </div>
  );
});
