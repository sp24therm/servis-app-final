import React, { useState, useEffect, useRef } from 'react';
import { Scan, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerModalProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

export const ScannerModal = ({ 
  onScan, 
  onClose 
}: ScannerModalProps) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        
        const config = { fps: 10, qrbox: { width: 250, height: 150 } };
        
        await html5QrCode.start(
          { facingMode: "environment" }, 
          config, 
          (decodedText) => {
            onScan(decodedText);
            html5QrCode.stop().then(() => onClose());
          },
          (errorMessage) => {
            // Silently ignore scan errors
          }
        );
      } catch (err) {
        console.error("Scanner error:", err);
        setError("Nepodarilo sa spustiť kameru. Skontrolujte povolenia.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Stop error:", err));
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-md bg-[#1E1E1E] rounded-3xl overflow-hidden border border-white/10">
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Scan size={20} className="text-[#3A87AD]" />
            Skenovať S/N alebo čiarový kód
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div id="reader" className="w-full aspect-video bg-black rounded-2xl overflow-hidden"></div>
          {error && <p className="text-red-400 text-xs mt-4 text-center">{error}</p>}
          <p className="text-white/40 text-[10px] mt-4 text-center italic">
            Namierte kameru na čiarový kód alebo výrobné číslo na štítku.
          </p>
        </div>
      </div>
    </div>
  );
};
