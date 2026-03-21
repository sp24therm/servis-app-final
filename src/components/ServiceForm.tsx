import React, { useState, useEffect, useRef } from 'react';
import { Wrench, Camera, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Clock, Trash2, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Boiler, ServiceRecord, ServiceStatus } from '../types';
import SignatureCanvas from 'react-signature-canvas';
import { uploadFile } from '../firebase';

interface ServiceFormProps {
  boiler: Boiler;
  initialData?: ServiceRecord;
  onCancel: () => void;
  onSubmit: (data: Partial<ServiceRecord>) => void;
}

export const ServiceForm = ({ 
  boiler, 
  initialData,
  onCancel, 
  onSubmit 
}: ServiceFormProps) => {
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    taskPerformed: initialData?.taskPerformed || 'Ročná prehliadka',
    co2Value: initialData?.co2Value || 0,
    coValue: initialData?.coValue || 0,
    pressureValue: initialData?.pressureValue || 0,
    technicianNotes: initialData?.technicianNotes || '',
    // Detailed fields
    co2Max: initialData?.co2Max || 0,
    co2Min: initialData?.co2Min || 0,
    o2Max: initialData?.o2Max || 0,
    o2Min: initialData?.o2Min || 0,
    efficiency: initialData?.efficiency || 0,
    gasPressure: initialData?.gasPressure || 0,
    expansionTankPressureCH: initialData?.expansionTankPressureCH || 0,
    hasDHWExpansionTank: initialData?.hasDHWExpansionTank || false,
    expansionTankPressureDHW: initialData?.expansionTankPressureDHW || 0,
    conductivity: initialData?.conductivity || 0,
    phCH: initialData?.phCH || 0,
    hardnessCH: initialData?.hardnessCH || 0,
    // New dynamic fields
    faultDescription: initialData?.faultDescription || '',
    faultFixed: initialData?.faultFixed || false,
    hasFlueGasAnalysis: initialData?.hasFlueGasAnalysis || (initialData?.taskPerformed === 'Porucha' || initialData?.taskPerformed === 'Iné'),
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

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.scrollTop = 0;
    }
  }, []);

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
          alert("Nahrávanie fotky zlyhalo.");
        }
      }
    };
    input.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signed && !initialData) {
      alert('Prosím, pridajte podpis zákazníka.');
      return;
    }

    const signature = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    
    onSubmit({
      ...formData,
      photo,
      photoBefore,
      photoAfter,
      photoBoiler,
      photoConnection,
      photoChimney,
      customerSignature: signature || initialData?.customerSignature,
      status: ServiceStatus.COMPLETED
    });
  };

  const toggleCheck = (field: string) => {
    setFormData(prev => ({
      ...prev,
      // @ts-ignore
      [field]: prev[field] === true ? false : prev[field] === false ? null : true
    }));
  };

  return (
    <div ref={modalRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-white/40 hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors">
          <ChevronUp className="-rotate-90" size={16} /> Späť
        </button>
        <h2 className="text-xl font-bold text-white">Zaznamenať úkon</h2>
        <div className="w-10" />
      </div>

      <div className="card p-6 bg-[#3A87AD]/5 border-[#3A87AD]/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#3A87AD] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#3A87AD]/20">
            <Wrench size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white">{boiler.brand} {boiler.model}</h3>
            <p className="text-sm text-white/60">{boiler.address}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-white/70">Dátum úkonu</label>
              <input 
                type="date" 
                className="input-field" 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-white/70">Typ úkonu</label>
              <select 
                className="input-field"
                value={formData.taskPerformed}
                onChange={e => setFormData({...formData, taskPerformed: e.target.value, hasFlueGasAnalysis: (e.target.value === 'Porucha' || e.target.value === 'Iné')})}
              >
                <option value="Ročná prehliadka">Ročná prehliadka</option>
                <option value="Porucha">Porucha</option>
                <option value="Inštalácia">Inštalácia</option>
                <option value="Iné">Iné</option>
              </select>
            </div>
          </div>

          {formData.taskPerformed === 'Inštalácia' && (
            <div className="flex items-center gap-2 py-2">
              <input 
                type="checkbox" 
                id="useAsInstallDate" 
                checked={formData.useAsInstallDate} 
                onChange={e => setFormData({...formData, useAsInstallDate: e.target.checked})}
                className="w-4 h-4 text-[#3A87AD] rounded bg-black/40 border-white/10"
              />
              <label htmlFor="useAsInstallDate" className="text-sm font-bold text-white/70 cursor-pointer">
                Použiť ako dátum montáže (prepočíta nasledujúci servis)
              </label>
            </div>
          )}

          {formData.taskPerformed === 'Porucha' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <label className="text-sm font-bold text-white/70">Popis poruchy</label>
                <textarea 
                  className="input-field min-h-[80px]" 
                  value={formData.faultDescription}
                  onChange={e => setFormData({...formData, faultDescription: e.target.value})}
                  placeholder="Popíšte prejavy poruchy..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="faultFixed" 
                  checked={formData.faultFixed} 
                  onChange={e => setFormData({...formData, faultFixed: e.target.checked})}
                  className="w-4 h-4 text-[#3A87AD] rounded bg-black/40 border-white/10"
                />
                <label htmlFor="faultFixed" className="text-sm font-bold text-white/70 cursor-pointer">Porucha odstránená</label>
              </div>
              
              <div className="space-y-2">
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, showSpareParts: !prev.showSpareParts }))}
                  className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 text-sm font-bold text-white/70 hover:bg-white/10 transition-all"
                >
                  <span>Použité náhradné diely</span>
                  {formData.showSpareParts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                <AnimatePresence>
                  {formData.showSpareParts && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-2"
                    >
                      {formData.spareParts.map((part: any, index: number) => (
                        <div key={index} className="flex gap-2 animate-in slide-in-from-left-2">
                          <input 
                            type="text" 
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
                              newParts[index].quantity = parseInt(e.target.value);
                              setFormData({...formData, spareParts: newParts});
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const newParts = formData.spareParts.filter((_: any, i: number) => i !== index);
                              setFormData({...formData, spareParts: newParts});
                            }}
                            className="p-2 text-[#C14F4F] hover:bg-[#C14F4F]/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, spareParts: [...formData.spareParts, { name: '', quantity: 1 }]})}
                        className="w-full py-2 border border-dashed border-white/10 rounded-xl text-xs font-bold text-white/40 hover:border-[#3A87AD]/50 hover:text-[#3A87AD] transition-all"
                      >
                        + Pridať diel
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 py-2">
            <input 
              type="checkbox" 
              id="hasFlueGasAnalysis" 
              checked={formData.hasFlueGasAnalysis} 
              onChange={e => setFormData({...formData, hasFlueGasAnalysis: e.target.checked})}
              className="w-4 h-4 text-[#3A87AD] rounded bg-black/40 border-white/10"
            />
            <label htmlFor="hasFlueGasAnalysis" className="text-sm font-bold text-white/70 cursor-pointer">Vykonať analýzu spalín</label>
          </div>
        </div>

        {formData.hasFlueGasAnalysis && (
          <div className="card p-6 space-y-6 animate-in fade-in slide-in-from-top-4">
            <h3 className="font-bold text-[#3A87AD] flex items-center gap-2">
              <TrendingUp size={18} /> Analýza spalín
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Max (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="input-field" 
                  value={formData.co2Max}
                  onChange={e => setFormData({...formData, co2Max: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase">CO2 Min (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="input-field" 
                  value={formData.co2Min}
                  onChange={e => setFormData({...formData, co2Min: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase">O2 Max (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="input-field" 
                  value={formData.o2Max}
                  onChange={e => setFormData({...formData, o2Max: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase">O2 Min (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="input-field" 
                  value={formData.o2Min}
                  onChange={e => setFormData({...formData, o2Min: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase">Účinnosť (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="input-field" 
                  value={formData.efficiency}
                  onChange={e => setFormData({...formData, efficiency: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase">Tlak plynu (mbar)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="input-field" 
                  value={formData.gasPressure}
                  onChange={e => setFormData({...formData, gasPressure: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase">CO (ppm)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={formData.coValue}
                  onChange={e => setFormData({...formData, coValue: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase">Tlak v systéme (bar)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="input-field" 
                  value={formData.pressureValue}
                  onChange={e => setFormData({...formData, pressureValue: parseFloat(e.target.value)})}
                />
              </div>
            </div>
          </div>
        )}

        <div className="card p-6 space-y-6">
          <h3 className="font-bold text-[#3A87AD] flex items-center gap-2">
            <CheckCircle2 size={18} /> Kontrolný zoznam
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {[
              { id: 'burnerCheck', label: 'Kontrola horáka' },
              { id: 'combustionChamberCleaning', label: 'Čistenie spaľovacej komory' },
              { id: 'electrodesCheck', label: 'Kontrola elektród' },
              { id: 'exchangerCheck', label: 'Kontrola výmenníka' },
              { id: 'fanCheck', label: 'Kontrola ventilátora' },
              { id: 'filtersCleaning', label: 'Čistenie filtrov' },
              { id: 'siphonCleaning', label: 'Čistenie sifónu' },
              { id: 'gasCircuitTightness', label: 'Tesnosť plynového okruhu' },
              { id: 'flueGasOutletTightness', label: 'Tesnosť odvodu spalín' },
              { id: 'pumpCheck', label: 'Kontrola čerpadla' },
              { id: 'threeWayValveCheck', label: 'Kontrola 3-cestného ventilu' },
              { id: 'airSupplyVentilation', label: 'Prívod vzduchu a vetranie' },
              { id: 'emergencyStatesCheck', label: 'Kontrola havarijných stavov' },
              { id: 'bondingProtection', label: 'Ochranné pospojovanie' },
            ].map(item => (
              <div key={item.id} className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-sm text-white/70">{item.label}</span>
                <button 
                  type="button"
                  // @ts-ignore
                  onClick={() => toggleCheck(item.id)}
                  className={`w-10 h-6 rounded-full relative transition-all ${
                    // @ts-ignore
                    formData[item.id] === true ? 'bg-emerald-500' : formData[item.id] === false ? 'bg-[#C14F4F]' : 'bg-white/10'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    // @ts-ignore
                    formData[item.id] === true ? 'left-5' : formData[item.id] === false ? 'left-1' : 'left-3'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 space-y-6">
          <h3 className="font-bold text-[#3A87AD] flex items-center gap-2">
            <Camera size={18} /> Fotodokumentácia
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { id: 'photoBefore', label: 'Foto pred' },
              { id: 'photoAfter', label: 'Foto po' },
              { id: 'photoBoiler', label: 'Celok' },
              { id: 'photoConnection', label: 'Napojenie' },
              { id: 'photoChimney', label: 'Komín' }
            ].map(type => (
              <div key={type.id} className="space-y-2">
                <p className="text-[10px] font-bold text-white/40 uppercase text-center">{type.label}</p>
                <button 
                  type="button"
                  onClick={() => handlePhotoClick(type.id)}
                  className="w-full aspect-square bg-white/5 border border-dashed border-white/10 rounded-2xl flex items-center justify-center overflow-hidden relative group"
                >
                  {/* @ts-ignore */}
                  {eval(type.id) ? (
                    <>
                      {/* @ts-ignore */}
                      <img src={eval(type.id)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera size={24} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <Camera size={24} className="text-white/20" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-white/70">Poznámky technika</label>
            <textarea 
              className="input-field min-h-[100px]" 
              value={formData.technicianNotes}
              onChange={e => setFormData({...formData, technicianNotes: e.target.value})}
              placeholder="Zadajte dôležité informácie o servise..."
            />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <label className="text-sm font-bold text-white/70 block mb-2">Podpis zákazníka</label>
          <div className="bg-white rounded-2xl overflow-hidden border-2 border-white/10">
            <SignatureCanvas 
              ref={sigCanvas}
              penColor='black'
              canvasProps={{className: 'w-full h-48 cursor-crosshair'}}
              onEnd={() => setSigned(true)}
            />
          </div>
          <button 
            type="button"
            onClick={() => {
              sigCanvas.current?.clear();
              setSigned(false);
            }}
            className="text-xs font-bold text-[#C14F4F] uppercase tracking-widest hover:underline"
          >
            Vymazať podpis
          </button>
        </div>

        <div className="flex gap-4 pt-4">
          <button 
            type="button" 
            onClick={onCancel} 
            className="btn-secondary flex-1 justify-center py-4"
          >
            Zrušiť
          </button>
          <button 
            type="submit" 
            className="btn-primary flex-1 justify-center py-4 text-lg shadow-xl shadow-[#3A87AD]/20"
          >
            Uložiť záznam
          </button>
        </div>
      </form>
    </div>
  );
};
