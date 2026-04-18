import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Wrench, 
  MessageSquare, 
  CheckCircle2, 
  ArrowLeft,
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

interface PublicBookingFormProps {
  onBack: () => void;
}

const WORKING_HOURS = ["07:00", "08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

export const PublicBookingForm = ({ onBack }: PublicBookingFormProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    boilerBrand: '',
    boilerModel: '',
    serviceType: 'Ročná prehliadka',
    preferredDate: new Date().toISOString().split('T')[0],
    preferredTime: '',
    notes: ''
  });

  // Fetch blocked slots for selected date
  useEffect(() => {
    const fetchSlots = async () => {
      setLoading(true);
      try {
        const slotsRef = collection(db, 'slots');
        const q = query(slotsRef, where('date', '==', formData.preferredDate));
        const snapshot = await getDocs(q);
        const blocked = snapshot.docs.map(doc => doc.data().time);
        setBlockedSlots(blocked);
      } catch (error) {
        console.error("Error fetching slots:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [formData.preferredDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.preferredTime) {
      toast.error('Prosím vyberte si čas termínu');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        ...formData,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setStep(3); // Success step
      toast.success('Rezervácia bola úspešne odoslaná');
    } catch (error) {
      console.error("Error submitting booking:", error);
      toast.error('Chyba pri odosielaní rezervácie');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const isStep1Valid = formData.name && formData.phone && formData.address && formData.boilerBrand;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center p-4 sm:p-6">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="p-2 text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold text-[#3A87AD]">Rezervácia termínu</h1>
            <p className="text-white/40 text-sm">SP Therm s.r.o.</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 h-1">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`flex-1 rounded-full transition-all duration-500 ${
                step >= i ? 'bg-[#3A87AD]' : 'bg-white/10'
              }`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="card p-6 space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <User size={14} /> Meno a priezvisko
                  </label>
                  <input 
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="napr. Jozef Mrkva"
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                      <Phone size={14} /> Telefón
                    </label>
                    <input 
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+421 900 000 000"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                      <Wrench size={14} /> Typ kotla
                    </label>
                    <input 
                      type="text"
                      required
                      value={formData.boilerBrand}
                      onChange={e => setFormData({ ...formData, boilerBrand: e.target.value })}
                      placeholder="napr. Viessmann"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <MapPin size={14} /> Adresa servisu
                  </label>
                  <input 
                    type="text"
                    required
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ulica, Mesto"
                    className="input-field"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <MessageSquare size={14} /> Poznámka (voliteľné)
                  </label>
                  <textarea 
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Doplňujúce informácie..."
                    className="input-field min-h-[80px]"
                  />
                </div>
              </div>

              <button 
                onClick={nextStep}
                disabled={!isStep1Valid}
                className="btn-primary w-full justify-center py-4 rounded-2xl disabled:opacity-50"
              >
                Pokračovať na výber termínu
                <ChevronRight size={20} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="card p-6 space-y-6"
            >
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <Calendar size={14} /> Vyberte si dátum
                  </label>
                  <input 
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.preferredDate}
                    onChange={e => setFormData({ ...formData, preferredDate: e.target.value, preferredTime: '' })}
                    className="input-field"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                    <Clock size={14} /> Dostupné časy
                  </label>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-[#3A87AD]" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {WORKING_HOURS.map(time => {
                        const isBlocked = blockedSlots.includes(time);
                        const isSelected = formData.preferredTime === time;
                        
                        return (
                          <button
                            key={time}
                            disabled={isBlocked}
                            onClick={() => setFormData({ ...formData, preferredTime: time })}
                            className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                              isBlocked 
                                ? 'bg-white/5 border-white/5 text-white/10 cursor-not-allowed' 
                                : isSelected
                                  ? 'bg-[#3A87AD] border-[#3A87AD] text-white shadow-lg shadow-[#3A87AD]/20'
                                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button onClick={prevStep} className="btn-secondary flex-1 justify-center">Späť</button>
                <button 
                  onClick={handleSubmit}
                  disabled={!formData.preferredTime || submitting}
                  className="btn-primary flex-1 justify-center"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Odoslať rezerváciu'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-10 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 mx-auto">
                <CheckCircle2 size={48} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Rezervácia odoslaná!</h2>
                <p className="text-white/40">
                  Vaša požiadavka bola prijatá. Budeme Vás kontaktovať ohľadom potvrdenia termínu.
                </p>
              </div>
              <button 
                onClick={onBack}
                className="btn-primary w-full justify-center py-4 rounded-2xl"
              >
                Späť na úvod
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
