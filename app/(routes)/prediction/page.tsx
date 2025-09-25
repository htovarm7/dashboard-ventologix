"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserData } from "@/lib/types";
import { URL_API } from "@/lib/global";
import BackButton from "@/components/BackButton";

const PredictiveModel = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] =
    useState<string>("Inicializando...");
  const router = useRouter();

  const IMAGE_TIMEOUT = 180000;

  const generateImageUrl = useCallback((numeroCliente: string) => {
    // Agregar timestamp para evitar cache problems
    const timestamp = Date.now();
    return `${URL_API}/web/beta/consumption_prediction?numero_cliente=${encodeURIComponent(
      numeroCliente
    )}&t=${timestamp}`;
  }, []);

  const loadPredictionImage = useCallback(
    async (numeroCliente: string) => {
      setImageLoading(true);
      setError(null);
      setLoadingProgress("Conectando con la API...");

      try {
        const url = generateImageUrl(numeroCliente);

        // Pre-check if API is responding
        setLoadingProgress("Verificando disponibilidad de la API...");
        const healthCheck = await fetch(`${URL_API}/docs`, {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        });

        if (!healthCheck.ok) {
          throw new Error("API no disponible");
        }

        setLoadingProgress(
          "Generando predicción (esto puede tomar 1-3 minutos)..."
        );

        // Use a timeout for the image load
        const imageLoadPromise = new Promise<string>((resolve, reject) => {
          const img = new window.Image();
          const timeoutId = setTimeout(() => {
            reject(
              new Error(
                "Timeout: La generación del gráfico está tomando más tiempo del esperado"
              )
            );
          }, IMAGE_TIMEOUT);

          img.onload = () => {
            clearTimeout(timeoutId);
            resolve(url);
          };

          img.onerror = () => {
            clearTimeout(timeoutId);
            reject(new Error("Error al cargar el gráfico predictivo"));
          };

          img.src = url;
        });

        const resultUrl = await imageLoadPromise;
        setImageUrl(resultUrl);
        setLoadingProgress("¡Gráfico cargado exitosamente!");
      } catch (err) {
        console.error("Error loading prediction image:", err);
      } finally {
        setImageLoading(false);
      }
    },
    [generateImageUrl, IMAGE_TIMEOUT]
  );

  const retryImageLoad = useCallback(() => {
    if (userData?.numero_cliente) {
      setError(null);
      setImageUrl(null);
      loadPredictionImage(userData.numero_cliente.toString());
    }
  }, [userData?.numero_cliente, loadPredictionImage]);

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

        loadPredictionImage(parsedUserData.numero_cliente.toString());
      } catch (err) {
        console.error("Error loading user data:", err);
        setError("Error al cargar los datos de usuario");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando modelo predictivo...</div>
      </div>
    );
  }

  if (error || !userData) {
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
        {userData && (
          <button
            onClick={retryImageLoad}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-blue-100 p-4">
      <BackButton className=" absolute top-0 left-0" />
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Modelo Predictivo</h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Predicción de Consumo</h2>

          <div className="flex flex-col items-center">
            {imageLoading && (
              <div className="flex flex-col items-center justify-center w-[800px] h-[600px] border border-gray-300 rounded bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <div className="text-gray-600 text-center px-4">
                  <p className="font-medium">{loadingProgress}</p>
                </div>
              </div>
            )}

            {imageUrl && !imageLoading && (
              <div className="w-full flex justify-center">
                <Image
                  src={imageUrl}
                  alt="Gráfico predictivo de consumo"
                  width={1600}
                  height={1000}
                  className="max-w-full h-auto border border-gray-300 rounded shadow-lg"
                  priority={true}
                  unoptimized={true}
                />
              </div>
            )}

            {!imageLoading && !imageUrl && !error && (
              <div className="flex items-center justify-center w-[800px] h-[600px] border border-gray-300 rounded bg-gray-50">
                <div className="text-gray-500">
                  No se pudo cargar el gráfico
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Error al cargar el gráfico</h3>
                  <p className="text-sm mt-1">{error}</p>
                </div>
                <button
                  onClick={retryImageLoad}
                  className="ml-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default PredictiveModel;
