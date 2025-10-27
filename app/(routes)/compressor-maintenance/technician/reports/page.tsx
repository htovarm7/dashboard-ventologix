"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import { Compresor } from "@/types/common";

const Reportes = () => {
  const router = useRouter();
  const [compressors, setCompressors] = useState<Compresor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompressor, setSelectedCompressor] =
    useState<Compresor | null>(null);

  useEffect(() => {
    const verifyAndLoadUser = async () => {
      const userData = sessionStorage.getItem("userData");
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          const compresores = parsedData.compresores || [];
          setCompressors(compresores);

          console.log(userData);
        } catch (error) {
          console.error("Error parsing userData from sessionStorage:", error);
          sessionStorage.removeItem("userData");
        }
      }
    };

    verifyAndLoadUser();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSelectedCompressor(null);
    } else {
      const filtered = compressors.filter((comp) => {
        const compressorName =
          comp.alias ||
          comp.alias ||
          `Compresor ${comp.linea || comp.linea || comp.id_compresor || ""}`;
        return compressorName.toLowerCase().includes(searchQuery.toLowerCase());
      });

      // Si hay exactamente un resultado, seleccionarlo automáticamente
      if (filtered.length === 1) {
        setSelectedCompressor(filtered[0]);
      } else {
        setSelectedCompressor(null);
      }
    }
  }, [searchQuery, compressors]);

  const handleCreateReport = () => {
    if (selectedCompressor) {
      // Enviar información del compresor seleccionado
      const compressorData = {
        id: selectedCompressor.id_compresor || selectedCompressor.id_compresor,
        linea: selectedCompressor.linea || selectedCompressor.linea,
        alias: selectedCompressor.alias || selectedCompressor.alias,
        numero_cliente: selectedCompressor.numero_cliente,
        nombre_cliente: selectedCompressor.nombre_cliente,
      };

      // Guardar en sessionStorage para que la página de create lo pueda usar
      sessionStorage.setItem(
        "selectedCompressorForReport",
        JSON.stringify(compressorData)
      );
    }

    router.push("/compressor-maintenance/technician/reports/create");
  };

  const handleViewAllReports = () => {
    router.push("/compressor-maintenance/technician/reports/all-reports");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <BackButton />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-900">
          Gestión de Reportes
        </h1>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar compresor por nombre para crear reporte específico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>

          {/* Selected Compressor Display */}
          {selectedCompressor && (
            <div className="mt-4 max-w-2xl mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-blue-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <div>
                    <p className="text-blue-800 font-semibold">
                      Compresor seleccionado:{" "}
                      {selectedCompressor.alias ||
                        selectedCompressor.alias ||
                        `Compresor ${
                          selectedCompressor.linea || selectedCompressor.linea
                        }`}
                    </p>
                    <p className="text-blue-600 text-sm">
                      Cliente:{" "}
                      {selectedCompressor.nombre_cliente ||
                        `Cliente ${selectedCompressor.numero_cliente}`}
                      | Línea:{" "}
                      {selectedCompressor.linea || selectedCompressor.linea}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <button
            onClick={handleCreateReport}
            className="group relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-8 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
          >
            <div className="flex items-center space-x-4">
              <svg
                className="w-10 h-10 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <div className="text-left">
                <h2 className="text-2xl font-bold mb-1">
                  {selectedCompressor
                    ? "Crear Reporte Específico"
                    : "Crear Reporte"}
                </h2>
                <p className="text-blue-100 text-base">
                  {selectedCompressor
                    ? `Para: ${
                        selectedCompressor.alias ||
                        selectedCompressor.alias ||
                        "Compresor seleccionado"
                      }`
                    : "Generar un nuevo reporte de mantenimiento"}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={handleViewAllReports}
            className="group relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-8 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
          >
            <div className="flex items-center space-x-4">
              <svg
                className="w-10 h-10 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div className="text-left">
                <h2 className="text-2xl font-bold mb-1">Todos los Reportes</h2>
                <p className="text-blue-100 text-base">
                  Ver y gestionar reportes existentes
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 text-lg">
            {selectedCompressor
              ? "Compresor seleccionado. Haz clic en 'Crear Reporte Específico' para continuar."
              : "Busca un compresor específico o selecciona una opción para continuar"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reportes;
