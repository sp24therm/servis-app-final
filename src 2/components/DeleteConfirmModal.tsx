import React from 'react';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card w-full max-w-md p-6 space-y-6"
      >
        <div className="flex items-center gap-4 text-[#C14F4F]">
          <div className="w-12 h-12 bg-[#C14F4F]/10 rounded-full flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        
        <p className="text-white/60">{message}</p>

        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Zrušiť</button>
          <button onClick={onConfirm} className="btn-primary bg-[#C14F4F] hover:bg-[#C14F4F]/80 border-[#C14F4F] flex-1 justify-center shadow-[#C14F4F]/20">
            Odstrániť
          </button>
        </div>
      </motion.div>
    </div>
  );
};
