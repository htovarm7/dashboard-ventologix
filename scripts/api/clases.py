from pydantic import BaseModel, EmailStr
from typing import List, Tuple, Optional, Literal
from datetime import datetime

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