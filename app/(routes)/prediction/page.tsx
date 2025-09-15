"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserData } from "@/lib/types";
import { URL_API } from "@/lib/global";

interface SelectedCompresor {
  numero_cliente: string;
  id_cliente: number;
  linea: string;
  alias?: string;
  date?: string;
  [key: string]: string | number | undefined;
}

const PredictiveModel = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedCompresor, setSelectedCompresor] =
    useState<SelectedCompresor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUserData = () => {
      try {
        const storedUserData = sessionStorage.getItem("userData");
        const storedCompresorData = sessionStorage.getItem("selectedCompresor");

        if (!storedUserData) {
          setError("No se encontraron datos de usuario");
          router.push("/login");
          return;
        }

        const parsedUserData: UserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);

        if (!storedCompresorData) {
          setError(
            "No hay compresor seleccionado. Por favor selecciona un compresor desde la página principal."
          );
          return;
        }

        const parsedCompresorData = JSON.parse(storedCompresorData);

        if (!parsedCompresorData.numero_cliente) {
          setError(
            "Número de cliente no disponible en el compresor seleccionado"
          );
          return;
        }

        setSelectedCompresor(parsedCompresorData);
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

  if (error || !userData || !selectedCompresor) {
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

  const plotUrl = `${URL_API}/web/forecast/plot?numero_cliente=${encodeURIComponent(
    selectedCompresor.numero_cliente
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
