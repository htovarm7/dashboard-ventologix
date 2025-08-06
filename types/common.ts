export interface Compresor {
  id_cliente: number;
  linea: string;
  alias: string;
}

export interface CompresorWithDate extends Compresor {
  date?: string;
}
