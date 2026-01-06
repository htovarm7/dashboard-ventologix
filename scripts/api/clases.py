from pydantic import BaseModel, EmailStr
from typing import List, Tuple, Optional

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

