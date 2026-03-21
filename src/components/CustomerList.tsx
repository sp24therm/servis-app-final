import React, { useState, useMemo } from 'react';
import { Search, Plus, User, ChevronRight, Phone, MapPin } from 'lucide-react';
import { Customer, Boiler } from '../types';

interface CustomerListProps {
  customers: Customer[];
  boilers: Boiler[];
  onSelectCustomer: (id: string) => void;
  onAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
}

export const CustomerList = ({ 
  customers, 
  boilers, 
  onSelectCustomer, 
  onAddCustomer,
  onEditCustomer
}: CustomerListProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return customers;

    return customers.filter(c => {
      const nameMatch = (c.name || '').toLowerCase().includes(query);
      const companyMatch = (c.company || '').toLowerCase().includes(query);
      const phoneMatch = (c.phone || '').includes(query);
      
      const customerBoilers = boilers.filter(b => b.customerId === c.id);
      const boilerMatch = customerBoilers.some(b => 
        (b.model || '').toLowerCase().includes(query) || 
        (b.brand || '').toLowerCase().includes(query) ||
        (b.serialNumber || '').toLowerCase().includes(query)
      );

      return nameMatch || companyMatch || phoneMatch || boilerMatch;
    });
  }, [customers, boilers, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Zákazníci</h1>
        <button onClick={onAddCustomer} className="btn-primary w-full sm:w-auto justify-center">
          <Plus size={20} /> Pridať zákazníka
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
        <input 
          type="text" 
          placeholder="Hľadať podľa mena, telefónu alebo kotla..." 
          className="input-field pl-12 py-4 text-lg"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map(customer => {
            const customerBoilers = boilers.filter(b => b.customerId === customer.id);
            return (
              <div 
                key={customer.id} 
                onClick={() => onSelectCustomer(customer.id)}
                className="card p-4 flex items-center justify-between hover:border-[#3A87AD]/30 hover:bg-[#3A87AD]/5 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 text-[#3A87AD] rounded-2xl flex items-center justify-center font-bold text-xl">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg group-hover:text-[#3A87AD] transition-colors">{customer.name}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <p className="text-sm text-white/40 flex items-center gap-1.5">
                        <Phone size={14} /> {customer.phone}
                      </p>
                      {customerBoilers.length > 0 && (
                        <p className="text-sm text-white/40 flex items-center gap-1.5">
                          <MapPin size={14} /> {customerBoilers[0].address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Zariadenia</span>
                    <span className="text-sm font-bold text-white/60">{customerBoilers.length}</span>
                  </div>
                  <ChevronRight size={20} className="text-white/20 group-hover:text-[#3A87AD] transition-all" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="card p-12 text-center space-y-4 bg-white/5 border-dashed">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
              <User size={32} />
            </div>
            <p className="text-white/40 font-medium">Nenašli sa žiadni zákazníci</p>
          </div>
        )}
      </div>
    </div>
  );
};
