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
  const [isExampleMode, setIsExampleMode] = useState(false);
  const router = useRouter();

  const IMAGE_TIMEOUT = 180000;

  const minDate = new Date("2025-09-01");
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

  const loadPressureImage = useCallback(
    async (numeroCliente: string, fecha: string, isRetry: boolean = false) => {
      // Helper functions inside useCallback to avoid dependency issues
      const formatDateForAPI = (date: Date): string => {
        return date.toISOString().split("T")[0];
      };

      const generateRandomDate = (): Date => {
        const minTime = minDate.getTime();
        const maxTime = maxDate.getTime();
        const randomTime = minTime + Math.random() * (maxTime - minTime);
        return new Date(randomTime);
      };

      setImageLoading(true);
      setError(null);
      setImageUrl(null); // Limpiar imagen anterior
      setLoadingProgress("Iniciando análisis...");

      try {
        const url = generateImageUrl(numeroCliente, fecha);

        setLoadingProgress("Verificando disponibilidad de la API...");
        const healthCheck = await fetch(`${URL_API}/docs`, {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        });

        if (!healthCheck.ok) {
          throw new Error("API no disponible");
        }

        setLoadingProgress(
          `Buscando datos de presión para cliente ${numeroCliente}...`
        );

        // Primero intentar hacer una petición fetch para verificar si hay datos
        const response = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(IMAGE_TIMEOUT),
        });

        // Si la respuesta no es una imagen (es JSON con error), usar ejemplo
        const contentType = response.headers.get("content-type");
        if (!response.ok || !contentType?.includes("image")) {
          const errorData = await response.json().catch(() => null);
          if (errorData?.error && !isRetry && numeroCliente !== "1009") {
            // Si no hay datos para este cliente, usar ejemplo con cliente 1009
            setLoadingProgress(
              "No hay datos de presión para este cliente. Preparando ejemplo..."
            );
            setIsExampleMode(true);
            const randomDate = generateRandomDate();
            setSelectedDate(randomDate);
            const exampleDateStr = formatDateForAPI(randomDate);

            // Pequeño delay para mostrar el mensaje
            await new Promise((resolve) => setTimeout(resolve, 1500));

            setLoadingProgress(
              `Cargando ejemplo de análisis (fecha: ${exampleDateStr})...`
            );
            return loadPressureImage("1009", exampleDateStr, true);
          }
          throw new Error(
            errorData?.error || "No se encontraron datos de presión"
          );
        }

        setLoadingProgress("Procesando datos y generando gráfico...");

        // Si llegamos aquí, la respuesta es una imagen válida
        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);

        setImageUrl(imageUrl);
        setLoadingProgress("¡Análisis de presión completado!");
        setShowDateSelector(false);
      } catch (err: unknown) {
        const error = err as Error;
        console.error("Error loading pressure image:", error);

        // Si hay error y no es un retry, intentar con ejemplo
        if (
          !isRetry &&
          numeroCliente !== "1009" &&
          !error.message.includes("API no disponible")
        ) {
          setLoadingProgress(
            "Error en datos del cliente. Cambiando a ejemplo..."
          );
          setIsExampleMode(true);
          const randomDate = generateRandomDate();
          setSelectedDate(randomDate);
          const exampleDateStr = formatDateForAPI(randomDate);

          // Pequeño delay para mostrar el mensaje
          await new Promise((resolve) => setTimeout(resolve, 1500));

          setLoadingProgress(
            `Cargando ejemplo con (fecha: ${exampleDateStr})...`
          );
          return loadPressureImage("1009", exampleDateStr, true);
        }

        setError(error.message || "Error al cargar el análisis de presión");
        setShowDateSelector(true);
      } finally {
        setImageLoading(false);
      }
    },
    [IMAGE_TIMEOUT, minDate, maxDate, generateImageUrl]
  );
  const retryImageLoad = useCallback(() => {
    if (userData?.numero_cliente && selectedDate) {
      setError(null);
      setImageUrl(null);
      setIsExampleMode(false); // Reset example mode on retry
      const dateStr = formatDateForAPI(selectedDate);
      loadPressureImage(userData.numero_cliente.toString(), dateStr);
    }
  }, [userData?.numero_cliente, selectedDate, loadPressureImage]);

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
    setIsExampleMode(false);
    loadPressureImage(userData.numero_cliente.toString(), dateStr);
  };

  const handleNewAnalysis = () => {
    setImageUrl(null);
    setError(null);
    setShowDateSelector(true);
    setSelectedDate(null);
    setIsExampleMode(false);
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

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        setSelectedDate(yesterday);
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
                Análisis de Presión {isExampleMode ? "(Ejemplo)" : ""}
              </h1>
              {userData && (
                <p className="text-lg text-gray-600 mt-2">
                  Cliente: {userData.name} (
                  {isExampleMode ? "Ejemplo" : userData.numero_cliente})
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
                  <div className="absolute inset-0 rounded-full h-8 w-8 border-t-2 border-blue-300 animate-pulse"></div>
                </div>
                <div className="flex-1">
                  <div className="text-blue-900 font-semibold text-lg mb-1">
                    Procesando Análisis de Presión
                  </div>
                  <div className="text-blue-700">{loadingProgress}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="bg-blue-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full animate-pulse transition-all duration-1000"
                  style={{
                    width: loadingProgress.includes("Iniciando")
                      ? "10%"
                      : loadingProgress.includes("Verificando")
                      ? "25%"
                      : loadingProgress.includes("Buscando")
                      ? "40%"
                      : loadingProgress.includes("No hay datos") ||
                        loadingProgress.includes("Error en datos")
                      ? "60%"
                      : loadingProgress.includes("Preparando") ||
                        loadingProgress.includes("Cambiando")
                      ? "70%"
                      : loadingProgress.includes("Cargando ejemplo")
                      ? "85%"
                      : loadingProgress.includes("Procesando")
                      ? "95%"
                      : "100%",
                  }}
                ></div>
              </div>

              {/* Estimated time */}
              <div className="text-xs text-blue-600 mt-2">
                {loadingProgress.includes("ejemplo")
                  ? "Tiempo estimado: 30-60 segundos"
                  : "Tiempo estimado: 1-3 minutos"}
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

          {/* Image Display */}
          {imageUrl && (
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
                  width={1200}
                  height={600}
                  className="w-full h-auto rounded shadow-lg"
                  unoptimized
                />
              </div>

              {/* Analysis Info */}
              <div
                className={`p-4 rounded-lg border ${
                  isExampleMode
                    ? "bg-orange-50 border-orange-200"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-sm ${
                    isExampleMode ? "text-orange-800" : "text-blue-800"
                  }`}
                >
                  {isExampleMode && (
                    <div className="md:col-span-2">
                      <span className="font-medium">Nota:</span> Este es un
                      ejemplo con datos reales para demostrar el análisis de
                      presión.
                    </div>
                  )}
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
