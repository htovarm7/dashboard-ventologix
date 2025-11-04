"use client";

import { useState, useEffect } from "react";
import BackButton from "@/components/BackButton";

interface SelectedCompressor {
  id: string;
  linea: string;
  alias: string;
  numero_cliente: number;
  nombre_cliente: string;
  numero_serie?: string;
}

const CreateReport = () => {
  const [selectedCompressor, setSelectedCompressor] =
    useState<SelectedCompressor | null>(null);

  useEffect(() => {
    // Leer el compresor seleccionado del sessionStorage
    const compressorData = sessionStorage.getItem(
      "selectedCompressorForReport"
    );
    if (compressorData) {
      try {
        const parsedData = JSON.parse(compressorData);
        setSelectedCompressor(parsedData);
      } catch (error) {
        console.error("Error parsing compressor data:", error);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <BackButton />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          Crear Reporte de Mantenimiento
        </h1>

        {/* Mostrar información del compresor seleccionado */}
        {selectedCompressor && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Compresor Seleccionado
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-blue-800">Alias:</span>{" "}
                <span className="text-blue-700">
                  {selectedCompressor.alias}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-800">Línea:</span>{" "}
                <span className="text-blue-700">
                  {selectedCompressor.linea}
                </span>
              </div>
              {selectedCompressor.numero_serie && (
                <div>
                  <span className="font-medium text-blue-800">N° Serie:</span>{" "}
                  <span className="text-blue-700">
                    {selectedCompressor.numero_serie}
                  </span>
                </div>
              )}
              <div>
                <span className="font-medium text-blue-800">Cliente:</span>{" "}
                <span className="text-blue-700">
                  {selectedCompressor.nombre_cliente}
                </span>
              </div>
            </div>
          </div>
        )}

        {!selectedCompressor && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              No se ha seleccionado ningún compresor específico. El reporte será
              general.
            </p>
          </div>
        )}

        <p className="text-gray-700">
          Aquí puedes crear un nuevo reporte de mantenimiento
          {selectedCompressor && ` para ${selectedCompressor.alias}`}.
        </p>
      </div>
    </div>
  );
};

export default CreateReport;
