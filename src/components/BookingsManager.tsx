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
  MessageSquare,
  XCircle,
  Edit2,
  ExternalLink,
  Download,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookings } from '../hooks/useBookings';
import { Booking } from '../types';
import { toast } from 'sonner';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const BookingCard = ({ 
  booking, 
  isPending, 
  confirmingId, 
  handleConfirm, 
  generateICS, 
  setEditingBooking, 
  setNewDate, 
  setNewTime, 
  setCancellingId 
}: { 
  booking: Booking, 
  isPending: boolean,
  confirmingId: string | null,
  handleConfirm: (b: Booking) => void,
  generateICS: (b: Booking) => void,
  setEditingBooking: (b: Booking) => void,
  setNewDate: (d: string) => void,
  setNewTime: (t: string) => void,
  setCancellingId: (id: string) => void
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className={`card p-6 border-l-4 transition-all group ${
      isPending ? 'border-l-red-500' : 'border-l-green-500'
    }`}
  >
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white">{booking.name}</h3>
              {isPending && (
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-2 text-white/40 text-sm mt-1">
              <MapPin size={14} />
              <span>{booking.address}</span>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full border ${
            isPending ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider">{booking.serviceType}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
            <Calendar size={18} className="text-[#3A87AD]" />
            <div>
              <p className="text-[10px] text-white/30 uppercase font-bold">Dátum</p>
              <p className="text-sm font-bold text-white">{new Date(booking.preferredDate).toLocaleDateString('sk-SK')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
            <Clock size={18} className="text-[#3A87AD]" />
            <div>
              <p className="text-[10px] text-white/30 uppercase font-bold">Čas</p>
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
          <a 
            href={`tel:${booking.phone}`}
            className="flex items-center gap-2 text-[#3A87AD] hover:text-white transition-colors bg-[#3A87AD]/10 px-3 py-1.5 rounded-lg border border-[#3A87AD]/20"
          >
            <Phone size={14} />
            <span className="text-sm font-bold">{booking.phone}</span>
          </a>
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
        {isPending ? (
          <button
            onClick={() => handleConfirm(booking)}
            disabled={confirmingId === booking.id}
            className="btn-primary w-full justify-center py-4 rounded-2xl shadow-lg shadow-[#3A87AD]/20"
          >
            {confirmingId === booking.id ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <CheckCircle2 size={20} />
                <span className="font-bold uppercase">Potvrdiť</span>
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={() => generateICS(booking)}
              className="btn-secondary w-full justify-center py-3 rounded-xl border-white/10"
            >
              <Download size={18} />
              <span className="text-xs font-bold uppercase">Do kalendára</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setEditingBooking(booking);
                  setNewDate(booking.preferredDate);
                  setNewTime(booking.preferredTime);
                }}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center justify-center text-white/60"
                title="Upraviť"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => setCancellingId(booking.id)}
                className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/20 flex items-center justify-center text-red-500"
                title="Zrušiť"
              >
                <XCircle size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  </motion.div>
);

export const BookingsManager = () => {
  const { bookings, confirmBooking, cancelBooking, updateBookingTime, loading } = useBookings();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean | null>(null);

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'google_calendar_tokens'), (snap) => {
      setIsGoogleConnected(snap.exists());
    });
    return () => unsub();
  }, []);

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  const handleConfirm = async (booking: Booking) => {
    setConfirmingId(booking.id);
    try {
      const success = await confirmBooking(booking);
      if (success) {
        // Create Google Calendar Event
        try {
          await fetch('/api/calendar/create-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking })
          });
          toast.success('Udalosť vytvorená v Google kalendári');
        } catch (err) {
          console.error('Failed to create Google Calendar event:', err);
          toast.error('Nepodarilo sa vytvoriť udalosť v Google kalendári');
        }

        toast.success('Termín potvrdený a zákazník vytvorený');
        
        // SMS Bridge for iPhone PWA
        const message = `Dobrý deň, potvrdzujem Váš termín servisu SP THERM na ${new Date(booking.preferredDate).toLocaleDateString('sk-SK')} o ${booking.preferredTime}. Tešíme sa na Vás.`;
        const smsUrl = `sms:${booking.phone}${navigator.userAgent.match(/iPhone/i) ? '&' : '?'}body=${encodeURIComponent(message)}`;
        window.location.href = smsUrl;
      }
    } catch (error) {
      toast.error('Chyba pri potvrdzovaní');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    const success = await cancelBooking(id);
    if (success) {
      toast.success('Termín zrušený');
      setCancellingId(null);
    }
  };

  const handleUpdate = async () => {
    if (!editingBooking) return;
    const success = await updateBookingTime(editingBooking.id, newDate, newTime);
    if (success) {
      toast.success('Termín aktualizovaný');
      setEditingBooking(null);
    }
  };

  const generateICS = (booking: Booking) => {
    const startDate = new Date(`${booking.preferredDate}T${booking.preferredTime}`).toISOString().replace(/-|:|\.\d+/g, '');
    const endDate = new Date(new Date(`${booking.preferredDate}T${booking.preferredTime}`).getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d+/g, '');
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:Servis SP THERM - ${booking.name}`,
      `LOCATION:${booking.address}`,
      `DESCRIPTION:Zákazník: ${booking.name}\\nTelefón: ${booking.phone}\\nKotol: ${booking.boilerBrand} ${booking.boilerModel || ''}\\nTyp: ${booking.serviceType}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `servis_${booking.name.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || isGoogleConnected === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#3A87AD]" size={32} />
      </div>
    );
  }

  if (!isGoogleConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="p-4 bg-red-500/10 rounded-full text-red-500">
          <AlertCircle size={48} />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl font-bold text-white">Google Kalendár nie je pripojený</h3>
          <p className="text-white/40">Pre zobrazenie a synchronizáciu termínov sa prosím prihláste v Nastaveniach.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#3A87AD]/20 rounded-xl">
            <Calendar className="text-[#3A87AD]" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Správa objednávok</h2>
            <p className="text-sm text-white/40">Prehľad rezervácií z webu</p>
          </div>
        </div>
      </div>

      {/* Pending Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">Nové požiadavky ({pendingBookings.length})</h3>
        </div>
        
        {pendingBookings.length === 0 ? (
          <div className="card p-8 text-center text-white/20 border-dashed">
            Žiadne nové požiadavky
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingBookings.map(b => (
              <BookingCard 
                key={b.id} 
                booking={b} 
                isPending={true}
                confirmingId={confirmingId}
                handleConfirm={handleConfirm}
                generateICS={generateICS}
                setEditingBooking={setEditingBooking}
                setNewDate={setNewDate}
                setNewTime={setNewTime}
                setCancellingId={setCancellingId}
              />
            ))}
          </div>
        )}
      </section>

      {/* Confirmed Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">Potvrdené termíny ({confirmedBookings.length})</h3>
        </div>

        {confirmedBookings.length === 0 ? (
          <div className="card p-8 text-center text-white/20 border-dashed">
            Žiadne potvrdené termíny
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {confirmedBookings.map(b => (
              <BookingCard 
                key={b.id} 
                booking={b} 
                isPending={false}
                confirmingId={confirmingId}
                handleConfirm={handleConfirm}
                generateICS={generateICS}
                setEditingBooking={setEditingBooking}
                setNewDate={setNewDate}
                setNewTime={setNewTime}
                setCancellingId={setCancellingId}
              />
            ))}
          </div>
        )}
      </section>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingBooking && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="card w-full max-w-md p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Upraviť termín</h3>
                <button onClick={() => setEditingBooking(null)} className="text-white/40 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Nový dátum</label>
                  <input 
                    type="date" 
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Nový čas</label>
                  <input 
                    type="time" 
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEditingBooking(null)} className="btn-secondary flex-1 justify-center">Zrušiť</button>
                <button onClick={handleUpdate} className="btn-primary flex-1 justify-center">Uložiť zmeny</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {cancellingId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="card w-full max-w-sm p-6 space-y-6 border-red-500/20"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-red-500/20 rounded-full text-red-500">
                  <AlertCircle size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Zrušiť termín?</h3>
                  <p className="text-sm text-white/40">Naozaj chcete zrušiť tento termín? Táto akcia uvoľní slot na webe.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setCancellingId(null)} className="btn-secondary flex-1 justify-center">Nie, späť</button>
                <button onClick={() => handleCancel(cancellingId)} className="btn-primary flex-1 justify-center bg-red-600 hover:bg-red-700 border-red-600">Áno, zrušiť</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
