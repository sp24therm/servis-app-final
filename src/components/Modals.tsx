import React, { useState, useEffect } from 'react';
import { Trash2, AlertCircle, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Contact } from '../types';

// --- Contact Modal ---
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
  const [contact, setContact] = useState({ name: '', company: '', phone: '', email: '', notes: '' });

  useEffect(() => {
    if (isOpen) {
      if (editingContact) {
        setContact({
          name: editingContact.name,
          company: editingContact.company || '',
          phone: editingContact.phone,
          email: editingContact.email || '',
          notes: editingContact.notes || ''
        });
      } else {
        setContact({ name: '', company: '', phone: '', email: '', notes: '' });
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
    onClose(); // Close modal after successful submit
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
              onClick={() => {
                if (window.confirm('Naozaj chcete vymazať tento kontakt?')) {
                  onDelete(editingContact.id);
                  onClose();
                }
              }}
              className="p-2 text-white hover:bg-red-500 rounded-xl transition-all"
              title="Vymazať kontakt"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Meno a priezvisko</label>
            <input 
              required
              type="text" 
              className="input-field" 
              value={contact.name}
              onChange={e => setContact({...contact, name: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Firma</label>
            <input 
              type="text" 
              className="input-field" 
              value={contact.company}
              onChange={e => setContact({...contact, company: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Telefón</label>
            <input 
              required
              type="tel" 
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
          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Poznámka</label>
            <textarea 
              className="input-field min-h-[80px]" 
              value={contact.notes}
              onChange={e => setContact({...contact, notes: e.target.value})}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Zrušiť</button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              {editingContact ? 'Uložiť zmeny' : 'Vytvoriť kontakt'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// --- Delete Confirmation Modal ---
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const DeleteConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: DeleteConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
        className="card w-full max-w-md p-8 relative z-10 text-center space-y-6"
      >
        <div className="w-16 h-16 bg-[#C14F4F]/20 text-[#C14F4F] rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-white/60 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Zrušiť</button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className="btn-primary flex-1 justify-center bg-[#C14F4F] hover:bg-[#A13F3F] border-[#C14F4F]/20"
          >
            Odstrániť
          </button>
        </div>
      </motion.div>
    </div>
  );
};
