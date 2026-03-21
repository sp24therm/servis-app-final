import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Boiler } from '../types';

const COLORS = ['#3A87AD', '#C14F4F', '#4FC18E', '#C1A44F', '#8E4FC1', '#4FC1C1'];

interface DashboardChartsProps {
  boilers: Boiler[];
}

export const DashboardCharts = ({ boilers }: DashboardChartsProps) => {
  const brandData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    boilers.forEach(b => {
      counts[b.brand] = (counts[b.brand] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [boilers]);

  const serviceStatusData = React.useMemo(() => {
    const now = new Date();
    let overdue = 0;
    let upcoming = 0;
    let onTime = 0;

    boilers.forEach(b => {
      if (!b.nextServiceDate) return;
      const nextDate = new Date(b.nextServiceDate);
      const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) overdue++;
      else if (diffDays <= 30) upcoming++;
      else onTime++;
    });

    return [
      { name: 'Po termíne', value: overdue, color: '#C14F4F' },
      { name: 'Blíži sa', value: upcoming, color: '#C1A44F' },
      { name: 'V poriadku', value: onTime, color: '#4FC18E' }
    ].filter(d => d.value > 0);
  }, [boilers]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Brand Distribution */}
      <div className="card p-6 space-y-4">
        <h3 className="font-bold text-white/60 text-sm uppercase tracking-widest">Distribúcia značiek</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={brandData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {brandData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1E1E1E', border: 'none', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry: any) => {
                  const { payload } = entry;
                  // Only show top 6 brands in legend
                  const index = brandData.findIndex(d => d.name === value);
                  if (index >= 6) return null;
                  return <span className="text-xs text-white/60">{value}</span>;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service Status */}
      <div className="card p-6 space-y-4">
        <h3 className="font-bold text-white/60 text-sm uppercase tracking-widest">Stav servisov</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serviceStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#ffffff40', fontSize: 12 }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#ffffff40', fontSize: 12 }} 
              />
              <Tooltip 
                cursor={{ fill: '#ffffff05' }}
                contentStyle={{ backgroundColor: '#1E1E1E', border: 'none', borderRadius: '12px', color: '#fff' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {serviceStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
