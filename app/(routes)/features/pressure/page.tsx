"use client";

import { useEffect, useState, useCallback } from "react";
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
    null
  );
  const [imageReady, setImageReady] = useState(false);
  const [statsReady, setStatsReady] = useState(false);
  const [pressureConfig, setPressureConfig] = useState<PressureConfig>({
    presion_max: 120,
    presion_min: 100,
    presion_alerta: 95,
    v_tanque: 700,
  });
  const [configDraft, setConfigDraft] = useState<PressureConfig>({
    presion_max: 120,
    presion_min: 100,
    presion_alerta: 95,
    v_tanque: 700,
  });
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [devices, setDevices] = useState<RTUDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<RTUDevice | null>(null);
  const router = useRouter();

  const minDate = new Date("2025-09-30");
  const maxDate = new Date();

  const loadDevices = useCallback(async (numeroCliente: string) => {
    try {
      const res = await fetch(
        `${URL_API}/pressure/devices?numero_cliente=${encodeURIComponent(numeroCliente)}`
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
        setPressureConfig(data.data);
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
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setConfigError(data.detail || "Error al guardar configuración");
        return;
      }
      setPressureConfig(configDraft);
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
        numeroCliente
      )}&fecha=${encodeURIComponent(fecha)}&t=${timestamp}`;
      return rtuId != null ? `${base}&rtu_id=${rtuId}` : base;
    },
    []
  );

  const generateStatsUrl = useCallback(
    (numeroCliente: string, fecha: string, rtuId?: number) => {
      const base = `${URL_API}/pressure/stats?numero_cliente=${encodeURIComponent(
        numeroCliente
      )}&fecha=${encodeURIComponent(fecha)}`;
      return rtuId != null ? `${base}&rtu_id=${rtuId}` : base;
    },
    []
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
    [generateStatsUrl]
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
              "No se encontraron datos de presión para la fecha seleccionada"
            );
          }
          throw new Error(`Error del servidor: ${response.status}`);
        }

        const imageBlob = await response.blob();

        if (!imageBlob.type.startsWith("image/")) {
          throw new Error(
            "No se encontraron datos de presión para la fecha seleccionada"
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
    [generateImageUrl]
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
            "El servicio de análisis de presión no está disponible en este momento. Por favor, inténtelo más tarde."
          );
        } else if (error.message.includes("No se encontraron datos")) {
          setError(
            "No tiene un dispositivo instalado. Si lo desea contacte a su IQengineer"
          );
        } else {
          setError(
            "Error al cargar el análisis de presión. Por favor, inténtelo nuevamente."
          );
        }
        setShowDateSelector(true);
      } finally {
        setImageLoading(false);
      }
    },
    [loadPressureImage, loadPressureStats]
  );
  const retryImageLoad = useCallback(() => {
    if (userData?.numero_cliente && selectedDate) {
      setError(null);
      const dateStr = formatDateForAPI(selectedDate);
      loadPressureAnalysis(
        userData.numero_cliente.toString(),
        dateStr,
        selectedDevice?.RTU_id
      );
    }
  }, [userData?.numero_cliente, selectedDate, selectedDevice, loadPressureAnalysis]);

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
      selectedDevice?.RTU_id
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <BackButton />

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Análisis de Presión
              </h1>
            </div>
          </div>

          {/* Panel de Configuración de Métricas */}
          <div className="mb-6">
            <button
              onClick={() => {
                setShowConfigPanel((prev) => !prev);
                if (!showConfigPanel) setConfigDraft({ ...pressureConfig });
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm border ${
                showConfigPanel
                  ? "bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300"
                  : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
              }`}
            >
              <span>⚙️</span>
              {showConfigPanel ? "Cerrar configuración" : "Configurar métricas"}
            </button>

            {showConfigPanel && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Parámetros operacionales personalizados
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Presión máxima (psi)
                    </label>
                    <input
                      type="number"
                      value={configDraft.presion_max}
                      onChange={(e) =>
                        setConfigDraft((d) => ({
                          ...d,
                          presion_max: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Presión mínima (psi)
                    </label>
                    <input
                      type="number"
                      value={configDraft.presion_min}
                      onChange={(e) =>
                        setConfigDraft((d) => ({
                          ...d,
                          presion_min: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Presión alerta (psi)
                    </label>
                    <input
                      type="number"
                      value={configDraft.presion_alerta}
                      onChange={(e) =>
                        setConfigDraft((d) => ({
                          ...d,
                          presion_alerta: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Volumen tanque (L)
                    </label>
                    <input
                      type="number"
                      value={configDraft.v_tanque}
                      onChange={(e) =>
                        setConfigDraft((d) => ({
                          ...d,
                          v_tanque: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  Regla: Presión alerta &lt; Presión mínima &lt; Presión máxima
                </div>

                {configError && (
                  <div className="text-sm text-red-600 mb-3">{configError}</div>
                )}
                {configSuccess && (
                  <div className="text-sm text-green-600 mb-3">
                    ✓ Configuración guardada correctamente
                  </div>
                )}

                <button
                  onClick={saveConfig}
                  disabled={savingConfig}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingConfig ? "Guardando..." : "Guardar configuración"}
                </button>
              </div>
            )}
          </div>

          {/* Selector de Fecha */}
          {showDateSelector && (
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">
                Seleccionar Fecha para Análisis
              </h2>

              {/* Selector de dispositivo — solo visible si hay más de uno */}
              {devices.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dispositivo
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {devices.map((device) => (
                      <button
                        key={device.RTU_id}
                        onClick={() => setSelectedDevice(device)}
                        className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                          selectedDevice?.RTU_id === device.RTU_id
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"
                        }`}
                      >
                        {device.linea}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-2">
                    Fecha de análisis:
                  </label>
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    dateFormat="yyyy-MM-dd"
                    minDate={minDate}
                    maxDate={maxDate}
                    placeholderText="Selecciona una fecha"
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                  />
                </div>

                <button
                  onClick={handleDateSubmit}
                  disabled={!selectedDate || imageLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4 sm:mt-6"
                >
                  {imageLoading ? "Generando..." : "Generar Análisis"}
                </button>
              </div>
            </div>
          )}

          {/* Loading Progress */}
          {imageLoading && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <div className="absolute inset-0 rounded-full h-8 w-8 border-t-2 animate-pulse border-blue-300"></div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-lg mb-1 text-blue-900">
                    Procesando Análisis de Presión
                  </div>
                  <div className="text-blue-700">{loadingProgress}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="rounded-full h-3 overflow-hidden bg-blue-200">
                <div
                  className="h-3 rounded-full animate-pulse transition-all duration-1000 bg-gradient-to-r from-blue-500 to-indigo-500"
                  style={{
                    width: loadingProgress.includes("Iniciando")
                      ? "10%"
                      : loadingProgress.includes("Verificando")
                      ? "25%"
                      : loadingProgress.includes(
                          "Cargando imagen y estadísticas"
                        )
                      ? "70%"
                      : loadingProgress.includes("completado")
                      ? "100%"
                      : "50%",
                  }}
                ></div>
              </div>

              <div className="text-xs mt-2 text-blue-600">
                Tiempo estimado: 1-3 minutos • Cargando imagen
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && userData && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="text-red-800 font-medium mb-3">
                Error: {error}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={retryImageLoad}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Reintentar
                </button>
                <button
                  onClick={handleNewAnalysis}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Seleccionar Nueva Fecha
                </button>
              </div>
            </div>
          )}

          {/* Image Display - Only show when both image and stats are ready */}
          {imageUrl && pressureStats && imageReady && statsReady && (
            <div className="space-y-6">
              {/* Date Navigator */}
              {selectedDate && (
                <DateNavigator
                  currentDate={formatDateForAPI(selectedDate)}
                  onDateChange={(newDate) => {
                    const newDateObj = new Date(newDate + "T00:00:00");
                    setSelectedDate(newDateObj);
                    loadPressureAnalysis(
                      userData!.numero_cliente.toString(),
                      newDate,
                      selectedDevice?.RTU_id
                    );
                  }}
                  type="day"
                />
              )}

              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Análisis de Presión -{" "}
                  {selectedDate ? formatDateForAPI(selectedDate) : ""}
                  {selectedDevice && devices.length > 1 && (
                    <span className="ml-2 text-lg font-normal text-gray-500">
                      ({selectedDevice.linea})
                    </span>
                  )}
                </h2>
                <button
                  onClick={handleNewAnalysis}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Nuevo Análisis
                </button>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <Image
                  src={imageUrl}
                  alt={`Análisis de presión para ${
                    selectedDate ? formatDateForAPI(selectedDate) : ""
                  }`}
                  width={1800}
                  height={1000}
                  className="w-full h-auto rounded shadow-lg"
                  unoptimized
                />
              </div>

              {/* Analysis Info */}
              <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                <h3 className="text-2xl font-semibold text-blue-900 mb-3">
                  Métricas Operacionales
                </h3>

                <div className="text-xl text-black space-y-1">
                  <div>
                    • Presión promedio:{" "}
                    {pressureStats.presion_promedio.toFixed(2)} psi
                  </div>
                  <div>
                    • Tiempo total: {pressureStats.tiempo_total_horas}h{" "}
                    {pressureStats.tiempo_total_minutos}min
                  </div>
                  <div>
                    • Pendiente subida:{" "}
                    {pressureStats.pendiente_subida.toFixed(2)} psi/min
                  </div>
                  <div>
                    • Pendiente bajada:{" "}
                    {pressureStats.pendiente_bajada.toFixed(2)} psi/min
                  </div>
                  <div>
                    • Variabilidad relativa:{" "}
                    {pressureStats.variabilidad_relativa.toFixed(3)}
                  </div>
                  <div>
                    • Estabilidad ±5 psi:{" "}
                    {pressureStats.indice_estabilidad.toFixed(2)}%
                  </div>
                  <div>
                    • Eventos críticos: {pressureStats.eventos_criticos_total}
                  </div>
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
