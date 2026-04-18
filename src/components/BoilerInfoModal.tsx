import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wrench, Calendar, Info, Camera, Zap, Flame } from 'lucide-react';
import { Boiler, ServiceRecord } from '../types';
import { getBoilerStatus, getStatusColor, getStatusLabel } from '../utils/boilerUtils';
import { ImageOverlay } from './ImageOverlay';

interface BoilerInfoModalProps {
  boiler: Boiler;
  services: ServiceRecord[];
  onClose: () => void;
  upcomingDays: number;
  dormantDays: number;
}

export const BoilerInfoModal = ({ 
  boiler, 
  services, 
  onClose,
  upcomingDays,
  dormantDays 
}: BoilerInfoModalProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const status = getBoilerStatus(boiler.nextServiceDate, upcomingDays, dormantDays);
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);

  // Find installation service record
  const installService = services.find(s => s.boilerId === boiler.id && s.taskPerformed === 'Inštalácia');

  const boilerPhotos = boiler.photos || {};
  const installPhotos = installService ? {
    overall: installService.photoBoiler,
    connection: installService.photoConnection,
    chimney: installService.photoChimney
  } : {};

  const allPhotos = [
    { url: boilerPhotos.overall, label: 'Kotol (Zariadenie)', source: 'Základné' },
    { url: boilerPhotos.connection, label: 'Napojenie (Zariadenie)', source: 'Základné' },
    { url: boilerPhotos.chimney, label: 'Komín (Zariadenie)', source: 'Základné' },
    { url: installPhotos.overall, label: 'Kotol (Inštalácia)', source: 'Inštalačný záznam' },
    { url: installPhotos.connection, label: 'Napojenie (Inštalácia)', source: 'Inštalačný záznam' },
    { url: installPhotos.chimney, label: 'Komín (Inštalácia)', source: 'Inštalačný záznam' },
  ].filter(p => p.url);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#1A1A1A] w-[85vw] h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#3A87AD]/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#3A87AD]/20 rounded-2xl text-[#3A87AD]">
                <Info size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{boiler.name}</h2>
                <p className="text-sm text-white/40">{boiler.brand} {boiler.model}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                  <Wrench size={14} /> Základné údaje
                </h3>
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Sériové číslo</p>
                    <p className="text-sm font-medium text-white">{boiler.serialNumber || 'Neuvedené'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Dátum inštalácie</p>
                    <p className="text-sm font-medium text-white">
                      {boiler.installDate ? new Date(boiler.installDate).toLocaleDateString('sk-SK') : 'Neuvedené'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={14} /> Servisné termíny
                </h3>
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Status</p>
                      <span 
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1"
                        style={{ backgroundColor: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Posledný servis</p>
                      <p className="text-sm font-medium text-white">
                        {boiler.lastServiceDate ? new Date(boiler.lastServiceDate).toLocaleDateString('sk-SK') : 'Nikdy'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Nasledujúci servis</p>
                      <p className="text-sm font-medium text-white">
                        {boiler.nextServiceDate ? new Date(boiler.nextServiceDate).toLocaleDateString('sk-SK') : 'Neuvedené'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                  <Zap size={14} /> Technické parametre
                </h3>
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Výkon</p>
                      <p className="text-sm font-medium text-white">{boiler.power ? `${boiler.power} kW` : 'Neuvedené'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Palivo</p>
                      <p className="text-sm font-medium text-white">{boiler.fuel || 'Neuvedené'}</p>
                    </div>
                  </div>
                  {boiler.notes && (
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Poznámka</p>
                      <p className="text-xs text-white/60 italic leading-relaxed">{boiler.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Photos Section */}
            {allPhotos.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                  <Camera size={14} /> Fotodokumentácia
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {allPhotos.map((photo, index) => (
                    <div key={index} className="group space-y-2">
                      <div 
                        className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5 cursor-pointer hover:border-[#3A87AD]/50 transition-all relative"
                        onClick={() => setSelectedImage(photo.url!)}
                      >
                        <img 
                          src={photo.url} 
                          alt={photo.label} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Camera size={20} className="text-white" />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-white/80 truncate">{photo.label}</p>
                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">{photo.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <ImageOverlay 
        src={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
    </>
  );
};
