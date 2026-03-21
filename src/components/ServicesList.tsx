import React, { useState, useMemo } from 'react';
import { Search, History, ChevronRight, FileText, Calendar, User, Wrench } from 'lucide-react';
import { ServiceRecord, Boiler, Customer } from '../types';

interface ServicesListProps {
  services: ServiceRecord[];
  boilers: Boiler[];
  customers: Customer[];
  onSelectCustomer: (id: string) => void;
  onSelectService: (id: string) => void;
}

export const ServicesList = ({ 
  services, 
  boilers, 
  customers,
  onSelectCustomer,
  onSelectService
}: ServicesListProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [services]);

  const filteredServices = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return sortedServices;

    return sortedServices.filter(s => {
      const boiler = boilers.find(b => b.id === s.boilerId);
      const customer = boiler ? customers.find(c => c.id === boiler.customerId) : null;

      const taskMatch = (s.taskPerformed || '').toLowerCase().includes(query);
      const customerMatch = customer ? (customer.name || '').toLowerCase().includes(query) : false;
      const boilerMatch = boiler ? (boiler.model || '').toLowerCase().includes(query) || (boiler.brand || '').toLowerCase().includes(query) : false;

      return taskMatch || customerMatch || boilerMatch;
    });
  }, [sortedServices, boilers, customers, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Servisné zásahy</h1>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-white/40 uppercase tracking-wider">Celkom</p>
          <p className="text-xl font-bold text-white/80">{services.length} záznamov</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
        <input 
          type="text" 
          placeholder="Hľadať podľa zákazníka, kotla alebo typu úkonu..." 
          className="input-field pl-12 py-4 text-lg"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredServices.length > 0 ? (
          filteredServices.map(service => {
            const boiler = boilers.find(b => b.id === service.boilerId);
            const customer = boiler ? customers.find(c => c.id === boiler.customerId) : null;
            
            return (
              <div 
                key={service.id} 
                onClick={() => onSelectService(service.id)}
                className="card p-4 flex items-center justify-between hover:border-[#3A87AD]/30 hover:bg-[#3A87AD]/5 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 text-[#3A87AD] rounded-2xl flex items-center justify-center font-bold text-xl">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg group-hover:text-[#3A87AD] transition-colors">{service.taskPerformed}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <p className="text-sm text-white/40 flex items-center gap-1.5">
                        <User size={14} /> {customer?.name || 'Neznámy zákazník'}
                      </p>
                      <p className="text-sm text-white/40 flex items-center gap-1.5">
                        <Wrench size={14} /> {boiler?.brand} {boiler?.model}
                      </p>
                      <p className="text-sm text-white/40 flex items-center gap-1.5">
                        <Calendar size={14} /> {new Date(service.date).toLocaleDateString('sk-SK')}
                      </p>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-white/20 group-hover:text-[#3A87AD] transition-all" />
              </div>
            );
          })
        ) : (
          <div className="card p-12 text-center space-y-4 bg-white/5 border-dashed">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
              <History size={32} />
            </div>
            <p className="text-white/40 font-medium">Nenašli sa žiadne záznamy</p>
          </div>
        )}
      </div>
    </div>
  );
};
