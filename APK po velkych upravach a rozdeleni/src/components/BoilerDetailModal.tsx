import React from 'react';
import { Wrench, X, History, ChevronRight } from 'lucide-react';
import { Boiler, ServiceRecord } from '../types';

interface BoilerDetailModalProps {
  boiler: Boiler;
  services: ServiceRecord[];
  onClose: () => void;
  onSelectService: (id: string) => void;
}

export const BoilerDetailModal = ({ 
  boiler, 
  services,
  onClose,
  onSelectService
}: BoilerDetailModalProps) => {
  const boilerServices = services
    .filter(s => s.boilerId === boiler.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-[#1E1E1E] rounded-3xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#3A87AD]/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#3A87AD]/20 rounded-2xl flex items-center justify-center text-[#3A87AD]">
              <Wrench size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{boiler.brand} {boiler.model}</h2>
              <p className="text-sm text-white/40">S/N: {boiler.serialNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Photos Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Kotol</p>
              <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                {boiler.photos?.overall ? (
                  <img src={boiler.photos.overall} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10 italic text-xs">Bez foto</div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Napojenie</p>
              <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                {boiler.photos?.connection ? (
                  <img src={boiler.photos.connection} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10 italic text-xs">Bez foto</div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Komín</p>
              <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                {boiler.photos?.chimney ? (
                  <img src={boiler.photos.chimney} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10 italic text-xs">Bez foto</div>
                )}
              </div>
            </div>
          </div>

          {/* History Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <History size={20} className="text-[#3A87AD]" />
              História servisov
            </h3>
            <div className="space-y-3">
              {boilerServices.length > 0 ? (
                boilerServices.map(service => (
                  <div 
                    key={service.id} 
                    onClick={() => onSelectService(service.id)}
                    className="card p-4 flex items-center justify-between hover:border-[#3A87AD]/30 hover:bg-[#3A87AD]/5 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 text-white/60 rounded-xl flex items-center justify-center font-bold text-xs">
                        {new Date(service.date).toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' })}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{service.taskPerformed}</h4>
                        <p className="text-xs text-white/40">{service.status} • {service.technicianNotes?.substring(0, 50)}...</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-white/20 group-hover:text-[#3A87AD]" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/20 italic text-center py-8">Žiadne servisné záznamy.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
