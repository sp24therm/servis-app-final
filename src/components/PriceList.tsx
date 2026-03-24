import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { usePriceList } from '../hooks/usePriceList';

interface PriceListProps {
  onClose: () => void;
}

export const PriceList = ({ onClose }: PriceListProps) => {
  const { items, loading } = usePriceList();

  useEffect(() => {
    const mainContainer = document.querySelector('[data-scroll-container]') as HTMLElement;
    if (mainContainer) {
      mainContainer.style.overflow = 'hidden';
    }
    return () => {
      if (mainContainer) {
        mainContainer.style.overflow = '';
      }
    };
  }, []);

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-[85vw] h-[85vh] bg-[#1a1a2e] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
          <h2 className="text-2xl font-bold text-white">Cenník služieb</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white"
          >
            <X size={28} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full text-white/40 italic">
              Načítavam cenník...
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8">
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-[#3A87AD] font-bold uppercase tracking-widest text-sm border-b border-[#3A87AD]/20 pb-2">
                    {category}
                  </h3>
                  <div className="divide-y divide-white/5">
                    {categoryItems.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex justify-between items-center py-4 min-h-[44px]"
                      >
                        <span className="text-white/90 font-medium">{item.name}</span>
                        <div className={`font-bold text-lg ${item.emergency ? 'text-red-500' : 'text-white'}`}>
                          {item.price}
                          {item.priceMax ? ` - ${item.priceMax}` : ''}
                          <span className="ml-1 text-sm font-normal opacity-60">{item.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
