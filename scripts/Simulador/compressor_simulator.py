# compressor_simulator.py
"""
Compressor Simulator (corregido)
- Escala potencia con presión respecto a una referencia fija.
- Calcula kWh por paso y devuelve columnas 'kwh_step' y 'kwh_cumulative'.
- Suaviza transitorios y soporta shutdown en NOLOAD con reinicio por histéresis.
"""
from dataclasses import dataclass
from typing import Dict, Any, Literal
import math
import numpy as np
import pandas as pd

# Constantes
P_ATM = 14.7  # psia
GAL_TO_CUFT = 0.133680556
SQRT3 = math.sqrt(3.0)

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def smooth_exp(prev, target, alpha):
    # alpha >0. Higher -> faster approach. Returns new value between prev and target.
    return prev + (target - prev) * (1 - math.exp(-alpha))

# Dataclasses de parámetros
@dataclass
class MotorParams:
    hp: float
    efficiency: float
    voltage_ll: float
    power_factor: float

@dataclass
class CompressorParams:
    max_output_scfm_per_hp: float
    storage_volume_gal: float

@dataclass
class ControlParams:
    setpoint_high_psi: float = 110.0
    setpoint_low_psi: float = 100.0
    unload_power_frac: float = 0.50
    noload_shutdown_min: float = 0.0
    pf_noload: float = 0.6
    pct_per_2psi: float = 1.0
    use_linear_pressure_rule: bool = True
    reference_pressure_psi: float = 100.0   # <-- referencia fija para escalado por presión
    transient_ramp_s: float = 2.0
    startup_spike_s: float = 0.8
    restart_band_psi: float = 5.0
    automatic_shutoff_enabled: bool = False
    shutoff_delay_min: float = 0.0
    blowdown_psi: float = 0.0

@dataclass
class DemandParams:
    constant_scfm: float

@dataclass
class SimulationParams:
    start_pressure_psi: float
    duration_min: float
    interval_sec: float = 1.0

@dataclass
class OutputParams:
    metric: Literal["current_A", "power_kW"] = "current_A"

# Conversiones
def hp_to_kw(hp: float) -> float:
    return hp * 0.7457

def nominal_input_kw(motor: MotorParams) -> float:
    shaft_kw = hp_to_kw(motor.hp)
    return shaft_kw / max(motor.efficiency, 1e-6)

def kw_to_current_A(kw_in: float, motor: MotorParams, pf: float = None) -> float:
    if pf is None:
        pf = motor.power_factor
    denom = SQRT3 * motor.voltage_ll * max(pf, 1e-6)
    return (kw_in * 1000.0) / denom

# Simulación
def simulate(config: Dict[str, Any]) -> pd.DataFrame:
    motor = MotorParams(**config["motor"])
    comp = CompressorParams(**config["compressor"])
    ctrl = ControlParams(**config["control"])
    dem  = DemandParams(**config["demand"])
    sim  = SimulationParams(**config["simulation"])
    outp = OutputParams(**config.get("output", {"metric":"current_A"}))

    # Derivadas
    capacity_scfm = motor.hp * comp.max_output_scfm_per_hp
    nom_kw = nominal_input_kw(motor)     # potencia nominal (kW) a LOAD base
    V_cuft = max(comp.storage_volume_gal, 1e-6) * GAL_TO_CUFT

    # Timing y escalas
    n_steps = max(1, int(round(sim.duration_min * 60.0 / sim.interval_sec)))
    times_s = [i * sim.interval_sec for i in range(n_steps)]
    times_min = [t / 60.0 for t in times_s]
    dt_s = sim.interval_sec
    dt_min = dt_s / 60.0
    dt_h = dt_s / 3600.0

    # Estados iniciales
    P_g = max(sim.start_pressure_psi, 0.0)  # psig
    loaded = False                          # inicia en NOLOAD (por tu preferencia)
    running = True
    time_in_noload_min = 0.0
    time_since_state_change_s = 0.0

    current_kw = 0.0
    total_kwh = 0.0

    # smooth alpha (tune)
    transient_steps = max(1, int(round(max(ctrl.transient_ramp_s, 0.1) / dt_s)))
    alpha = 5.0 / transient_steps

    rec = {
        "t_min": [], "pressure_psi": [], "demand_scfm": [], "supply_scfm": [],
        "state": [], "input_kw": [], "current_A": [], "kwh_step": []
    }

    # Loop temporal
    prev_state_label = "NOLOAD"
    for step, t_min in enumerate(times_min):
        demand = dem.constant_scfm

        # Control LOAD/NOLOAD con histéresis
        if running:
            if loaded:
                if P_g >= ctrl.setpoint_high_psi:
                    loaded = False
                    time_since_state_change_s = 0.0
            else:
                if P_g <= ctrl.setpoint_low_psi:
                    loaded = True
                    time_since_state_change_s = 0.0
        else:
            # si estaba apagado, volver a arrancar sólo si baja suficiente la presión (histéresis)
            if P_g <= max(ctrl.setpoint_low_psi - ctrl.restart_band_psi, 0.0):
                running = True
                loaded = True
                time_since_state_change_s = 0.0

        # --- Escalado de potencia por presión relativa a una referencia fija ----
        # Opción lineal empírica: pct_per_2psi % por cada 2 psi
        if ctrl.use_linear_pressure_rule:
            P_ref = ctrl.reference_pressure_psi
            scale_press = 1.0 + (ctrl.pct_per_2psi / 100.0) * ((P_g - P_ref) / 2.0)
            scale_press = max(0.3, scale_press)   # evitar valores negativos absurdos
        else:
            # alternativa física aproximada (log)
            Pref_abs = max(ctrl.reference_pressure_psi + P_ATM, P_ATM + 1e-6)
            Pabs = max(P_g + P_ATM, P_ATM + 1e-6)
            scale_press = math.log(Pabs / P_ATM) / math.log(Pref_abs / P_ATM)
            scale_press = max(0.3, scale_press)

        # --- Determinar target_kw dependiendo del estado (RUNNING/LOADED/NOLOAD) ---
        if not running:
            target_kw = 0.0
        elif loaded:
            target_kw = nom_kw * scale_press
            # pequeño pico de arranque si justo pasamos de NOLOAD a LOAD
            if prev_state_label == "NOLOAD" and time_since_state_change_s <= ctrl.startup_spike_s:
                target_kw *= 1.5 #CAMBIAR PARA EL PICO
        else:
            target_kw = nom_kw * clamp(ctrl.unload_power_frac, 0.0, 1.0) * scale_press

        # --- Apagar por noload_shutdown_min (solo cuando en NOLOAD y running) ---
        if running and (not loaded):
            time_in_noload_min += dt_min
            if ctrl.noload_shutdown_min > 0 and time_in_noload_min >= ctrl.noload_shutdown_min:
                # hacemos un "soft shutdown": set running=False; target_kw=0
                running = False
                target_kw = 0.0
                current_kw = 0.0
        else:
            if loaded:
                time_in_noload_min = 0.0

        # Suavizado en kW para evitar saltos instantáneos
        current_kw = smooth_exp(current_kw, target_kw, alpha)

        # Calcular corriente real usando PF según estado
        pf_used = motor.power_factor if loaded else ctrl.pf_noload
        current_A = kw_to_current_A(current_kw, motor, pf=pf_used) if current_kw > 0 else 0.0

        # Supply para dinámica de presión (si running y loaded -> full capacity)
        supply = capacity_scfm if (running and loaded) else 0.0

        # Dinámica isotérmica simplificada
        P_abs = P_g + P_ATM
        Q_net = supply - demand            # SCFM (positivo => presión sube)
        dP_abs_dt = (P_ATM / max(V_cuft := V_cuft if False else V_cuft if False else 1, 1e-9) * 0)  # filler avoided
        # calcular V_cuft local real:
        V_cuft = max(comp.storage_volume_gal, 1e-6) * GAL_TO_CUFT
        dP_abs_dt = (P_ATM / max(V_cuft, 1e-9)) * Q_net   # psia/min
        P_abs_new = max(0.0, P_abs + dP_abs_dt * dt_min)
        P_g = max(0.0, P_abs_new - P_ATM)

        # kWh por paso (kW * horas_pasadas)
        kwh_step = float(current_kw * dt_h)
        total_kwh += kwh_step

        # registro
        rec["t_min"].append(t_min)
        rec["pressure_psi"].append(float(P_g))
        rec["demand_scfm"].append(float(demand))
        rec["supply_scfm"].append(float(supply))
        rec["state"].append("LOAD" if (running and loaded) else ("NOLOAD" if running else "OFF"))
        rec["input_kw"].append(float(current_kw))
        rec["current_A"].append(float(current_A))
        rec["kwh_step"].append(kwh_step)

        # contadores
        time_since_state_change_s += dt_s
        prev_state_label = "LOAD" if (running and loaded) else ("NOLOAD" if running else "OFF")

    df = pd.DataFrame(rec)
    df["kwh_cumulative"] = df["kwh_step"].cumsum()

    # columnas de salida: si quieren kW o A pueden usar 'output_metric'
    if outp.metric == "power_kW":
        df["output_metric"] = df["input_kw"]
        df["output_label"] = "Power (kW)"
    else:
        df["output_metric"] = df["current_A"]
        df["output_label"] = "Current (A)"

    # añado total_kwh a dataframe (última fila) como info accesible
    df.attrs["total_kwh"] = float(total_kwh)
    df.attrs["duration_min"] = float(sim.duration_min)

    return df
