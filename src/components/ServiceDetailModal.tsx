import React, { useState } from 'react';
import { Trash2, Download, ArrowLeft, CheckCircle2, AlertCircle, PenTool, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import { ServiceRecord, Boiler, Customer } from '../types';
import { generateServicePDF } from '../utils/pdf';

interface ServiceDetailModalProps {
  service: ServiceRecord;
  boiler: Boiler;
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
}

export const ServiceDetailModal = ({ 
  service, 
  boiler, 
  customer,
  onClose,
  onEdit,
  onDelete
}: ServiceDetailModalProps) => {
  if (!service) return null;
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      await generateServicePDF(service, boiler, customer);
    } catch (error) {
      console.error("PDF generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="card w-full max-w-2xl p-0 overflow-hidden"
      >
        <div className="bg-[#3A87AD] p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Detail zásahu</p>
              <h2 className="text-2xl font-bold">{service.taskPerformed}</h2>
              <p className="text-white/80 text-sm mt-1">
                {new Date(service.date).toLocaleDateString('sk-SK')} • {boiler.brand} {boiler.model}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onDelete(service.id)} 
                className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-xl transition-colors"
                title="Vymazať záznam"
              >
                <Trash2 size={18} />
              </button>
              <button 
                onClick={handleDownloadPDF} 
                disabled={isGenerating}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
                title="Stiahnuť PDF"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                PDF
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <ArrowLeft size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/40 uppercase">CO2 Hodnota</p>
              <p className="text-lg font-bold text-white">{service.co2Value}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/40 uppercase">CO</p>
              <p className="text-lg font-bold text-white">{service.coValue} ppm</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/40 uppercase">Tlak</p>
              <p className="text-lg font-bold text-white">{service.pressureValue} bar</p>
            </div>
          </div>

          {service.taskPerformed === 'Ročná prehliadka' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-white/5 p-4 rounded-2xl space-y-4 border border-white/5">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Analýza spalín a tlaky</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'CO2 Max', val: service.co2Max, unit: '%' },
                    { label: 'CO2 Min', val: service.co2Min, unit: '%' },
                    { label: 'CO', val: service.coValue, unit: ' ppm' },
                    { label: 'O2 Max', val: service.o2Max, unit: '%' },
                    { label: 'O2 Min', val: service.o2Min, unit: '%' },
                    { label: 'Účinnosť', val: service.efficiency, unit: '%' },
                    { label: 'Tlak plynu', val: service.gasPressure, unit: ' mbar' },
                    { label: 'Tlak exp. ÚK', val: service.expansionTankPressureCH, unit: ' bar' },
                    { label: 'Tlak exp. TÚV', val: service.expansionTankPressureDHW, unit: ' bar', show: service.hasDHWExpansionTank },
                  ].map(item => (item.show !== false && (
                    <div key={item.label}>
                      <p className="text-[10px] font-bold text-white/40 uppercase">{item.label}</p>
                      <p className="text-sm font-bold text-white">{item.val ?? '-'}{item.unit}</p>
                    </div>
                  )))}
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl space-y-4 border border-white/5">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Chemické hodnoty ÚK</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Konduktivita', val: service.conductivity, unit: ' mS/cm' },
                    { label: 'PH ÚK', val: service.phCH, unit: '' },
                    { label: 'Tvrdosť ÚK', val: service.hardnessCH, unit: ' °dH' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-[10px] font-bold text-white/40 uppercase">{item.label}</p>
                      <p className="text-sm font-bold text-white">{item.val ?? '-'}{item.unit}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl space-y-4 border border-white/5">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Kontrolný zoznam</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
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
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-xs text-white/60">{item.label}</span>
                      {service[item.key as keyof ServiceRecord] ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : (
                        <AlertCircle size={14} className="text-[#C14F4F]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {service.technicianNotes && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase">Poznámky technika</p>
              <div className="p-4 bg-white/5 rounded-2xl text-white/60 text-sm italic border border-white/5">
                {service.technicianNotes}
              </div>
            </div>
          )}

          {/* Photos Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {service.photo && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Hlavná fotografia</p>
                <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                  <img src={service.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              </div>
            )}
            {service.photoBefore && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Pred opravou</p>
                <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                  <img src={service.photoBefore} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              </div>
            )}
            {service.photoAfter && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Po oprave</p>
                <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                  <img src={service.photoAfter} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              </div>
            )}
            {service.photoBoiler && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Kotol (Inštalácia)</p>
                <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                  <img src={service.photoBoiler} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              </div>
            )}
            {service.photoConnection && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Napojenie (Inštalácia)</p>
                <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                  <img src={service.photoConnection} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              </div>
            )}
            {service.photoChimney && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Komín (Inštalácia)</p>
                <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                  <img src={service.photoChimney} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              </div>
            )}
          </div>

          {/* Spare Parts Section */}
          {service.spareParts && service.spareParts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Wrench size={20} className="text-[#3A87AD]" />
                Použité náhradné diely
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {service.spareParts.map((part, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-white font-medium">{part.name}</span>
                    <span className="text-[#3A87AD] font-bold">x{part.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {service.signature && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Podpis zákazníka</p>
              <div className="aspect-video bg-white p-4 rounded-2xl border border-white/5 flex items-center justify-center">
                <img src={service.signature} alt="Signature" className="max-w-full max-h-full object-contain mix-blend-multiply" />
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-white/5 flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Zavrieť</button>
            <button onClick={onEdit} className="btn-primary flex-1 justify-center bg-amber-500 hover:bg-amber-600 border-amber-500 shadow-amber-500/20">
              <PenTool size={18} /> Upraviť záznam
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
