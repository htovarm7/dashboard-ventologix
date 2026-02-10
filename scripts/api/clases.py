from pydantic import BaseModel, EmailStr
from typing import List, Tuple, Optional, Literal
from datetime import datetime, time
from decimal import Decimal

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

class Dispositivo(BaseModel):
    id: Optional[int] = None
    id_kpm: Optional[str] = None
    id_proyecto: int
    id_cliente: int

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

class PreMantenimientoRequest(BaseModel):
    folio: str
    equipo_enciende: Optional[str] = None
    display_enciende: Optional[str] = None
    horas_totales: Optional[Decimal] = None
    horas_carga: Optional[Decimal] = None
    horas_descarga: Optional[Decimal] = None
    mantenimiento_proximo: Optional[str] = None
    compresor_es_master: Optional[str] = None
    amperaje_maximo_motor: Optional[Decimal] = None
    ubicacion_compresor: Optional[str] = None
    expulsion_aire_caliente: Optional[str] = None
    operacion_muchos_polvos: Optional[str] = None
    compresor_bien_instalado: Optional[str] = None
    condiciones_especiales: Optional[str] = None
    voltaje_alimentacion: Optional[Decimal] = None
    amperaje_motor_carga: Optional[Decimal] = None
    amperaje_ventilador: Optional[Decimal] = None
    fugas_aceite_visibles: Optional[str] = None
    fugas_aire_audibles: Optional[str] = None
    aceite_oscuro_degradado: Optional[str] = None
    temp_ambiente: Optional[Decimal] = None
    temp_compresion_display: Optional[Decimal] = None
    temp_compresion_laser: Optional[Decimal] = None
    temp_separador_aceite: Optional[Decimal] = None
    temp_interna_cuarto: Optional[Decimal] = None
    delta_t_enfriador_aceite: Optional[Decimal] = None
    temp_motor_electrico: Optional[Decimal] = None
    metodo_control_presion: Optional[str] = None
    presion_carga: Optional[Decimal] = None
    presion_descarga: Optional[Decimal] = None
    diferencial_presion: Optional[str] = None
    delta_p_separador: Optional[Decimal] = None
    tipo_valvula_admision: Optional[str] = None
    funcionamiento_valvula_admision: Optional[str] = None
    wet_tank_existe: Optional[bool] = None
    wet_tank_litros: Optional[int] = None
    wet_tank_valvula_seguridad: Optional[bool] = None
    wet_tank_dren: Optional[bool] = None
    dry_tank_existe: Optional[bool] = None
    dry_tank_litros: Optional[int] = None
    dry_tank_valvula_seguridad: Optional[bool] = None
    dry_tank_dren: Optional[bool] = None
    exceso_polvo_suciedad: Optional[bool] = None
    hay_manual: Optional[bool] = None
    tablero_electrico_enciende: Optional[bool] = None
    giro_correcto_motor: Optional[bool] = None
    unidad_compresion_gira: Optional[bool] = None
    motor_ventilador_funciona: Optional[bool] = None
    razon_paro_mantenimiento: Optional[str] = None
    alimentacion_electrica_conectada: Optional[bool] = None
    pastilla_adecuada_amperajes: Optional[bool] = None
    tuberia_descarga_conectada_a: Optional[str] = None