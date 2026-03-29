import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Users, History, Phone, Settings as SettingsIcon, LogOut, User as UserIcon, ChevronDown, Inbox, Bell, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { LOGO_URL } from '../config/constants';
import { PriceList } from './PriceList';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isVisible: boolean;
}

export const Sidebar = ({ activeTab, setActiveTab, isVisible }: SidebarProps) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPriceListOpen, setIsPriceListOpen] = useState(false);
  const [hasCalendarToken, setHasCalendarToken] = useState<boolean | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  useEffect(() => {
    // Listen to calendar tokens in Firestore
    const unsub = onSnapshot(doc(db, 'settings', 'google_calendar_tokens'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // Check if we have a refresh token or a valid access token
        setHasCalendarToken(!!(data.refresh_token || data.access_token));
      } else {
        setHasCalendarToken(false);
      }
    });

    return () => unsub();
  }, []);

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
    { id: 'bookings', label: 'Objednávky', icon: Inbox },
    { id: 'customers', label: 'Zákazníci', icon: Users },
    { id: 'services', label: 'Zásahy', icon: History },
    { id: 'contacts', label: 'Kontakty', icon: Phone },
  ];

  return (
    <>
      {/* Universal Top Bar */}
      <div className="relative bg-gradient-to-b from-black/60 to-transparent px-6 py-3 flex justify-between items-center">
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
                  {/* Calendar Sync Status */}
                  {hasCalendarToken === false && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        window.location.href = '/api/auth/google';
                      }}
                      className="w-full flex items-center gap-3 p-3 mb-1 rounded-xl bg-[#3A87AD]/20 text-[#3A87AD] hover:bg-[#3A87AD]/30 transition-all text-sm font-bold border border-[#3A87AD]/30"
                    >
                      <Bell size={18} className="animate-bounce" />
                      Prepojiť Google Kalendár
                    </button>
                  )}

                  {hasCalendarToken === true && (
                    <div className="flex items-center gap-2 px-3 py-2 mb-1 text-[10px] font-medium text-green-400/80 uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                      Kalendár aktívny
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setActiveTab('settings');
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

        <button 
          onClick={() => setIsPriceListOpen(true)}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all shadow-lg"
          title="Zobraziť cenník"
        >
          <span className="text-lg font-bold">€</span>
        </button>
      </div>

      <AnimatePresence>
        {isPriceListOpen && (
          <PriceList onClose={() => setIsPriceListOpen(false)} />
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Always visible) */}
      <div className={`fixed bottom-0 left-0 right-0 bg-[#121212] backdrop-blur-md border-t border-white/5 px-6 py-1.5 flex justify-around items-center z-[40] transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex w-full justify-around">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all min-h-[44px] ${
                activeTab === item.id 
                  ? 'text-[#3A87AD]' 
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
