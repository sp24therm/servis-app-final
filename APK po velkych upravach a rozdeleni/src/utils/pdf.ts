import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ServiceRecord, Boiler, Customer } from '../types';

export const generateServicePDF = async (service: ServiceRecord, boiler: Boiler, customer: Customer) => {
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

  const logoUrl = '/image_4.png';
  const placeholderLogo = 'https://picsum.photos/seed/logo/200/200';

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

  element.innerHTML = `
    <div style="display: flex; justify-between; align-items: start; border-bottom: 2px solid #3A87AD; padding-bottom: 20px; margin-bottom: 25px;">
      <div style="display: flex; align-items: center; gap: 15px;">
        <img src="${logoUrl}" onerror="this.src='${placeholderLogo}'" style="height: 60px; width: auto;" />
        <div style="font-size: 24px; font-weight: bold; color: #3A87AD;">SP Therm s.r.o.</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 18px; font-weight: bold; color: #3A87AD;">SERVISNÝ PROTOKOL</div>
        <div style="font-size: 12px; color: #64748b;">Číslo záznamu: ${service.id.slice(0, 8).toUpperCase()}</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 25px;">
      <div>
        <div style="font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px;">Zákazník</div>
        <div style="font-size: 14px; font-weight: bold;">${customer.name}</div>
        ${customer.company ? `<div style="font-size: 12px; color: #475569;">${customer.company}</div>` : ''}
        <div style="font-size: 12px; color: #475569;">${customer.phone}</div>
        ${customer.email ? `<div style="font-size: 12px; color: #475569;">${customer.email}</div>` : ''}
      </div>
      <div>
        <div style="font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px;">Zariadenie</div>
        <div style="font-size: 14px; font-weight: bold;">${boiler.brand} ${boiler.model}</div>
        <div style="font-size: 12px; color: #475569;">S/N: ${boiler.serialNumber}</div>
        <div style="font-size: 12px; color: #475569;">Adresa: ${boiler.address}</div>
      </div>
    </div>

    <div style="background-color: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 25px;">
      <div style="display: flex; justify-content: space-between;">
        <div>
          <div style="font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">Dátum servisu</div>
          <div style="font-size: 14px; font-weight: bold;">${new Date(service.date).toLocaleDateString('sk-SK')}</div>
        </div>
        <div>
          <div style="font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">Typ zásahu</div>
          <div style="font-size: 14px; font-weight: bold;">${service.taskPerformed}</div>
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
      <div>
        <div style="font-size: 13px; font-weight: bold; color: #3A87AD; margin-bottom: 10px; border-left: 3px solid #3A87AD; padding-left: 8px;">Namerané hodnoty</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Parameter</th>
              <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">Hodnota</th>
            </tr>
          </thead>
          <tbody>
            ${service.taskPerformed === 'Ročná prehliadka' ? `
              <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">CO2 Max / Min</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${service.co2Max || '-'} / ${service.co2Min || '-'} %</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">CO</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${service.coValue || '-'} ppm</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">O2 Max / Min</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${service.o2Max || '-'} / ${service.o2Min || '-'} %</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">Účinnosť</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${service.efficiency || '-'} %</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">Tlak plynu</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${service.gasPressure || '-'} mbar</td></tr>
            ` : `
              <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">CO2</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${service.co2Value || '-'} %</td></tr>
              <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">Tlak systému</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${service.pressureValue || '-'} bar</td></tr>
            `}
            <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">Konduktivita</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${service.conductivity || '-'} mS/cm</td></tr>
            <tr><td style="border: 1px solid #e2e8f0; padding: 6px;">PH / Tvrdosť ÚK</td><td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${service.phCH || '-'} / ${service.hardnessCH || '-'} °dH</td></tr>
          </tbody>
        </table>
      </div>

      <div>
        <div style="font-size: 13px; font-weight: bold; color: #3A87AD; margin-bottom: 10px; border-left: 3px solid #3A87AD; padding-left: 8px;">Prehľad vykonaných úkonov</div>
        <div style="display: grid; grid-template-columns: 1fr; gap: 2px; font-size: 10px;">
          ${checklistItems.map(item => `
            <div style="display: flex; align-items: center; gap: 5px; padding: 2px 0; border-bottom: 1px solid #f1f5f9;">
              <div style="width: 10px; height: 10px; border: 1px solid #3A87AD; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #3A87AD; font-weight: bold;">
                ${(service as any)[item.key] ? '✓' : ''}
              </div>
              <div style="color: ${(service as any)[item.key] ? '#1e293b' : '#94a3b8'}">${item.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    ${service.technicianNotes ? `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: bold; color: #3A87AD; margin-bottom: 8px;">Poznámky technika</div>
        <div style="font-size: 11px; color: #475569; background-color: #fffbeb; padding: 10px; border: 1px solid #fef3c7; border-radius: 6px;">
          ${service.technicianNotes}
        </div>
      </div>
    ` : ''}

    <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
      <div style="text-align: center;">
        <div style="border-bottom: 1px solid #cbd5e1; height: 50px; display: flex; align-items: center; justify-content: center;">
          ${service.signature ? `<img src="${service.signature}" style="max-height: 50px; max-width: 150px;" />` : ''}
        </div>
        <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Podpis zákazníka</div>
      </div>
      <div style="text-align: center;">
        <div style="border-bottom: 1px solid #cbd5e1; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #94a3b8;">
          [ Pečiatka ]
        </div>
        <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Pečiatka</div>
      </div>
      <div style="text-align: center;">
        <div style="border-bottom: 1px solid #cbd5e1; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #1e293b; font-weight: bold;">
          SP Therm s.r.o.
        </div>
        <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Servisný technik</div>
      </div>
    </div>
  `;

  document.body.appendChild(element);
  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
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
