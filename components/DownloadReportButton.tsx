"use client";

import React, { useState } from "react";

interface DownloadReportButtonProps {
  clientId: string;
  linea: string;
  clientName: string;
  alias: string;
  reportType: "diario" | "semanal";
  className?: string;
}

export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({
  clientId,
  linea,
  clientName,
  alias,
  reportType,
  className = "",
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!clientId || !linea) {
      setDownloadError("Faltan parámetros necesarios para generar el reporte");
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_cliente: parseInt(clientId),
          linea,
          nombre_cliente: clientName,
          alias,
          tipo: reportType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al generar el PDF");
      }

      // Get the PDF as blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;

      // Generate filename using the same logic as automation.py
      const today = new Date();
      const etiquetaFecha =
        reportType === "diario"
          ? new Date(today.getTime() - 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0]
          : getFechaReporteSemanal(today);

      const aliasLimpio = (alias || "").trim();
      const nombreArchivo = `Reporte ${
        reportType === "diario" ? "Diario" : "Semanal"
      } ${clientName} ${aliasLimpio} ${etiquetaFecha}.pdf`;

      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      setDownloadError(
        error instanceof Error ? error.message : "Error desconocido"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper function to generate weekly report date (replicating automation.py logic)
  const getFechaReporteSemanal = (fechaBase: Date): string => {
    const lunes = new Date(fechaBase);
    lunes.setDate(fechaBase.getDate() - fechaBase.getDay() - 6); // Previous Monday
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    const fecha = fechaBase.toISOString().split("T")[0];
    const meses = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    const mes = meses[domingo.getMonth()];

    return `${fecha} (Semana del ${lunes.getDate()} al ${domingo.getDate()} ${mes})`;
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={`
          flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-300
          ${
            isDownloading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95"
          } 
          text-white shadow-lg hover:shadow-xl
          ${className}
        `}
      >
        {isDownloading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Generando PDF...</span>
          </>
        ) : (
          <>
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Descargar Reporte PDF</span>
          </>
        )}
      </button>

      {downloadError && (
        <div className="text-red-500 text-sm max-w-xs text-center">
          {downloadError}
        </div>
      )}
    </div>
  );
};

export default DownloadReportButton;
