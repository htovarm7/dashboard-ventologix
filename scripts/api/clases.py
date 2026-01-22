from pydantic import BaseModel, EmailStr
from typing import List, Tuple, Optional, Literal
from datetime import datetime, time

class Client(BaseModel):
    id_cliente: int
    numero_cliente: int
    nombre_cliente: str
    RFC: str
    direccion: Optional[str] = None
    champion: Optional[str] = None
    id_compresor: Optional[int] = None
    CostokWh: Optional[float] = 0.17
    demoDiario: Optional[bool] = None
    demoSemanal: Optional[bool] = None

class ClienteEventual(BaseModel):
    nombre_cliente: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None

class Compresor(BaseModel):
    id: int
    hp: int
    tipo: Literal["tornillo", "piston"]
    voltaje: int
    marca: int
    numero_serie: Optional[str] = None
    anio: Optional[int] = None
    id_cliente: int
    Amp_Load: Optional[int] = None
    Amp_No_Load: Optional[int] = None
    proyecto: int
    linea: str
    LOAD_NO_LOAD: Optional[int] = None
    Alias: str
    segundosPorRegistro: Optional[int] = None 
    fecha_ultimo_mtto: Optional[datetime] = None

class CompresorEventual(BaseModel):
    hp: Optional[int] = None
    tipo: Optional[str] = None
    voltaje: Optional[int] = None
    marca: Optional[str] = None
    numero_serie: Optional[str] = None
    anio: Optional[int] = None
    id_cliente: int
    Amp_Load: Optional[int] = None
    Amp_No_Load: Optional[int] = None
    proyecto: Optional[int] = None
    linea: Optional[str] = None
    LOAD_NO_LOAD: Optional[float] = None
    Alias: Optional[str] = None
    segundosPorRegistro: Optional[int] = 30
    fecha_ultimo_mtto: Optional[datetime] = None
    modelo: Optional[str] = None

class OrdenServicio(BaseModel):
    folio: str
    id_cliente: Optional[int] = None
    id_cliente_eventual: Optional[int] = None
    nombre_cliente: str
    numero_cliente: int
    alias_compresor: str
    numero_serie: str
    hp: int
    tipo: Literal["tornillo","piston"]
    marca: str
    anio: Optional[int] = None
    tipo_visita: Literal['1era Visita comercial','Diagnostico','Mantenimiento']
    tipo_mantenimiento: Optional[str] = None
    prioridad: Literal['baja','media','alta','urgente']
    fecha_programada: datetime
    hora_programada: time
    estado: Literal['no_iniciado','en_progreso','terminado','enviado']
    fecha_creacion: datetime
    reporte_url: Optional[str]

class Modulos(BaseModel):
    numero_cliente: int
    nombre_cliente: str
    mantenimiento: bool
    reporteDia: bool
    reporteSemana: bool
    presion: bool
    prediccion: bool
    kwh: bool

class MantenimientoItem(BaseModel):
    nombre: str
    realizado: bool

class ReporteMantenimiento(BaseModel):
    folio: str
    
    # Items de mantenimiento (Sí/No)
    cambio_aceite: Optional[Literal["Sí", "No"]] = None
    cambio_filtro_aceite: Optional[Literal["Sí", "No"]] = None
    cambio_filtro_aire: Optional[Literal["Sí", "No"]] = None
    cambio_separador_aceite: Optional[Literal["Sí", "No"]] = None
    revision_valvula_admision: Optional[Literal["Sí", "No"]] = None
    revision_valvula_descarga: Optional[Literal["Sí", "No"]] = None
    limpieza_radiador: Optional[Literal["Sí", "No"]] = None
    revision_bandas_correas: Optional[Literal["Sí", "No"]] = None
    revision_fugas_aire: Optional[Literal["Sí", "No"]] = None
    revision_fugas_aceite: Optional[Literal["Sí", "No"]] = None
    revision_conexiones_electricas: Optional[Literal["Sí", "No"]] = None
    revision_presostato: Optional[Literal["Sí", "No"]] = None
    revision_manometros: Optional[Literal["Sí", "No"]] = None
    lubricacion_general: Optional[Literal["Sí", "No"]] = None
    limpieza_general: Optional[Literal["Sí", "No"]] = None
    
    # Comentarios
    comentarios_generales: Optional[str] = None
    comentario_cliente: Optional[str] = None