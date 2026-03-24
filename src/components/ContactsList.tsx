import React, { useState, useMemo } from 'react';
import { Search, Plus, Phone, Info, MapPin, PenTool, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'specialization' | 'brand' | null>(null);

  const uniqueSpecializations = useMemo(() => {
    return Array.from(new Set(contacts.map(c => c.specialization).filter(Boolean))) as string[];
  }, [contacts]);

  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(contacts.map(c => c.brand).filter(Boolean))) as string[];
  }, [contacts]);

  const openNavigation = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(
      `https://maps.google.com/?q=${encoded}`,
      '_blank'
    );
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (c.specialization || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
    
    const matchesSpecialization = !selectedSpecialization || c.specialization === selectedSpecialization;
    const matchesBrand = !selectedBrand || c.brand === selectedBrand;

    return matchesSearch && matchesSpecialization && matchesBrand;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Kontakty</h1>
        <button onClick={onAddContact} className="btn-primary">
          <Plus size={20} />
          <span>Nový kontakt</span>
        </button>
      </header>

      <div className="space-y-4">
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

        <div className="flex gap-6 px-1">
          <div className="relative">
            <button 
              onClick={() => setOpenDropdown(openDropdown === 'specialization' ? null : 'specialization')}
              className={`flex items-center gap-1.5 text-sm cursor-pointer transition-colors ${selectedSpecialization ? 'text-white/90 font-bold' : 'text-white/60 hover:text-white/80'}`}
            >
              {selectedSpecialization || 'Špecializácia'} 
              {openDropdown === 'specialization' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {openDropdown === 'specialization' && (
              <div className="absolute z-20 mt-2 w-56 bg-[#1E1E1E] border border-white/10 rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in duration-200">
                {uniqueSpecializations.map(spec => (
                  <button
                    key={spec}
                    onClick={() => {
                      setSelectedSpecialization(selectedSpecialization === spec ? null : spec);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${selectedSpecialization === spec ? 'text-[#3A87AD] font-bold' : 'text-white/60'}`}
                  >
                    {spec}
                  </button>
                ))}
                {uniqueSpecializations.length === 0 && (
                  <div className="px-4 py-2 text-xs text-white/20 italic">Žiadne hodnoty</div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setOpenDropdown(openDropdown === 'brand' ? null : 'brand')}
              className={`flex items-center gap-1.5 text-sm cursor-pointer transition-colors ${selectedBrand ? 'text-white/90 font-bold' : 'text-white/60 hover:text-white/80'}`}
            >
              {selectedBrand || 'Firma'} 
              {openDropdown === 'brand' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {openDropdown === 'brand' && (
              <div className="absolute z-20 mt-2 w-56 bg-[#1E1E1E] border border-white/10 rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in duration-200">
                {uniqueBrands.map(brand => (
                  <button
                    key={brand}
                    onClick={() => {
                      setSelectedBrand(selectedBrand === brand ? null : brand);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${selectedBrand === brand ? 'text-[#3A87AD] font-bold' : 'text-white/60'}`}
                  >
                    {brand}
                  </button>
                ))}
                {uniqueBrands.length === 0 && (
                  <div className="px-4 py-2 text-xs text-white/20 italic">Žiadne hodnoty</div>
                )}
              </div>
            )}
          </div>
        </div>
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
              <div className="flex flex-col items-end gap-2">
                {contact.brand && (
                  <span className="bg-white/10 text-white/70 text-[10px] px-2 py-0.5 rounded-full font-medium">
                    {contact.brand}
                  </span>
                )}
                <button 
                  onClick={() => onEditContact(contact)}
                  className="p-2 text-white/20 hover:text-white/60 hover:bg-white/5 rounded-lg transition-all"
                >
                  <PenTool size={16} />
                </button>
              </div>
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
                  <span 
                    title="Navigovať"
                    className="cursor-pointer hover:text-blue-400 transition-colors"
                    onClick={() => openNavigation(contact.address)}
                  >
                    <MapPin size={16} className="text-white/20 mt-0.5" />
                  </span>
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
