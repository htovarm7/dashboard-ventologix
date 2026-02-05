/* ===== Clientes ======= */
export interface Client {
  id_cliente: number;
  numero_cliente: number;
  nombre_cliente: string;
  RFC: string;
  direccion: string;
  champion: string;
  CostokWh: number;
  demoDiario: number | null;
  demoSemanal: number | null;
}

export interface ClientFormData {
  numero_cliente: number | string;
  nombre_cliente: string;
  RFC: string;
  direccion: string;
  champion: string;
  CostokWh: number | string;
  demoDiario: number | string;
  demoSemanal: number | string;
}

/* ===== Compresores ======= */
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

/* ===== Usuarios ======= */
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

export type EngineerData = {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
};

export interface UserData {
  id_cliente?: number;
  numero_cliente: number;
  rol: number;
  compresores: {
    linea: string;
    proyecto: number;
    Alias: string;
    numero_cliente: string;
  }[];
  email: string;
  name: string;
  timestamp: number;
  secciones?: string[];
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

/* ===== Ordenes de Servicio ======= */
export interface OrdenServicio {
  folio: string;
  id_cliente: number;
  id_cliente_eventual: number;
  nombre_cliente: string;
  numero_cliente: number;
  alias_compresor: string;
  numero_serie: string;
  hp: number;
  tipo: string;
  marca: string;
  anio: number;
  tipo_visita: string;
  prioridad: string;
  fecha_programada: string;
  hora_programada: string;
  estado: string;
  fecha_creacion: string;
  reporte_url: string;
  tipo_mantenimiento: string;
}

export interface ReportFormData {
  // Datos iniciales
  folio?: string;
  compressorId?: string;
  numeroCliente?: string;
  equipmentHp?: string;
  compressorType?: string;
  compressorAlias?: string;
  clientId?: string;
  clientName?: string;
  clientAddress?: string;
  clientContact?: string;
  clientPhone?: string;
  reportDate: string;

  // Nuevos campos de Orden de Servicio
  eventualClientId?: string;
  maintenanceType?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  orderStatus?: string;
  creationDate?: string;
  reportUrl?: string;

  // Información inicial
  diagnosticType: string;
  equipmentPowers: string;
  displayPowers: string;

  // Sección cuando equipo ENCIENDE
  // Horas y alarmas
  photo1?: File | null;
  generalHours: string;
  loadHours: string;
  unloadHours: string;
  photo2?: File | null;
  maintenance2000: boolean;
  maintenance4000: boolean;
  maintenance6000: boolean;
  maintenanceRequired: string;
  otherMechanicalFailure: boolean;

  // Temperaturas
  compressionTempDisplay: string;
  compressionTempLaser: string;
  finalCompressionTemp: string;
  airIntakeTemp: string;
  intercoolerTemp: string;

  // Mediciones eléctricas
  supplyVoltage: string;
  mainMotorAmperage: string;
  fanAmperage: string;
  photo3?: File | null;
  powerFactorLoadOk: string;
  powerFactorUnloadOk: string;

  // Datos del compresor
  photo4?: File | null;
  brand: string;
  serialNumber: string;
  yearManufactured: string;
  model: string;

  // Sistema neumático
  photo5?: File | null;
  oilLeaks: string;
  airLeaks: string;
  intakeValveFunctioning: string;
  intakeValveType: string;
  pressureDifferential: string;
  pressureControlMethod: string;
  isMaster: string;
  operatingPressure: string;
  operatingSetPoint: string;
  loadPressure: string;
  unloadPressure: string;

  // Wet Tank
  photo6?: File | null;
  wetTankExists: boolean;
  wetTankLiters: string;
  wetTankSafetyValve: boolean;
  wetTankDrain: boolean;

  // Dry Tank
  photo7?: File | null;
  dryTankExists: boolean;
  dryTankLiters: string;
  dryTankSafetyValve: boolean;
  dryTankDrain: boolean;

  // Condiciones ambientales
  photo8?: File | null;
  internalTemp: string;
  location: string;
  hotAirExpulsion: string;
  highDustOperation: string;
  specialConditions: string;
  
  // Campos adicionales para diagnóstico
  deltaTAceite: string;
  deltaPSeparador: string;
  tempMotor: string;
  aceiteOscuro: string;

  // Sección cuando equipo NO ENCIENDE
  equipmentStatePhoto?: File | null;
  completeElementsPhoto?: File | null;
  motorCondition: string;
  compressionUnitCondition: string;
  coolingCoilCondition: string;
  admissionValvesCondition: string;
  otherCondition: string;

  generalConditionsPhoto?: File | null;
  excessDust: boolean;
  hasManual: boolean;
  electricalPanelPowers: boolean;
  correctMotorRotation: boolean;
  compressionUnitRotates: boolean;
  fanMotorWorks: boolean;
  maintenanceStopReasons: string;

  installationsPhoto?: File | null;
  electricalFeedConnected: boolean;
  adequateBreaker: boolean;
  dischargePipeConnectedTo: string;
  compressorRoomConditions: string;

  // Campos de POST-MANTENIMIENTO (valores finales después del mantenimiento)
  displayPowersFinal?: string;
  generalHoursFinal?: string;
  loadHoursFinal?: string;
  unloadHoursFinal?: string;
  supplyVoltageFinal?: string;
  mainMotorAmperageFinal?: string;
  fanAmperageFinal?: string;
  oilLeaksFinal?: string;
  aceiteOscuroFinal?: string;
  airIntakeTempFinal?: string;
  compressionTempDisplayFinal?: string;
  compressionTempLaserFinal?: string;
  finalCompressionTempFinal?: string;
  internalTempFinal?: string;
  deltaTAceiteFinal?: string;
  tempMotorFinal?: string;
  loadPressureFinal?: string;
  unloadPressureFinal?: string;
  deltaPSeparadorFinal?: string;
  airLeaksFinal?: string;

  // Firmas
  nombrePersonaCargo?: string;
  firmaPersonaCargo?: string; // Base64 de la firma
  firmaTecnicoVentologix?: string; // URL o path de la imagen del técnico
}

/* ===== Modulos Web ======= */
export interface Modulos {
  nombre_cliente?: string;
  numero_cliente?: number;
  mantenimiento?: boolean;
  reporteDia?: boolean;
  reporteSemana?: boolean;
  presion?: boolean;
  prediccion?: boolean;
  kwh?: boolean;
}

export interface ModulosFormData {
  numero_cliente?: number;
  nombre_cliente?: string;
  mantenimiento?: boolean;
  reporteDia?: boolean;
  reporteSemana?: boolean;
  presion?: boolean;
  prediccion?: boolean;
  kwh?: boolean;
}

/* ===== Datos de Graficas ======= */
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
  fotos_drive: string[];
  carpeta_fotos: string;
  mantenimientos: MaintenanceItem[];
  Generado?: number; // 0 = no generado, 1 = generado
  link_pdf?: string; // URL del PDF en Google Drive
  hp?: number;
  voltaje?: number;
  anio?: number;
  Alias?: string;
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

/* ===== RTU Devices ======= */
export interface RTUDevice {
  id: number;
  numero_serie_topico: string;
  RTU_id: number;
  numero_cliente: number;
  alias: string | null;
  nombre_cliente?: string;
}

export interface RTUSensor {
  id: number;
  RTU_id: number;
  C: number;
  Vmin: number | null;
  Vmax: number | null;
  Lmin: number | null;
  Lmax: number | null;
}

export interface RTUPort {
  id: number;
  RTU_id: number;
  P1: number | null;
  P2: number | null;
  P3: number | null;
}

export interface RTUFormData {
  numero_serie_topico: string;
  RTU_id: number | string;
  numero_cliente: number | string;
  alias: string;
  // Sensores (C1, C2, C3)
  C1_Vmin: number | string;
  C1_Vmax: number | string;
  C1_Lmin: number | string;
  C1_Lmax: number | string;
  C2_Vmin: number | string;
  C2_Vmax: number | string;
  C2_Lmin: number | string;
  C2_Lmax: number | string;
  C3_Vmin: number | string;
  C3_Vmax: number | string;
  C3_Lmin: number | string;
  C3_Lmax: number | string;
  // Puertos ESP
  P1: number | string;
  P2: number | string;
  P3: number | string;
}
