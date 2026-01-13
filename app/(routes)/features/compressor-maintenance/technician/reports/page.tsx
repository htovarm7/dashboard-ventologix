"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

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
            Reportes en Progreso
          </h1>
          <p className="text-gray-600 text-xl">
            Continúa trabajando en tus reportes guardados
          </p>
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
      </div>
    </div>
  );
};

export default TypeReportes;
