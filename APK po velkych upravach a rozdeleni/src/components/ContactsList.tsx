import React, { useState } from 'react';
import { Search, Plus, Phone, Info, MapPin, PenTool } from 'lucide-react';
import { Contact } from '../types';

interface ContactsListProps {
  contacts: Contact[];
  onAddContact: () => void;
  onEditContact: (contact: Contact) => void;
}

export const ContactsList = ({ 
  contacts,
  onAddContact,
  onEditContact
}: ContactsListProps) => {
  const [search, setSearch] = useState('');

  const filteredContacts = contacts.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.specialization || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Kontakty</h1>
        <button onClick={onAddContact} className="btn-primary">
          <Plus size={20} />
          <span>Nový kontakt</span>
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
        <input 
          type="text" 
          placeholder="Hľadať v kontaktoch..." 
          className="input-field pl-12"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map(contact => (
          <div 
            key={contact.id} 
            className="card p-5 space-y-4 hover:border-[#3A87AD]/30 transition-all group"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#3A87AD]/10 text-[#3A87AD] rounded-xl flex items-center justify-center font-bold">
                  {contact.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-white">{contact.name}</h3>
                  <p className="text-xs text-[#3A87AD] font-medium uppercase tracking-wider">{contact.specialization}</p>
                </div>
              </div>
              <button 
                onClick={() => onEditContact(contact)}
                className="p-2 text-white/20 hover:text-white/60 hover:bg-white/5 rounded-lg transition-all"
              >
                <PenTool size={16} />
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-sm text-white/60 hover:text-[#3A87AD] transition-colors">
                <Phone size={16} className="text-white/20" />
                {contact.phone}
              </a>
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm text-white/60 hover:text-[#3A87AD] transition-colors">
                  <Info size={16} className="text-white/20" />
                  {contact.email}
                </a>
              )}
              {contact.address && (
                <div className="flex items-start gap-3 text-sm text-white/60">
                  <MapPin size={16} className="text-white/20 mt-0.5" />
                  <span>{contact.address}</span>
                </div>
              )}
            </div>

            {contact.notes && (
              <div className="bg-white/5 rounded-lg p-3 text-xs text-white/40 italic">
                {contact.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
