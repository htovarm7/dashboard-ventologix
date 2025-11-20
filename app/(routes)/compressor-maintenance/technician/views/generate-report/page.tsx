"use client";
import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import { MaintenanceReportResponse, MaintenanceReportData } from "@/lib/types";
import Image from "next/image";
import PrintPageButton from "@/components/printPageButton";

const ViewMaintenanceReportPage = () => {
  const { isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [numeroSerie, setNumeroSerie] = useState("");
  const [reportData, setReportData] = useState<MaintenanceReportData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos de la visita seleccionada si existen
  useEffect(() => {
    // Primero revisar si hay parámetro de query ?id=xxx (para Playwright)
    const queryId = searchParams.get("id");
    if (queryId) {
      console.log("Loading report from query parameter:", queryId);
      fetchReportDataById(queryId);
      return;
    }
    
    // Si no hay query param, revisar sessionStorage (para navegación web normal)
    const selectedVisitData = sessionStorage.getItem("selectedVisitData");
    if (selectedVisitData) {
      try {
        const visitData = JSON.parse(selectedVisitData);
        // Auto-llenar el número de serie y cargar el reporte por ID
        if (visitData.numero_serie) {
          setNumeroSerie(visitData.numero_serie);
        }
        if (visitData.id) {
          // Auto-cargar el reporte usando el ID de la visita específica
          setTimeout(() => {
            fetchReportDataById(visitData.id);
          }, 100);
        }
        // Limpiar los datos de sessionStorage después de usarlos
        sessionStorage.removeItem("selectedVisitData");
      } catch (error) {
        console.error("Error parsing visit data:", error);
      }
    }
  }, [searchParams]);

  const fetchReportDataById = async (visitId: string) => {
    try {
      setLoading(true);
      setError(null);

      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(
        `${API_BASE_URL}/web/maintenance/report-data-by-id/${visitId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Error al obtener los datos del reporte"
        );
      }

      const data: MaintenanceReportResponse = await response.json();
      setReportData(data.reporte);
      // Guardar datos del reporte en sessionStorage para el nombre del PDF
      sessionStorage.setItem("currentReportData", JSON.stringify(data.reporte));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar el reporte"
      );
      console.error("Error fetching maintenance report data:", err);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDataWithSerie = async (serie: string) => {
    if (!serie.trim()) {
      setError("Por favor ingrese un número de serie");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(
        `${API_BASE_URL}/web/maintenance/report-data/${serie}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Error al obtener los datos del reporte"
        );
      }

      const data: MaintenanceReportResponse = await response.json();
      setReportData(data.reporte);
      // Guardar datos del reporte en sessionStorage para el nombre del PDF
      sessionStorage.setItem("currentReportData", JSON.stringify(data.reporte));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar el reporte"
      );
      console.error("Error fetching report data:", err);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async () => {
    await fetchReportDataWithSerie(numeroSerie);
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
      <div className="no-print">
        <BackButton />
      </div>

      <div className="max-w-7xl mx-auto mt-4">
        {/* Overlay de carga */}
        {loading && (
          <LoadingOverlay isVisible={true} message="Cargando reporte..." />
        )}

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
                    <p className="text-sm opacity-90">
                      REPORTE DE MANTENIMIENTO
                    </p>
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
                  <p className="font-semibold">
                    {formatDate(reportData.timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Técnico:</p>
                  <p className="font-semibold">{reportData.tecnico}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email del Técnico:</p>
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
              <div className="mt-2 text-lg items-center">
                <span className="font-bold text-green-600">✓</span> = Se realizó
                cambio,&nbsp;
                <span className="font-bold">✗</span> = Se mantuvo igual
              </div>
            </div>

            {/* Comentarios */}
            {reportData.comentarios_generales && (
              <div className="p-6 border-b">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  COMENTARIOS GENERALES
                </h2>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-lg whitespace-pre-wrap">
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
                  <p className="text-lg whitespace-pre-wrap">
                    {reportData.comentario_cliente}
                  </p>
                </div>
              </div>
            )}

            <div className="p-6">
              <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                RECURSOS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportData.carpeta_fotos && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-xl text-green-800">
                      Carpeta de Fotos
                    </p>
                    <a
                      href={reportData.carpeta_fotos}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-700 underline break-all"
                    >
                      {reportData.carpeta_fotos}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {reportData && (
          <div className="flex justify-center mb-8 no-print">
            <PrintPageButton reportType="reporte-visita" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewMaintenanceReportPage;
