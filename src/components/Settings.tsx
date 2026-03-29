import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, uploadFile, handleFirestoreError, OperationType } from '../firebase';
import { compressImage } from '../utils/imageUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Check, Loader2, X, Euro, ChevronRight, Building2, Save, Clock, Sun, Snowflake, AlertTriangle, Plus, Settings2, Bell, Calendar as CalendarIcon } from 'lucide-react';
import { PriceListEditor } from './PriceListEditor';
import { useCompanyInfo, CompanyInfo } from '../hooks/useCompanyInfo';
import { useTermSettings, TermSettings } from '../hooks/useTermSettings';
import { useSeasonConfig, SeasonConfig } from '../hooks/useSeasonConfig';
import { useCalendarConfig, CalendarConfig } from '../hooks/useCalendarConfig';
import { useErrorCodes, ErrorCode } from '../hooks/useErrorCodes';
import { toast } from 'sonner';

interface SettingsProps {
  onBackgroundUpdate: (url: string) => void;
}

export const Settings = ({ onBackgroundUpdate }: SettingsProps) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  
  const { companyInfo, saveCompanyInfo, loading: companyLoading } = useCompanyInfo();
  const { termSettings, saveTermSettings, loading: termsLoading } = useTermSettings();
  const { config: calendarConfig, saveCalendarConfig, loading: calendarLoading } = useCalendarConfig();
  const { config: seasonConfig, saveSeasonConfig, loading: seasonLoading, currentSeason, autoSeason } = useSeasonConfig();
  const { errorCodes, brands, addErrorCode, addBrand, loading: errorCodesLoading } = useErrorCodes();

  const [localCompanyInfo, setLocalCompanyInfo] = useState<CompanyInfo>(companyInfo);
  const [localTermSettings, setLocalTermSettings] = useState<TermSettings>(termSettings);
  const [localCalendarConfig, setLocalCalendarConfig] = useState<CalendarConfig>(calendarConfig);
  const [localSeasonConfig, setLocalSeasonConfig] = useState<SeasonConfig>(seasonConfig);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [termsSaveStatus, setTermsSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [calendarSaveStatus, setCalendarSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [seasonSaveStatus, setSeasonSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [errorCodeSaveStatus, setErrorCodeSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const [newErrorCode, setNewErrorCode] = useState<Omit<ErrorCode, 'id' | 'createdAt'>>({
    brand: '',
    code: '',
    category: 'DIY',
    description: '',
    instruction: '',
  });
  const [newBrandName, setNewBrandName] = useState('');
  const [isAddingBrand, setIsAddingBrand] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        toast.success('Google Kalendár úspešne prepojený');
        // Trigger sync
        fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/manualSyncCalendarSlots`, { method: 'POST' });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/getGoogleAuthUrl`);
      const { url } = await response.json();
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch (error) {
      toast.error('Nepodarilo sa získať prihlasovaciu adresu');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  useEffect(() => {
    if (companyInfo) setLocalCompanyInfo(companyInfo);
  }, [companyInfo]);

  useEffect(() => {
    if (termSettings) setLocalTermSettings(termSettings);
  }, [termSettings]);

  useEffect(() => {
    if (calendarConfig) setLocalCalendarConfig(calendarConfig);
  }, [calendarConfig]);

  useEffect(() => {
    if (seasonConfig) setLocalSeasonConfig(seasonConfig);
  }, [seasonConfig]);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleTermsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTermsSaveStatus('saving');
    try {
      await saveTermSettings(localTermSettings);
      setTermsSaveStatus('success');
      toast.success('Aktualizované');
      setTimeout(() => setTermsSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving term settings:', error);
      setTermsSaveStatus('idle');
    }
  };

  const handleCalendarSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalendarSaveStatus('saving');
    try {
      await saveCalendarConfig(localCalendarConfig);
      setCalendarSaveStatus('success');
      toast.success('Aktualizované');
      setTimeout(() => setCalendarSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving calendar config:', error);
      setCalendarSaveStatus('idle');
    }
  };

  const handleCompanySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      await saveCompanyInfo(localCompanyInfo);
      setSaveStatus('success');
      toast.success('Aktualizované');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving company info:', error);
      setSaveStatus('idle');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      // 1. Compress image
      const compressedBlob = await compressImage(file);
      
      // 2. Upload to Firebase Storage
      const storagePath = 'settings/global_bg.jpg';
      const downloadUrl = await uploadFile(compressedBlob as File, storagePath);

      // 3. Update Firestore
      await setDoc(doc(db, 'appConfig', 'appearance'), {
        backgroundUrl: downloadUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setUploadStatus('success');
      onBackgroundUpdate(downloadUrl);
      
      // Reset status after 3 seconds
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error) {
      console.error('Error uploading background:', error);
      setUploadStatus('error');
      handleFirestoreError(error, OperationType.WRITE, 'appConfig/appearance');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSeasonSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSeasonSaveStatus('saving');
    try {
      await saveSeasonConfig(localSeasonConfig);
      setSeasonSaveStatus('success');
      toast.success('Aktualizované');
      setTimeout(() => setSeasonSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving season config:', error);
      setSeasonSaveStatus('idle');
    }
  };

  const handleAddErrorCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newErrorCode.brand || !newErrorCode.code) return;
    setErrorCodeSaveStatus('saving');
    try {
      await addErrorCode(newErrorCode as ErrorCode);
      setErrorCodeSaveStatus('success');
      setNewErrorCode({
        brand: '',
        code: '',
        category: 'DIY',
        description: '',
        instruction: '',
      });
      setTimeout(() => setErrorCodeSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error adding error code:', error);
      setErrorCodeSaveStatus('idle');
    }
  };

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) return;
    await addBrand(newBrandName.trim());
    setNewBrandName('');
    setIsAddingBrand(false);
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-8 relative">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <h2 className="text-2xl font-bold text-[#3A87AD]">Nastavenia</h2>
        </div>

        <div className="space-y-4">
          {/* Appearance Section */}
          <section className="space-y-4">
            <button 
              onClick={() => toggleSection('appearance')}
              className="w-full flex items-center justify-between text-white/80 hover:text-white transition-colors group p-2 rounded-xl hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <ImageIcon size={20} className="text-[#3A87AD]" />
                <h3 className="text-lg font-bold">Vzhľad aplikácie</h3>
              </div>
              <ChevronRight 
                size={20} 
                className={`text-white/20 group-hover:text-white/40 transition-transform duration-300 ${activeSection === 'appearance' ? 'rotate-90' : ''}`} 
              />
            </button>
            
            <AnimatePresence>
              {activeSection === 'appearance' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-4 mt-2">
                    <p className="text-sm text-white/60">Zmeniť globálne pozadie aplikácie</p>
                    
                    <div className="relative">
                      <input
                        type="file"
                        id="bg-upload"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isUploading}
                        className="hidden"
                      />
                      <label
                        htmlFor="bg-upload"
                        className={`flex items-center justify-center gap-3 p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer
                          ${isUploading ? 'border-[#3A87AD]/50 bg-[#3A87AD]/5 cursor-not-allowed' : 
                            uploadStatus === 'success' ? 'border-green-500/50 bg-green-500/5' : 
                            'border-white/20 hover:border-[#3A87AD]/50 hover:bg-white/5'}`}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="animate-spin text-[#3A87AD]" size={20} />
                            <span className="text-sm font-bold">Nahrávam nové pozadie...</span>
                          </>
                        ) : uploadStatus === 'success' ? (
                          <>
                            <Check className="text-green-500" size={20} />
                            <span className="text-sm font-bold text-green-500">Pozadie úspešne zmenené ✓</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="text-white/40" size={20} />
                            <span className="text-sm font-bold">Vybrať nový obrázok pozadia</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Price List Editor Section */}
          <section className="space-y-4 pt-4 border-t border-white/5">
            <button 
              onClick={() => toggleSection('pricelist')}
              className="w-full flex items-center justify-between text-white/80 hover:text-white transition-colors group p-2 rounded-xl hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <Euro size={20} className="text-[#3A87AD]" />
                <h3 className="text-lg font-bold">Správa cenníka</h3>
              </div>
              <ChevronRight 
                size={20} 
                className={`text-white/20 group-hover:text-white/40 transition-transform duration-300 ${activeSection === 'pricelist' ? 'rotate-90' : ''}`} 
              />
            </button>
            
            <AnimatePresence>
              {activeSection === 'pricelist' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-1 pt-2">
                    <PriceListEditor />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Company Info Section */}
          <section className="space-y-4 pt-4 border-t border-white/5">
            <button 
              onClick={() => toggleSection('company')}
              className="w-full flex items-center justify-between text-white/80 hover:text-white transition-colors group p-2 rounded-xl hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-[#3A87AD]" />
                <h3 className="text-lg font-bold">Firemné údaje</h3>
              </div>
              <ChevronRight 
                size={20} 
                className={`text-white/20 group-hover:text-white/40 transition-transform duration-300 ${activeSection === 'company' ? 'rotate-90' : ''}`} 
              />
            </button>
            
            <AnimatePresence>
              {activeSection === 'company' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-1 pt-2">
                    {companyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-[#3A87AD]" size={24} />
                      </div>
                    ) : (
                      <form onSubmit={handleCompanySave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Názov firmy</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={localCompanyInfo.name}
                              onChange={e => setLocalCompanyInfo({...localCompanyInfo, name: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">IČO</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={localCompanyInfo.ico}
                              onChange={e => setLocalCompanyInfo({...localCompanyInfo, ico: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">DIČ</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={localCompanyInfo.dic}
                              onChange={e => setLocalCompanyInfo({...localCompanyInfo, dic: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">IČ DPH</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={localCompanyInfo.icDph}
                              onChange={e => setLocalCompanyInfo({...localCompanyInfo, icDph: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Ulica</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={localCompanyInfo.street}
                              onChange={e => setLocalCompanyInfo({...localCompanyInfo, street: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Mesto</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={localCompanyInfo.city}
                              onChange={e => setLocalCompanyInfo({...localCompanyInfo, city: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">PSČ</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={localCompanyInfo.zip}
                              onChange={e => setLocalCompanyInfo({...localCompanyInfo, zip: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Telefón</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={localCompanyInfo.phone}
                              onChange={e => setLocalCompanyInfo({...localCompanyInfo, phone: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Email</label>
                            <input 
                              type="email" 
                              className="input-field" 
                              value={localCompanyInfo.email}
                              onChange={e => setLocalCompanyInfo({...localCompanyInfo, email: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">IBAN</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={localCompanyInfo.iban}
                              onChange={e => setLocalCompanyInfo({...localCompanyInfo, iban: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-4">
                          <button 
                            type="submit" 
                            disabled={saveStatus === 'saving'}
                            className={`btn-primary min-w-[140px] justify-center ${saveStatus === 'success' ? 'bg-green-600 hover:bg-green-600' : ''}`}
                          >
                            {saveStatus === 'saving' ? (
                              <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>Ukladám...</span>
                              </>
                            ) : saveStatus === 'success' ? (
                              <>
                                <Check size={18} />
                                <span>Uložené ✓</span>
                              </>
                            ) : (
                              <>
                                <Save size={18} />
                                <span>Uložiť</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Term Settings Section */}
          <section className="space-y-4 pt-4 border-t border-white/5">
            <button 
              onClick={() => toggleSection('terms')}
              className="w-full flex items-center justify-between text-white/80 hover:text-white transition-colors group p-2 rounded-xl hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-[#3A87AD]" />
                <h3 className="text-lg font-bold">Nastavenia termínov</h3>
              </div>
              <ChevronRight 
                size={20} 
                className={`text-white/20 group-hover:text-white/40 transition-transform duration-300 ${activeSection === 'terms' ? 'rotate-90' : ''}`} 
              />
            </button>
            
            <AnimatePresence>
              {activeSection === 'terms' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-1 pt-2">
                    {termsLoading || calendarLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-[#3A87AD]" size={24} />
                      </div>
                    ) : (
                      <div className="space-y-10">
                        {/* Term Thresholds */}
                        <form onSubmit={handleTermsSave} className="space-y-6">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Prahové hodnoty termínov</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Dni pre "BLÍŽIACE SA"</label>
                              <div className="flex items-center gap-3">
                                <input 
                                  type="number" 
                                  className="input-field" 
                                  value={localTermSettings.upcomingDays}
                                  onChange={e => setLocalTermSettings({...localTermSettings, upcomingDays: parseInt(e.target.value) || 0})}
                                />
                                <span className="text-sm text-white/40">dní</span>
                              </div>
                              <p className="text-[10px] text-white/30 italic">Počet dní pred termínom, kedy sa status zmení na oranžovú.</p>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Dni pre "ZASPÄTÝ"</label>
                              <div className="flex items-center gap-3">
                                <input 
                                  type="number" 
                                  className="input-field" 
                                  value={localTermSettings.dormantDays}
                                  onChange={e => setLocalTermSettings({...localTermSettings, dormantDays: parseInt(e.target.value) || 0})}
                                />
                                <span className="text-sm text-white/40">dní</span>
                              </div>
                              <p className="text-[10px] text-white/30 italic">Počet dní po termíne, kedy sa status zmení na šedú.</p>
                            </div>
                          </div>
                          <div className="flex justify-end pt-4">
                            <button 
                              type="submit" 
                              disabled={termsSaveStatus === 'saving'}
                              className={`btn-primary min-w-[140px] justify-center ${termsSaveStatus === 'success' ? 'bg-green-600 hover:bg-green-600' : ''}`}
                            >
                              {termsSaveStatus === 'saving' ? (
                                <>
                                  <Loader2 className="animate-spin" size={18} />
                                  <span>Ukladám...</span>
                                </>
                              ) : termsSaveStatus === 'success' ? (
                                <>
                                  <Check size={18} />
                                  <span>Uložené ✓</span>
                                </>
                              ) : (
                                <>
                                  <Save size={18} />
                                  <span>Uložiť prahy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>

                        {/* Calendar Config */}
                        <form onSubmit={handleCalendarSave} className="space-y-6 pt-10 border-t border-white/5">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Pracovné dni a časy</h4>
                          
                          <div className="space-y-4">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Pracovné dni</label>
                            <div className="flex flex-wrap gap-2">
                              {['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'].map((day, index) => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const newDays = localCalendarConfig.workingDays.includes(index)
                                      ? localCalendarConfig.workingDays.filter(d => d !== index)
                                      : [...localCalendarConfig.workingDays, index].sort();
                                    setLocalCalendarConfig({...localCalendarConfig, workingDays: newDays});
                                  }}
                                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                    localCalendarConfig.workingDays.includes(index)
                                      ? 'bg-[#3A87AD] border-[#3A87AD] text-white shadow-lg'
                                      : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                                  }`}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Začiatok práce</label>
                              <input 
                                type="time" 
                                className="input-field" 
                                value={localCalendarConfig.startTime}
                                onChange={e => setLocalCalendarConfig({...localCalendarConfig, startTime: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Koniec práce</label>
                              <input 
                                type="time" 
                                className="input-field" 
                                value={localCalendarConfig.endTime}
                                onChange={e => setLocalCalendarConfig({...localCalendarConfig, endTime: e.target.value})}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-4">
                            <button 
                              type="submit" 
                              disabled={calendarSaveStatus === 'saving'}
                              className={`btn-primary min-w-[140px] justify-center ${calendarSaveStatus === 'success' ? 'bg-green-600 hover:bg-green-600' : ''}`}
                            >
                              {calendarSaveStatus === 'saving' ? (
                                <>
                                  <Loader2 className="animate-spin" size={18} />
                                  <span>Ukladám...</span>
                                </>
                              ) : calendarSaveStatus === 'success' ? (
                                <>
                                  <Check size={18} />
                                  <span>Uložené ✓</span>
                                </>
                              ) : (
                                <>
                                  <Save size={18} />
                                  <span>Uložiť kalendár</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Season Mode Section */}
          <section className="space-y-4 pt-4 border-t border-white/5">
            <button 
              onClick={() => toggleSection('seasons')}
              className="w-full flex items-center justify-between text-white/80 hover:text-white transition-colors group p-2 rounded-xl hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                {currentSeason === 'winter' ? <Snowflake size={20} className="text-[#3A87AD]" /> : <Sun size={20} className="text-[#3A87AD]" />}
                <h3 className="text-lg font-bold">Sezónny režim</h3>
              </div>
              <ChevronRight 
                size={20} 
                className={`text-white/20 group-hover:text-white/40 transition-transform duration-300 ${activeSection === 'seasons' ? 'rotate-90' : ''}`} 
              />
            </button>
            
            <AnimatePresence>
              {activeSection === 'seasons' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-1 pt-2">
                    {seasonLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-[#3A87AD]" size={24} />
                      </div>
                    ) : (
                      <form onSubmit={handleSeasonSave} className="space-y-6">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${currentSeason === 'winter' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                              {currentSeason === 'winter' ? <Snowflake size={20} /> : <Sun size={20} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">Aktuálny režim: {currentSeason === 'winter' ? 'ZIMA' : 'LETO'}</p>
                              <p className="text-xs text-white/40">{localSeasonConfig.manualOverride ? 'Manuálny override aktívny' : `Automaticky (podľa mesiaca: ${autoSeason === 'winter' ? 'Zima' : 'Leto'})`}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-white">Manuálny override</p>
                              <p className="text-xs text-white/40">Ignorovať automatické prepínanie podľa dátumu</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setLocalSeasonConfig({...localSeasonConfig, manualOverride: !localSeasonConfig.manualOverride})}
                              className={`w-12 h-6 rounded-full transition-colors relative ${localSeasonConfig.manualOverride ? 'bg-[#3A87AD]' : 'bg-white/10'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${localSeasonConfig.manualOverride ? 'left-7' : 'left-1'}`} />
                            </button>
                          </div>

                          {localSeasonConfig.manualOverride && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setLocalSeasonConfig({...localSeasonConfig, manualSeason: 'winter'})}
                                className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${localSeasonConfig.manualSeason === 'winter' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-white/40'}`}
                              >
                                <Snowflake size={24} />
                                <span className="text-xs font-bold">ZIMA</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setLocalSeasonConfig({...localSeasonConfig, manualSeason: 'summer'})}
                                className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${localSeasonConfig.manualSeason === 'summer' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-white/5 border-white/10 text-white/40'}`}
                              >
                                <Sun size={24} />
                                <span className="text-xs font-bold">LETO</span>
                              </button>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Začiatok zimy (mesiac)</label>
                              <select 
                                className="input-field"
                                value={localSeasonConfig.winterStartMonth}
                                onChange={e => setLocalSeasonConfig({...localSeasonConfig, winterStartMonth: parseInt(e.target.value)})}
                              >
                                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                  <option key={m} value={m}>{new Date(2000, m-1).toLocaleString('sk-SK', {month: 'long'})}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Začiatok leta (mesiac)</label>
                              <select 
                                className="input-field"
                                value={localSeasonConfig.summerStartMonth}
                                onChange={e => setLocalSeasonConfig({...localSeasonConfig, summerStartMonth: parseInt(e.target.value)})}
                              >
                                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                  <option key={m} value={m}>{new Date(2000, m-1).toLocaleString('sk-SK', {month: 'long'})}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end pt-4">
                          <button 
                            type="submit" 
                            disabled={seasonSaveStatus === 'saving'}
                            className={`btn-primary min-w-[140px] justify-center ${seasonSaveStatus === 'success' ? 'bg-green-600 hover:bg-green-600' : ''}`}
                          >
                            {seasonSaveStatus === 'saving' ? (
                              <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>Ukladám...</span>
                              </>
                            ) : seasonSaveStatus === 'success' ? (
                              <>
                                <Check size={18} />
                                <span>Uložené ✓</span>
                              </>
                            ) : (
                              <>
                                <Save size={18} />
                                <span>Uložiť</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Error Codes Section */}
          <section className="space-y-4 pt-4 border-t border-white/5">
            <button 
              onClick={() => toggleSection('errorcodes')}
              className="w-full flex items-center justify-between text-white/80 hover:text-white transition-colors group p-2 rounded-xl hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-[#3A87AD]" />
                <h3 className="text-lg font-bold">Správa chybových kódov</h3>
              </div>
              <ChevronRight 
                size={20} 
                className={`text-white/20 group-hover:text-white/40 transition-transform duration-300 ${activeSection === 'errorcodes' ? 'rotate-90' : ''}`} 
              />
            </button>
            
            <AnimatePresence>
              {activeSection === 'errorcodes' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-1 pt-2 space-y-8">
                    {/* Add New Error Code Form */}
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-6">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Pridať nový chybový kód</h4>
                      <form onSubmit={handleAddErrorCode} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Značka</label>
                            <div className="flex gap-2">
                              <select 
                                className="input-field flex-1"
                                value={newErrorCode.brand}
                                onChange={e => setNewErrorCode({...newErrorCode, brand: e.target.value})}
                                required
                              >
                                <option value="">Vyberte značku</option>
                                {brands.map(b => <option key={b} value={b}>{b}</option>)}
                              </select>
                              <button 
                                type="button"
                                onClick={() => setIsAddingBrand(true)}
                                className="p-3 bg-white/5 rounded-xl hover:bg-white/10 text-[#3A87AD]"
                              >
                                <Plus size={20} />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Kód</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              placeholder="napr. F28"
                              value={newErrorCode.code}
                              onChange={e => setNewErrorCode({...newErrorCode, code: e.target.value})}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Kategória</label>
                          <div className="flex p-1 bg-black/40 rounded-xl border border-white/10">
                            {(['DIY', 'Restart', 'Dangerous'] as const).map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setNewErrorCode({...newErrorCode, category: cat})}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newErrorCode.category === cat ? 'bg-[#3A87AD] text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                              >
                                {cat === 'DIY' ? 'Urob si sám' : cat === 'Restart' ? 'Reštart' : 'Nebezpečné'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Popis chyby</label>
                          <textarea 
                            className="input-field min-h-[80px]" 
                            placeholder="Stručný popis čo chyba znamená..."
                            value={newErrorCode.description}
                            onChange={e => setNewErrorCode({...newErrorCode, description: e.target.value})}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Inštrukcia pre zákazníka</label>
                          <textarea 
                            className="input-field min-h-[80px]" 
                            placeholder="Čo má zákazník urobiť..."
                            value={newErrorCode.instruction}
                            onChange={e => setNewErrorCode({...newErrorCode, instruction: e.target.value})}
                          />
                        </div>

                        <div className="flex justify-end">
                          <button 
                            type="submit" 
                            disabled={errorCodeSaveStatus === 'saving'}
                            className={`btn-primary min-w-[140px] justify-center ${errorCodeSaveStatus === 'success' ? 'bg-green-600 hover:bg-green-600' : ''}`}
                          >
                            {errorCodeSaveStatus === 'saving' ? (
                              <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>Pridávam...</span>
                              </>
                            ) : errorCodeSaveStatus === 'success' ? (
                              <>
                                <Check size={18} />
                                <span>Pridané ✓</span>
                              </>
                            ) : (
                              <>
                                <Plus size={18} />
                                <span>Pridať kód</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Brands Management Modal-like overlay */}
                    <AnimatePresence>
                      {isAddingBrand && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                          <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="card w-full max-w-md p-6 space-y-6"
                          >
                            <div className="flex justify-between items-center">
                              <h3 className="text-lg font-bold text-white">Pridať novú značku</h3>
                              <button onClick={() => setIsAddingBrand(false)} className="text-white/40 hover:text-white">
                                <X size={20} />
                              </button>
                            </div>
                            <div className="space-y-4">
                              <input 
                                type="text" 
                                className="input-field" 
                                placeholder="Názov značky..."
                                value={newBrandName}
                                onChange={e => setNewBrandName(e.target.value)}
                                autoFocus
                              />
                              <div className="flex gap-3">
                                <button onClick={() => setIsAddingBrand(false)} className="btn-secondary flex-1 justify-center">Zrušiť</button>
                                <button onClick={handleAddBrand} className="btn-primary flex-1 justify-center">Pridať</button>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Existing Error Codes List */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Zoznam kódov</h4>
                      {errorCodesLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="animate-spin text-[#3A87AD]" size={24} />
                        </div>
                      ) : errorCodes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {errorCodes.map(code => (
                            <div key={code.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] font-bold text-[#3A87AD] uppercase">{code.brand}</span>
                                  <h5 className="text-lg font-bold text-white">{code.code}</h5>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  code.category === 'DIY' ? 'bg-green-500/20 text-green-400' :
                                  code.category === 'Restart' ? 'bg-orange-500/20 text-orange-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {code.category === 'DIY' ? 'Urob si sám' : code.category === 'Restart' ? 'Reštart' : 'Nebezpečné'}
                                </span>
                              </div>
                              <p className="text-xs text-white/60 line-clamp-2">{code.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-8 text-white/20 italic">Zatiaľ žiadne chybové kódy.</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Notifications Section */}
          <section className="space-y-4 pt-4 border-t border-white/5">
            <button 
              onClick={() => toggleSection('notifications')}
              className="w-full flex items-center justify-between text-white/80 hover:text-white transition-colors group p-2 rounded-xl hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-[#3A87AD]" />
                <h3 className="text-lg font-bold">Upozornenia</h3>
              </div>
              <ChevronRight 
                size={20} 
                className={`text-white/20 group-hover:text-white/40 transition-transform duration-300 ${activeSection === 'notifications' ? 'rotate-90' : ''}`} 
              />
            </button>
            
            <AnimatePresence>
              {activeSection === 'notifications' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-1 pt-2 space-y-6">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#3A87AD]/20 rounded-xl">
                          <Bell className="text-[#3A87AD]" size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Push Upozornenia</h4>
                          <p className="text-xs text-white/40">Dostávajte upozornenia na nové objednávky priamo na iPhone.</p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => {
                          toast.info('Funkcia Web Push vyžaduje konfiguráciu Service Workera a VAPID kľúčov.');
                        }}
                        className="btn-primary w-full justify-center py-4 rounded-xl"
                      >
                        <Bell size={20} />
                        <span className="font-bold uppercase">Povoliť upozornenia</span>
                      </button>
                      
                      <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <p className="text-[10px] text-blue-400 leading-relaxed">
                          Poznámka: Pre fungovanie upozornení na iPhone musí byť aplikácia pridaná na plochu (Add to Home Screen) a iOS musí byť vo verzii 16.4 alebo novšej.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </div>
  );
};
