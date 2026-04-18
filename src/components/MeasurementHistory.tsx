import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { ServiceRecord } from '../types';

export const MeasurementHistory = ({ services }: { services: ServiceRecord[] }) => {
  const data = [...services]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(s => ({
      date: new Date(s.date).toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' }),
      co2: s.co2Value || 0,
      co: s.coValue || 0,
      pressure: s.pressureValue || 0,
      efficiency: s.efficiency || 0
    }));

  if (data.length === 0) return null;

  return (
    <div className="space-y-6 p-4 bg-black/20 rounded-2xl border border-white/5">
      <div className="h-[300px] w-full">
        <p className="text-[10px] font-bold text-white/40 uppercase mb-2 tracking-widest">CO2 (%) & Účinnosť (%)</p>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
            <RechartsTooltip 
              contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              itemStyle={{ fontSize: '12px' }}
            />
            <Line type="monotone" dataKey="co2" stroke="#3A87AD" strokeWidth={3} dot={{ fill: '#3A87AD', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} name="CO2" />
            <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Účinnosť" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="h-[300px] w-full">
        <p className="text-[10px] font-bold text-white/40 uppercase mb-2 tracking-widest">CO (ppm) & Tlak (bar)</p>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
            <RechartsTooltip 
              contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              itemStyle={{ fontSize: '12px' }}
            />
            <Line type="monotone" dataKey="co" stroke="#C14F4F" strokeWidth={3} dot={{ fill: '#C14F4F', strokeWidth: 2, r: 4 }} name="CO" />
            <Line type="monotone" dataKey="pressure" stroke="#fbbf24" strokeWidth={2} dot={{ fill: '#fbbf24', strokeWidth: 2, r: 4 }} name="Tlak" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
