import React, { useState, useRef, useMemo } from 'react';
import { Wrench, Camera, Scan } from 'lucide-react';
import { Boiler } from '../types';
import { AddressSearch } from './AddressSearch';
import Tesseract from 'tesseract.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export const BoilerFormFields = ({ 
  boilerData, 
  setBoilerData, 
  existingBoilers,
  setIsScannerOpen
}: { 
  boilerData: any, 
  setBoilerData: any, 
  existingBoilers: Boiler[],
  setIsScannerOpen: (v: boolean) => void
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoType, setActivePhotoType] = useState<string | null>(null);

  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [scanning, setScanning] = useState(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  const brands = useMemo(() => Array.from(new Set(existingBoilers.map(b => b.brand))), [existingBoilers]);
  const modelsForBrand = useMemo(() => {
    if (!boilerData.brand) return [];
    return Array.from(new Set(existingBoilers.filter(b => b.brand === boilerData.brand).map(b => b.model)));
  }, [boilerData.brand, existingBoilers]);

  const handlePhotoClick = (type: string) => {
    setActivePhotoType(type);
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activePhotoType) {
      const type = activePhotoType; // Capture current type
      // Create local preview immediately
      const previewUrl = URL.createObjectURL(file);
      setPreviews(prev => ({ ...prev, [type]: previewUrl }));
      setUploading(prev => ({ ...prev, [type]: true }));
      
      try {
        const storageRef = ref(storage, `boilers/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        setBoilerData((prev: any) => ({
          ...prev,
          photos: { ...(prev.photos || {}), [type]: downloadURL }
        }));
      } catch (error) {
        console.error("Upload failed", error);
        alert("Nahrávanie fotky zlyhalo. Skúste to prosím znova.");
      } finally {
        setUploading(prev => ({ ...prev, [type]: false }));
      }
    }
  };

  const handleScanClick = () => {
    scannerInputRef.current?.click();
  };

  const onScanFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScanning(true);
      try {
        const { data: { text } } = await Tesseract.recognize(file, 'slk+eng', {
          logger: m => console.log(m)
        });
        
        // Try to find a serial number pattern (e.g., alphanumeric, 8+ chars)
        const lines = text.split('\n');
        let foundSerial = '';
        
        // Simple heuristic: look for lines that look like serial numbers
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length >= 8 && /^[A-Z0-9-]+$/i.test(trimmed)) {
            foundSerial = trimmed;
            break;
          }
        }

        if (foundSerial) {
          setBoilerData((prev: any) => ({ ...prev, serialNumber: foundSerial }));
          alert(`Rozpoznané sériové číslo: ${foundSerial}`);
        } else {
          // If no pattern found, just take the first non-empty line or first 15 chars
          const firstLine = lines.find(l => l.trim().length > 5)?.trim() || text.substring(0, 20).trim();
          setBoilerData((prev: any) => ({ ...prev, serialNumber: firstLine }));
          alert(`Rozpoznaný text: ${firstLine}`);
        }
      } catch (error) {
        console.error("OCR failed", error);
        alert("Rozpoznávanie textu zlyhalo.");
      } finally {
        setScanning(false);
      }
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-white/5">
      <h3 className="font-bold text-[#3A87AD] flex items-center gap-2">
        <Wrench size={18} /> Údaje o zariadení
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-bold text-white/70">Meno zariadenia</label>
          <input 
            required
            type="text" 
            className="input-field" 
            value={boilerData.name}
            onChange={e => setBoilerData({...boilerData, name: e.target.value})}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-white/70">Adresa inštalácie</label>
          <AddressSearch 
            value={boilerData.address} 
            onChange={v => setBoilerData({...boilerData, address: v})}
            onSelect={(addr, lat, lng) => setBoilerData({...boilerData, address: addr, lat, lng})}
            autoOpen={!boilerData.address}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1 relative">
          <label className="text-sm font-bold text-white/70">Značka</label>
          <input 
            type="text" 
            className="input-field" 
            list="brands-list"
            value={boilerData.brand}
            onChange={e => setBoilerData({...boilerData, brand: e.target.value})}
          />
          <datalist id="brands-list">
            {brands.map(b => <option key={b} value={b} />)}
          </datalist>
        </div>
        <div className="space-y-1 relative">
          <label className="text-sm font-bold text-white/70">Model</label>
          <input 
            type="text" 
            className="input-field" 
            list="models-list"
            value={boilerData.model}
            onChange={e => setBoilerData({...boilerData, model: e.target.value})}
          />
          <datalist id="models-list">
            {modelsForBrand.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-bold text-white/70">Sériové číslo</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="input-field" 
              value={boilerData.serialNumber}
              onChange={e => setBoilerData({...boilerData, serialNumber: e.target.value})}
            />
            <button 
              type="button" 
              onClick={() => setIsScannerOpen(true)}
              className="p-2 bg-[#3A87AD]/10 rounded-xl hover:bg-[#3A87AD] text-[#3A87AD] hover:text-white transition-all" 
              title="Skenovať"
            >
              <Scan size={20} />
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-white/70">Dátum montáže</label>
          <input 
            type="date" 
            className="input-field" 
            value={boilerData.installDate}
            onChange={e => setBoilerData({...boilerData, installDate: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={onFileChange}
        />
        {['overall', 'connection', 'chimney'].map(type => (
          <div key={type} className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase">
              {type === 'overall' ? 'Celkové' : type === 'connection' ? 'Napojenie' : 'Komín'}
            </label>
            <button 
              type="button"
              onClick={() => handlePhotoClick(type)}
              disabled={uploading[type]}
              className="w-full aspect-square bg-white/5 border border-dashed border-white/10 rounded-xl flex items-center justify-center overflow-hidden relative group"
            >
              {previews[type] || boilerData.photos?.[type] ? (
                <>
                  <img src={previews[type] || boilerData.photos[type]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  {uploading[type] && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-[#3A87AD]/30 border-t-[#3A87AD] rounded-full animate-spin" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                </>
              ) : (
                uploading[type] ? (
                  <div className="w-6 h-6 border-2 border-[#3A87AD]/30 border-t-[#3A87AD] rounded-full animate-spin" />
                ) : (
                  <Camera size={20} className="text-white/20" />
                )
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-bold text-white/70">Poznámka k zariadeniu</label>
        <textarea 
          className="input-field min-h-[60px]" 
          value={boilerData.notes}
          onChange={e => setBoilerData({...boilerData, notes: e.target.value})}
        />
      </div>
    </div>
  );
};
