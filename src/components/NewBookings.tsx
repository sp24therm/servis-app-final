import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Wrench, 
  CheckCircle2, 
  Loader2, 
  ChevronRight,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBookings } from '../hooks/useBookings';
import { Booking } from '../types';

// Mock for native modules in web environment
const CalendarIntegration = {
  createEvent: async (booking: Booking) => {
    console.log('Native Calendar Integration (Mock):', {
      title: `Servis SP THERM - ${booking.name}`,
      startDate: new Date(`${booking.preferredDate}T${booking.preferredTime}`),
      endDate: new Date(new Date(`${booking.preferredDate}T${booking.preferredTime}`).getTime() + 60 * 60 * 1000),
      location: booking.address,
      notes: `Zákazník: ${booking.name}\nAdresa: ${booking.address}\nTelefón: ${booking.phone}\nKotol: ${booking.boilerBrand} ${booking.boilerModel || ''}\nTyp servisu: ${booking.serviceType}\nPoznámka: ${booking.notes || ''}`
    });
    
    // In a real Expo app, you would use:
    // import * as Calendar from 'expo-calendar';
    // const { status } = await Calendar.requestCalendarPermissionsAsync();
    // if (status === 'granted') {
    //   const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    //   const defaultCalendar = calendars.find(c => c.allowsModifications) || calendars[0];
    //   await Calendar.createEventAsync(defaultCalendar.id, { ... });
    // }
    
    return true;
  }
};

export const NewBookings = () => {
  const { bookings, confirmBooking, loading } = useBookings();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleConfirm = async (booking: Booking) => {
    setConfirmingId(booking.id);
    try {
      // 1. Update Firestore & Customer
      const success = await confirmBooking(booking);
      
      if (success) {
        // 2. Native Calendar Integration
        await CalendarIntegration.createEvent(booking);

        // 3. SMS Bridge
        const message = `Dobrý deň, potvrdzujem Váš termín servisu SP THERM na ${new Date(booking.preferredDate).toLocaleDateString('sk-SK')} o ${booking.preferredTime}. Tešíme sa na Vás.`;
        const smsUrl = `sms:${booking.phone}${navigator.userAgent.match(/iPhone/i) ? '&' : '?'}body=${encodeURIComponent(message)}`;
        window.open(smsUrl, '_blank');
      }
    } catch (error) {
      console.error('Error in handleConfirm:', error);
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#3A87AD]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#3A87AD]/20 rounded-xl">
            <Calendar className="text-[#3A87AD]" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Nové objednávky</h2>
            <p className="text-sm text-white/40">Čakajúce na potvrdenie termínu</p>
          </div>
        </div>
        <div className="bg-white/5 px-4 py-2 rounded-full border border-white/10">
          <span className="text-sm font-bold text-[#3A87AD]">{bookings.length}</span>
          <span className="text-xs text-white/40 ml-2 uppercase tracking-wider">objednávok</span>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
            <CheckCircle2 className="text-white/10" size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white/60">Všetko vybavené</h3>
            <p className="text-sm text-white/30">Momentálne nemáte žiadne nové objednávky.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {bookings.map((booking) => (
              <motion.div
                key={booking.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="card p-6 hover:border-[#3A87AD]/30 transition-all group"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-[#3A87AD] transition-colors">{booking.name}</h3>
                        <div className="flex items-center gap-2 text-white/40 text-sm mt-1">
                          <MapPin size={14} />
                          <span>{booking.address}</span>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-[#3A87AD]/10 rounded-full border border-[#3A87AD]/20">
                        <span className="text-[10px] font-bold text-[#3A87AD] uppercase tracking-wider">{booking.serviceType}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <Calendar size={18} className="text-[#3A87AD]" />
                        <div>
                          <p className="text-[10px] text-white/30 uppercase font-bold">Preferovaný dátum</p>
                          <p className="text-sm font-bold text-white">{new Date(booking.preferredDate).toLocaleDateString('sk-SK')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <Clock size={18} className="text-[#3A87AD]" />
                        <div>
                          <p className="text-[10px] text-white/30 uppercase font-bold">Preferovaný čas</p>
                          <p className="text-sm font-bold text-white">{booking.preferredTime}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <Wrench size={18} className="text-[#3A87AD]" />
                        <div>
                          <p className="text-[10px] text-white/30 uppercase font-bold">Zariadenie</p>
                          <p className="text-sm font-bold text-white">{booking.boilerBrand} {booking.boilerModel}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <div className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                        <Phone size={14} className="text-[#3A87AD]" />
                        <span className="text-sm">{booking.phone}</span>
                      </div>
                      {booking.email && (
                        <div className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                          <Mail size={14} className="text-[#3A87AD]" />
                          <span className="text-sm">{booking.email}</span>
                        </div>
                      )}
                    </div>

                    {booking.notes && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex gap-3">
                        <MessageSquare size={16} className="text-white/20 shrink-0 mt-0.5" />
                        <p className="text-xs text-white/40 italic">"{booking.notes}"</p>
                      </div>
                    )}
                  </div>

                  <div className="lg:w-48 flex flex-col justify-center gap-3">
                    <button
                      onClick={() => handleConfirm(booking)}
                      disabled={confirmingId === booking.id}
                      className="btn-primary w-full justify-center py-4 rounded-2xl shadow-lg shadow-[#3A87AD]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {confirmingId === booking.id ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <>
                          <CheckCircle2 size={20} />
                          <span className="font-bold">POTVRDIŤ TERMÍN</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-white/20 uppercase tracking-widest font-bold">
                      Zapíše do kalendára a otvorí SMS
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
