import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';

interface UserMenuProps {
  onOpenSettings: () => void;
}

export const UserMenu = ({ onOpenSettings }: UserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all group"
      >
        <div className="w-10 h-10 rounded-full bg-[#3A87AD]/20 flex items-center justify-center border border-[#3A87AD]/30 group-hover:border-[#3A87AD]/50 transition-all overflow-hidden">
          {user?.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'User'} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <UserIcon size={20} className="text-[#3A87AD]" />
          )}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-bold text-white/90 truncate max-w-[120px]">
            {user?.displayName || 'Užívateľ'}
          </p>
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
            Administrátor
          </p>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-white/20 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-2 w-56 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[200] backdrop-blur-xl"
          >
            <div className="p-4 border-bottom border-white/5 bg-white/5">
              <p className="text-xs text-white/40 font-medium uppercase tracking-widest mb-1">Prihlásený ako</p>
              <p className="text-sm font-bold text-white/90 truncate">{user?.email}</p>
            </div>
            
            <div className="p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
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
  );
};
