"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";

interface CompressorSearchResult {
  id: string;
  serialNumber: string;
  clientId: string;
  clientName: string;
  brand: string;
  model: string;
}

interface DraftReport {
  id: string;
  folio: string;
  clientName: string;
  serialNumber: string;
  lastModified: string;
  reportType: string;
}

const TypeReportes = () => {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CompressorSearchResult[]>(
    []
  );
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [draftReports, setDraftReports] = useState<DraftReport[]>([]);

  // Load draft reports on mount
  useEffect(() => {
    const loadDraftReports = () => {
      const drafts = localStorage.getItem("draftReports");
      if (drafts) {
        setDraftReports(JSON.parse(drafts));
      }
    };
    loadDraftReports();
  }, []);

  // Search for compressors
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // TODO: Replace with actual API call
    // Simulated search results
    const mockResults: CompressorSearchResult[] = [
      {
        id: "comp-001",
        serialNumber: "ABC123456",
        clientId: "CLI-001",
        clientName: "Empresa Demo S.A.",
        brand: "Atlas Copco",
        model: "GA75",
      },
      {
        id: "comp-002",
        serialNumber: "XYZ789012",
        clientId: "CLI-002",
        clientName: "Industrias México",
        brand: "Sullair",
        model: "LS20-100",
      },
    ];

    const filtered = mockResults.filter(
      (comp) =>
        comp.serialNumber.toLowerCase().includes(query.toLowerCase()) ||
        comp.clientName.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  const handleSelectCompressor = (
    compressor: CompressorSearchResult,
    reportType: string
  ) => {
    // Navigate to create page with compressor data
    const params = new URLSearchParams({
      compressorId: compressor.id,
      serialNumber: compressor.serialNumber,
      clientId: compressor.clientId,
      clientName: compressor.clientName,
      brand: compressor.brand,
      model: compressor.model,
    });

    router.push(
      `/features/compressor-maintenance/technician/reports/${reportType}/submit?${params.toString()}`
    );
  };

  const deleteDraft = (draftId: string) => {
    const updatedDrafts = draftReports.filter((d) => d.id !== draftId);
    setDraftReports(updatedDrafts);
    localStorage.setItem("draftReports", JSON.stringify(updatedDrafts));
  };

  const loadDraft = (draft: DraftReport) => {
    // Navigate to create page with draft data
    router.push(
      `/features/compressor-maintenance/technician/reports/create?draftId=${draft.id}`
    );
  };

  // Función para ir atrás
  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={handleGoBack}
          className="absolute left-8 top-8 flex items-center gap-2 bg-blue-800 text-white hover:bg-blue-900 transition-colors duration-200 px-4 py-3 rounded-lg shadow-md hover:shadow-lg"
          title="Atrás"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-lg font-medium">Atrás</span>
        </button>

        <div className="mt-8 mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            Gestión de Reportes de Mantenimiento
          </h1>
          <p className="text-gray-600 text-xl">
            Crea y visualiza reportes de mantenimiento de compresores
          </p>
        </div>

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
              placeholder="Buscar por número de serie o nombre del cliente..."
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
                  key={result.id}
                  className="p-4 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-lg">
                        {result.clientName}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Serie:</span>{" "}
                        {result.serialNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Marca:</span>{" "}
                        {result.brand} |
                        <span className="font-medium"> Modelo:</span>{" "}
                        {result.model}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSelectCompressor(result, "pre")}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      📋 Pre-Mantenimiento
                    </button>
                    <button
                      onClick={() => handleSelectCompressor(result, "mtto")}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      🔧 Mantenimiento
                    </button>
                    <button
                      onClick={() => handleSelectCompressor(result, "post")}
                      className="px-4 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                    >
                      ✅ Post-Mantenimiento
                    </button>
                  </div>
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

        {/* Draft Reports Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              📝 Reportes en Borrador
            </h2>
            {draftReports.length > 0 && (
              <span className="px-4 py-2 bg-orange-500 text-white rounded-full font-semibold text-sm shadow-md">
                {draftReports.length}{" "}
                {draftReports.length === 1
                  ? "reporte pendiente"
                  : "reportes pendientes"}
              </span>
            )}
          </div>

          {draftReports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-lg font-medium">No hay reportes en borrador</p>
              <p className="text-sm mt-2">
                Los reportes guardados aparecerán aquí para continuar más tarde
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftReports.map((draft) => (
                <div
                  key={draft.id}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-lg transition-all"
                >
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                        {draft.reportType || "Reporte"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(draft.lastModified).toLocaleDateString(
                          "es-MX"
                        )}
                      </span>
                    </div>
                    <p className="font-bold text-gray-800 text-lg truncate">
                      {draft.clientName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Folio:</span> {draft.folio}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Serie:</span>{" "}
                      {draft.serialNumber}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadDraft(draft)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors font-medium"
                    >
                      Continuar
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm("¿Estás seguro de eliminar este borrador?")
                        ) {
                          deleteDraft(draft.id);
                        }
                      }}
                      className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          {/* Pre Mantenimiento  */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-t-4 border-green-500 transform hover:-translate-y-1">
            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-5xl">📋</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-green-600 mb-2">
                    Pre-Mantenimiento
                  </h2>
                  <p className="text-base text-gray-500">Inspección inicial</p>
                </div>
              </div>

              <p className="text-gray-600 mb-8 text-center leading-relaxed">
                Registra las condiciones iniciales del equipo antes del servicio
              </p>

              <div className="space-y-4">
                <Link
                  href="/features/compressor-maintenance/technician/reports/pre"
                  className="block w-full px-6 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-center shadow-md hover:shadow-lg text-lg"
                >
                  📊 Ver Reportes
                </Link>
                <Link
                  href="/features/compressor-maintenance/technician/reports/pre/submit"
                  className="block w-full px-6 py-4 bg-green-50 text-green-700 font-semibold rounded-lg hover:bg-green-100 transition-colors text-center border-2 border-green-500 text-lg"
                >
                  ➕ Crear Reporte
                </Link>
              </div>
            </div>
          </div>

          {/* Mantenimiento  */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-t-4 border-blue-500 transform hover:-translate-y-1">
            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-5xl">🔧</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-blue-600 mb-2">
                    Mantenimiento
                  </h2>
                  <p className="text-base text-gray-500">Servicio técnico</p>
                </div>
              </div>

              <p className="text-gray-600 mb-8 text-center leading-relaxed">
                Documenta las actividades y reparaciones realizadas
              </p>

              <div className="space-y-4">
                <Link
                  href="/features/compressor-maintenance/views"
                  className="block w-full px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-center shadow-md hover:shadow-lg text-lg"
                >
                  📊 Ver Reportes
                </Link>
                <Link
                  href="/features/compressor-maintenance/technician/reports/mtto/submit"
                  className="block w-full px-6 py-4 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors text-center border-2 border-blue-500 text-lg"
                >
                  ➕ Crear Reporte
                </Link>
              </div>
            </div>
          </div>

          {/* Post Mantenimiento  */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-t-4 border-orange-500 transform hover:-translate-y-1">
            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-5xl">✅</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-orange-600 mb-2">
                    Post-Mantenimiento
                  </h2>
                  <p className="text-base text-gray-500">Verificación final</p>
                </div>
              </div>

              <p className="text-gray-600 mb-8 text-center leading-relaxed">
                Verifica el funcionamiento después del servicio realizado
              </p>

              <div className="space-y-4">
                <Link
                  href="/features/compressor-maintenance/technician/reports/post"
                  className="block w-full px-6 py-4 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors text-center shadow-md hover:shadow-lg text-lg"
                >
                  📊 Ver Reportes
                </Link>
                <Link
                  href="/features/compressor-maintenance/technician/reports/post/submit"
                  className="block w-full px-6 py-4 bg-orange-50 text-orange-700 font-semibold rounded-lg hover:bg-orange-100 transition-colors text-center border-2 border-orange-500 text-lg"
                >
                  ➕ Crear Reporte
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypeReportes;
