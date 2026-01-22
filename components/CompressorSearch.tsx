"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { URL_API } from "@/lib/global";

interface CompressorSearchResult {
  hp: number;
  tipo: string;
  marca: string;
  numero_serie: number;
  anio: number;
  id_cliente: number;
  alias: string;
  nombre_cliente: string;
  numero_cliente: number;
}

export default function CompressorSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CompressorSearchResult[]>(
    []
  );
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Search for compressors
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await fetch(
        `${URL_API}/compresores/compresor-cliente/${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (data.data) {
        setSearchResults(data.data);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error("Error al buscar compresores:", error);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSelectCompressor = (compressor: CompressorSearchResult) => {
    // Navigate to create page with compressor data
    const params = new URLSearchParams({
      compressorId: compressor.numero_serie.toString(),
      serialNumber: compressor.numero_serie.toString(),
      clientId: compressor.id_cliente.toString(),
      clientName: compressor.nombre_cliente,
      brand: compressor.marca,
      model: compressor.alias,
      hp: compressor.hp.toString(),
      year: compressor.anio.toString(),
      tipo: compressor.tipo,
    });

    router.push(
      `/features/compressor-maintenance/technician/reports/create?${params.toString()}`
    );
  };

  return (
    <>
      {/* Search Bar Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          🔍 Buscar Compresor para Crear Reporte
        </h2>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() =>
              searchResults.length > 0 && setShowSearchResults(true)
            }
            placeholder="Buscar por número de serie o numero del cliente..."
            className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          />
          <svg
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400"
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

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full max-w-7xl mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
            <div className="p-4 bg-blue-50 border-b-2 border-blue-200">
              <p className="font-semibold text-blue-800">
                Selecciona el compresor y el tipo de reporte:
              </p>
            </div>
            {searchResults.map((result) => (
              <div
                key={result.numero_serie}
                className="p-4 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-800 text-lg">
                      {result.nombre_cliente}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Serie:</span>{" "}
                      {result.numero_serie}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Marca:</span> {result.marca}{" "}
                      |<span className="font-medium"> Modelo:</span>{" "}
                      {result.alias} |<span className="font-medium"> HP:</span>{" "}
                      {result.hp}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSelectCompressor(result)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <span>Iniciar Reporte</span>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {showSearchResults &&
          searchResults.length === 0 &&
          searchQuery.length >= 2 && (
            <div className="absolute z-50 w-full max-w-7xl mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl p-4">
              <p className="text-gray-600 text-center">
                No se encontraron resultados para "{searchQuery}"
              </p>
            </div>
          )}
      </div>

      {/* Eventual Client Button */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 mb-8 border-2 border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-purple-900 mb-2">
              👤 Cliente Eventual
            </h2>
            <p className="text-purple-700">
              ¿Necesitas crear un reporte para un cliente que no está
              registrado?
            </p>
          </div>
          <button
            onClick={() =>
              router.push(
                "/features/compressor-maintenance/technician/reports/create?isEventual=true"
              )
            }
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <svg
              className="w-5 h-5"
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
            <span>Crear Reporte Eventual</span>
          </button>
        </div>
      </div>
    </>
  );
}
