import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Terminal } from 'lucide-react';

export const DiagnosticSection: React.FC = () => {
  const isDiagMode = new URLSearchParams(window.location.search).get('diag') === 'true';

  return (
    <section className="py-12 px-6 max-w-5xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-card p-8 border-white/5"
      >
        {isDiagMode ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-light-blue/10 flex items-center justify-center text-light-blue">
              <Terminal className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white">
              Diagnostický nástroj (vývojový režim)
            </h3>
            <p className="text-white/40 text-center max-w-md">
              Prístup k testovacím rozhraniam analytického modulu bol aktivovaný.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-white/20" />
            <p style={{ color: '#999', fontSize: '0.85rem' }}>
              Pripravujeme inteligentnú diagnostiku kotlov
            </p>
          </div>
        )}
      </motion.div>
    </section>
  );
};
