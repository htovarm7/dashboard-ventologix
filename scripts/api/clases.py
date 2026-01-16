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