"use client";

import React from "react";
import { usePathname } from "next/navigation";

interface PrintReportButtonProps {
  clientData?: {
    nombre_cliente?: string;
    nombre?: string;
  };
  compressorData?: {
    alias?: string;
  };
  reportType?: "diario" | "semanal";
  className?: string;
  customFileName?: string;
}

const PrintReportButton: React.FC<PrintReportButtonProps> = ({
  clientData,
  compressorData,
  reportType = "diario",
  className = "",
  customFileName,
}) => {
  const pathname = usePathname();

  const generateFileName = () => {
    if (customFileName) return customFileName;

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const fecha =
      reportType === "diario"
        ? yesterday.toISOString().split("T")[0]
        : today.toISOString().split("T")[0];

    const clientName =
      clientData?.nombre_cliente || clientData?.nombre || "Cliente";
    const alias = compressorData?.alias || "Compresor";

    return `Reporte ${
      reportType === "diario" ? "Diario" : "Semanal"
    } ${clientName} ${alias} ${fecha}`;
  };

  const handlePrint = () => {
    const styles = document.createElement("style");
    styles.id = "print-playwright";
    let styleContent = `
      @page {
        size: A2 portrait;
        margin: 0;
      }
      html, body {
        width: 1920px !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body * {
        visibility: hidden;
      }
      main, main * {
        visibility: visible;
      }
      main {
        position: absolute;
        left: 0;
        top: 0;
        width: 100% !important;
      }
      nav, .sidebar, .no-print, button {
        display: none !important;
      }
      canvas, svg, img {
        visibility: visible !important;
        display: block !important;
        page-break-inside: avoid !important;
      }
    `;

    if (pathname.includes("graphsDateWeek")) {
      styleContent += `
        @page {
          size: A2 portrait;
          margin: 0mm;
        }
        html, body {
          width: auto !important;
          height: auto !important;
          font-size: 10px !important;
        }
        main {
        }
      `;
    }

    styles.textContent = styleContent;

    const existing = document.getElementById("print-playwright");
    if (existing) existing.remove();
    document.head.appendChild(styles);

    const originalTitle = document.title;
    document.title = generateFileName();

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
        styles.remove();
      }, 500);
    }, 100);
  };

  return (
    <button
      onClick={handlePrint}
      className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition ${className}`}
      title={`Descargar: ${generateFileName()}`}
    >
      📄 Descargar PDF
    </button>
  );
};

export default PrintReportButton;
