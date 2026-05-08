"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { UserData, PressureConfig } from "@/lib/types";
import { URL_API } from "@/lib/global";
import BackButton from "@/components/BackButton";
import { PressureStats } from "@/lib/types";

interface RTUDevice {
  RTU_id: number;
  numero_serie_topico: string;
  linea: string;
}
import DateNavigator from "@/components/DateNavigator";
import { formatLocalDate } from "@/lib/dateUtils";

// Helper function outside component to avoid re-creation
const formatDateForAPI = (date: Date): string => {
  return formatLocalDate(date);
};

const PressureAnalysis = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] =
    useState<string>("Inicializando...");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDateSelector, setShowDateSelector] = useState(true);
  const [pressureStats, setPressureStats] = useState<PressureStats | null>(
    null,
  );
  const [imageReady, setImageReady] = useState(false);
  const [statsReady, setStatsReady] = useState(false);
  const [configDraft, setConfigDraft] = useState<PressureConfig>({
    presion_max: 120,
    presion_min: 100,
    presion_alerta: 95,
    v_tanque: 700,
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [devices, setDevices] = useState<RTUDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<RTUDevice | null>(null);
  const datePickerRef = useRef<DatePicker>(null);
  const router = useRouter();

  const minDate = new Date("2025-09-30");
  const maxDate = new Date();

  const loadDevices = useCallback(async (numeroCliente: string) => {
    try {
      const res = await fetch(
        `${URL_API}/pressure/devices?numero_cliente=${encodeURIComponent(numeroCliente)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDevices(data.data);
        if (data.data.length > 0) setSelectedDevice(data.data[0]);
      }
    } catch {
      // silencioso
    }
  }, []);

  const loadPressureConfig = useCallback(async (rtuId: number) => {
    try {
      const res = await fetch(`${URL_API}/pressure/config/${rtuId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data) {
        setConfigDraft(data.data);
      }
    } catch {
      // usa defaults si falla
    }
  }, []);

  const saveConfig = useCallback(async () => {
    if (!selectedDevice) return;
    setSavingConfig(true);
    setConfigError(null);
    setConfigSuccess(false);
    try {
      const res = await fetch(
        `${URL_API}/pressure/config/${selectedDevice.RTU_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(configDraft),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setConfigError(data.detail || "Error al guardar configuración");
        return;
      }
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch {
      setConfigError("Error de conexión al guardar configuración");
    } finally {
      setSavingConfig(false);
    }
  }, [selectedDevice, configDraft]);

  const generateImageUrl = useCallback(
    (numeroCliente: string, fecha: string, rtuId?: number) => {
      const timestamp = Date.now();
      const base = `${URL_API}/pressure/plot?numero_cliente=${encodeURIComponent(
        numeroCliente,
      )}&fecha=${encodeURIComponent(fecha)}&t=${timestamp}`;
      return rtuId != null ? `${base}&rtu_id=${rtuId}` : base;
    },
    [],
  );

  const generateStatsUrl = useCallback(
    (numeroCliente: string, fecha: string, rtuId?: number) => {
      const base = `${URL_API}/pressure/stats?numero_cliente=${encodeURIComponent(
        numeroCliente,
      )}&fecha=${encodeURIComponent(fecha)}`;
      return rtuId != null ? `${base}&rtu_id=${rtuId}` : base;
    },
    [],
  );

  const loadPressureStats = useCallback(
    async (numeroCliente: string, fecha: string, rtuId?: number) => {
      try {
        const url = generateStatsUrl(numeroCliente, fecha, rtuId);
        const response = await fetch(url, {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setPressureStats(data);
        setStatsReady(true);
        return data;
      } catch (err: unknown) {
        const error = err as Error;
        console.error("Error loading pressure stats:", error);
        setPressureStats(null);
        setStatsReady(false);
        throw error;
      }
    },
    [generateStatsUrl],
  );

  const loadPressureImage = useCallback(
    async (numeroCliente: string, fecha: string, rtuId?: number) => {
      try {
        const url = generateImageUrl(numeroCliente, fecha, rtuId);

        const response = await fetch(url, {
          method: "GET",
        });

        if (!response.ok) {
          if (response.status === 404 || response.status === 500) {
            throw new Error(
              "No se encontraron datos de presión para la fecha seleccionada",
            );
          }
          throw new Error(`Error del servidor: ${response.status}`);
        }

        const imageBlob = await response.blob();

        if (!imageBlob.type.startsWith("image/")) {
          throw new Error(
            "No se encontraron datos de presión para la fecha seleccionada",
          );
        }

        const imageUrl = URL.createObjectURL(imageBlob);
        setImageUrl(imageUrl);
        setImageReady(true);
        return imageUrl;
      } catch (err: unknown) {
        setImageUrl(null);
        setImageReady(false);
        throw err;
      }
    },
    [generateImageUrl],
  );

  const loadPressureAnalysis = useCallback(
    async (numeroCliente: string, fecha: string, rtuId?: number) => {
      setImageLoading(true);
      setError(null);
      setImageUrl(null);
      setPressureStats(null);
      setImageReady(false);
      setStatsReady(false);
      setLoadingProgress("Iniciando análisis...");

      try {
        setLoadingProgress("Verificando disponibilidad de la API...");
        const healthCheck = await fetch(`${URL_API}/docs`, {
          method: "HEAD",
        });

        if (!healthCheck.ok) {
          throw new Error("API no disponible");
        }

        setLoadingProgress("Cargando imagen y estadísticas en paralelo...");

        await Promise.all([
          loadPressureImage(numeroCliente, fecha, rtuId),
          loadPressureStats(numeroCliente, fecha, rtuId),
        ]);

        setLoadingProgress("¡Análisis de presión completado!");
        setShowDateSelector(false);
      } catch (err: unknown) {
        const error = err as Error;
        console.error("Error loading pressure analysis:", error);

        if (error.message.includes("API no disponible")) {
          setError(
            "El servicio de análisis de presión no está disponible en este momento. Por favor, inténtelo más tarde.",
          );
        } else if (error.message.includes("No se encontraron datos")) {
          setError(
            "No tiene un dispositivo instalado. Si lo desea contacte a su IQengineer",
          );
        } else {
          setError(
            "Error al cargar el análisis de presión. Por favor, inténtelo nuevamente.",
          );
        }
        setShowDateSelector(true);
      } finally {
        setImageLoading(false);
      }
    },
    [loadPressureImage, loadPressureStats],
  );
  const retryImageLoad = useCallback(() => {
    if (userData?.numero_cliente && selectedDate) {
      setError(null);
      const dateStr = formatDateForAPI(selectedDate);
      loadPressureAnalysis(
        userData.numero_cliente.toString(),
        dateStr,
        selectedDevice?.RTU_id,
      );
    }
  }, [
    userData?.numero_cliente,
    selectedDate,
    selectedDevice,
    loadPressureAnalysis,
  ]);

  const handleDateSubmit = () => {
    if (!selectedDate) {
      setError("Por favor seleccione una fecha");
      return;
    }

    if (!userData?.numero_cliente) {
      setError("Número de cliente no disponible");
      return;
    }

    const dateStr = formatDateForAPI(selectedDate);
    loadPressureAnalysis(
      userData.numero_cliente.toString(),
      dateStr,
      selectedDevice?.RTU_id,
    );
  };

  const handleNewAnalysis = () => {
    setImageUrl(null);
    setError(null);
    setShowDateSelector(true);
    setSelectedDate(null);
    setPressureStats(null);
    setImageReady(false);
    setStatsReady(false);
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUserData = sessionStorage.getItem("userData");

        if (!storedUserData) {
          setError("No se encontraron datos de usuario");
          router.push("/login");
          return;
        }

        const parsedUserData: UserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);

        if (!parsedUserData.numero_cliente) {
          setError("Número de cliente no disponible en los datos de usuario");
          return;
        }

        const clientStr = parsedUserData.numero_cliente.toString();
        await loadDevices(clientStr);
        setSelectedDate(new Date());
      } catch (err) {
        console.error("Error loading user data:", err);
        setError("Error al cargar los datos de usuario");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [router, loadDevices]);

  // Recarga la config del dispositivo cada vez que cambia el seleccionado
  useEffect(() => {
    if (selectedDevice) loadPressureConfig(selectedDevice.RTU_id);
  }, [selectedDevice, loadPressureConfig]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando análisis de presión...</div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <div className="text-red-500 text-lg mb-4">
          {error || "Error al cargar los datos"}
        </div>
        <button
          onClick={() => router.push("/home")}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  /** Collapsible Parámetros operacionales panel — reused in both phases */
  const configPanel = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <button
        type="button"
        onClick={() => setIsConfigOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-5 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-gray-800">Parámetros operacionales</h2>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isConfigOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isConfigOpen && (
        <div className="px-5 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {(
              [
                { key: "presion_max",   label: "Presión máxima", unit: "psi", color: "green"  },
                { key: "presion_min",   label: "Presión mínima", unit: "psi", color: "blue"   },
                { key: "presion_alerta",label: "Presión alerta", unit: "psi", color: "yellow" },
                { key: "v_tanque",      label: "Volumen tanque", unit: "L",   color: "purple" },
              ] as const
            ).map(({ key, label, unit, color }) => (
              <div key={key}>
                <label className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1.5">
                  <span>{label}</span>
                  <span className={`px-1.5 py-0.5 bg-${color}-50 text-${color}-700 rounded text-xs font-semibold`}>
                    {unit}
                  </span>
                </label>
                <input
                  type="number"
                  value={configDraft[key]}
                  onChange={(e) => setConfigDraft((d) => ({ ...d, [key]: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-xs text-gray-400">Alerta &lt; Mínima &lt; Máxima</p>
            {configError && <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{configError}</p>}
            {configSuccess && <p className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg font-medium">✓ Guardado correctamente</p>}
            <button
              onClick={saveConfig}
              disabled={savingConfig}
              className="ml-auto px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {savingConfig ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <BackButton />

        {/* Header */}
        <div className="mt-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Análisis de Presión</h1>
          {selectedDevice && (
            <p className="text-xl font-semibold text-blue-700 mt-1">
              {selectedDevice.linea}
            </p>
          )}
        </div>

        <div className="space-y-5">
            {/* Selector de Dispositivo + Fecha */}
            {showDateSelector && (
              <div className="space-y-4">
                {/* Selector de dispositivo */}
                {devices.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                      Selecciona un dispositivo
                    </p>
                    <div
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${
                        selectedDevice
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div
                        className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                          selectedDevice ? "bg-blue-500" : "bg-gray-200"
                        }`}
                      >
                        <svg
                          className={`w-5 h-5 ${selectedDevice ? "text-white" : "text-gray-500"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
                          />
                        </svg>
                      </div>
                      <select
                        value={selectedDevice?.RTU_id ?? ""}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          const device = devices.find((d) => d.RTU_id === id);
                          if (device) setSelectedDevice(device);
                        }}
                        className={`w-full bg-transparent text-l font-semibold focus:outline-none cursor-pointer ${
                          selectedDevice ? "text-blue-700" : "text-gray-500"
                        }`}
                      >
                        {devices.map((device) => (
                          <option key={device.RTU_id} value={device.RTU_id}>
                            {device.linea}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Selector de fecha */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                    Selecciona una fecha
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
                    <div className="flex-1">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => datePickerRef.current?.setOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            datePickerRef.current?.setOpen(true);
                          }
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors cursor-pointer ${
                          selectedDate
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <svg
                          className={`w-5 h-5 shrink-0 ${selectedDate ? "text-blue-500" : "text-gray-400"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <DatePicker
                          ref={datePickerRef}
                          selected={selectedDate}
                          onChange={(date) => setSelectedDate(date)}
                          dateFormat="yyyy-MM-dd"
                          minDate={minDate}
                          maxDate={maxDate}
                          placeholderText="Selecciona una fecha"
                          className={`w-full bg-transparent text-sm font-semibold focus:outline-none cursor-pointer ${
                            selectedDate ? "text-blue-700" : "text-gray-500"
                          }`}
                          showYearDropdown
                          showMonthDropdown
                          dropdownMode="select"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleDateSubmit}
                      disabled={
                        !selectedDate || !selectedDevice || imageLoading
                      }
                      className="px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      {imageLoading ? "Generando..." : "Generar análisis →"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {imageLoading && (
              <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative shrink-0">
                    <div className="animate-spin rounded-full h-9 w-9 border-2 border-blue-200 border-t-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      Procesando análisis
                    </p>
                    <p className="text-sm text-blue-600 mt-0.5">
                      {loadingProgress}
                    </p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
                    style={{
                      width: loadingProgress.includes("Iniciando")
                        ? "10%"
                        : loadingProgress.includes("Verificando")
                          ? "25%"
                          : loadingProgress.includes("Cargando imagen")
                            ? "70%"
                            : loadingProgress.includes("completado")
                              ? "100%"
                              : "50%",
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Tiempo estimado: 1–3 minutos
                </p>
              </div>
            )}

            {/* Error */}
            {error && userData && (
              <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                <p className="text-red-700 font-medium mb-4">{error}</p>
                <div className="flex gap-3">
                  <button
                    onClick={retryImageLoad}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reintentar
                  </button>
                  <button
                    onClick={handleNewAnalysis}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Nueva fecha
                  </button>
                </div>
              </div>
            )}

            {/* Resultados */}
            {imageUrl && pressureStats && imageReady && statsReady && (
              <div className="space-y-5">
                {/* Navegador de fechas */}
                {selectedDate && (
                  <DateNavigator
                    currentDate={formatDateForAPI(selectedDate)}
                    onDateChange={(newDate) => {
                      const newDateObj = new Date(newDate + "T00:00:00");
                      setSelectedDate(newDateObj);
                      loadPressureAnalysis(
                        userData!.numero_cliente.toString(),
                        newDate,
                        selectedDevice?.RTU_id,
                      );
                    }}
                    type="day"
                  />
                )}

                {/* Título + botón nuevo análisis */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">
                    {selectedDate ? formatDateForAPI(selectedDate) : ""}
                  </h2>
                  <button
                    onClick={handleNewAnalysis}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    ← Nueva fecha
                  </button>
                </div>

                {/* Parámetros operacionales — arriba de la gráfica */}
                {configPanel}

                {/* Gráfica — ancho completo */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <Image
                    src={imageUrl}
                    alt={`Análisis de presión para ${selectedDate ? formatDateForAPI(selectedDate) : ""}`}
                    width={1800}
                    height={1000}
                    className="w-full h-auto rounded-lg"
                    unoptimized
                  />
                </div>

                {/* Métricas operacionales */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-4">
                    Métricas operacionales
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Presión promedio",    value: `${pressureStats.presion_promedio.toFixed(2)} psi`,                                    color: "blue"   },
                      { label: "Tiempo total",        value: `${pressureStats.tiempo_total_horas}h ${pressureStats.tiempo_total_minutos ?? 0}min`,   color: "indigo" },
                      { label: "Pendiente subida",    value: `${pressureStats.pendiente_subida.toFixed(2)} psi/min`,                                color: "green"  },
                      { label: "Pendiente bajada",    value: `${pressureStats.pendiente_bajada.toFixed(2)} psi/min`,                                color: "orange" },
                      { label: "Variabilidad relativa", value: pressureStats.variabilidad_relativa.toFixed(3),                                      color: "purple" },
                      { label: "Estabilidad ±5 psi", value: `${pressureStats.indice_estabilidad.toFixed(2)}%`,                                     color: "teal"   },
                      { label: "Eventos críticos",   value: pressureStats.eventos_criticos_total.toString(), color: pressureStats.eventos_criticos_total > 0 ? "red" : "green" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <p className={`text-lg font-bold text-${color}-600`}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PressureAnalysis;
