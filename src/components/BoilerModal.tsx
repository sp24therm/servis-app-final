import React from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Boiler } from '../types';
import { BoilerFormFields } from './BoilerFormFields';

interface BoilerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (boiler: Omit<Boiler, 'id' | 'customerId'>) => void;
  onDelete: (id: string) => void;
  editingBoilerId: string | null;
  newBoilerData: any;
  setNewBoilerData: any;
  existingBoilers: Boiler[];
  setIsScannerOpen: (v: boolean) => void;
}

export const BoilerModal = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  onDelete,
  editingBoilerId,
  newBoilerData,
  setNewBoilerData,
  existingBoilers,
  setIsScannerOpen
}: BoilerModalProps) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Serial number duplicate check
    if (!editingBoilerId && newBoilerData.serialNumber) {
      const existingBoiler = existingBoilers.find(b => b.serialNumber === newBoilerData.serialNumber);
      if (existingBoiler) {
        const confirmSave = window.confirm('Zariadenie s týmto sériovým číslom už existuje. Chcete ho napriek tomu uložiť?');
        if (!confirmSave) return;
      }
    }

    onAdd(newBoilerData);
    onClose(); // Close modal after successful submit
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="card w-full max-w-2xl p-6 space-y-6"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#3A87AD]">
            {editingBoilerId ? 'Upraviť zariadenie' : 'Pridať nové zariadenie'}
          </h2>
          {editingBoilerId && (
            <button 
              type="button"
              onClick={() => {
                if (window.confirm('Naozaj chcete vymazať toto zariadenie?')) {
                  onDelete(editingBoilerId);
                  onClose();
                }
              }}
              className="p-2 text-white hover:bg-red-500 rounded-xl transition-all shadow-lg"
              title="Vymazať zariadenie"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BoilerFormFields 
            boilerData={newBoilerData} 
            setBoilerData={setNewBoilerData} 
            existingBoilers={existingBoilers} 
            setIsScannerOpen={setIsScannerOpen}
          />
          <div className="flex gap-3 pt-4 border-t border-white/5">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Zrušiť</button>
            <button type="submit" className="btn-primary flex-1 justify-center">Uložiť zariadenie</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
