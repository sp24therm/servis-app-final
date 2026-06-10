import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ServiceRecord, Boiler, Customer } from '../types';
import { LOGO_URL } from '../config/constants';

const toBase64 = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
  });
};

export const generateServicePDF = async (
  service: ServiceRecord,
  boiler: Boiler,
  customer: Customer,
  companyInfo?: {
    name?: string; street?: string; city?: string; zip?: string;
    phone?: string; email?: string; ico?: string;
    analyzerModel?: string; analyzerSerial?: string;
    gasDetectorModel?: string;
  },
  technicianName?: string,
  stampUrl?: string
) => {
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatAddress = (address: string): string => {
    if (!address) return '-';
    const parts = address.split(',').map(p => p.trim());
    // Nájdi PSČ — je to časť ktorá obsahuje len čísla a medzery (formát: 900 46)
    const pscIndex = parts.findIndex(p => /^\d{3}\s?\d{2}$/.test(p));
    if (pscIndex !== -1) {
      // Zobraz: č.d., ulica, mesto, PSČ
      // Mesto je časť pred PSČ ktorá nie je okres (neobsahuje "okres" ani "kraj")
      const filtered = parts.filter(p => 
        !/okres|kraj/i.test(p)
      );
      return filtered.slice(0, 4).join(', ');
    }
    // Fallback: prvé 4 časti bez okresu a kraja
    return parts
      .filter(p => !/okres|kraj/i.test(p))
      .slice(0, 4)
      .join(', ');
  };

  // For mobile/iPhone compatibility, we open a new window immediately to avoid popup blockers
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write('<html><head><title>Generujem PDF...</title><style>body{display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#64748b;background:#f8fafc;}</style></head><body><div><p>Generujem váš servisný protokol, prosím čakajte...</p></div></body></html>');
  }

  const element = document.createElement('div');
  element.style.padding = '40px';
  element.style.width = '800px';
  element.style.backgroundColor = 'white';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.color = '#1e293b';
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.top = '0';

  const logoBase64 = await toBase64(LOGO_URL);
  const stampBase64 = (stampUrl && stampUrl.length > 0) 
    ? await toBase64(stampUrl) 
    : '';


  const checklistItems = [
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
    { key: 'bondingProtection', label: 'Ochranné pospojovanie' },
  ];

  // SEKCIA 1 — Hlavička (header)
  const headerHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; margin-bottom: 14px; border-bottom: 3.5px solid #1e3a5f;">
      <div style="display: flex; align-items: center; gap: 14px;">
        ${logoBase64 ? `<img src="${logoBase64}" style="height: 72px; width: auto;" />` : ''}
        <div>
          <div style="font-size: 18px; font-weight: bold; color: #1e3a5f; line-height: 1.2;">${companyInfo?.name || 'SP Therm s.r.o.'}</div>
          <div style="font-size: 10px; color: #475569; margin-top: 4px; line-height: 1.4;">
            ${[companyInfo?.street, companyInfo?.city, companyInfo?.zip].filter(Boolean).join(', ')}<br/>
            ${[companyInfo?.phone ? `Tel: ${companyInfo.phone}` : '', companyInfo?.email ? `Email: ${companyInfo.email}` : '', companyInfo?.ico ? `IČO: ${companyInfo.ico}` : ''].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 18px; font-weight: bold; color: #1e3a5f; letter-spacing: -0.5px; line-height: 1.1;">SPRÁVA O ODBORNEJ PREHLIADKE</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 6px; font-weight: bold;">
          č. ${service.id.slice(0, 8).toUpperCase()} · ${formatDate(service.date)}
        </div>
      </div>
    </div>
  `;

  // SEKCIA 2 — Identifikácia
  const customerDeviceInfoHtml = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 14px; background-color: #f8fafc; padding: 14px 18px; border-radius: 8px; border: 1px solid #e2e8f0;">
      <div>
        <div style="font-size: 10px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 3px;">Prevádzkovateľ</div>
        <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">${customer.name}</div>
        ${customer.company ? `<div style="font-size: 12px; color: #475569; font-weight: 500; margin-bottom: 2px;">Firma: ${customer.company}</div>` : ''}
        <div style="font-size: 12px; color: #475569;">${formatAddress(boiler.address)}</div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 2px;">Tel: ${customer.phone}</div>
        ${customer.email ? `<div style="font-size: 12px; color: #475569;">Email: ${customer.email}</div>` : ''}
      </div>
      <div>
        <div style="font-size: 10px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 3px;">Zariadenie</div>
        <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">${boiler.brand} ${boiler.model}</div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 2px;">Sériové číslo: ${boiler.serialNumber || 'N/A'}</div>
        ${boiler.power ? `<div style="font-size: 12px; color: #475569; margin-bottom: 2px;">Výkon: ${boiler.power} kW</div>` : ''}
        ${boiler.installDate ? `<div style="font-size: 12px; color: #475569; margin-bottom: 2px;">Uvedenie do prevádzky: ${formatDate(boiler.installDate)}</div>` : ''}
      </div>
    </div>
  `;

  // SEKCIA — Dátum a typ (Kompaktnejšia verzia)
  const interventionDetailsHtml = `
    <div style="display: flex; gap: 12px; margin-bottom: 14px;">
      <div style="flex: 1; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 14px;">
        <div style="font-size: 9px; font-weight: bold; color: #0369a1; text-transform: uppercase; margin-bottom: 3px;">Dátum zásahu</div>
        <div style="font-size: 14px; font-weight: bold; color: #1e293b;">${formatDate(service.date)}</div>
      </div>
      <div style="flex: 1; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 14px;">
        <div style="font-size: 9px; font-weight: bold; color: #0369a1; text-transform: uppercase; margin-bottom: 3px;">Typ zásahu</div>
        <div style="font-size: 14px; font-weight: bold; color: #1e293b;">${service.taskPerformed}</div>
      </div>
      <div style="flex: 1; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 14px;">
        <div style="font-size: 9px; font-weight: bold; color: #0369a1; text-transform: uppercase; margin-bottom: 3px;">Technik</div>
        <div style="font-size: 14px; font-weight: bold; color: #1e293b;">${technicianName || 'SP Therm'}</div>
      </div>
    </div>
  `;

  // SEKCIA 3 — Merací prístroj
  const analyzerInfoHtml = `
    <div style="background: #f1f5f9; border-radius: 6px; padding: 8px 14px; 
                margin-bottom: 14px; font-size: 10px; color: #475569; 
                display: flex; gap: 24px; flex-wrap: wrap;">
      <span><strong>Analyzátor spalín:</strong> ${companyInfo?.analyzerModel || '_______________'}</span>
      <span><strong>Sér. č. / Kalibrácia:</strong> ${companyInfo?.analyzerSerial || '_______________'}</span>
      ${companyInfo?.gasDetectorModel ? `<span><strong>Detektor plynu:</strong> ${companyInfo.gasDetectorModel}</span>` : ''}
    </div>
  `;

  // SEKCIA 4 — Obsah prehliadky
  let middleContentHtml = '';

  if (service.taskPerformed === 'Ročná prehliadka' || service.taskPerformed === 'Inštalácia') {
    middleContentHtml = `
      ${service.taskPerformed === 'Inštalácia' ? `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 11px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; margin-bottom: 10px; border-left: 3px solid #1e3a5f; padding-left: 8px;">Uvedenie do prevádzky</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background-color: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 11px; line-height: 1.6;">
            <div>
              <div style="margin-bottom: 4px;"><strong>Dátum inštalácie:</strong> ${boiler.installDate ? formatDate(boiler.installDate) : formatDate(service.date)}</div>
              <div style="margin-bottom: 4px;"><strong>Zariadenie:</strong> ${boiler.brand} ${boiler.model}</div>
              <div style="margin-bottom: 4px;"><strong>Výkon:</strong> ${boiler.power ? boiler.power + ' kW' : '- kW'}</div>
              <div style="margin-bottom: 4px;"><strong>Sériové číslo:</strong> ${boiler.serialNumber || 'N/A'}</div>
              <div style="margin-bottom: 4px;"><strong>Objem expanznej nádoby ÚK/TÚV:</strong> ÚK: ________ l / TÚV: ${service.hasDHWExpansionTank ? '________ l' : 'Nie'}</div>
            </div>
            <div>
              <div style="margin-bottom: 4px;"><strong>Nastavený tlak exp. nádoby ÚK:</strong> ${service.expansionTankPressureCH || '-'} bar</div>
              <div style="margin-bottom: 4px;"><strong>Nastavený tlak exp. nádoby TÚV:</strong> ${service.hasDHWExpansionTank ? (service.expansionTankPressureDHW || '-') + ' bar' : 'Nie'}</div>
              <div style="margin-bottom: 4px;"><strong>Tlak systému po naplnení:</strong> ${service.pressureValue || '-'} bar</div>
              <div style="margin-bottom: 4px;"><strong>Odovzdanie dokladov:</strong></div>
              <div style="display: flex; gap: 8px; margin-bottom: 4px; font-size: 10px; color: #334155;">
                <div style="display: flex; align-items: center; gap: 3px;">
                  <span style="font-weight: bold; color: #1e3a5f;">✓</span> Návod k obsluhe
                </div>
                <div style="display: flex; align-items: center; gap: 3px;">
                  <span style="font-weight: bold; color: #1e3a5f;">✓</span> Záručný list
                </div>
                <div style="display: flex; align-items: center; gap: 3px;">
                  <span style="font-weight: bold; color: #1e3a5f;">✓</span> Protokol o tlakovaní
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 4px; font-size: 10px; margin-top: 4px;">
                <strong>Poučenie zákazníka o obsluhe:</strong>
                <div style="display: flex; align-items: center; gap: 2px; font-weight: bold; color: #1e3a5f;">
                  ✓ Áno
                </div>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <div style="display: grid; grid-template-columns: 1.14fr 0.86fr; gap: 24px; margin-bottom: 20px;">
        <div>
          <div style="font-size: 11px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; margin-bottom: 10px; border-left: 3px solid #1e3a5f; padding-left: 8px;">Namerané hodnoty</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                <th style="border: 1px solid #e2e8f0; padding: 5px 8px; text-align: left; color: #334155;">Parameter</th>
                <th style="border: 1px solid #e2e8f0; padding: 5px 8px; text-align: center; width: 110px; color: #334155;">Hodnota</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="border: 1px solid #e2e8f0; padding: 5px 8px;">CO2 Max / Min</td><td style="border: 1px solid #e2e8f0; padding: 5px 8px; text-align: center; font-weight: bold; color: #0f172a;">${service.co2Max || '-'} / ${service.co2Min || '-'} %</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 5px 8px;">CO</td><td style="border: 1px solid #e2e8f0; padding: 5px 8px; text-align: center; font-weight: bold; color: #0f172a;">${service.coValue || '-'} ppm</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 5px 8px;">O2 Max / Min</td><td style="border: 1px solid #e2e8f0; padding: 5px 8px; text-align: center; font-weight: bold; color: #0f172a;">${service.o2Max || '-'} / ${service.o2Min || '-'} %</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 5px 8px;">Účinnosť</td><td style="border: 1px solid #e2e8f0; padding: 5px 8px; text-align: center; font-weight: bold; color: #0f172a;">${service.efficiency || '-'} %</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 5px 8px;">Tlak plynu</td><td style="border: 1px solid #e2e8f0; padding: 5px 8px; text-align: center; font-weight: bold; color: #0f172a;">${service.gasPressure || '-'} mbar</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 5px 8px;">Tlak exp. ÚK</td><td style="border: 1px solid #e2e8f0; padding: 5px 8px; text-align: center; font-weight: bold; color: #0f172a;">${service.expansionTankPressureCH || '-'} bar</td></tr>
              ${service.hasDHWExpansionTank ? `<tr><td style="border: 1px solid #e2e8f0; padding: 5px 8px;">Tlak exp. TÚV</td><td style="border: 1px solid #e2e8f0; padding: 5px 8px; text-align: center; font-weight: bold; color: #0f172a;">${service.expansionTankPressureDHW || '-'} bar</td></tr>` : ''}
              <tr><td style="border: 1px solid #e2e8f0; padding: 5px 8px;">Konduktivita</td><td style="border: 1px solid #e2e8f0; padding: 5px 8px; text-align: center; font-weight: bold; color: #0f172a;">${service.conductivity || '-'} mS/cm</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 5px 8px;">PH / Tvrdosť ÚK</td><td style="border: 1px solid #e2e8f0; padding: 5px 8px; text-align: center; font-weight: bold; color: #0f172a;">${service.phCH || '-'} / ${service.hardnessCH || '-'} °dH</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; margin-bottom: 10px; border-left: 3px solid #1e3a5f; padding-left: 8px;">Vykonané úkony</div>
          <div style="display: grid; grid-template-columns: 1fr; gap: 3.5px; font-size: 10px; background-color: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
            ${checklistItems
              .filter(item => (service as any)[item.key] === true)
              .map(item => `
                <div style="
                  display: flex;
                  align-items: baseline;
                  gap: 6px;
                  padding: 3px 0;
                  border-bottom: 1px solid #f1f5f9;
                ">
                  <span style="
                    font-size: 11px;
                    font-weight: bold;
                    color: #3A87AD;
                    line-height: 1.4;
                    flex-shrink: 0;
                  ">✓</span>
                  <span style="
                    font-size: 10px;
                    color: #0f172a;
                    font-weight: 600;
                    line-height: 1.4;
                    word-break: break-word;
                    white-space: normal;
                    flex: 1;
                    min-width: 0;
                  ">${item.label}</span>
                </div>
              `).join('')}
          </div>
        </div>
      </div>
    `;
  } else if (service.taskPerformed === 'Porucha') {
    middleContentHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px;">
        <div>
          <div style="font-size: 11px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; margin-bottom: 10px; border-left: 3px solid #1e3a5f; padding-left: 8px;">Popis poruchy</div>
          <div style="font-size: 11px; color: #475569; background-color: #fef2f2; padding: 12px; border: 1px solid #fee2e2; border-radius: 6px; min-height: 90px; line-height: 1.5;">
            ${service.faultDescription || 'Popis poruchy nie je špecifikovaný.'}
            <div style="font-size: 11px; color: #dc2626; margin-top: 10px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
              Stav závady: ${service.faultFixed ? '<span style="color:#16a34a; background-color:#f0fdf4; padding: 3px 8px; border-radius: 4px; border: 1px solid #bbf7d0; font-weight: bold;">Odstránená ✓</span>' : '<span style="color:#dc2626; background-color:#fef2f2; padding: 3px 8px; border-radius: 4px; border: 1px solid #fecaca; font-weight: bold;">Pretrváva ✗</span>'}
            </div>
          </div>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; margin-bottom: 10px; border-left: 3px solid #1e3a5f; padding-left: 8px;">Namerané hodnoty</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left; color: #334155;">Parameter</th>
                <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; width: 120px; color: #334155;">Hodnota</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">CO2 Hodnota</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-weight: bold; color: #0f172a;">${service.co2Value || '-'} %</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">CO</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-weight: bold; color: #0f172a;">${service.coValue || '-'} ppm</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">Tlak systému</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-weight: bold; color: #0f172a;">${service.pressureValue || '-'} bar</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; margin-bottom: 10px; border-left: 3px solid #1e3a5f; padding-left: 8px;">Popis opravy / Poznámka technika</div>
        <div style="font-size: 11px; color: #475569; background-color: #fffbeb; padding: 12px; border: 1px solid #fef3c7; border-radius: 6px; min-height: 70px; line-height: 1.5;">
          ${service.technicianNotes || 'Popis vykonanej opravy nie je špecifikovaný.'}
        </div>
      </div>
    `;
  } else {
    middleContentHtml = `
      <div style="display: grid; grid-template-columns: 1.14fr 0.86fr; gap: 24px; margin-bottom: 20px;">
        <div>
          <div style="font-size: 11px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; margin-bottom: 10px; border-left: 3px solid #1e3a5f; padding-left: 8px;">Namerané hodnoty</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left; color: #334155;">Parameter</th>
                <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; width: 120px; color: #334155;">Hodnota</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">CO2</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-weight: bold; color: #0f172a;">${service.co2Value || '-'} %</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">CO</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-weight: bold; color: #0f172a;">${service.coValue || '-'} ppm</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; margin-bottom: 10px; border-left: 3px solid #1e3a5f; padding-left: 8px;">Základné overenie</div>
          <div style="display: grid; grid-template-columns: 1fr; gap: 3.5px; font-size: 10px; background-color: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
            ${checklistItems.slice(0, 8)
              .filter(item => (service as any)[item.key] === true)
              .map(item => `
                <div style="
                  display: flex;
                  align-items: baseline;
                  gap: 6px;
                  padding: 3px 0;
                  border-bottom: 1px solid #f1f5f9;
                ">
                  <span style="
                    font-size: 11px;
                    font-weight: bold;
                    color: #3A87AD;
                    line-height: 1.4;
                    flex-shrink: 0;
                  ">✓</span>
                  <span style="
                    font-size: 10px;
                    color: #0f172a;
                    font-weight: 600;
                    line-height: 1.4;
                    word-break: break-word;
                    white-space: normal;
                    flex: 1;
                    min-width: 0;
                  ">${item.label}</span>
                </div>
              `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // SEKCIA 5 — Použité náhradné diely
  const sparePartsHtml = (service.spareParts && service.spareParts.length > 0) ? `
    <div style="margin-bottom: 14px;">
      <div style="font-size: 11px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; margin-bottom: 10px; border-left: 3px solid #1e3a5f; padding-left: 8px;">Použité náhradné diely</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; color: #334155;">Názov dielu / súčiastky</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center; width: 120px; color: #334155;">Množstvo</th>
          </tr>
        </thead>
        <tbody>
          ${service.spareParts.map(p => `
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: 500;">${p.name}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center; font-weight: bold; color: #1e3a5f;">${p.quantity} ks</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  // SEKCIA 6 — Zhodnotenie
  const isCapable = service.operationalStatus !== 'incapable';
  const hodnotenie = isCapable 
    ? 'ZARIADENIE JE SCHOPNÉ PREVÁDZKY' 
    : 'ZARIADENIE NIE JE SCHOPNÉ PREVÁDZKY';
  const hodnotenieFarba = isCapable ? '#f0fdf4' : '#fef2f2';
  const hodnotenieBorder = isCapable ? '#22c55e' : '#ef4444';
  const hodnotenieFarbaText = isCapable ? '#16a34a' : '#dc2626';

  const evaluationHtml = `
    <div style="border: 2px solid ${hodnotenieBorder}; border-radius: 8px; 
                padding: 12px 16px; background: ${hodnotenieFarba}; margin-bottom: 14px;">
      <div style="font-size: 9px; font-weight: bold; color: #64748b; 
                  text-transform: uppercase; margin-bottom: 4px;">
        Záver odbornej prehliadky
      </div>
      <div style="font-size: 15px; font-weight: bold; color: ${hodnotenieFarbaText};">
        ${hodnotenie}
      </div>
    </div>
  ${service.technicianNotes ? `
    <div style="
      font-size: 10px; 
      color: #475569; 
      margin-bottom: 14px;
      padding-left: 4px;
      line-height: 1.4;
    ">
      <span style="font-weight: bold; color: #1e3a5f;">Poznámka: </span>${service.technicianNotes}
    </div>
  ` : ''}
  `;

  // SEKCIA 7 — Podpisy
  const signaturesHtml = `
    <div style="font-size: 10px; color: #64748b; margin-top: 20px; margin-bottom: 12px; 
                line-height: 1.4; font-style: italic; border-top: 1px solid #e2e8f0; 
                padding-top: 10px;">
      Podpisom potvrdzujem prevzatie servisného protokolu a oboznámenie sa 
      s informáciou o spracovaní osobných údajov.
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; 
                align-items: start; margin-top: 8px;">
      
      <!-- Zákazník -->
      <div style="text-align: center;">
        <div style="border-bottom: 1px solid #cbd5e1; height: 70px; 
                    display: flex; align-items: center; justify-content: center; 
                    margin-bottom: 4px;">
          ${service.signature 
            ? `<img src="${service.signature}" style="max-height: 65px; max-width: 180px;" />`
            : ''}
        </div>
        <div style="display: flex; justify-content: space-between; 
                    font-size: 8.5px; color: #64748b; padding: 0 2px;">
          <span>Prevádzkovateľ / Zákazník</span>
          <span style="font-weight: bold; color: #1e293b;">${customer.name}</span>
        </div>
      </div>

      <!-- Pečiatka a podpis technika -->
      <div style="text-align: center;">
        <div style="border-bottom: 1px solid #cbd5e1; height: 70px;
                    display: flex; align-items: center; justify-content: center;
                    margin-bottom: 4px;">
          ${stampBase64
            ? `<img src="${stampBase64}" 
                   style="max-height: 65px; max-width: 200px; object-fit: contain;" />`
            : ''}
        </div>
        <div style="display: flex; justify-content: space-between; 
                    font-size: 8.5px; color: #64748b; padding: 0 2px;">
          <span>Servisný technik</span>
          <span style="font-weight: bold; color: #1e293b;">
            ${technicianName || companyInfo?.name || 'SP Therm s.r.o.'}
          </span>
        </div>
      </div>
    </div>
  `;

  // SEKCIA 8 — Pätica
  const footerHtml = `
    <div style="text-align: center; font-size: 8.5px; color: #94a3b8; 
                border-top: 1px solid #e2e8f0; margin-top: 12px; 
                padding-top: 8px; font-weight: 500;">
      Správa vyhotovená v súlade s § 16 ods. 2 vyhl. č. 508/2009 Z. z. · Platnosť: 12 mesiacov od dátumu vystavenia · ${companyInfo?.name || 'SP Therm s.r.o.'}
    </div>
  `;

  // Spojenie všetkých častí
  element.innerHTML = `
    ${headerHtml}
    ${customerDeviceInfoHtml}
    ${interventionDetailsHtml}
    ${analyzerInfoHtml}
    ${middleContentHtml}
    ${sparePartsHtml}
    ${evaluationHtml}
    ${signaturesHtml}
    ${footerHtml}
  `;

  document.body.appendChild(element);
  const canvas = await html2canvas(element, { 
    scale: 2, 
    useCORS: true,
    allowTaint: true,
    imageTimeout: 15000
  });
  const imgData = canvas.toDataURL('image/png');
  document.body.removeChild(element);

  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

  const blob = pdf.output('blob');
  const blobURL = URL.createObjectURL(blob);

  if (newWindow) {
    newWindow.location.href = blobURL;
  } else {
    window.location.href = blobURL;
  }
};
