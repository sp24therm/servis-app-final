import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ImageOverlayProps {
  src: string | null;
  onClose: () => void;
}

export const ImageOverlay = ({ src, onClose }: ImageOverlayProps) => {
  if (!src) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 md:p-10"
        onClick={onClose}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="fixed top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110]"
        >
          <X size={24} />
        </button>

        <motion.img
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          src={src}
          alt="Fullscreen"
          referrerPolicy="no-referrer"
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </motion.div>
    </AnimatePresence>
  );
};
