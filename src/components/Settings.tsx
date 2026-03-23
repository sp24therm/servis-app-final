import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, uploadFile, handleFirestoreError, OperationType } from '../firebase';
import { compressImage } from '../utils/imageUtils';
import { motion } from 'motion/react';
import { Image as ImageIcon, Check, Loader2, X } from 'lucide-react';

interface SettingsProps {
  onClose: () => void;
  onBackgroundUpdate: (url: string) => void;
}

export const Settings = ({ onClose, onBackgroundUpdate }: SettingsProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      // 1. Compress image
      const compressedBlob = await compressImage(file);
      
      // 2. Upload to Firebase Storage
      const storagePath = 'settings/global_bg.jpg';
      const downloadUrl = await uploadFile(compressedBlob as File, storagePath);

      // 3. Update Firestore
      await setDoc(doc(db, 'appConfig', 'appearance'), {
        backgroundUrl: downloadUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setUploadStatus('success');
      onBackgroundUpdate(downloadUrl);
      
      // Reset status after 3 seconds
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error) {
      console.error('Error uploading background:', error);
      setUploadStatus('error');
      handleFirestoreError(error, OperationType.WRITE, 'appConfig/appearance');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card w-full max-w-md p-6 space-y-6 relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-[#3A87AD]">Nastavenia</h2>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-lg font-medium text-white/80">Vzhľad aplikácie</h3>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
              <p className="text-sm text-white/60">Zmeniť pozadie aplikácie</p>
              
              <div className="relative">
                <input
                  type="file"
                  id="bg-upload"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
                <label
                  htmlFor="bg-upload"
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer
                    ${isUploading ? 'border-[#3A87AD]/50 bg-[#3A87AD]/5 cursor-not-allowed' : 
                      uploadStatus === 'success' ? 'border-green-500/50 bg-green-500/5' : 
                      'border-white/20 hover:border-[#3A87AD]/50 hover:bg-white/5'}`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="animate-spin text-[#3A87AD]" size={20} />
                      <span className="text-sm font-medium">Nahrávam...</span>
                    </>
                  ) : uploadStatus === 'success' ? (
                    <>
                      <Check className="text-green-500" size={20} />
                      <span className="text-sm font-medium text-green-500">Hotovo ✓</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="text-white/40" size={20} />
                      <span className="text-sm font-medium">Vybrať obrázok</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="pt-4">
          <button 
            onClick={onClose}
            className="btn-secondary w-full justify-center"
          >
            Zatvoriť
          </button>
        </div>
      </motion.div>
    </div>
  );
};
