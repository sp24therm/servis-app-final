import React, { useMemo } from 'react';
import { TrendingUp, Wrench, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
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
  const sortedServices = [...services].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const trendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: d.toLocaleDateString('sk-SK', { month: 'short' }),
        month: d.getMonth(),
        year: d.getFullYear(),
        value: 0
      });
    }

    services.forEach(s => {
      const d = new Date(s.date);
      const monthIndex = months.findIndex(m => m.month === d.getMonth() && m.year === d.getFullYear());
      if (monthIndex !== -1) {
        months[monthIndex].value++;
      }
    });

    return months;
  }, [services]);

  const currentMonthCount = trendData[11].value;
  const previousMonthCount = trendData[10].value;
  const diff = currentMonthCount - previousMonthCount;
  const percentChange = previousMonthCount > 0 ? Math.round((diff / previousMonthCount) * 100) : (currentMonthCount > 0 ? 100 : 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-white">Zásahy</h1>
        <p className="text-white/40">História všetkých servisných úkonov.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-bold text-white/40 uppercase tracking-wider mb-1">Celkový počet zásahov</p>
          <p className="text-5xl font-bold text-[#3A87AD]">{services.length}</p>
          <div className={`mt-4 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${diff >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-[#C14F4F] bg-[#C14F4F]/10'}`}>
            <TrendingUp size={14} className={diff < 0 ? 'rotate-180' : ''} />
            <span>{diff >= 0 ? '+' : ''}{percentChange}% oproti min. mesiacu</span>
          </div>
        </div>

        <div className="card p-6 md:col-span-2">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-[#3A87AD]" />
              Počet zásahov (12m)
            </h2>
            <span className="text-xs font-medium text-white/40">Ø {Math.round(services.length / 12)}/mes.</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#colorCount)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {sortedServices.map(service => {
          const boiler = boilers.find(b => b.id === service.boilerId);
          const customer = customers.find(c => c.id === boiler?.customerId);
          
          return (
            <div 
              key={service.id} 
              className="card p-4 flex items-center justify-between hover:border-[#3A87AD]/30 hover:bg-[#3A87AD]/5 cursor-pointer transition-all group"
            >
              <div 
                className="flex items-center gap-4 flex-1"
                onClick={() => onSelectService(service.id)}
              >
                <div className="w-12 h-12 bg-white/5 text-[#3A87AD] rounded-full flex items-center justify-center">
                  <Wrench size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        customer && onSelectCustomer(customer.id);
                      }}
                      className="font-bold text-white hover:text-[#3A87AD] transition-colors"
                    >
                      {customer?.name}
                    </button>
                    <span className="text-[10px] bg-[#3A87AD]/10 text-[#3A87AD] px-1.5 py-0.5 rounded-md font-bold uppercase">{boiler?.brand}</span>
                  </div>
                  <p className="text-sm text-white/40">{service.taskPerformed} • {new Date(service.date).toLocaleDateString('sk-SK')}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div className="hidden sm:block" onClick={() => onSelectService(service.id)}>
                  <p className="text-[10px] font-bold text-white/20 uppercase">Stav</p>
                  <span className="text-xs font-bold text-emerald-500">{service.status}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    customer && onSelectCustomer(customer.id);
                  }}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/20 hover:text-[#3A87AD]"
                  title="Prejsť na zákazníka"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
