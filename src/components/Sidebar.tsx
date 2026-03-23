import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Users, History, Phone, Settings as SettingsIcon, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { LOGO_URL } from '../config/constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isVisible: boolean;
  onOpenSettings: () => void;
}

export const Sidebar = ({ activeTab, setActiveTab, isVisible, onOpenSettings }: SidebarProps) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (mobileUserMenuRef.current && !mobileUserMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Prehľad', icon: LayoutDashboard },
    { id: 'customers', label: 'Zákazníci', icon: Users },
    { id: 'services', label: 'Zásahy', icon: History },
    { id: 'contacts', label: 'Kontakty', icon: Phone },
  ];

  return (
    <>
      {/* Mobile/Tablet Top Bar */}
      <div className="lg:hidden relative bg-gradient-to-b from-black/60 to-transparent px-6 py-3 flex justify-between items-center">
        <div className="relative" ref={mobileUserMenuRef}>
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 hover:bg-white/5 p-1 rounded-xl transition-all cursor-pointer"
          >
            <img 
              src={LOGO_URL} 
              alt="SP Therm logo" 
              className="h-8 w-8 rounded-full object-cover" 
              referrerPolicy="no-referrer" 
            />
            <span className="font-bold text-lg tracking-tight text-[#3A87AD]">SP Therm s.r.o.</span>
          </button>

          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-full left-0 mt-2 w-56 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[200] backdrop-blur-xl"
              >
                <div className="p-4 border-b border-white/5 bg-white/5">
                  <p className="text-xs text-white/40 font-medium uppercase tracking-widest mb-1">Prihlásený ako</p>
                  <p className="text-sm font-bold text-white/90 truncate">{user?.displayName || user?.email || 'Užívateľ'}</p>
                </div>
                
                <div className="p-2">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all text-sm font-medium"
                  >
                    <SettingsIcon size={18} className="text-[#3A87AD]" />
                    Nastavenia
                  </button>
                  
                  <div className="h-px bg-white/5 my-1 mx-2" />
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all text-sm font-medium"
                  >
                    <LogOut size={18} />
                    Odhlásiť sa
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sidebar (Bottom on Mobile, Left on Desktop) */}
      <div className={`fixed bottom-0 left-0 right-0 bg-[#121212] backdrop-blur-md border-t border-white/5 px-6 py-1.5 flex justify-around items-center lg:relative lg:w-64 lg:h-screen lg:flex-col lg:justify-start lg:border-t-0 lg:border-r lg:pt-8 lg:gap-2 z-[40] transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'} lg:bg-transparent lg:border-r-white/10`}>
        <div className="hidden lg:block relative w-full px-4 mb-8" ref={userMenuRef}>
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 w-full hover:bg-white/5 p-2 rounded-xl transition-all group min-h-[44px] cursor-pointer"
          >
            <img 
              src={LOGO_URL} 
              alt="SP Therm logo" 
              className="h-8 w-8 rounded-full object-cover" 
              referrerPolicy="no-referrer" 
            />
            <div className="flex flex-col items-start overflow-hidden">
              <span className="font-bold text-lg tracking-tight text-[#3A87AD] truncate w-full">SP Therm s.r.o.</span>
            </div>
          </button>

        <AnimatePresence>
          {isUserMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full left-4 mt-2 w-56 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[200] backdrop-blur-xl"
            >
              <div className="p-4 border-b border-white/5 bg-white/5">
                <p className="text-xs text-white/40 font-medium uppercase tracking-widest mb-1">Prihlásený ako</p>
                <p className="text-sm font-bold text-white/90 truncate">{user?.displayName || user?.email || 'Užívateľ'}</p>
              </div>
              
              <div className="p-2">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all text-sm font-medium"
                >
                  <SettingsIcon size={18} className="text-[#3A87AD]" />
                  Nastavenia
                </button>
                
                <div className="h-px bg-white/5 my-1 mx-2" />
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all text-sm font-medium"
                >
                  <LogOut size={18} />
                  Odhlásiť sa
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex lg:block w-full justify-around lg:space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col lg:flex-row items-center gap-0.5 lg:gap-3 px-4 py-2 lg:w-full rounded-xl transition-all min-h-[44px] ${
              activeTab === item.id 
                ? 'text-[#3A87AD] lg:bg-[#3A87AD]/10' 
                : 'text-white/40 hover:text-white/60 lg:hover:bg-white/5'
            }`}
          >
            <item.icon size={20} className="lg:w-6 lg:h-6" />
            <span className="text-[10px] lg:text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  </>
);
};
