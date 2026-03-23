import React, { useState, useMemo } from 'react';
import { Plus, Search, Phone, ChevronRight, TrendingUp, CheckCircle2 } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { Customer, Boiler } from '../types';
import { getBoilerStatus, getStatusColor, getStatusLabel } from '../utils/boilerUtils';

const removeDiacritics = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

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
                        const status = getBoilerStatus(b.nextServiceDate);
                        const statusColor = getStatusColor(status);
                        const statusLabel = getStatusLabel(status);
                        return (
                          <span 
                            key={b.id} 
                            title={`Kotol ${b.name} - ${statusLabel}`}
                          >
                            <CheckCircle2 
                              size={14} 
                              style={{ color: statusColor }} 
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
