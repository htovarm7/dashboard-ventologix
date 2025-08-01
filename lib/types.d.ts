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