import React, { useState, useEffect, useRef } from 'react';
import { Save, Check, Trash2, Plus, AlertCircle, ChevronDown } from 'lucide-react';
import { usePriceList } from '../hooks/usePriceList';
import { PriceListItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const PriceListEditor = () => {
  const { items, updatePrice, addItem, deleteItem, loading } = usePriceList();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [localPrices, setLocalPrices] = useState<Record<string, { price: number; priceMax: number | null }>>({});

  // New item state
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Omit<PriceListItem, 'id'>>({
    category: '',
    name: '',
    price: 0,
    priceMax: null,
    unit: '€',
    emergency: false,
    order: 1
  });

  // Category dropdown state
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Unique categories from existing items
  const uniqueCategories = Array.from(new Set(items.map(item => item.category))).sort();

  // Filtered categories based on input
  const filteredCategories = uniqueCategories.filter(cat => 
    cat.toLowerCase().includes(newItem.category.toLowerCase())
  );

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync local prices when items load
  useEffect(() => {
    if (items.length > 0) {
      const prices: Record<string, { price: number; priceMax: number | null }> = {};
      items.forEach(item => {
        prices[item.id] = { price: item.price, priceMax: item.priceMax };
      });
      setLocalPrices(prices);
    }
  }, [items]);

  const handleUpdate = async (id: string) => {
    const local = localPrices[id];
    if (!local) return;
    
    setSavingId(id);
    try {
      await updatePrice(id, local.price, local.priceMax);
      setSavingId(null);
      setSavedId(id);
      setTimeout(() => setSavedId(null), 2000);
    } catch (error) {
      setSavingId(null);
      console.error('Failed to update price:', error);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addItem({ ...newItem, order: items.length + 1 });
      setIsAdding(false);
      setNewItem({
        category: '',
        name: '',
        price: 0,
        priceMax: null,
        unit: '€',
        emergency: false,
        order: items.length + 2
      });
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  if (loading) return <div className="text-white/40 italic p-4">Načítavam editor cenníka...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Položky cenníka</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="btn-primary py-2 px-4 text-sm"
        >
          <Plus size={16} className="mr-2" />
          Pridať položku
        </button>
      </div>

      {/* Add New Item Form */}
      {isAdding && (
        <form onSubmit={handleAddItem} className="card p-4 space-y-4 border border-[#3A87AD]/30 bg-[#3A87AD]/5 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 relative" ref={categoryRef}>
              <label className="text-xs font-bold text-white/40 uppercase">Kategória</label>
              <div className="relative">
                <input 
                  required
                  type="text"
                  className="input-field pr-10"
                  placeholder="napr. Servis kotla"
                  value={newItem.category}
                  onChange={e => {
                    setNewItem({...newItem, category: e.target.value});
                    setShowCategoryDropdown(true);
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                />
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              {/* Category Dropdown */}
              <AnimatePresence>
                {showCategoryDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 right-0 top-full mt-1 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar"
                  >
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setNewItem({...newItem, category: cat});
                            setShowCategoryDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          {cat}
                        </button>
                      ))
                    ) : newItem.category && (
                      <button
                        type="button"
                        onClick={() => setShowCategoryDropdown(false)}
                        className="w-full text-left px-4 py-2 text-sm text-[#3A87AD] hover:bg-white/5 transition-colors font-medium"
                      >
                        Vytvoriť: "{newItem.category}"
                      </button>
                    )}
                    {filteredCategories.length === 0 && !newItem.category && (
                      <div className="px-4 py-2 text-xs text-white/30 italic">
                        Zadajte názov kategórie...
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-white/40 uppercase">Názov služby</label>
              <input 
                required
                type="text"
                className="input-field"
                placeholder="napr. Ročná prehliadka"
                value={newItem.name}
                onChange={e => setNewItem({...newItem, name: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-white/40 uppercase">Cena (€)</label>
              <input 
                required
                type="number"
                step="0.01"
                className="input-field"
                value={newItem.price}
                onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-white/40 uppercase">Max. cena (voliteľné)</label>
              <input 
                type="number"
                step="0.01"
                className="input-field"
                placeholder="Prázdne ak nie je"
                value={newItem.priceMax || ''}
                onChange={e => setNewItem({...newItem, priceMax: e.target.value ? parseFloat(e.target.value) : null})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-white/40 uppercase">Jednotka</label>
              <input 
                required
                type="text"
                className="input-field"
                placeholder="€ alebo €/hod"
                value={newItem.unit}
                onChange={e => setNewItem({...newItem, unit: e.target.value})}
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  className="w-4 h-4 rounded bg-black/40 border-white/10 text-red-500"
                  checked={newItem.emergency}
                  onChange={e => setNewItem({...newItem, emergency: e.target.checked})}
                />
                <span className="text-sm font-bold text-white/70">Havarijné</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1 justify-center">Uložiť novú položku</button>
            <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary px-4">Zrušiť</button>
          </div>
        </form>
      )}

      {/* Items List */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="card p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-[#3A87AD] uppercase tracking-widest">{item.category}</span>
                <h4 className="text-white/60 font-medium">{item.name}</h4>
              </div>
              <button 
                onClick={() => setDeleteConfirmId(item.id)}
                className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {deleteConfirmId === item.id ? (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle size={16} />
                  <span>Naozaj vymazať?</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(item.id)} className="text-xs font-bold text-red-500 hover:underline">ÁNO</button>
                  <button onClick={() => setDeleteConfirmId(null)} className="text-xs font-bold text-white/40 hover:text-white/60">NIE</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[120px] space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Cena ({item.unit})</label>
                  <input 
                    type="text"
                    inputMode="decimal"
                    className="input-field py-1.5 text-sm"
                    value={localPrices[item.id]?.price ?? item.price}
                    onChange={e => {
                      const val = parseFloat(e.target.value.replace(',', '.')) || 0;
                      setLocalPrices(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], price: val }
                      }));
                    }}
                  />
                </div>

                {item.priceMax !== null && (
                  <div className="flex-1 min-w-[120px] space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Max. cena</label>
                    <input 
                      type="text"
                      inputMode="decimal"
                      className="input-field py-1.5 text-sm"
                      value={localPrices[item.id]?.priceMax ?? item.priceMax}
                      onChange={e => {
                        const val = parseFloat(e.target.value.replace(',', '.')) || 0;
                        setLocalPrices(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], priceMax: val }
                        }));
                      }}
                    />
                  </div>
                )}

                <button 
                  onClick={() => handleUpdate(item.id)}
                  disabled={savingId === item.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                    savedId === item.id 
                      ? 'bg-green-500/20 text-green-500 border border-green-500/30' 
                      : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {savingId === item.id ? (
                    <>Ukladám...</>
                  ) : savedId === item.id ? (
                    <><Check size={14} /> Uložené ✓</>
                  ) : (
                    <><Save size={14} /> Uložiť</>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
