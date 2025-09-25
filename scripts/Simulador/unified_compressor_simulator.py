import math
import json
from dataclasses import dataclass, asdict
from typing import Dict, Any, Literal, Optional, List, Tuple
import pandas as pd
import numpy as np

# ==================== CONSTANTES ====================
P_ATM = 14.7  # psia (presión atmosférica)
GAL_TO_CUFT = 0.133680556  # conversión galones a pies cúbicos
SQRT3 = math.sqrt(3.0)

# ==================== FUNCIONES AUXILIARES ====================
def clamp(x: float, lo: float, hi: float) -> float:
    """Limita un valor entre un mínimo y máximo"""
    return max(lo, min(hi, x))

def smooth_exp(prev: float, target: float, alpha: float) -> float:
    """Suavizado exponencial para transiciones"""
    return prev + (target - prev) * (1 - math.exp(-alpha))

def hp_to_kw(hp: float) -> float:
    """Convierte caballos de fuerza a kilovatios"""
    return hp * 0.7457

def nominal_input_kw(motor_hp: float, efficiency: float) -> float:
    """Calcula la potencia de entrada nominal en kW"""
    shaft_kw = hp_to_kw(motor_hp)
    return shaft_kw / max(efficiency, 1e-6)

def kw_to_current_A(kw_in: float, voltage_ll: float, power_factor: float) -> float:
    """Convierte potencia en kW a corriente en Amperios"""
    if kw_in <= 0:
        return 0.0
    denom = SQRT3 * voltage_ll * max(power_factor, 1e-6)
    return (kw_in * 1000.0) / denom

# ==================== CLASES DE CONFIGURACIÓN ====================
@dataclass
class MotorConfig:
    """Configuración del motor"""
    hp: float = 100.0
    efficiency: float = 0.9
    voltage_ll: float = 440.0
    power_factor: float = 0.85

@dataclass
class CompressorConfig:
    """Configuración del compresor"""
    max_output_scfm_per_hp: float = 4.2
    storage_volume_gal: float = 1150.0

@dataclass
class ControlConfig:
    """Configuración del sistema de control"""
    setpoint_high_psi: float = 110.0
    setpoint_low_psi: float = 100.0
    unload_power_frac: float = 0.50
    noload_shutdown_min: float = 1.0
    pf_noload: float = 0.6
    pct_per_2psi: float = 1.0
    use_linear_pressure_rule: bool = True
    reference_pressure_psi: float = 100.0
    transient_ramp_s: float = 2.0
    startup_spike_s: float = 0.8
    restart_band_psi: float = 5.0
    automatic_shutoff_enabled: bool = False
    shutoff_delay_min: float = 0.0
    blowdown_psi: float = 0.0

@dataclass
class DemandConfig:
    """Configuración de demanda de aire"""
    constant_scfm: float = 210.0

@dataclass
class SimulationConfig:
    """Configuración de la simulación"""
    start_pressure_psi: float = 110.0
    duration_min: float = 10.0
    interval_sec: float = 1.0

@dataclass
class OutputConfig:
    """Configuración de salida"""
    metric: Literal["current_A", "power_kW"] = "current_A"

# ==================== SIMULADOR PRINCIPAL ====================
class CompressorSimulator:
    """Simulador principal de compresor de aire"""
    
    def __init__(self):
        self.reset()
    
    def reset(self):
        """Reinicia el estado del simulador"""
        self.pressure_psi = 0.0
        self.loaded = False
        self.running = True
        self.time_in_noload_min = 0.0
        self.time_since_state_change_s = 0.0
        self.current_kw = 0.0
        self.total_kwh = 0.0
        self.results = []
    
    def simulate(self, config: Dict[str, Any]) -> pd.DataFrame:
        """
        Ejecuta la simulación completa del compresor
        
        Args:
            config: Diccionario con toda la configuración
            
        Returns:
            DataFrame con los resultados de la simulación
        """
        # Parsear configuración
        motor = MotorConfig(**config.get("motor", {}))
        compressor = CompressorConfig(**config.get("compressor", {}))
        control = ControlConfig(**config.get("control", {}))
        demand = DemandConfig(**config.get("demand", {}))
        simulation = SimulationConfig(**config.get("simulation", {}))
        output = OutputConfig(**config.get("output", {}))
        
        # Calcular parámetros derivados
        capacity_scfm = motor.hp * compressor.max_output_scfm_per_hp
        nom_kw = nominal_input_kw(motor.hp, motor.efficiency)
        V_cuft = max(compressor.storage_volume_gal, 1e-6) * GAL_TO_CUFT
        
        # Configurar tiempo
        n_steps = max(1, int(round(simulation.duration_min * 60.0 / simulation.interval_sec)))
        dt_s = simulation.interval_sec
        dt_min = dt_s / 60.0
        dt_h = dt_s / 3600.0
        
        # Estado inicial
        self.reset()
        self.pressure_psi = max(simulation.start_pressure_psi, 0.0)
        self.loaded = False  # inicia en NOLOAD
        
        # Configurar suavizado
        transient_steps = max(1, int(round(max(control.transient_ramp_s, 0.1) / dt_s)))
        alpha = 5.0 / transient_steps
        
        # Almacenar resultados
        results = {
            "t_min": [], "pressure_psi": [], "demand_scfm": [], "supply_scfm": [],
            "state": [], "input_kw": [], "current_A": [], "kwh_step": []
        }
        
        prev_state_label = "NOLOAD"
        
        # Loop principal de simulación
        for step in range(n_steps):
            t_min = step * dt_min
            demand_scfm = demand.constant_scfm
            
            # Control de carga con histéresis
            if self.running:
                if self.loaded:
                    if self.pressure_psi >= control.setpoint_high_psi:
                        self.loaded = False
                        self.time_since_state_change_s = 0.0
                else:
                    if self.pressure_psi <= control.setpoint_low_psi:
                        self.loaded = True
                        self.time_since_state_change_s = 0.0
            else:
                # Reinicio por histéresis
                if self.pressure_psi <= max(control.setpoint_low_psi - control.restart_band_psi, 0.0):
                    self.running = True
                    self.loaded = True
                    self.time_since_state_change_s = 0.0
            
            # Escalado de potencia por presión
            if control.use_linear_pressure_rule:
                P_ref = control.reference_pressure_psi
                scale_press = 1.0 + (control.pct_per_2psi / 100.0) * ((self.pressure_psi - P_ref) / 2.0)
                scale_press = max(0.3, scale_press)
            else:
                # Escalado logarítmico
                Pref_abs = max(control.reference_pressure_psi + P_ATM, P_ATM + 1e-6)
                Pabs = max(self.pressure_psi + P_ATM, P_ATM + 1e-6)
                scale_press = math.log(Pabs / P_ATM) / math.log(Pref_abs / P_ATM)
                scale_press = max(0.3, scale_press)
            
            # Determinar potencia objetivo
            if not self.running:
                target_kw = 0.0
            elif self.loaded:
                target_kw = nom_kw * scale_press
                # Pico de arranque
                if prev_state_label == "NOLOAD" and self.time_since_state_change_s <= control.startup_spike_s:
                    target_kw *= 1.5
            else:
                target_kw = nom_kw * clamp(control.unload_power_frac, 0.0, 1.0) * scale_press
            
            # Apagado automático en NOLOAD
            if self.running and (not self.loaded):
                self.time_in_noload_min += dt_min
                if control.noload_shutdown_min > 0 and self.time_in_noload_min >= control.noload_shutdown_min:
                    self.running = False
                    target_kw = 0.0
                    self.current_kw = 0.0
            else:
                if self.loaded:
                    self.time_in_noload_min = 0.0
            
            # Suavizado de potencia
            self.current_kw = smooth_exp(self.current_kw, target_kw, alpha)
            
            # Calcular corriente
            pf_used = motor.power_factor if self.loaded else control.pf_noload
            current_A = kw_to_current_A(self.current_kw, motor.voltage_ll, pf_used)
            
            # Suministro de aire
            supply_scfm = capacity_scfm if (self.running and self.loaded) else 0.0
            
            # Dinámica de presión (isotérmica simplificada)
            P_abs = self.pressure_psi + P_ATM
            Q_net = supply_scfm - demand_scfm  # SCFM neto
            dP_abs_dt = (P_ATM / max(V_cuft, 1e-9)) * Q_net  # psia/min
            P_abs_new = max(0.0, P_abs + dP_abs_dt * dt_min)
            self.pressure_psi = max(0.0, P_abs_new - P_ATM)
            
            # Energía consumida en este paso
            kwh_step = float(self.current_kw * dt_h)
            self.total_kwh += kwh_step
            
            # Determinar estado actual
            if self.running and self.loaded:
                state = "LOAD"
            elif self.running:
                state = "NOLOAD"
            else:
                state = "OFF"
            
            # Guardar resultados
            results["t_min"].append(t_min)
            results["pressure_psi"].append(float(self.pressure_psi))
            results["demand_scfm"].append(float(demand_scfm))
            results["supply_scfm"].append(float(supply_scfm))
            results["state"].append(state)
            results["input_kw"].append(float(self.current_kw))
            results["current_A"].append(float(current_A))
            results["kwh_step"].append(kwh_step)
            
            # Actualizar contadores
            self.time_since_state_change_s += dt_s
            prev_state_label = state
        
        # Crear DataFrame
        df = pd.DataFrame(results)
        df["kwh_cumulative"] = df["kwh_step"].cumsum()
        
        # Columna de salida según métrica solicitada
        if output.metric == "power_kW":
            df["output_metric"] = df["input_kw"]
            df["output_label"] = "Power (kW)"
        else:
            df["output_metric"] = df["current_A"]
            df["output_label"] = "Current (A)"
        
        # Metadatos
        df.attrs["total_kwh"] = float(self.total_kwh)
        df.attrs["duration_min"] = float(simulation.duration_min)
        
        return df

# ==================== CONFIGURACIONES PREDEFINIDAS ====================
def get_default_config() -> Dict[str, Any]:
    """Retorna la configuración por defecto"""
    return {
        "motor": {
            "hp": 100.0,
            "efficiency": 0.9,
            "voltage_ll": 440.0,
            "power_factor": 0.85
        },
        "compressor": {
            "max_output_scfm_per_hp": 4.2,
            "storage_volume_gal": 1150.0
        },
        "control": {
            "setpoint_high_psi": 110.0,
            "setpoint_low_psi": 100.0,
            "unload_power_frac": 0.50,
            "noload_shutdown_min": 1.0,
            "pf_noload": 0.6,
            "pct_per_2psi": 1.0,
            "use_linear_pressure_rule": True,
            "reference_pressure_psi": 100.0,
            "transient_ramp_s": 2.0,
            "startup_spike_s": 0.8,
            "restart_band_psi": 5.0,
            "automatic_shutoff_enabled": False,
            "shutoff_delay_min": 0.0,
            "blowdown_psi": 0.0
        },
        "demand": {
            "constant_scfm": 210.0
        },
        "simulation": {
            "start_pressure_psi": 110.0,
            "duration_min": 10.0,
            "interval_sec": 1.0
        },
        "output": {
            "metric": "current_A"
        }
    }

# ==================== FUNCIONES PRINCIPALES PARA API ====================
def run_simulation(config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Función principal para ejecutar simulación desde API
    
    Args:
        config: Configuración personalizada (opcional)
        
    Returns:
        Diccionario con resultados de la simulación
    """
    if config is None:
        config = get_default_config()
    
    # Mergear con configuración por defecto
    default_config = get_default_config()
    merged_config = {}
    
    for section in default_config:
        merged_config[section] = {**default_config[section], **config.get(section, {})}
    
    # Ejecutar simulación
    simulator = CompressorSimulator()
    df = simulator.simulate(merged_config)
    
    # Calcular estadísticas
    duration_h = merged_config["simulation"]["duration_min"] / 60.0
    dt_min = merged_config["simulation"]["interval_sec"] / 60.0
    
    # Promedios ponderados por tiempo
    avg_current = (df["current_A"] * dt_min).sum() / max(merged_config["simulation"]["duration_min"], 1e-9)
    avg_power = (df["input_kw"] * dt_min).sum() / max(merged_config["simulation"]["duration_min"], 1e-9)
    total_kwh = df["kwh_step"].sum()
    kwh_per_hour = total_kwh / max(duration_h, 1e-9)
    
    # Análisis de estados
    state_distribution = df["state"].value_counts(normalize=True).to_dict()
    
    return {
        "success": True,
        "data": df.to_dict(orient="records"),
        "summary": {
            "total_kwh": float(total_kwh),
            "kwh_per_hour": float(kwh_per_hour),
            "avg_current_A": float(avg_current),
            "avg_power_kW": float(avg_power),
            "duration_min": float(merged_config["simulation"]["duration_min"]),
            "state_distribution": state_distribution,
            "final_pressure_psi": float(df["pressure_psi"].iloc[-1]),
            "max_pressure_psi": float(df["pressure_psi"].max()),
            "min_pressure_psi": float(df["pressure_psi"].min())
        },
        "config": merged_config
    }

def quick_simulation(
    hp: float = 100.0,
    demand_scfm: float = 210.0,
    duration_min: float = 10.0,
    storage_gal: float = 1150.0,
    high_psi: float = 110.0,
    low_psi: float = 100.0
) -> Dict[str, Any]:
    """
    Simulación rápida con parámetros principales
    
    Args:
        hp: Potencia del motor en HP
        demand_scfm: Demanda de aire en SCFM
        duration_min: Duración en minutos
        storage_gal: Volumen del tanque en galones
        high_psi: Presión alta de control
        low_psi: Presión baja de control
        
    Returns:
        Diccionario con resultados
    """
    config = get_default_config()
    
    # Actualizar parámetros principales
    config["motor"]["hp"] = hp
    config["demand"]["constant_scfm"] = demand_scfm
    config["simulation"]["duration_min"] = duration_min
    config["compressor"]["storage_volume_gal"] = storage_gal
    config["control"]["setpoint_high_psi"] = high_psi
    config["control"]["setpoint_low_psi"] = low_psi
    
    return run_simulation(config)

# ==================== EJEMPLO DE USO ====================
if __name__ == "__main__":
    print("🔧 Simulador Unificado de Compresor")
    print("=" * 40)
    
    # Ejemplo 1: Simulación básica
    print("\n📊 Ejecutando simulación básica...")
    result = quick_simulation(
        hp=100.0,
        demand_scfm=210.0,
        duration_min=5.0
    )
    
    print(f"✅ Simulación completada")
    print(f"📈 Consumo total: {result['summary']['total_kwh']:.2f} kWh")
    print(f"⚡ Corriente promedio: {result['summary']['avg_current_A']:.1f} A")
    print(f"🔌 Potencia promedio: {result['summary']['avg_power_kW']:.1f} kW")
    print(f"📊 Distribución de estados: {result['summary']['state_distribution']}")
    
    # Ejemplo 2: Configuración personalizada
    print("\n🛠️ Ejecutando simulación personalizada...")
    custom_config = {
        "motor": {"hp": 75.0, "voltage_ll": 480.0},
        "demand": {"constant_scfm": 150.0},
        "simulation": {"duration_min": 15.0, "interval_sec": 0.5},
        "control": {"setpoint_high_psi": 120.0, "setpoint_low_psi": 105.0}
    }
    
    result2 = run_simulation(custom_config)
    print(f"✅ Simulación personalizada completada")
    print(f"📈 kWh/hora normalizado: {result2['summary']['kwh_per_hour']:.2f}")
    print(f"🎯 Presión final: {result2['summary']['final_pressure_psi']:.1f} psi")
    
    print(f"\n📝 Total de {len(result2['data'])} puntos de datos generados")