import React, { useState, useEffect, useRef } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Customer, Boiler } from '../types';
import { BoilerFormFields } from './BoilerFormFields';
import { doc, collection } from 'firebase/firestore';
import { db } from '../firebase';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (customer: Omit<Customer, 'id'>, boiler?: Omit<Boiler, 'id' | 'customerId'>, preGeneratedIds?: { customerId?: string, boilerId?: string }) => void;
  onUpdate: (id: string, customer: Partial<Customer>) => void;
  onDelete: (id: string) => void;
  editingCustomer: Customer | null;
  customers: Customer[];
  boilers: Boiler[];
  setIsScannerOpen: (v: boolean) => void;
}

export const CustomerModal = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  onUpdate,
  onDelete,
  editingCustomer,
  customers,
  boilers,
  setIsScannerOpen
}: CustomerModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [newCustomer, setNewCustomer] = useState({ 
    name: '', 
    company: '', 
    phone: '', 
    email: '', 
    notes: '',
    secondaryContact: { name: '', phone: '' }
  });
  const [addBoiler, setAddBoiler] = useState(true);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [newBoiler, setNewBoiler] = useState({
    name: 'Hlavný kotol',
    address: '',
    lat: 0,
    lng: 0,
    brand: '',
    model: '',
    serialNumber: '',
    installDate: new Date().toISOString().split('T')[0],
    notes: '',
    photos: {}
  });

  // Pre-generate IDs for new customer/boiler
  const [preGeneratedIds] = useState(() => ({
    customerId: doc(collection(db, 'customers')).id,
    boilerId: doc(collection(db, 'boilers')).id
  }));

  useEffect(() => {
    if (isOpen) {
      if (editingCustomer) {
        setNewCustomer({
          name: editingCustomer.name,
          company: editingCustomer.company || '',
          phone: editingCustomer.phone,
          email: editingCustomer.email || '',
          notes: editingCustomer.notes || '',
          secondaryContact: editingCustomer.secondaryContact || { name: '', phone: '' }
        });
        setAddBoiler(false);
      } else {
        setNewCustomer({ 
          name: '', 
          company: '', 
          phone: '', 
          email: '', 
          notes: '',
          secondaryContact: { name: '', phone: '' }
        });
        setAddBoiler(false);
        setNewBoiler({
          name: 'Hlavný kotol',
          address: '',
          lat: 0,
          lng: 0,
          brand: '',
          model: '',
          serialNumber: '',
          installDate: new Date().toISOString().split('T')[0],
          notes: '',
          photos: {}
        });
      }
      setDuplicateError(null);
    }
  }, [isOpen, editingCustomer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateError(null);

    // Duplicate check
    const isDuplicate = customers.some(c => {
      if (editingCustomer && c.id === editingCustomer.id) return false;
      return (
        c.name.toLowerCase() === newCustomer.name.toLowerCase() ||
        (newCustomer.phone && c.phone === newCustomer.phone) ||
        (newCustomer.email && c.email && c.email.toLowerCase() === newCustomer.email.toLowerCase())
      );
    });

    if (isDuplicate) {
      setDuplicateError('Zákazník s týmto menom, telefónom alebo emailom už existuje.');
      return;
    }

    if (editingCustomer) {
      onUpdate(editingCustomer.id, newCustomer);
    } else {
      onAdd(newCustomer, addBoiler ? newBoiler : undefined, preGeneratedIds);
    }
  };

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="card w-full max-w-2xl p-6 space-y-6"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {editingCustomer ? 'Upraviť zákazníka' : 'Nový zákazník'}
          </h2>
          {editingCustomer && (
            <button 
              type="button"
              onClick={() => onDelete(editingCustomer.id)}
              className="p-2 text-white hover:bg-red-500 rounded-xl transition-all"
              title="Vymazať zákazníka"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {duplicateError && (
          <div className="p-3 bg-[#C14F4F]/10 border border-[#C14F4F]/20 rounded-xl flex items-center gap-3 text-[#C14F4F] text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            {duplicateError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-white/70">Meno a priezvisko</label>
              <input 
                required
                type="text" 
                className="input-field" 
                value={newCustomer.name}
                onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-white/70">Firma</label>
              <input 
                type="text" 
                className="input-field" 
                value={newCustomer.company}
                onChange={e => setNewCustomer({...newCustomer, company: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-white/70">Telefón</label>
              <input 
                type="tel" 
                className="input-field" 
                value={newCustomer.phone}
                onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-white/70">Email</label>
              <input 
                type="email" 
                className="input-field" 
                value={newCustomer.email}
                onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
              />
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl space-y-4 border border-white/5">
            <h3 className="text-sm font-bold text-[#3A87AD] uppercase tracking-wider">Pomocný kontakt (voliteľné)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-white/70">Meno pomocného kontaktu</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newCustomer.secondaryContact.name}
                  onChange={e => setNewCustomer({
                    ...newCustomer, 
                    secondaryContact: { ...newCustomer.secondaryContact, name: e.target.value }
                  })}
                  placeholder="napr. Manželka, Správca..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-white/70">Telefón pomocného kontaktu</label>
                <input 
                  type="tel" 
                  className="input-field" 
                  value={newCustomer.secondaryContact.phone}
                  onChange={e => setNewCustomer({
                    ...newCustomer, 
                    secondaryContact: { ...newCustomer.secondaryContact, phone: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Poznámka</label>
            <textarea 
              className="input-field min-h-[60px]" 
              value={newCustomer.notes}
              onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})}
            />
          </div>

          {!editingCustomer && (
            <div className="flex items-center gap-2 py-2">
              <input 
                type="checkbox" 
                id="add-boiler" 
                checked={addBoiler} 
                onChange={e => setAddBoiler(e.target.checked)}
                className="w-4 h-4 text-[#3A87AD] rounded bg-black/40 border-white/10"
              />
              <label htmlFor="add-boiler" className="text-sm font-bold text-white/70 cursor-pointer">Pridať prvé zariadenie</label>
            </div>
          )}

          {!editingCustomer && addBoiler && (
            <BoilerFormFields 
              boilerData={newBoiler} 
              setBoilerData={setNewBoiler} 
              existingBoilers={boilers} 
              setIsScannerOpen={setIsScannerOpen}
              customerId={preGeneratedIds.customerId}
              boilerId={preGeneratedIds.boilerId}
            />
          )}

          <div className="flex gap-3 pt-4 border-t border-white/5">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Zrušiť</button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              {editingCustomer ? 'Uložiť zmeny' : 'Vytvoriť zákazníka'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
