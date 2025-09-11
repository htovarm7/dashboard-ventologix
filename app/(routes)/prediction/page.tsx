"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserData } from "@/lib/types";
import Image from "next/image";

const PredictiveModel = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const router = useRouter();

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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

        if (!parsedUserData.numero_cliente) {
          setError("Número de cliente no disponible");
          return;
        }

        setUserData(parsedUserData);
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
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const plotUrl = `${API_BASE_URL}/web/forecast/plot?numero_cliente=${encodeURIComponent(
    userData.numero_cliente
  )}`;

  return (
    <main className="min-h-screen bg-blue-100 p-4">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Modelo Predictivo</h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Predicción de Consumo</h2>

          <div className="flex justify-center">
            {imageLoading && (
              <div className="flex items-center justify-center w-[800px] h-[600px] border border-gray-300 rounded bg-gray-50">
                <div className="text-gray-500">Cargando gráfico...</div>
              </div>
            )}
            <Image
              src={plotUrl}
              alt="Gráfico predictivo de consumo"
              width={1600}
              height={1000}
              className={`max-w-full h-auto border border-gray-300 rounded ${
                imageLoading ? "hidden" : "block"
              }`}
              onError={() => {
                console.error("Error loading plot image");
                setError("Error al cargar el gráfico predictivo");
                setImageLoading(false);
              }}
              onLoad={() => {
                console.log("Plot image loaded successfully");
                setImageLoading(false);
              }}
            />
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default PredictiveModel;
