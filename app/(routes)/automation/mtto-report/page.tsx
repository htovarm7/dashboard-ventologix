"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import { MaintenanceReportResponse, MaintenanceReportData } from "@/lib/types";
import Image from "next/image";

declare global {
  interface Window {
    status: string;
  }
}

function MttoReportContent() {
  const searchParams = useSearchParams();

  const [reportData, setReportData] = useState<MaintenanceReportData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [isAutomation, setIsAutomation] = useState(false);

  // Cargar datos de la visita seleccionada si existen
  useEffect(() => {
    // Primero revisar si hay parámetro de query ?id=xxx (para Playwright y navegación)
    const queryId = searchParams.get("id");
    if (queryId) {
      console.log("Loading report from query parameter:", queryId);
      setIsAutomation(true); // Modo automatización
      fetchReportDataById(queryId);
      return;
    }

    // Si no hay query param, revisar sessionStorage (para navegación web normal)
    const selectedVisitData = sessionStorage.getItem("selectedVisitData");
    if (selectedVisitData) {
      try {
        const visitData = JSON.parse(selectedVisitData);
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

      // Señal para Playwright: iniciando carga
      if (typeof window !== "undefined") {
        window.status = "loading";
      }

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
        console.error("Error fetching report:", errorData);

        // Señal para Playwright: error
        if (typeof window !== "undefined") {
          window.status = "data-error";
        }

        throw new Error(
          errorData.detail || "Error al obtener los datos del reporte"
        );
      }

      const data: MaintenanceReportResponse = await response.json();
      setReportData({
        ...data.reporte,
        fotos_drive: data.reporte.fotos_drive || [],
      });

      // Guardar datos del reporte en sessionStorage para el nombre del PDF
      sessionStorage.setItem("currentReportData", JSON.stringify(data.reporte));

      // Señal para Playwright: datos listos, esperar renderizado
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.status = "pdf-ready";
          console.log("Report ready for PDF generation");
        }
      }, 500); // Pequeño delay para asegurar que el DOM esté completamente renderizado
    } catch (err) {
      console.error("Error fetching maintenance report data:", err);
      setReportData(null);

      // Señal para Playwright: error
      if (typeof window !== "undefined") {
        window.status = "data-error";
      }
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen p-4 md:p-8">
      {/* Ocultar botón de regreso en modo automatización */}
      {!isAutomation && (
        <div className="no-print">
          <BackButton />
        </div>
      )}

      <div className="max-w-7xl mx-auto mt-4">
        {/* Overlay de carga */}
        {loading && (
          <LoadingOverlay isVisible={true} message="Cargando reporte..." />
        )}

        {/* Reporte */}
        {reportData && !loading && (
          <div className="bg-white rounded-lg overflow-hidden mb-6">
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

            <div className="p-6">
              <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                DATOS DEL COMPRESOR
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Columna 1 */}
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Cliente:</p>
                    <p className="font-semibold">{reportData.cliente}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Tipo:</p>
                    <p className="font-semibold">{reportData.tipo}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Alias:</p>
                    <p className="font-semibold">{reportData.Alias || "N/A"}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">HP:</p>
                    <p className="font-semibold">{reportData.hp || "N/A"}</p>
                  </div>
                </div>
                {/* Columna 2 */}
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Voltaje:</p>
                    <p className="font-semibold">
                      {reportData.voltaje || "N/A"}
                    </p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Marca:</p>
                    <p className="font-semibold">{reportData.compresor}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Año:</p>
                    <p className="font-semibold">{reportData.anio || "N/A"}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Número de Serie:</p>
                    <p className="font-semibold">{reportData.numero_serie}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Datos del Técnico */}
            <div className="p-6">
              <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                DATOS DEL TÉCNICO
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Columna 1 */}
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Nombre del técnico:</p>
                    <p className="font-semibold">{reportData.tecnico}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Email del técnico:</p>
                    <p className="font-semibold">{reportData.email}</p>
                  </div>
                </div>
                {/* Columna 2 */}
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Número de teléfono:</p>
                    <p className="font-semibold">+52 8184777023</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Fecha de la visita:</p>
                    <p className="font-semibold">
                      {formatDate(reportData.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
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
              <div className="p-6">
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
              <div className="p-6">
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

            {reportData.fotos_drive && reportData.fotos_drive.length > 0 && (
              <div className="p-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  FOTOS DEL MANTENIMIENTO
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {reportData.fotos_drive.map((fotoUrl, index) => (
                    <div
                      key={index}
                      className="cursor-pointer transform hover:scale-105 transition-transform"
                    >
                      <Image
                        src={fotoUrl}
                        width={400}
                        height={400}
                        className="w-full h-full object-cover rounded-lg shadow hover:shadow-lg"
                        alt={`Foto ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MttoReport() {
  return (
    <Suspense
      fallback={<LoadingOverlay isVisible={true} message="Cargando..." />}
    >
      <MttoReportContent />
    </Suspense>
  );
}
