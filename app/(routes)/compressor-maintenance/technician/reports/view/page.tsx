"use client";
import React, { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import { MaintenanceReportResponse, MaintenanceReportData } from "@/lib/types";
import Image from "next/image";

const ViewMaintenanceReportPage = () => {
  const { isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();

  const [numeroSerie, setNumeroSerie] = useState("");
  const [reportData, setReportData] = useState<MaintenanceReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReportData = async () => {
    if (!numeroSerie.trim()) {
      setError("Por favor ingrese un número de serie");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${API_BASE_URL}/web/maintenance/report-data/${numeroSerie}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al obtener los datos del reporte");
      }

      const data: MaintenanceReportResponse = await response.json();
      setReportData(data.reporte);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al cargar el reporte");
      console.error("Error fetching report data:", err);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReportData();
  };

  if (isLoading) {
    return <LoadingOverlay isVisible={true} message="Cargando..." />;
  }

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <BackButton />

      <div className="max-w-7xl mx-auto mt-4">
        {/* Formulario de búsqueda */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Consultar Reporte de Mantenimiento
          </h1>
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="text"
              value={numeroSerie}
              onChange={(e) => setNumeroSerie(e.target.value)}
              placeholder="Ingrese el número de serie del compresor"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </form>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Overlay de carga */}
        {loading && <LoadingOverlay isVisible={true} message="Cargando reporte..." />}

        {/* Reporte */}
        {reportData && !loading && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                    <Image
                      src="/Ventologix_05.png"
                      alt="Ventologix Logo"
                      width={64}
                      height={64}
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">VENTOLOGIX</h1>
                    <p className="text-sm opacity-90">REPORTE DE MANTENIMIENTO</p>
                    <p className="text-sm opacity-90">{reportData.cliente}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">#{reportData.id}</p>
                  <p className="text-sm">ID Registro</p>
                </div>
              </div>
            </div>

            {/* Datos Generales */}
            <div className="p-6 border-b">
              <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                DATOS GENERALES
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Cliente:</p>
                  <p className="font-semibold">{reportData.cliente}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha:</p>
                  <p className="font-semibold">{formatDate(reportData.timestamp)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Técnico:</p>
                  <p className="font-semibold">{reportData.tecnico}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email:</p>
                  <p className="font-semibold">{reportData.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo:</p>
                  <p className="font-semibold">{reportData.tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Compresor:</p>
                  <p className="font-semibold">{reportData.compresor}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Número de Serie:</p>
                  <p className="font-semibold">{reportData.numero_serie}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Número de Cliente:</p>
                  <p className="font-semibold">{reportData.numero_cliente}</p>
                </div>
              </div>
            </div>

            {/* Mantenimientos Realizados */}
            <div className="p-6 border-b">
              <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                MANTENIMIENTOS REALIZADOS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reportData.mantenimientos.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded ${
                      item.realizado
                        ? "bg-green-50 border border-green-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <span className="text-sm font-medium">{item.nombre}</span>
                    <span
                      className={`text-lg font-bold ${
                        item.realizado ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {item.realizado ? "✓" : "✗"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comentarios */}
            {reportData.comentarios_generales && (
              <div className="p-6 border-b">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  COMENTARIOS GENERALES
                </h2>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm whitespace-pre-wrap">
                    {reportData.comentarios_generales}
                  </p>
                </div>
              </div>
            )}

            {/* Comentario del Cliente */}
            {reportData.comentario_cliente && (
              <div className="p-6 border-b">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  COMENTARIO DEL CLIENTE
                </h2>
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm whitespace-pre-wrap">
                    {reportData.comentario_cliente}
                  </p>
                </div>
              </div>
            )}

            {/* Enlaces */}
            <div className="p-6">
              <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                RECURSOS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportData.link_form && (
                  <a
                    href={reportData.link_form}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <svg
                      className="w-6 h-6 text-blue-600"
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
                    <div>
                      <p className="font-semibold text-blue-800">Formulario</p>
                      <p className="text-xs text-blue-600">Ver formulario completo</p>
                    </div>
                  </a>
                )}
                {reportData.carpeta_fotos && (
                  <a
                    href={reportData.carpeta_fotos}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    <div>
                      <p className="font-semibold text-green-800">Carpeta de Fotos</p>
                      <p className="text-xs text-green-600">Ver fotos del servicio</p>
                    </div>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Botón de Impresión */}
        {reportData && (
          <div className="flex justify-center mb-8 no-print">
            <button
              onClick={() => window.print()}
              className="px-6 py-3 bg-blue-800 text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors shadow-lg"
            >
              Imprimir Reporte
            </button>
          </div>
        )}
      </div>

      {/* Estilos para impresión */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ViewMaintenanceReportPage;
