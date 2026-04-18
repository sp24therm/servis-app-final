import React, { useState, useEffect } from 'react';

interface AddressSearchProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (addr: string, lat: number, lng: number) => void;
  autoOpen?: boolean;
}

export const AddressSearch = ({ 
  value, 
  onChange, 
  onSelect,
  autoOpen = true
}: AddressSearchProps) => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ignoreNext, setIgnoreNext] = useState(false);

  useEffect(() => {
    if (value.length < 3 || ignoreNext) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&countrycodes=sk`);
        const data = await res.json();
        setResults(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value, ignoreNext]);

  return (
    <div className="relative">
      <input 
        type="text" 
        className="input-field" 
        placeholder="Zadajte adresu (napr. Lipová 20, Lab)..."
        value={value}
        onChange={(e) => {
          setIgnoreNext(false);
          onChange(e.target.value);
        }}
        onBlur={() => setTimeout(() => setResults([]), 200)}
      />
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E1E1E] border border-white/10 rounded-xl shadow-2xl z-[110] max-h-[200px] overflow-y-auto backdrop-blur-md">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm border-b border-white/5 last:border-0 text-white/80 transition-colors"
              onClick={() => {
                setIgnoreNext(true);
                onSelect(r.display_name, parseFloat(r.lat), parseFloat(r.lon));
                setResults([]);
              }}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
