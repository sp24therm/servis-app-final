import React from 'react';
import { motion } from 'framer-motion';
import { Wrench } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card max-w-md w-full p-8 text-center space-y-8"
      >
        <div className="space-y-2">
          <div className="w-16 h-16 bg-[#3A87AD] rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-[#3A87AD]/20">
            <Wrench size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#3A87AD] pt-4">SP Therm s.r.o.</h1>
          <p className="text-white/60">Prihláste sa pre prístup k správe zákazníkov a servisných záznamov.</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white font-semibold py-3 px-4 rounded-xl hover:bg-white/10 transition-all shadow-sm active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Prihlásiť sa cez Google
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#121212] px-2 text-white/20">alebo</span></div>
          </div>

          <button 
            onClick={() => (window as any).showPublicBooking()}
            className="w-full flex items-center justify-center gap-3 bg-[#3A87AD] text-white font-bold py-4 px-4 rounded-2xl hover:bg-[#3A87AD]/90 transition-all shadow-lg shadow-[#3A87AD]/20 active:scale-[0.98]"
          >
            Rezervovať termín servisu
          </button>
        </div>

        <p className="text-xs text-white/40">
          Všetky dáta sú synchronizované v reálnom čase pre váš tím.
        </p>
      </motion.div>
    </div>
  );
};
