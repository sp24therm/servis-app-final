import React from 'react';
import { X, Trash2, Calendar, Wrench, FileText, CheckCircle2, Camera, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { ServiceRecord, Boiler } from '../types';

interface ServiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceRecord | null;
  boiler: Boiler | null;
  onDelete: (id: string) => void;
}

export const ServiceDetailModal = ({ 
  isOpen, 
  onClose, 
  service, 
  boiler,
  onDelete
}: ServiceDetailModalProps) => {
  if (!isOpen || !service || !boiler) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto pt-10 pb-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="card w-full max-w-3xl p-0 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-[#3A87AD] p-6 flex justify-between items-center text-white relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Wrench size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{service.taskPerformed}</h2>
              <p className="text-white/70 text-sm flex items-center gap-2">
                <Calendar size={14} /> {new Date(service.date).toLocaleDateString('sk-SK')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (window.confirm('Naozaj chcete vymazať tento záznam?')) {
                  onDelete(service.id);
                  onClose();
                }
              }}
              className="p-2 text-white hover:bg-red-500 rounded-xl transition-all"
              title="Vymazať záznam"
            >
              <Trash2 size={22} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* Boiler Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Zariadenie</p>
              <p className="text-lg font-bold text-white">{boiler.brand} {boiler.model}</p>
              <p className="text-sm text-white/60">{boiler.address}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Sériové číslo</p>
              <p className="text-lg font-bold text-white">{boiler.serialNumber || 'Neuvedené'}</p>
            </div>
          </div>

          {/* Combustion Analysis */}
          {(service.co2Value > 0 || service.pressureValue > 0) && (
            <div className="space-y-4">
              <h3 className="font-bold text-[#3A87AD] flex items-center gap-2 border-b border-white/5 pb-2">
                <TrendingUp size={18} /> Analýza spalín
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card p-3 bg-white/5 border-white/10 text-center">
                  <p className="text-[10px] font-bold text-white/40 uppercase">CO2</p>
                  <p className="text-xl font-bold text-white">{service.co2Value}%</p>
                </div>
                <div className="card p-3 bg-white/5 border-white/10 text-center">
                  <p className="text-[10px] font-bold text-white/40 uppercase">CO</p>
                  <p className="text-xl font-bold text-white">{service.coValue || 0} ppm</p>
                </div>
                <div className="card p-3 bg-white/5 border-white/10 text-center">
                  <p className="text-[10px] font-bold text-white/40 uppercase">Tlak</p>
                  <p className="text-xl font-bold text-white">{service.pressureValue} bar</p>
                </div>
                <div className="card p-3 bg-white/5 border-white/10 text-center">
                  <p className="text-[10px] font-bold text-white/40 uppercase">Účinnosť</p>
                  <p className="text-xl font-bold text-white">{service.efficiency || 0}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Checklist */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#3A87AD] flex items-center gap-2 border-b border-white/5 pb-2">
              <CheckCircle2 size={18} /> Vykonané kontroly
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
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
                <div key={item.id} className="flex items-center justify-between py-1">
                  <span className="text-sm text-white/60">{item.label}</span>
                  {/* @ts-ignore */}
                  {service[item.id] === true ? (
                    <span className="text-emerald-500 text-xs font-bold uppercase tracking-widest">OK</span>
                  // @ts-ignore
                  ) : service[item.id] === false ? (
                    <span className="text-[#C14F4F] text-xs font-bold uppercase tracking-widest">CHYBA</span>
                  ) : (
                    <span className="text-white/20 text-xs font-bold uppercase tracking-widest">—</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Photos */}
          {(service.photoBefore || service.photoAfter || service.photoBoiler || service.photoConnection || service.photoChimney) && (
            <div className="space-y-4">
              <h3 className="font-bold text-[#3A87AD] flex items-center gap-2 border-b border-white/5 pb-2">
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
                  // @ts-ignore
                  service[type.id] && (
                    <div key={type.id} className="space-y-2">
                      <p className="text-[10px] font-bold text-white/40 uppercase text-center">{type.label}</p>
                      <div className="aspect-square rounded-2xl overflow-hidden border border-white/10">
                        {/* @ts-ignore */}
                        <img src={service[type.id]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {service.technicianNotes && (
            <div className="space-y-2">
              <h3 className="font-bold text-[#3A87AD] flex items-center gap-2 border-b border-white/5 pb-2">
                <FileText size={18} /> Poznámky technika
              </h3>
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap bg-white/5 p-4 rounded-2xl border border-white/10">
                {service.technicianNotes}
              </p>
            </div>
          )}

          {/* Signature */}
          {service.customerSignature && (
            <div className="space-y-2 pt-4 border-t border-white/5">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Podpis zákazníka</p>
              <div className="bg-white rounded-2xl p-4 w-full max-w-[300px]">
                <img src={service.customerSignature} alt="Podpis" className="w-full h-auto" referrerPolicy="no-referrer" />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
