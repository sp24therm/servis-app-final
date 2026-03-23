import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft,
  Info,
  Wrench,
  ChevronUp,
  ChevronDown,
  Trash2,
  X,
  Camera,
  PieChart as PieChartIcon,
  CheckCircle2,
  PenTool
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { Boiler, ServiceRecord, ServiceStatus } from '../types';
import { storage, uploadFile } from '../firebase';
import { 
  ref, 
  getDownloadURL,
  uploadBytes
} from 'firebase/storage';

const trimCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const l = pixels.data.length;
  const bound = {
    top: null as number | null,
    left: null as number | null,
    right: null as number | null,
    bottom: null as number | null
  };
  let i, x, y;

  for (i = 0; i < l; i += 4) {
    if (pixels.data[i + 3] !== 0) {
      x = (i / 4) % canvas.width;
      y = Math.floor((i / 4) / canvas.width);

      if (bound.top === null) bound.top = y;
      if (bound.left === null) bound.left = x;
      else if (x < bound.left) bound.left = x;
      if (bound.right === null) bound.right = x;
      else if (bound.right < x) bound.right = x;
      if (bound.bottom === null || bound.bottom < y) bound.bottom = y;
    }
  }

  if (bound.top === null) return canvas;

  const trimHeight = bound.bottom! - bound.top! + 1;
  const trimWidth = bound.right! - bound.left! + 1;
  const trimmed = ctx.getImageData(bound.left!, bound.top!, trimWidth, trimHeight);

  const copy = document.createElement('canvas');
  copy.width = trimWidth;
  copy.height = trimHeight;
  const copyCtx = copy.getContext('2d');
  if (copyCtx) copyCtx.putImageData(trimmed, 0, 0);

  return copy;
};

export const ServiceForm = ({ 
  boiler, 
  initialData,
  onCancel, 
  onSubmit 
}: { 
  boiler: Boiler, 
  initialData?: ServiceRecord,
  onCancel: () => void, 
  onSubmit: (data: Partial<ServiceRecord>) => void 
}) => {
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    taskPerformed: initialData?.taskPerformed || '',
    co2Value: initialData?.co2Value || '',
    coValue: initialData?.coValue || '',
    pressureValue: initialData?.pressureValue || '',
    technicianNotes: initialData?.technicianNotes || '',
    // Detailed fields
    co2Max: initialData?.co2Max || '',
    co2Min: initialData?.co2Min || '',
    o2Max: initialData?.o2Max || '',
    o2Min: initialData?.o2Min || '',
    efficiency: initialData?.efficiency || '',
    gasPressure: initialData?.gasPressure || '',
    expansionTankPressureCH: initialData?.expansionTankPressureCH || '',
    hasDHWExpansionTank: initialData?.hasDHWExpansionTank || false,
    expansionTankPressureDHW: initialData?.expansionTankPressureDHW || '',
    conductivity: initialData?.conductivity || '',
    phCH: initialData?.phCH || '',
    hardnessCH: initialData?.hardnessCH || '',
    // New dynamic fields
    faultDescription: initialData?.faultDescription || '',
    faultFixed: initialData?.faultFixed || false,
    hasFlueGasAnalysis: initialData?.hasFlueGasAnalysis || false,
    spareParts: initialData?.spareParts || [],
    useAsInstallDate: false,
    showSpareParts: false,
    burnerCheck: initialData?.burnerCheck ?? null,
    combustionChamberCleaning: initialData?.combustionChamberCleaning ?? null,
    electrodesCheck: initialData?.electrodesCheck ?? null,
    exchangerCheck: initialData?.exchangerCheck ?? null,
    fanCheck: initialData?.fanCheck ?? null,
    filtersCleaning: initialData?.filtersCleaning ?? null,
    siphonCleaning: initialData?.siphonCleaning ?? null,
    gasCircuitTightness: initialData?.gasCircuitTightness ?? null,
    flueGasOutletTightness: initialData?.flueGasOutletTightness ?? null,
    pumpCheck: initialData?.pumpCheck ?? null,
    threeWayValveCheck: initialData?.threeWayValveCheck ?? null,
    airSupplyVentilation: initialData?.airSupplyVentilation ?? null,
    emergencyStatesCheck: initialData?.emergencyStatesCheck ?? null,
    bondingProtection: initialData?.bondingProtection ?? null,
  });
  const [photo, setPhoto] = useState<string | null>(initialData?.photo || null);
  const [photoBefore, setPhotoBefore] = useState<string | null>(initialData?.photoBefore || null);
  const [photoAfter, setPhotoAfter] = useState<string | null>(initialData?.photoAfter || null);
  const [photoBoiler, setPhotoBoiler] = useState<string | null>(initialData?.photoBoiler || null);
  const [photoConnection, setPhotoConnection] = useState<string | null>(initialData?.photoConnection || null);
  const [photoChimney, setPhotoChimney] = useState<string | null>(initialData?.photoChimney || null);
  const [signed, setSigned] = useState(!!initialData);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const normalizeNumber = (value: string) => value.replace(',', '.');

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.scrollTop = 0;
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = (type: string = 'photo') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          const path = `services/${boiler.id}/${Date.now()}_${file.name}`;
          const downloadURL = await uploadFile(file, path);
          if (type === 'photo') setPhoto(downloadURL);
          else if (type === 'photoBefore') setPhotoBefore(downloadURL);
          else if (type === 'photoAfter') setPhotoAfter(downloadURL);
          else if (type === 'photoBoiler') setPhotoBoiler(downloadURL);
          else if (type === 'photoConnection') setPhotoConnection(downloadURL);
          else if (type === 'photoChimney') setPhotoChimney(downloadURL);
        } catch (error) {
          console.error("Upload failed", error);
          alert("Nahrávanie zlyhalo. Skontrolujte pripojenie.");
        }
      }
    };
    input.click();
  };

  const removePhoto = (type: string) => {
    if (type === 'photo') setPhoto(null);
    else if (type === 'photoBefore') setPhotoBefore(null);
    else if (type === 'photoAfter') setPhotoAfter(null);
    else if (type === 'photoBoiler') setPhotoBoiler(null);
    else if (type === 'photoConnection') setPhotoConnection(null);
    else if (type === 'photoChimney') setPhotoChimney(null);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const storageRef = ref(storage, `services/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        setPhoto(downloadURL);
      } catch (error) {
        console.error("Upload failed", error);
      }
    }
  };

  return (
    <div ref={modalRef} className="space-y-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto p-1">
      <header className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-white">Nový servisný záznam</h1>
      </header>

      <div className="card p-6 space-y-6">
        <div className="bg-[#3A87AD]/10 p-4 rounded-xl flex items-start gap-3">
          <Info className="text-[#3A87AD] mt-0.5" size={20} />
          <div>
            <p className="font-bold text-[#3A87AD]">{boiler.brand} {boiler.model}</p>
            <p className="text-sm text-[#3A87AD]/70">S/N: {boiler.serialNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white/70">Dátum servisu</label>
            <input 
              type="date" 
              className="input-field" 
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-white/70">Vykonaná práca</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'Ročná prehliadka', label: 'Ročná prehliadka' },
                { id: 'Porucha', label: 'Porucha' },
                { id: 'Inštalácia', label: 'Inštalácia' },
                { id: 'Iné', label: 'Iné' }
              ].map(task => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setFormData({...formData, taskPerformed: task.id})}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border-2 ${
                    formData.taskPerformed === task.id 
                      ? 'bg-[#3A87AD] border-[#3A87AD] text-white shadow-md shadow-[#3A87AD]/20' 
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-[#3A87AD]/50 hover:text-white'
                  }`}
                >
                  {task.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {formData.taskPerformed === 'Porucha' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-2">
              <label className="text-sm font-bold text-white/70">Popis poruchy</label>
              <textarea 
                className="input-field min-h-[80px]" 
                placeholder="Popíšte zistenú poruchu..."
                value={formData.faultDescription}
                onChange={(e) => setFormData({...formData, faultDescription: e.target.value})}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-[#3A87AD] bg-black/40 border-white/10" 
                  checked={formData.faultFixed} 
                  onChange={e => setFormData({...formData, faultFixed: e.target.checked})} 
                />
                <span className="text-sm font-bold text-white/70">Porucha odstránená</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-[#3A87AD] bg-black/40 border-white/10" 
                  checked={formData.hasFlueGasAnalysis} 
                  onChange={e => setFormData({...formData, hasFlueGasAnalysis: e.target.checked})} 
                />
                <span className="text-sm font-bold text-white/70">Analýza spalín</span>
              </label>
            </div>

            {formData.hasFlueGasAnalysis && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Max (%)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.co2Max} onChange={e => setFormData({...formData, co2Max: normalizeNumber(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">O2 Max (%)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.o2Max} onChange={e => setFormData({...formData, o2Max: normalizeNumber(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Min (%)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.co2Min} onChange={e => setFormData({...formData, co2Min: normalizeNumber(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">O2 Min (%)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.o2Min} onChange={e => setFormData({...formData, o2Min: normalizeNumber(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">CO (ppm)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.coValue} onChange={e => setFormData({...formData, coValue: normalizeNumber(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Tlak plynu (bar)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.gasPressure} onChange={e => setFormData({...formData, gasPressure: normalizeNumber(e.target.value)})} />
                </div>
              </div>
            )}

            {/* Spare Parts Accordion */}
            <div className="border border-white/10 rounded-2xl overflow-hidden">
              <button 
                type="button"
                onClick={() => setFormData({...formData, showSpareParts: !formData.showSpareParts})}
                className="w-full p-4 flex justify-between items-center bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="font-bold text-white flex items-center gap-2">
                  <Wrench size={18} className="text-[#3A87AD]" />
                  Použité náhradné diely
                </span>
                {formData.showSpareParts ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {formData.showSpareParts && (
                <div className="p-4 space-y-4 bg-black/20">
                  {formData.spareParts.map((part, index) => (
                    <div key={index} className="flex gap-2">
                      <input 
                        className="input-field flex-1" 
                        placeholder="Názov dielu" 
                        value={part.name}
                        onChange={e => {
                          const newParts = [...formData.spareParts];
                          newParts[index].name = e.target.value;
                          setFormData({...formData, spareParts: newParts});
                        }}
                      />
                      <input 
                        type="number" 
                        className="input-field w-20" 
                        placeholder="Ks" 
                        value={part.quantity}
                        onChange={e => {
                          const newParts = [...formData.spareParts];
                          newParts[index].quantity = parseInt(e.target.value) || 0;
                          setFormData({...formData, spareParts: newParts});
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const newParts = formData.spareParts.filter((_, i) => i !== index);
                          setFormData({...formData, spareParts: newParts});
                        }}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, spareParts: [...formData.spareParts, { name: '', quantity: 1 }]})}
                    className="w-full py-2 border border-dashed border-white/20 rounded-xl text-xs font-bold text-white/40 hover:text-white hover:border-white/40 transition-all"
                  >
                    + Pridať diel
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Foto Pred</label>
                <div className="relative aspect-video bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden">
                  {photoBefore ? (
                    <div className="relative w-full h-full group">
                      <img src={photoBefore} className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); removePhoto('photoBefore'); }} 
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => handlePhotoClick('photoBefore')} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Camera size={20} className="text-white/20" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Foto Po</label>
                <div className="relative aspect-video bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden">
                  {photoAfter ? (
                    <div className="relative w-full h-full group">
                      <img src={photoAfter} className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); removePhoto('photoAfter'); }} 
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => handlePhotoClick('photoAfter')} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Camera size={20} className="text-white/20" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {formData.taskPerformed === 'Inštalácia' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-[#3A87AD] bg-black/40 border-white/10" 
                  checked={formData.useAsInstallDate} 
                  onChange={e => setFormData({...formData, useAsInstallDate: e.target.checked})} 
                />
                <span className="text-sm font-bold text-white/70">Použiť ako dátum montáže</span>
              </label>
              <p className="text-[10px] text-white/30 mt-1 ml-6 italic">Prepíše pôvodný dátum inštalácie v dokumente zariadenia.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">Foto Kotol</label>
                <div className="relative aspect-square bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden">
                  {photoBoiler ? (
                    <>
                      <img src={photoBoiler} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto('photoBoiler')} className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <div onClick={() => handlePhotoClick('photoBoiler')} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Camera size={20} className="text-white/20" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">Foto Napojenie</label>
                <div className="relative aspect-square bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden">
                  {photoConnection ? (
                    <>
                      <img src={photoConnection} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto('photoConnection')} className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <div onClick={() => handlePhotoClick('photoConnection')} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Camera size={20} className="text-white/20" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">Foto Komín</label>
                <div className="relative aspect-square bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden">
                  {photoChimney ? (
                    <>
                      <img src={photoChimney} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto('photoChimney')} className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <div onClick={() => handlePhotoClick('photoChimney')} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Camera size={20} className="text-white/20" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {formData.taskPerformed === 'Iné' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="border-t border-white/5 pt-6">
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-[#3A87AD] bg-black/40 border-white/10" 
                  checked={formData.hasFlueGasAnalysis} 
                  onChange={e => setFormData({...formData, hasFlueGasAnalysis: e.target.checked})} 
                />
                <span className="text-sm font-bold text-white/70">Analýza spalín</span>
              </label>

              {formData.hasFlueGasAnalysis && (
                <div className="animate-in fade-in duration-300">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <PieChartIcon size={20} className="text-[#3A87AD]" />
                    Analýza spalín a tlaky
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Max (%)</label>
                      <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.co2Max} onChange={e => setFormData({...formData, co2Max: normalizeNumber(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Min (%)</label>
                      <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.co2Min} onChange={e => setFormData({...formData, co2Min: normalizeNumber(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">CO (ppm)</label>
                      <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.coValue} onChange={e => setFormData({...formData, coValue: normalizeNumber(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">Účinnosť (%)</label>
                      <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.efficiency} onChange={e => setFormData({...formData, efficiency: normalizeNumber(e.target.value)})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">O2 Max (%)</label>
                      <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.o2Max} onChange={e => setFormData({...formData, o2Max: normalizeNumber(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">O2 Min (%)</label>
                      <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.o2Min} onChange={e => setFormData({...formData, o2Min: normalizeNumber(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">Tlak plynu (mbar)</label>
                      <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.gasPressure} onChange={e => setFormData({...formData, gasPressure: normalizeNumber(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">Tlak exp. ÚK (bar)</label>
                      <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.expansionTankPressureCH} onChange={e => setFormData({...formData, expansionTankPressureCH: normalizeNumber(e.target.value)})} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {formData.taskPerformed === 'Ročná prehliadka' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="border-t border-white/5 pt-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <PieChartIcon size={20} className="text-[#3A87AD]" />
                Analýza spalín a tlaky
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Max (%)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.co2Max} onChange={e => setFormData({...formData, co2Max: normalizeNumber(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Min (%)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.co2Min} onChange={e => setFormData({...formData, co2Min: normalizeNumber(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">CO (ppm)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.coValue} onChange={e => setFormData({...formData, coValue: normalizeNumber(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Účinnosť (%)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.efficiency} onChange={e => setFormData({...formData, efficiency: normalizeNumber(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">O2 Max (%)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.o2Max} onChange={e => setFormData({...formData, o2Max: normalizeNumber(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">O2 Min (%)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.o2Min} onChange={e => setFormData({...formData, o2Min: normalizeNumber(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Tlak plynu (mbar)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.gasPressure} onChange={e => setFormData({...formData, gasPressure: normalizeNumber(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Tlak exp. ÚK (bar)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.expansionTankPressureCH} onChange={e => setFormData({...formData, expansionTankPressureCH: normalizeNumber(e.target.value)})} />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded text-[#3A87AD] bg-black/40 border-white/10" checked={formData.hasDHWExpansionTank} onChange={e => setFormData({...formData, hasDHWExpansionTank: e.target.checked})} />
                  <span className="text-sm font-bold text-white/70">Má TÚV exp.</span>
                </label>
                {formData.hasDHWExpansionTank && (
                  <div className="flex-1 flex items-center gap-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Tlak (bar)</label>
                    <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5 w-24" value={formData.expansionTankPressureDHW} onChange={e => setFormData({...formData, expansionTankPressureDHW: normalizeNumber(e.target.value)})} />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-white/5 pt-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Info size={20} className="text-[#3A87AD]" />
                Chemické hodnoty ÚK
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Konduktivita (mS/cm)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.conductivity} onChange={e => setFormData({...formData, conductivity: normalizeNumber(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">PH ÚK</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.phCH} onChange={e => setFormData({...formData, phCH: normalizeNumber(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Tvrdosť ÚK (°dH)</label>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="input-field py-1.5" value={formData.hardnessCH} onChange={e => setFormData({...formData, hardnessCH: normalizeNumber(e.target.value)})} />
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-[#3A87AD]" />
                Kontrolný zoznam
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { key: 'burnerCheck', label: 'Kontrola horáka' },
                  { key: 'combustionChamberCleaning', label: 'Čistenie spaľovacej komory' },
                  { key: 'electrodesCheck', label: 'Kontrola elektród' },
                  { key: 'exchangerCheck', label: 'Kontrola výmenníka' },
                  { key: 'fanCheck', label: 'Kontrola ventilátora' },
                  { key: 'filtersCleaning', label: 'Čistenie filtrov' },
                  { key: 'siphonCleaning', label: 'Čistenie sifónu' },
                  { key: 'gasCircuitTightness', label: 'Tesnosť plynového okruhu' },
                  { key: 'flueGasOutletTightness', label: 'Tesnosť odvodu spalín' },
                  { key: 'pumpCheck', label: 'Kontrola čerpadla' },
                  { key: 'threeWayValveCheck', label: 'Kontrola 3-cestného ventilu' },
                  { key: 'airSupplyVentilation', label: 'Prívod vzduchu a vetranie' },
                  { key: 'emergencyStatesCheck', label: 'Kontrola havarijných stavov' },
                  { key: 'bondingProtection', label: 'Ochrana pospojovaním' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-xs font-bold text-white/80">{item.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, [item.key]: true})}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          formData[item.key as keyof typeof formData] === true 
                            ? 'bg-emerald-500 text-white shadow-sm' 
                            : 'bg-white/5 text-white/40 border border-white/10'
                        }`}
                      >
                        ÁNO
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, [item.key]: false})}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          formData[item.key as keyof typeof formData] === false 
                            ? 'bg-[#C14F4F] text-white shadow-sm' 
                            : 'bg-white/5 text-white/40 border border-white/10'
                        }`}
                      >
                        NIE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold text-white/70">Poznámky technika</label>
          <textarea 
            className="input-field min-h-[100px]" 
            placeholder="Doplňujúce informácie o stave kotla..."
            value={formData.technicianNotes}
            onChange={(e) => setFormData({...formData, technicianNotes: e.target.value})}
          ></textarea>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={onFileChange}
            />
            <label className="text-sm font-bold text-white/70 flex items-center gap-2">
              <Camera size={18} /> Fotografia stavu
            </label>
            <div 
              onClick={() => handlePhotoClick('photo')}
              className="aspect-video bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all overflow-hidden"
            >
              {photo ? (
                <img src={photo} alt="Boiler" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="text-white/20 mb-2" size={32} />
                  <span className="text-xs font-medium text-white/40">Kliknite pre odfotenie</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-white/70 flex items-center gap-2">
              <PenTool size={18} /> Podpis zákazníka
            </label>
            <div className="bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden h-48">
              <SignatureCanvas 
                ref={sigCanvas}
                penColor="#3A87AD"
                canvasProps={{ className: "w-full h-full cursor-crosshair" }}
                onEnd={() => setSigned(true)}
              />
              <div className="absolute bottom-4 left-4 right-4 h-px bg-white/10 pointer-events-none"></div>
              <button 
                type="button"
                onClick={() => { sigCanvas.current?.clear(); setSigned(false); }}
                className="absolute top-2 right-2 p-1 bg-black/40 rounded-md text-xs font-bold text-white/40 hover:text-white transition-colors"
              >
                Vymazať podpis
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Zrušiť</button>
          <button 
            onClick={() => {
              const canvas = sigCanvas.current?.getCanvas();
              const signature = canvas ? trimCanvas(canvas).toDataURL('image/png') : undefined;
              onSubmit({
                ...formData, 
                status: ServiceStatus.COMPLETED, 
                photo: photo || undefined,
                photoBefore: photoBefore || undefined,
                photoAfter: photoAfter || undefined,
                photoBoiler: photoBoiler || undefined,
                photoConnection: photoConnection || undefined,
                photoChimney: photoChimney || undefined,
                signature
              });
            }}
            className="btn-primary flex-1 justify-center"
          >
            Uložiť záznam
          </button>
        </div>
      </div>
    </div>
  );
};
