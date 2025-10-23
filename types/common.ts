export interface Compresor {
  id_compresor: number;
  id_cliente: number;
  linea: string;
  alias: string;
  tipo: string;
  numero_serie: string;
  nombre_cliente?: string;
  numero_cliente?: number;
}

export interface Engineer {
  id: string;
  name: string;
  email: string;
  compressors: string[];
  emailPreferences: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  };
}

export interface UserData {
  id_cliente?: number;
  numero_cliente: number;
  rol: number;
  compresores: { linea: string; proyecto: number; Alias: string }[];
  email: string;
  name: string;
  timestamp: number;
}

export interface Engineer {
  id: string;
  name: string;
  email: string;
  compressors: string[];
  emailPreferences: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  };
}
export interface CompresorWithDate extends Compresor {
  date?: string;
}

export interface ClientData {
  nombre_cliente?: string;
  rol?: number;
}

export interface UserData {
  id_cliente?: number;
  numero_cliente: number;
  rol: number;
  compresores: { linea: string; proyecto: number; Alias: string }[];
  email: string;
  name: string;
  timestamp: number;
}
