# menu_executable_sim.py
import json
import copy
import tkinter as tk
from tkinter import ttk, messagebox
import matplotlib.pyplot as plt
from unified_compressor_simulator import run_simulation as simulate_unified

# Configuración por defecto integrada (sin depender de archivo externo)
config_default = {
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
        "restart_band_psi": 5.0
    },
    "demand": {
        "constant_scfm": 210.0
    },
    "simulation": {
        "start_pressure_psi": 110.0,
        "duration_min": 10,
        "interval_sec": 1
    },
    "output": {
        "metric": "current_A"
    }
}

def run_simulation():
    cfg = copy.deepcopy(config_default)
    try:
        cfg["motor"]["hp"] = float(entry_hp.get())
        cfg["motor"]["voltage_ll"] = float(entry_v.get())
        cfg["motor"]["efficiency"] = float(entry_eff.get())
        cfg["motor"]["power_factor"] = float(entry_pf.get())
        cfg["compressor"]["storage_volume_gal"] = float(entry_gal.get())
        cfg["compressor"]["max_output_scfm_per_hp"] = float(entry_scfm_hp.get())
        cfg["control"]["setpoint_high_psi"] = float(entry_high.get())
        cfg["control"]["setpoint_low_psi"] = float(entry_low.get())
        cfg["control"]["unload_power_frac"] = float(entry_unload.get())
        cfg["control"]["pf_noload"] = float(entry_pf_noload.get())
        cfg["control"]["pct_per_2psi"] = float(entry_pct2.get())
        cfg["control"]["use_linear_pressure_rule"] = bool(var_use_linear.get())
        cfg["control"]["reference_pressure_psi"] = float(entry_refp.get())
        cfg["control"]["noload_shutdown_min"] = float(entry_noload.get())
        cfg["demand"]["constant_scfm"] = float(entry_demand.get())
        cfg["simulation"]["duration_min"] = float(entry_dur.get())
        cfg["simulation"]["interval_sec"] = float(entry_interval.get())
        cfg["simulation"]["start_pressure_psi"] = float(entry_start_p.get())
    except Exception as e:
        messagebox.showerror("Entrada inválida", str(e))
        return

    # Usar el simulador unificado
    result = simulate_unified(cfg)
    if not result["success"]:
        messagebox.showerror("Error de simulación", "La simulación falló")
        return
    
    # Convertir de vuelta a DataFrame para mantener compatibilidad
    import pandas as pd
    df = pd.DataFrame(result["data"])

    # Calcular promedios correctos y kWh/h normalizado
    dt_min = cfg["simulation"]["interval_sec"] / 60.0
    duration_min = float(cfg["simulation"]["duration_min"])
    duration_h = duration_min / 60.0

    # Promedio de corriente ponderado por tiempo (sum(I*dt)/T)
    avg_current_timeweighted = (df["current_A"] * dt_min).sum() / max(duration_min, 1e-9)

    # Promedio de kW ponderado (suma input_kw*dt)/T -> equivalente a total_kwh / duration_h
    total_kwh = df["kwh_step"].sum()  # kWh total en toda la simulación
    kwh_per_hour = total_kwh / max(duration_h, 1e-9)  # kWh por hora normalizado

    # Graficar (misma escala eje y)
    fig, ax = plt.subplots(figsize=(10,5))
    ax.plot(df["t_min"], df["pressure_psi"], linestyle="--", label="Presión (psi)")
    ax.plot(df["t_min"], df["current_A"], linestyle=":", label="Corriente (A)")
    ax.set_xlabel("Tiempo (min)")
    ax.set_ylabel("Presión (psi) / Corriente (A)")
    ax.set_title("Simulación de Compresor")
    ax.legend()

    # Mostrar promedios FUERA de la gráfica (debajo del título)
    plt.figtext(0.12, 0.92,
                f"Corriente promedio (ponderada): {avg_current_timeweighted:.2f} A    |    kWh/h: {kwh_per_hour:.2f}",
                ha="left", fontsize=10)

    plt.tight_layout(rect=[0,0,1,0.9])
    plt.show()

# Construcción GUI
root = tk.Tk()
root.title("Compressor Simulator - Menu")

frm = ttk.Frame(root, padding=10)
frm.grid()

def get_def(section, key, default=""):
    try:
        return str(config_default[section][key])
    except Exception:
        return default

labels = [
    ("Motor HP", ("motor","hp")),
    ("Voltaje LL (V)", ("motor","voltage_ll")),
    ("Eficiencia", ("motor","efficiency")),
    ("PF (load)", ("motor","power_factor")),
    ("Volumen gal (storage)", ("compressor","storage_volume_gal")),
    ("SCFM/HP", ("compressor","max_output_scfm_per_hp")),
    ("Presión alta (psi)", ("control","setpoint_high_psi")),
    ("Presión baja (psi)", ("control","setpoint_low_psi")),
    ("Frac. Unload (0-1)", ("control","unload_power_frac")),
    ("PF NoLoad", ("control","pf_noload")),
    ("Pct per 2psi (ej. 1.0 -> 1%/2psi)", ("control","pct_per_2psi")),
    ("Ref Pressure (psi) (fija)", ("control","reference_pressure_psi")),
    ("Shutdown NOLOAD (min)", ("control","noload_shutdown_min")),
    ("Demanda SCFM", ("demand","constant_scfm")),
    ("Duración (min)", ("simulation","duration_min")),
    ("Intervalo (s)", ("simulation","interval_sec")),
    ("Presión inicial (psi)", ("simulation","start_pressure_psi"))
]

entries = []
for i, (label_text, (sec,key)) in enumerate(labels):
    ttk.Label(frm, text=label_text).grid(row=i, column=0, sticky="w", pady=2)
    e = ttk.Entry(frm, width=18)
    e.insert(0, get_def(sec,key,""))
    e.grid(row=i, column=1, pady=2)
    entries.append(e)

(entry_hp, entry_v, entry_eff, entry_pf,
 entry_gal, entry_scfm_hp,
 entry_high, entry_low, entry_unload,
 entry_pf_noload, entry_pct2, entry_refp,
 entry_noload, entry_demand, entry_dur,
 entry_interval, entry_start_p) = entries

var_use_linear = tk.IntVar(value=1 if config_default["control"].get("use_linear_pressure_rule", True) else 0)
chk = ttk.Checkbutton(frm, text="Usar regla lineal 1%/2psi", variable=var_use_linear)
chk.grid(row=len(labels), column=0, columnspan=2, pady=(6,0))

ttk.Button(frm, text="Run Simulation", command=run_simulation).grid(row=len(labels)+1, column=0, columnspan=2, pady=8)

root.mainloop()
