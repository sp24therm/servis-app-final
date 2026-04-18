import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useLeadCapture } from '../hooks/useLeadCapture';

interface BookingStep1Props {
  onComplete: () => void;
  setBookingName: (name: string) => void;
  setBookingPhone: (phone: string) => void;
}

export const BookingStep1: React.FC<BookingStep1Props> = ({ 
  onComplete, 
  setBookingName, 
  setBookingPhone 
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { createLead, saveLeadId } = useLeadCapture();

  const validatePhone = (p: string) => {
    const slovakRegex = /^\+421\d{9}$/;
    const localRegex = /^09\d{8}$/;
    return slovakRegex.test(p.replace(/\s/g, '')) || localRegex.test(p.replace(/\s/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\s/g, '');
    if (!validatePhone(cleanPhone)) {
      setError('Zadajte platné slovenské telefónne číslo (+421... alebo 09...)');
      return;
    }

    setIsSubmitting(true);
    try {
      const leadId = await createLead(name, cleanPhone);
      saveLeadId(leadId);
      
      // Update parent state so next step is pre-filled
      setBookingName(name);
      setBookingPhone(cleanPhone);
      
      onComplete();
    } catch (err) {
      setError('Vyskytla sa chyba pri odosielaní. Skúste to prosím neskôr.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h3 className="text-2xl font-bold">Rýchly kontakt</h3>
        <p className="text-white/60">Zadajte základné údaje a pokračujte k výberu termínu.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-widest text-white/40">Meno a priezvisko *</label>
          <input 
            required
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-white/30 transition-colors"
            placeholder="Ján Novák"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-widest text-white/40">Telefónne číslo *</label>
          <input 
            required
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-white/30 transition-colors"
            placeholder="09XX XXX XXX"
          />
        </div>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-flame-red text-white font-bold py-5 rounded-2xl shadow-lg shadow-flame-red/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              Pokračovať k výberu termínu
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};
