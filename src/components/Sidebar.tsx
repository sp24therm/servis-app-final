import React from 'react';
import { LayoutDashboard, Users, History, Phone } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isVisible: boolean;
}

export const Sidebar = ({ activeTab, setActiveTab, isVisible }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Prehľad', icon: LayoutDashboard },
    { id: 'customers', label: 'Zákazníci', icon: Users },
    { id: 'services', label: 'Zásahy', icon: History },
    { id: 'contacts', label: 'Kontakty', icon: Phone },
  ];

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-[#121212] backdrop-blur-md border-t border-white/5 px-6 py-1.5 flex justify-around items-center md:relative md:w-64 md:h-screen md:flex-col md:justify-start md:border-t-0 md:border-r md:pt-8 md:gap-2 z-[40] transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'} md:bg-transparent md:border-r-white/10`}>
      <div className="hidden md:flex items-center gap-3 px-4 mb-8 w-full">
        <img 
          src="/logo.png" 
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/logo/200/200'; }}
          alt="Logo" 
          className="h-10 w-auto object-contain" 
          referrerPolicy="no-referrer" 
        />
        <span className="font-bold text-xl tracking-tight text-[#3A87AD]">SP Therm s.r.o.</span>
      </div>
      
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex flex-col md:flex-row items-center gap-0.5 md:gap-3 px-4 py-1.5 md:w-full rounded-xl transition-all ${
            activeTab === item.id 
              ? 'text-[#3A87AD] md:bg-[#3A87AD]/10' 
              : 'text-white/40 hover:text-white/60 md:hover:bg-white/5'
          }`}
        >
          <item.icon size={20} className="md:w-6 md:h-6" />
          <span className="text-[9px] md:text-sm font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
};
