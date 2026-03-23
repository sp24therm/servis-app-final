import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { Contact } from '../types';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (contact: Omit<Contact, 'id'>) => void;
  onUpdate: (id: string, contact: Partial<Contact>) => void;
  onDelete: (id: string) => void;
  editingContact: Contact | null;
}

export const ContactModal = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  onUpdate,
  onDelete,
  editingContact
}: ContactModalProps) => {
  const [contact, setContact] = useState({ name: '', specialization: '', phone: '', email: '', address: '', notes: '' });

  useEffect(() => {
    if (isOpen) {
      if (editingContact) {
        setContact({
          name: editingContact.name,
          specialization: editingContact.specialization || '',
          phone: editingContact.phone,
          email: editingContact.email || '',
          address: editingContact.address || '',
          notes: editingContact.notes || ''
        });
      } else {
        setContact({ name: '', specialization: '', phone: '', email: '', address: '', notes: '' });
      }
    }
  }, [isOpen, editingContact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContact) {
      onUpdate(editingContact.id, contact);
    } else {
      onAdd(contact);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="card w-full max-w-md p-6 relative z-10 overflow-y-auto max-h-[90vh]"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {editingContact ? 'Upraviť kontakt' : 'Nový kontakt'}
          </h2>
          {editingContact && (
            <button 
              type="button"
              onClick={() => onDelete(editingContact.id)}
              className="p-2 text-white hover:bg-red-500 rounded-xl transition-all"
              title="Vymazať kontakt"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Meno / Názov</label>
            <input 
              required
              className="input-field" 
              value={contact.name}
              onChange={e => setContact({...contact, name: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Špecializácia (značka/odbor)</label>
            <input 
              required
              placeholder="napr. Servisný technik, Predajňa..."
              className="input-field" 
              value={contact.specialization}
              onChange={e => setContact({...contact, specialization: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-white/70">Telefón</label>
              <input 
                required
                className="input-field" 
                value={contact.phone}
                onChange={e => setContact({...contact, phone: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-white/70">Email</label>
              <input 
                type="email"
                className="input-field" 
                value={contact.email}
                onChange={e => setContact({...contact, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Adresa</label>
            <input 
              className="input-field" 
              value={contact.address}
              onChange={e => setContact({...contact, address: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Poznámka</label>
            <textarea 
              className="input-field min-h-[80px]" 
              value={contact.notes}
              onChange={e => setContact({...contact, notes: e.target.value})}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Zrušiť</button>
            <button type="submit" className="btn-primary flex-1">Uložiť</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
