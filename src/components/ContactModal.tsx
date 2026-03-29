import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronDown } from 'lucide-react';
import { Contact } from '../types';
import { AddressSearch } from './AddressSearch';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (contact: Omit<Contact, 'id'>) => void;
  onUpdate: (id: string, contact: Partial<Contact>) => void;
  onDelete: (id: string) => void;
  editingContact: Contact | null;
  contacts: Contact[];
}

export const ContactModal = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  onUpdate,
  onDelete,
  editingContact,
  contacts
}: ContactModalProps) => {
  const [contact, setContact] = useState({ 
    name: '', 
    specialization: '', 
    brand: '',
    phone: '', 
    email: '', 
    address: '', 
    notes: '' 
  });

  // Dropdown states
  const [showSpecDropdown, setShowSpecDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const specRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);

  // Suggestions
  const specSuggestions = Array.from(new Set(contacts.map(c => c.specialization).filter(Boolean))) as string[];
  const brandSuggestions = Array.from(new Set(contacts.map(c => c.brand).filter(Boolean))) as string[];

  const filteredSpecs = specSuggestions.filter(s => 
    s.toLowerCase().includes(contact.specialization.toLowerCase())
  );
  const filteredBrands = brandSuggestions.filter(b => 
    b.toLowerCase().includes(contact.brand.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (specRef.current && !specRef.current.contains(event.target as Node)) {
        setShowSpecDropdown(false);
      }
      if (brandRef.current && !brandRef.current.contains(event.target as Node)) {
        setShowBrandDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (editingContact) {
        setContact({
          name: editingContact.name,
          specialization: editingContact.specialization || '',
          brand: editingContact.brand || '',
          phone: editingContact.phone,
          email: editingContact.email || '',
          address: editingContact.address || '',
          notes: editingContact.notes || ''
        });
      } else {
        setContact({ name: '', specialization: '', brand: '', phone: '', email: '', address: '', notes: '' });
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
        className="card w-full max-w-md p-6 relative z-10 overflow-y-auto max-h-[90vh] custom-scrollbar"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 relative" ref={specRef}>
              <label className="text-sm font-bold text-white/70">Špecializácia (odbor)</label>
              <div className="relative">
                <input 
                  required
                  placeholder="napr. Servisný technik..."
                  className="input-field pr-8" 
                  value={contact.specialization}
                  onChange={e => {
                    setContact({...contact, specialization: e.target.value});
                    setShowSpecDropdown(true);
                  }}
                  onFocus={() => setShowSpecDropdown(true)}
                />
                <button
                  type="button"
                  onClick={() => setShowSpecDropdown(!showSpecDropdown)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <AnimatePresence>
                {showSpecDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute left-0 right-0 top-full mt-1 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-50 max-h-40 overflow-y-auto custom-scrollbar"
                  >
                    {filteredSpecs.length > 0 ? (
                      filteredSpecs.map(spec => (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => {
                            setContact({...contact, specialization: spec});
                            setShowSpecDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          {spec}
                        </button>
                      ))
                    ) : contact.specialization && (
                      <button
                        type="button"
                        onClick={() => setShowSpecDropdown(false)}
                        className="w-full text-left px-3 py-2 text-xs text-[#3A87AD] hover:bg-white/5 transition-colors font-medium"
                      >
                        Vytvoriť: "{contact.specialization}"
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-1 relative" ref={brandRef}>
              <label className="text-sm font-bold text-white/70">Firma / značka</label>
              <div className="relative">
                <input 
                  placeholder="napr. Viessmann..."
                  className="input-field pr-8" 
                  value={contact.brand}
                  onChange={e => {
                    setContact({...contact, brand: e.target.value});
                    setShowBrandDropdown(true);
                  }}
                  onFocus={() => setShowBrandDropdown(true)}
                />
                <button
                  type="button"
                  onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <AnimatePresence>
                {showBrandDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute left-0 right-0 top-full mt-1 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-50 max-h-40 overflow-y-auto custom-scrollbar"
                  >
                    {filteredBrands.length > 0 ? (
                      filteredBrands.map(brand => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => {
                            setContact({...contact, brand: brand});
                            setShowBrandDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          {brand}
                        </button>
                      ))
                    ) : contact.brand && (
                      <button
                        type="button"
                        onClick={() => setShowBrandDropdown(false)}
                        className="w-full text-left px-3 py-2 text-xs text-[#3A87AD] hover:bg-white/5 transition-colors font-medium"
                      >
                        Vytvoriť: "{contact.brand}"
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
            <AddressSearch 
              value={contact.address}
              onChange={addr => setContact({...contact, address: addr})}
              onSelect={(addr) => setContact({...contact, address: addr})}
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
