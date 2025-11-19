export type clientData = {
    numero_cliente: number;
    nombre_cliente: string;
    RFC: string;
    direccion: string;
    costoUSD: number;
    demoDiario: boolean;
    demoSemanal: boolean;
  };

export type compressorData = {
    hp: number;
    tipo: string;
    voltaje: number;
    marca: string;
    numero_serie: number;
    alias: string;
    limite: number;
    date: string;
  };

export interface Engineer {
  id: string;
  name: string;
  email: string;
  numero_cliente: number;
  rol?: number; // 0 = SuperAdmin, 1 = Gerente VT, 2 = VAST, 3 = Gerente Cliente, 4 = Cliente
  compressors: Array<{ id: string; alias: string }> | string[];
  emailPreferences: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  };
}


export interface Compressor {
  id: string;
  id_cliente: number;
  linea: string;
  alias: string;
  tipo: string;
  numero_serie: string;
  numero_cliente: number;
  nombre_cliente?: string;
}

export interface UserData {
  id_cliente?: number;
  numero_cliente: number;
  rol: number;
  compresores: { linea: string; proyecto: number; Alias: string, numero_cliente: string }[];
  email: string;
  name: string;
  timestamp: number;
}

export interface UserResponse {
  id: number;
  numeroCliente: number;
  rol: number;
  compresores: Compressor[];
  email: string;
  name: string;
}


export interface UserInfo {
  email?: string;
  nickname?: string;
  username?: string;
  name?: string;
  sub?: string;
  accessToken?: string;
}

export type EngineerFormData = {
  name: string;
  email: string;
  compressors: string[];
  rol?: number; // 0 = SuperAdmin, 1 = Gerente VT, 2 = VAST, 3 = Gerente Cliente, 4 = Cliente
};

export type dayData = {
    fecha: string;
    inicio_funcionamiento: string;
    fin_funcionamiento: string;
    horas_trabajadas: number;
    kWh: number;
    horas_load: number;
    horas_noload: number;
    hp_nominal: number;
    hp_equivalente: number;
    ciclos: number;
    promedio_ciclos_hora: number;
    costo_usd: number;
    comentario_ciclos: string;
    comentario_hp_equivalente: string;
  };

interface LineData {
    time: string;
    corriente: number;
  }

export type chartData = [number, number, number];

export type consumoData = {
  turno1: number[];
  turno2: number[];
  turno3: number[];
};

export type SummaryData = {
  semana_actual: {
    total_kWh: number;
    costo_estimado: number;
    promedio_ciclos_por_hora: number;
    promedio_hp_equivalente: number;
    horas_trabajadas: number;
  };
  comparacion: {
    bloque_A: string;
    bloque_B: string;
    bloque_C: string;
    bloque_D: string;
    porcentaje_kwh: number;
    porcentaje_costo: number;
    porcentaje_ciclos: number;
    porcentaje_hp: number;
    porcentaje_horas: number;
  };
  comentarios: {
    comentario_A: string;
    comentario_B: string;
    comentario_C: string;
    comentario_D: string;
  };
  detalle_semana_actual: {
    semana: number;
    fecha: string;
    kWh: number;
    horas_trabajadas: number;
    kWh_load: number;
    horas_load: number;
    kWh_noload: number;
    horas_noload: number;
    hp_equivalente: number;
    conteo_ciclos: number;
    promedio_ciclos_por_hora: number;
  }[];
  promedio_semanas_anteriores: {
    total_kWh_anteriores: number;
    costo_estimado: number;
    promedio_ciclos_por_hora: number;
    promedio_hp_equivalente: number;
    horas_trabajadas_anteriores: number;
  };
};

export type EngineerData = {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
};

export interface MaintenanceRecord {
  id: string;
  compressorId: string;
  compressorAlias: string;
  type: string; // Preventivo, Correctivo, etc.
  frequency: number; // en horas
  lastMaintenanceDate: string;
  nextMaintenanceDate?: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  id_mantenimiento?: number; // ID del tipo de mantenimiento
}

export interface CompressorMaintenance {
  compressor: Compressor;
  maintenanceRecords: MaintenanceRecord[];
}

export interface SelectedCompressor {
  id: string;
  linea: string;
  alias: string;
  numero_cliente: number;
  nombre_cliente: string;
  numero_serie?: string;
}

export interface PressureStats {
  presion_promedio: number;
  tiempo_total_horas: number;
  tiempo_total_minutos: number;
  pendiente_subida: number;
  pendiente_bajada: number;
  variabilidad_relativa: number;
  indice_estabilidad: number;
  eventos_criticos_total: number;
}

export interface LineData {
  time: string;
  corriente: number;
}

// Tipos para reporte de mantenimiento de compresores
export interface MaintenanceItem {
  nombre: string;
  realizado: boolean;
  valor: string;
}

export interface MaintenanceReportData {
  id: number;
  timestamp: string | null;
  cliente: string;
  tecnico: string;
  email: string;
  tipo: string;
  compresor: string;
  numero_serie: string;
  comentarios_generales: string;
  numero_cliente: string;
  comentario_cliente: string;
  link_form: string;
  carpeta_fotos: string;
  mantenimientos: MaintenanceItem[];
}

export interface MaintenanceReportResponse {
  success: boolean;
  reporte: MaintenanceReportData;
}

export interface ReportData {
  // Datos Generales del Servicio
  folio: string;
  fecha: string;
  compania: string;
  atencion: string;
  direccion: string;
  telefono: string;
  email: string;
  tecnico: string;
  ayudantes: string[];

  // Datos del Equipo
  tipo: string;
  modelo: string;
  numeroSerie: string;
  amperaje: string;
  voltaje: string;
  marca: string;

  // Datos del Reporte
  inicioServicio: string;
  finServicio: string;
  tipoServicio: string;
  tipoOrden: string;

  // Funcionamiento de Elementos
  elementos: {
    nombre: string;
    estado: "correcto" | "incorrecto" | "noAplica";
  }[];

  // Lecturas después de 15 min
  lecturas: {
    presionSeparador: number;
    presionAire: number;
    temperaturaOperacion: number;
    lcP1: number;
    lcP2: number;
    lcV1: number;
    lcV2: number;
    lcV3: number;
    voltL1L2: number;
    voltL2L3: number;
  };

  // Condiciones de Manguera y Montaje
  condiciones: {
    oralPortal: string;
    notas: string;
  };

  // Condiciones Ambientales
  condicionesAmbientales: {
    notaAdicional: string;
  };

  // Refacciones
  refacciones: {
    refaccion: string;
    cantidad: number;
  }[];

  // Tiempo Laborado
  tiempoLaborado: {
    dia: string;
    entrada: string;
    salida: string;
  }[];

  // Firmas
  firmas: {
    cliente: string;
    tecnico: string;
  };

  // Notas finales
  notasFinales: string;
}

export type MaintenanceTask = {
  id: string;
  name: string;
  completed: boolean;
  comments: string;
};

export type Visit = {
  id: string;
  date: string;
  technician: string;
  tasks: MaintenanceTask[];
  photos: string[];
  carpeta_fotos?: string;
  link_form?: string;
  comentarios_generales?: string;
  comentario_cliente?: string;
  compresor?: string;
  numero_serie?: string;
  cliente?: string;
  numero_cliente?: number;
};