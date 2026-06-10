import React, { useState, useMemo } from 'react';
import { Plus, Search, Phone, ChevronRight, TrendingUp, CheckCircle2, Trash2, Calendar, MessageSquare, GitMerge } from 'lucide-react';
import { toast } from 'sonner';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { Customer, Boiler, Booking } from '../types';
import { getBoilerStatus, getStatusColor, getStatusLabel } from '../utils/boilerUtils';
import { useTermSettings } from '../hooks/useTermSettings';
import { removeDiacritics, sanitizePhone } from '../utils/textUtils'; // CHANGED: imported from textUtils


interface CustomerListProps {
  customers: Customer[];
  boilers: Boiler[];
  bookings: Booking[];
  onSelectCustomer: (id: string) => void;
  onAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onMergeCustomers?: (sourceId: string, targetId: string) => Promise<boolean>;
  initialSearch?: string;
}

type ServiceCategory = 'TERAZ' | 'PO TERMÍNE' | 'ZASPATÝ' | 'BLÍŽIACE SA' | 'V TERMÍNE';

export const CustomerList = ({ 
  customers, 
  boilers,
  bookings,
  onSelectCustomer,
  onAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onMergeCustomers,
  initialSearch
}: CustomerListProps) => {
  const [search, setSearch] = useState(initialSearch || '');

  React.useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);
  const { termSettings } = useTermSettings();
  const [mergeSource, setMergeSource] = useState<Customer | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  const sendServiceReminderSms = (customer: Customer) => {
    const text = `Dobrý deň ${customer.name}, blíži sa termín Vašej ročnej prehliadky kotla. Termín si môžete rezervovať na www.sptherm.sk alebo Vás v najbližších dňoch budeme kontaktovať. Váš spoľahlivý partner pre vykurovanie – SP Therm s.r.o.`;
    const phone = customer.phone ? sanitizePhone(customer.phone) : ''; // CHANGED: using sanitizePhone helper
    if (!phone) {
      toast.warning('Zákazník nemá telefónne číslo');
      return;
    }
    const isIphone = /iPhone/i.test(navigator.userAgent);
    window.location.href = `sms:${phone}${isIphone ? '&' : '?'}body=${encodeURIComponent(text)}`;
  };

  const handleOpenEdit = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    onEditCustomer(customer);
  };

  const getCategoryInfo = (customer: Customer, customerBoilers: Boiler[]) => {
    const webBooking = bookings.find(bk => bk.phone === customer.phone && bk.status === 'confirmed');
    
    // If has web booking, it's always TERAZ
    if (webBooking) {
      return { category: 'TERAZ' as ServiceCategory, days: 0, label: 'TERAZ' };
    }

    const mostUrgentBoiler = customerBoilers.length > 0 
      ? [...customerBoilers].sort((a, b) => {
          if (!a.nextServiceDate) return 1;
          if (!b.nextServiceDate) return -1;
          return new Date(a.nextServiceDate).getTime() - new Date(b.nextServiceDate).getTime();
        })[0]
      : null;

    if (!mostUrgentBoiler || !mostUrgentBoiler.nextServiceDate) {
      return { category: 'V TERMÍNE' as ServiceCategory, days: 0, label: 'V TERMÍNE' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(mostUrgentBoiler.nextServiceDate);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Logic based on settings
    // TERAZ: -dni_teraz_po to +dni_teraz_pred
    if (diffDays >= -termSettings.nowDaysAfter && diffDays <= termSettings.nowDaysBefore) {
      return { category: 'TERAZ' as ServiceCategory, days: diffDays, label: 'TERAZ' };
    }
    
    // PO TERMÍNE: Viac ako dni_po_termine po termíne, ale menej ako dni_zaspate
    if (diffDays <= -termSettings.overdueDays && diffDays > -termSettings.dormantDays) {
      return { category: 'PO TERMÍNE' as ServiceCategory, days: Math.abs(diffDays), label: `PO TERMÍNE: ${Math.abs(diffDays)} dní` };
    }

    // ZASPATÝ: Viac ako dni_zaspate po termíne
    if (diffDays <= -termSettings.dormantDays) {
      return { category: 'ZASPATÝ' as ServiceCategory, days: Math.abs(diffDays), label: `ZASPATÝ: ${Math.abs(diffDays)} dní` };
    }

    // BLÍŽIACE SA: Menej ako dni_bliziace_sa do termínu, ale nie TERAZ
    if (diffDays > termSettings.nowDaysBefore && diffDays <= termSettings.upcomingDays) {
      return { category: 'BLÍŽIACE SA' as ServiceCategory, days: diffDays, label: `BLÍŽIACE SA: ${diffDays} dní` };
    }

    // V TERMÍNE: Ostatní
    return { category: 'V TERMÍNE' as ServiceCategory, days: diffDays, label: 'V TERMÍNE' };
  };

  const categoryOrder: Record<ServiceCategory, number> = {
    'TERAZ': 0,
    'PO TERMÍNE': 1,
    'BLÍŽIACE SA': 2,
    'V TERMÍNE': 3,
    'ZASPATÝ': 4
  };

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (search) {
      const normalizedSearch = removeDiacritics(search).toLowerCase();
      result = customers.filter(c => {
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
    }

    // Sort by category then by name
    return [...result].sort((a, b) => {
      const aBoilers = boilers.filter(bo => bo.customerId === a.id);
      const bBoilers = boilers.filter(bo => bo.customerId === b.id);
      
      const aInfo = getCategoryInfo(a, aBoilers);
      const bInfo = getCategoryInfo(b, bBoilers);
      
      if (categoryOrder[aInfo.category] !== categoryOrder[bInfo.category]) {
        return categoryOrder[aInfo.category] - categoryOrder[bInfo.category];
      }
      
      return a.name.localeCompare(b.name);
    });
  }, [customers, boilers, bookings, search, termSettings]);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-6 flex flex-col justify-center items-center text-center min-h-[120px]">
          <p className="text-base font-bold text-white/40 uppercase tracking-wider mb-1">Celkový počet zákazníkov</p>
          <p className="text-5xl font-bold text-[#3A87AD]">{customers.length}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-sm font-bold">
            <TrendingUp size={14} />
            <span>Aktívne rastúce</span>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-[#3A87AD]" />
              Prírastok zákazníkov (12m)
            </h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
        <input 
          type="text" 
          placeholder="Hľadať v zozname zákazníkov" 
          className="input-field !pl-12" // FIXED
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredCustomers.map(customer => {
          const customerBoilers = boilers.filter(b => b.customerId === customer.id);
          const webBooking = bookings.find(bk => bk.phone === customer.phone && bk.status === 'confirmed');
          const info = getCategoryInfo(customer, customerBoilers);
          
          const mostUrgentBoiler = customerBoilers.length > 0 
            ? [...customerBoilers].sort((a, b) => {
                if (!a.nextServiceDate) return 1;
                if (!b.nextServiceDate) return -1;
                return new Date(a.nextServiceDate).getTime() - new Date(b.nextServiceDate).getTime();
              })[0]
            : null;

          const getCategoryColor = (cat: ServiceCategory) => {
            switch (cat) {
              case 'TERAZ': return '#3A87AD';
              case 'PO TERMÍNE': return '#EF4444';
              case 'ZASPATÝ': return '#9CA3AF';
              case 'BLÍŽIACE SA': return '#F59E0B';
              case 'V TERMÍNE': return '#10B981';
              default: return '#9CA3AF';
            }
          };
          
          return (
            <div 
              key={customer.id} 
              onClick={() => onSelectCustomer(customer.id)}
              className={`card p-5 flex items-center justify-between hover:border-[#3A87AD]/30 hover:bg-[#3A87AD]/5 cursor-pointer transition-all group min-h-[80px] ${
                webBooking ? 'border-l-4 border-l-[#3A87AD] bg-[#3A87AD]/5' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/5 text-white/60 rounded-full flex items-center justify-center font-bold text-xl relative">
                  {customer.name.charAt(0)}
                  {webBooking && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#3A87AD] rounded-full border-2 border-[#1A1A1A] flex items-center justify-center">
                      <Calendar size={8} className="text-white" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <h3 className="font-bold text-white text-lg leading-tight flex items-center gap-1.5">
                      {customer.name}
                      {customer.notes?.startsWith('Z web objednávky') && (
                        <span className="text-[9px] bg-[#3A87AD]/20 text-[#3A87AD] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">WEB</span>
                      )}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(customerBoilers.map(b => b.brand))).map(brand => (
                        <span key={brand} className="text-[10px] bg-[#3A87AD]/10 text-[#3A87AD] px-1.5 py-0.5 rounded-md font-bold uppercase">{brand}</span>
                      ))}
                    </div>
                  </div>
                  {customer.company && <p className="text-sm text-white/40 mt-0.5">{customer.company}</p>}
                  
                  <div className="flex items-center gap-3 text-base text-white/60 mt-1">
                    <span className="flex items-center gap-1"><Phone size={16} /> {customer.phone}</span>
                    <div className="flex gap-1">
                      {customerBoilers.map(b => {
                        const status = getBoilerStatus(b.nextServiceDate);
                        const statusColor = getStatusColor(status);
                        return (
                          <span 
                            key={b.id} 
                            title={`Kotol ${b.name}`}
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
              <div className="flex items-center gap-4 ml-auto">
                {info.category === 'BLÍŽIACE SA' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendServiceReminderSms(customer);
                    }}
                    className="p-2 text-white/20 hover:text-[#3A87AD] hover:bg-[#3A87AD]/10 rounded-lg transition-all"
                    title="Pripomienka SMS"
                  >
                    <MessageSquare size={18} />
                  </button>
                )}
                 <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMergeSource(customer);
                    setMergeTargetId('');
                  }}
                  className="p-2 text-white/20 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                  title="Zlúčiť zákazníka"
                >
                  <GitMerge size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCustomer(customer.id);
                  }}
                  className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Odstrániť zákazníka"
                >
                  <Trash2 size={18} />
                </button>
                
                <div className="flex flex-col items-end flex-shrink-0">
                  <span 
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ 
                      backgroundColor: `${getCategoryColor(info.category)}20`, 
                      color: getCategoryColor(info.category) 
                    }}
                  >
                    {info.label}
                  </span>
                  <span className="text-xs font-bold text-white/60">
                    {webBooking 
                      ? new Date(webBooking.preferredDate).toLocaleDateString('sk-SK')
                      : mostUrgentBoiler?.nextServiceDate 
                        ? new Date(mostUrgentBoiler.nextServiceDate).toLocaleDateString('sk-SK') 
                        : '-'}
                  </span>
                </div>
                <ChevronRight size={20} className="text-white/20 group-hover:text-[#3A87AD]" />
              </div>
            </div>
          );
        })}
      </div>

      {mergeSource && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-md border border-white/10 shadow-2xl relative bg-[#1A1A1A] text-white">
            <h3 className="text-xl font-bold mb-2">Zlúčiť zákazníka</h3>
            <p className="text-sm text-white/60 mb-4">
              Chystáte sa zlúčiť zákazníka <strong>{mergeSource.name}</strong> do iného zákazníka. Všetky zariadenia (kotly) a zlúčené poznámky budú presunuté na cieľového zákazníka a pôvodný zákazník bude natrvalo vymazaný.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                  Vyberte cieľového zákazníka
                </label>
                <select
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  className="w-full bg-[#262626] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#3A87AD]"
                >
                  <option value="">-- Vyberte zákazníka --</option>
                  {customers
                    .filter(c => c.id !== mergeSource.id)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || 'bez tel.'})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setMergeSource(null)}
                className="px-4 py-2 text-sm font-bold text-white/60 hover:text-white transition-colors"
              >
                Zrušiť
              </button>
              <button
                type="button"
                disabled={!mergeTargetId}
                onClick={async () => {
                  if (!mergeTargetId) return;
                  if (onMergeCustomers) {
                    await onMergeCustomers(mergeSource.id, mergeTargetId);
                  }
                  setMergeSource(null);
                }}
                className="px-4 py-2 bg-[#3A87AD] hover:bg-[#2A779D] text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <GitMerge size={16} />
                Zlúčiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
