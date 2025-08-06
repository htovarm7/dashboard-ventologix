export interface Compresor {
  id_cliente: number;
  linea: string;
  alias: string;
  nombre_cliente?: string;
}

export interface CompresorWithDate extends Compresor {
  date?: string;
}

export interface ClientData {
  nombre_cliente?: string;
}
