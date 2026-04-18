import React, { useState, useMemo } from 'react';
import { X, Save, MapPin, Loader2 } from 'lucide-react';
import { Boiler } from '../types';
import { AddressSearch } from './AddressSearch';
import { BoilerFormFields } from './BoilerFormFields';
import { doc, collection } from 'firebase/firestore';
import { db } from '../firebase';

interface BoilerModalProps {
  boiler?: Boiler;
  onSave: (boiler: Partial<Boiler>) => Promise<void>;
  onCancel: () => void;
  customerId?: string;
  existingBoilers: Boiler[];
  setIsScannerOpen: (v: boolean) => void;
}

export const BoilerModal = ({ boiler, onSave, onCancel, customerId, existingBoilers, setIsScannerOpen }: BoilerModalProps) => {
  const [formData, setFormData] = useState<Partial<Boiler>>(
    boiler || {
      customerId,
      name: 'Hlavný kotol',
      brand: '',
      model: '',
      serialNumber: '',
      address: '',
      installDate: new Date().toISOString().split('T')[0],
      lastServiceDate: '',
      nextServiceDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      notes: ''
    }
  );
  const [isSaving, setIsSaving] = useState(false);

  const preGeneratedBoilerId = useMemo(() => {
    return doc(collection(db, 'boilers')).id;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Error saving boiler", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#1E1E1E] w-full max-w-2xl rounded-3xl shadow-2xl border border-white/10 my-8 animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#1E1E1E]/80 backdrop-blur-xl z-10 rounded-t-3xl">
          <h2 className="text-xl font-bold text-white">{boiler ? 'Upraviť zariadenie' : 'Nové zariadenie'}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Adresa inštalácie</label>
              <AddressSearch 
                value={formData.address || ''}
                onChange={(v) => setFormData({ ...formData, address: v })}
                onSelect={(addr, lat, lng) => setFormData({ ...formData, address: addr, lat, lng })}
              />
            </div>

            <BoilerFormFields 
              boilerData={formData}
              setBoilerData={setFormData}
              existingBoilers={existingBoilers}
              setIsScannerOpen={setIsScannerOpen}
              customerId={customerId || boiler?.customerId || ''}
              boilerId={boiler?.id || preGeneratedBoilerId}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onCancel} 
              className="btn-secondary flex-1 justify-center py-4"
            >
              Zrušiť
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="btn-primary flex-[2] justify-center py-4 shadow-xl shadow-[#3A87AD]/20"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Ukladám...
                </>
              ) : (
                <>
                  <Save size={20} />
                  {boiler ? 'Uložiť zmeny' : 'Pridať zariadenie'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
