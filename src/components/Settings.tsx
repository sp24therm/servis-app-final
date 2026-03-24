import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, uploadFile, handleFirestoreError, OperationType } from '../firebase';
import { compressImage } from '../utils/imageUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Check, Loader2, X, Euro, ChevronRight } from 'lucide-react';
import { PriceListEditor } from './PriceListEditor';

interface SettingsProps {
  onBackgroundUpdate: (url: string) => void;
}

export const Settings = ({ onBackgroundUpdate }: SettingsProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isPriceListExpanded, setIsPriceListExpanded] = useState(false);

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
    <div className="space-y-6">
      <div className="card p-6 space-y-8 relative">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <h2 className="text-2xl font-bold text-[#3A87AD]">Nastavenia</h2>
        </div>

        <div className="space-y-10">
          {/* Background Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white/80">
              <ImageIcon size={20} className="text-[#3A87AD]" />
              <h3 className="text-lg font-bold">Vzhľad aplikácie</h3>
            </div>
            
            <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-4">
              <p className="text-sm text-white/60">Zmeniť globálne pozadie aplikácie</p>
              
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
                  className={`flex items-center justify-center gap-3 p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer
                    ${isUploading ? 'border-[#3A87AD]/50 bg-[#3A87AD]/5 cursor-not-allowed' : 
                      uploadStatus === 'success' ? 'border-green-500/50 bg-green-500/5' : 
                      'border-white/20 hover:border-[#3A87AD]/50 hover:bg-white/5'}`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="animate-spin text-[#3A87AD]" size={20} />
                      <span className="text-sm font-bold">Nahrávam nové pozadie...</span>
                    </>
                  ) : uploadStatus === 'success' ? (
                    <>
                      <Check className="text-green-500" size={20} />
                      <span className="text-sm font-bold text-green-500">Pozadie úspešne zmenené ✓</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="text-white/40" size={20} />
                      <span className="text-sm font-bold">Vybrať nový obrázok pozadia</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </section>

          {/* Price List Editor Section */}
          <section className="space-y-4 pt-4 border-t border-white/5">
            <button 
              onClick={() => setIsPriceListExpanded(!isPriceListExpanded)}
              className="w-full flex items-center justify-between text-white/80 hover:text-white transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Euro size={20} className="text-[#3A87AD]" />
                <h3 className="text-lg font-bold">Správa cenníka</h3>
              </div>
              <ChevronRight 
                size={20} 
                className={`text-white/20 group-hover:text-white/40 transition-transform duration-300 ${isPriceListExpanded ? 'rotate-90' : ''}`} 
              />
            </button>
            
            <AnimatePresence>
              {isPriceListExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-1 pt-2">
                    <PriceListEditor />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </div>
  );
};
