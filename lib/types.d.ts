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
