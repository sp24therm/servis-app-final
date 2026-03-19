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

  const logoUrl = '/logo.png';
  const placeholderLogo = 'https://picsum.photos/seed/logo/200/200';

  element.innerHTML = `
    <div style="display: flex; justify-between; align-items: start; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
      <div style="display: flex; align-items: center; gap: 15px;">
        <img src="${logoUrl}" onerror="this.src='${placeholderLogo}'" style="height: 60px; width: auto;" />
        <div style="font-size: 24px; font-weight: bold; color: #1e3a8a;">Servis Plyn</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 18px; font-weight: bold; color: #2563eb;">SERVISNÝ PROTOKOL</div>
        <div style="font-size: 12px; color: #64748b;">Číslo záznamu: ${service.id.slice(0, 8).toUpperCase()}</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
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

    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
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

    <div style="margin-bottom: 30px;">
      <div style="font-size: 14px; font-weight: bold; color: #1e3a8a; margin-bottom: 15px; border-left: 4px solid #2563eb; padding-left: 10px;">Namerané hodnoty</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Parameter</th>
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">Hodnota</th>
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Jednotka</th>
          </tr>
        </thead>
        <tbody>
          ${service.taskPerformed === 'Ročná prehliadka' ? `
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">CO2 Max</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: bold;">${service.co2Max || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">%</td>
            </tr>
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">CO2 Min</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: bold;">${service.co2Min || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">%</td>
            </tr>
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">CO</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: bold;">${service.coValue || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">ppm</td>
            </tr>
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">O2 Max</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: bold;">${service.o2Max || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">%</td>
            </tr>
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">O2 Min</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: bold;">${service.o2Min || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">%</td>
            </tr>
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">Účinnosť</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: bold;">${service.efficiency || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">%</td>
            </tr>
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">Tlak plynu</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: bold;">${service.gasPressure || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">mbar</td>
            </tr>
          ` : `
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">CO2</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: bold;">${service.co2Value || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">%</td>
            </tr>
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">Tlak systému</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: bold;">${service.pressureValue || '-'}</td>
              <td style="border: 1px solid #e2e8f0; padding: 10px;">bar</td>
            </tr>
          `}
        </tbody>
      </table>
    </div>

    <div style="margin-bottom: 30px;">
      <div style="font-size: 14px; font-weight: bold; color: #1e3a8a; margin-bottom: 15px; border-left: 4px solid #2563eb; padding-left: 10px;">Chemické hodnoty ÚK</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Parameter</th>
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">Hodnota</th>
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Jednotka</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #e2e8f0; padding: 10px;">Konduktivita</td>
            <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: bold;">${service.conductivity || '-'}</td>
            <td style="border: 1px solid #e2e8f0; padding: 10px;">mS/cm</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e2e8f0; padding: 10px;">PH ÚK</td>
            <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: bold;">${service.phCH || '-'}</td>
            <td style="border: 1px solid #e2e8f0; padding: 10px;">-</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e2e8f0; padding: 10px;">Tvrdosť ÚK</td>
            <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: bold;">${service.hardnessCH || '-'}</td>
            <td style="border: 1px solid #e2e8f0; padding: 10px;">°dH</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${service.technicianNotes ? `
      <div style="margin-bottom: 30px;">
        <div style="font-size: 14px; font-weight: bold; color: #1e3a8a; margin-bottom: 10px;">Poznámky technika</div>
        <div style="font-size: 12px; color: #475569; background-color: #fffbeb; padding: 15px; border: 1px solid #fef3c7; border-radius: 8px;">
          ${service.technicianNotes}
        </div>
      </div>
    ` : ''}

    <div style="margin-top: 50px; display: flex; justify-content: space-between;">
      <div style="text-align: center; width: 200px;">
        <div style="border-bottom: 1px solid #cbd5e1; height: 60px;">
          ${service.signature ? `<img src="${service.signature}" style="max-height: 60px; max-width: 180px;" />` : ''}
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 5px;">Podpis zákazníka</div>
      </div>
      <div style="text-align: center; width: 200px;">
        <div style="border-bottom: 1px solid #cbd5e1; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #94a3b8;">
          Pečiatka a podpis
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 5px;">Servisný technik</div>
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
