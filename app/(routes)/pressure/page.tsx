"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { UserData } from "@/lib/types";
import { URL_API } from "@/lib/global";
import BackButton from "@/components/BackButton";

// Helper function outside component to avoid re-creation
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

interface PressureStats {
  presion_promedio: number;
  tiempo_total_horas: number;
  tiempo_total_minutos: number;
  pendiente_subida: number;
  pendiente_bajada: number;
  variabilidad_relativa: number;
  indice_estabilidad: number;
  eventos_criticos_total: number;
}

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
  const router = useRouter();

  const IMAGE_TIMEOUT = 180000;

  const minDate = new Date("2025-09-30");
  const maxDate = new Date();

  const generateImageUrl = useCallback(
    (numeroCliente: string, fecha: string) => {
      const timestamp = Date.now();
      return `${URL_API}/web/beta/pressure-plot?numero_cliente=${encodeURIComponent(
        numeroCliente
      )}&fecha=${encodeURIComponent(fecha)}&t=${timestamp}`;
    },
    []
  );

  const generateStatsUrl = useCallback(
    (numeroCliente: string, fecha: string) => {
      return `${URL_API}/web/beta/pressure-stats?numero_cliente=${encodeURIComponent(
        numeroCliente
      )}&fecha=${encodeURIComponent(fecha)}`;
    },
    []
  );

  const loadPressureStats = useCallback(
    async (numeroCliente: string, fecha: string) => {
      try {
        const url = generateStatsUrl(numeroCliente, fecha);
        const response = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(30000),
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
    async (numeroCliente: string, fecha: string) => {
      try {
        const url = generateImageUrl(numeroCliente, fecha);

        const response = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(IMAGE_TIMEOUT),
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
    [IMAGE_TIMEOUT, generateImageUrl]
  );

  const loadPressureAnalysis = useCallback(
    async (numeroCliente: string, fecha: string) => {
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
          signal: AbortSignal.timeout(5000),
        });

        if (!healthCheck.ok) {
          throw new Error("API no disponible");
        }

        setLoadingProgress("Cargando imagen y estadísticas en paralelo...");

        // Load both image and stats in parallel
        await Promise.all([
          loadPressureImage(numeroCliente, fecha),
          loadPressureStats(numeroCliente, fecha),
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
      loadPressureAnalysis(userData.numero_cliente.toString(), dateStr);
    }
  }, [userData?.numero_cliente, selectedDate, loadPressureAnalysis]);

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
    loadPressureAnalysis(userData.numero_cliente.toString(), dateStr);
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
    const loadUserData = () => {
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

        // Para todos los usuarios, solo mostrar selector de fecha
        setSelectedDate(new Date());
      } catch (err) {
        console.error("Error loading user data:", err);
        setError("Error al cargar los datos de usuario");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [router]);

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
              {userData && (
                <p className="text-lg text-gray-600 mt-2">
                  Usuario: {userData.name}
                </p>
              )}
            </div>
          </div>

          {/* Selector de Fecha */}
          {showDateSelector && (
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">
                Seleccionar Fecha para Análisis
              </h2>
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
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Análisis de Presión -{" "}
                  {selectedDate ? formatDateForAPI(selectedDate) : ""}
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
