export enum ServiceStatus {
  COMPLETED = 'Dokončené',
  PENDING = 'Čakajúce',
  CANCELLED = 'Zrušené',
}

export interface ServiceRecord {
  id: string;
  boilerId: string;
  date: string;
  taskPerformed: string;
  co2Value: number;
  coValue?: number; // CO value in ppm
  pressureValue: number;
  status: ServiceStatus;
  technicianNotes?: string;
  signature?: string; // Base64 or URL
  photo?: string; // Base64 or URL

  // Detailed "Ročný servis" fields
  co2Max?: number;
  co2Min?: number;
  o2Max?: number;
  o2Min?: number;
  efficiency?: number;
  gasPressure?: number;
  expansionTankPressureCH?: number;
  hasDHWExpansionTank?: boolean;
  expansionTankPressureDHW?: number;
  conductivity?: number;
  phCH?: number;
  hardnessCH?: number;
  burnerCheck?: boolean;
  combustionChamberCleaning?: boolean;
  electrodesCheck?: boolean;
  exchangerCheck?: boolean;
  fanCheck?: boolean;
  filtersCleaning?: boolean;
  siphonCleaning?: boolean;
  gasCircuitTightness?: boolean;
  flueGasOutletTightness?: boolean;
  pumpCheck?: boolean;
  threeWayValveCheck?: boolean;
  airSupplyVentilation?: boolean;
  emergencyStatesCheck?: boolean;
  bondingProtection?: boolean;

  // New dynamic fields
  faultDescription?: string;
  faultFixed?: boolean;
  hasFlueGasAnalysis?: boolean;
  photoBefore?: string;
  photoAfter?: string;
  photoBoiler?: string;
  photoConnection?: string;
  photoChimney?: string;
  spareParts?: { name: string; quantity: number }[];
}

export interface Boiler {
  id: string;
  customerId: string;
  name: string; // e.g. "Hlavný kotol"
  address: string;
  lat?: number;
  lng?: number;
  brand: string;
  model: string;
  serialNumber: string;
  installDate: string;
  notes?: string;
  photos?: {
    overall?: string;
    connection?: string;
    chimney?: string;
  };
  lastServiceDate?: string;
  nextServiceDate?: string;
}

export interface Customer {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt?: string;
}

export interface Contact {
  id: string;
  name: string;
  specialization: string; // e.g. "Servisný technik", "Predajňa", "Inštalatér"
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
}

export interface AppState {
  customers: Customer[];
  boilers: Boiler[];
  services: ServiceRecord[];
  contacts: Contact[];
}
