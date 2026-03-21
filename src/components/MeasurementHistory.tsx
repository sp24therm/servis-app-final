import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { ServiceRecord } from '../types';
import { TrendingUp, Activity, Droplets } from 'lucide-react';

interface MeasurementHistoryProps {
  services: ServiceRecord[];
}

const MeasurementHistory = ({ services }: { services: ServiceRecord[] }) => {
  const sortedServices = [...services].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const data = sortedServices.map(s => ({
    date: new Date(s.date).toLocaleDateString('sk-SK'),
    co2Max: s.co2Max || s.co2Value || 0,
    co2Min: s.co2Min || 0,
    co: s.coValue || 0,
    o2Max: s.o2Max || 0,
    o2Min: s.o2Min || 0,
    efficiency: s.efficiency || 0,
    ph: s.phCH || 0,
    conductivity: s.conductivity || 0,
    hardness: s.hardnessCH || 0,
  }));

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-white/20 italic bg-white/5 rounded-2xl border border-white/5">
        Žiadne historické dáta pre grafy.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Combustion Analysis */}
      <div className="card p-4">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-[#3A87AD]" />
          Analýza spalín (CO2, O2, Účinnosť)
        </h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="date" 
                  fontSize={10} 
                  tick={{ fill: 'rgba(255,255,255,0.3)' }} 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  fontSize={10} 
                  tick={{ fill: 'rgba(255,255,255,0.3)' }} 
                  domain={['auto', 'auto']} 
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E1E1E', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ fontSize: '11px', fontWeight: '600', color: '#E0E0E0' }}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="co2Max" name="CO2 Max (%)" stroke="#3A87AD" strokeWidth={3} dot={{ r: 3, fill: '#3A87AD', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="co2Min" name="CO2 Min (%)" stroke="#3A87AD" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2, fill: '#3A87AD', strokeWidth: 0 }} />
                <Line type="monotone" dataKey="co" name="CO (ppm)" stroke="#C14F4F" strokeWidth={2.5} dot={{ r: 3, fill: '#C14F4F', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="efficiency" name="Účinnosť (%)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="o2Max" name="O2 Max (%)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2, fill: '#f59e0b', strokeWidth: 0 }} />
                <Line type="monotone" dataKey="o2Min" name="O2 Min (%)" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" dot={{ r: 2, fill: '#f59e0b', strokeWidth: 0 }} />
              </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chemical Values */}
      <div className="card p-4">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Droplets size={18} className="text-emerald-500" />
          Chemické hodnoty ÚK (pH, Tvrdosť, Vodivosť)
        </h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="date" 
                  fontSize={10} 
                  tick={{ fill: 'rgba(255,255,255,0.3)' }} 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  fontSize={10} 
                  tick={{ fill: 'rgba(255,255,255,0.3)' }} 
                  domain={['auto', 'auto']} 
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E1E1E', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ fontSize: '11px', fontWeight: '600', color: '#E0E0E0' }}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="ph" name="pH" stroke="#059669" strokeWidth={3} dot={{ r: 3, fill: '#059669', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="hardness" name="Tvrdosť (°dH)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="conductivity" name="Vodivosť (mS/cm)" stroke="#ec4899" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 2, fill: '#ec4899', strokeWidth: 0 }} />
              </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MeasurementHistory;
