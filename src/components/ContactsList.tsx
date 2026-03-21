import React, { useState, useMemo } from 'react';
import { Search, Plus, Phone, Mail, User, ChevronRight, Edit2 } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return contacts;

    return contacts.filter(c => {
      const nameMatch = (c.name || '').toLowerCase().includes(query);
      const companyMatch = (c.company || '').toLowerCase().includes(query);
      const phoneMatch = (c.phone || '').includes(query);
      const emailMatch = (c.email || '').toLowerCase().includes(query);

      return nameMatch || companyMatch || phoneMatch || emailMatch;
    });
  }, [contacts, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Kontakty</h1>
        <button onClick={onAddContact} className="btn-primary w-full sm:w-auto justify-center">
          <Plus size={20} /> Pridať kontakt
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
        <input 
          type="text" 
          placeholder="Hľadať podľa mena, firmy, telefónu alebo emailu..." 
          className="input-field pl-12 py-4 text-lg"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredContacts.length > 0 ? (
          filteredContacts.map(contact => (
            <div 
              key={contact.id} 
              className="card p-6 space-y-4 hover:border-[#3A87AD]/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#3A87AD]/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-[#3A87AD]/10 transition-all" />
              
              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 text-[#3A87AD] rounded-2xl flex items-center justify-center font-bold text-xl">
                    {contact.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg group-hover:text-[#3A87AD] transition-colors">{contact.name}</h3>
                    {contact.company && <p className="text-xs font-bold text-[#3A87AD] uppercase tracking-widest">{contact.company}</p>}
                  </div>
                </div>
                <button 
                  onClick={() => onEditContact(contact)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"
                >
                  <Edit2 size={16} />
                </button>
              </div>

              <div className="space-y-3 pt-2 relative z-10">
                <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-white/60 hover:text-white transition-colors">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                    <Phone size={14} />
                  </div>
                  <span className="text-sm font-medium">{contact.phone}</span>
                </a>
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-white/60 hover:text-white transition-colors">
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                      <Mail size={14} />
                    </div>
                    <span className="text-sm font-medium">{contact.email}</span>
                  </a>
                )}
              </div>

              {contact.notes && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 relative z-10">
                  <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{contact.notes}</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="card p-12 text-center space-y-4 bg-white/5 border-dashed col-span-full">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
              <User size={32} />
            </div>
            <p className="text-white/40 font-medium">Nenašli sa žiadne kontakty</p>
          </div>
        )}
      </div>
    </div>
  );
};
