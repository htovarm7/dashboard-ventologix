"use client";

import React from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

const PrintPageButton: React.FC = () => {
  const downloadAsPDF = async () => {
    const element = document.body;
    try {
      const dataUrl = await toPng(element, { cacheBust: true });
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const imgWidth = pageWidth;
        const imgHeight = (img.height * imgWidth) / img.width;

        let position = 0;
        let heightLeft = imgHeight;

        pdf.addImage(img, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(img, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`Reporte_${new Date().toISOString().split("T")[0]}.pdf`);
      };
    } catch (error) {
      console.error("Error al generar PDF:", error);
    }
  };

  return (
    <button
      onClick={downloadAsPDF}
      className="fixed bottom-6 right-6 z-50 group bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 ease-in-out border-2 border-white/20 backdrop-blur-sm"
      title="Descargar página como PDF"
    >
      <div className="flex items-center space-x-2">
        <svg
          className="w-5 h-5 group-hover:animate-bounce"
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
        <span className="hidden sm:inline">PDF</span>
      </div>

      {/* Efecto de ondas al hacer hover */}
      <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></div>

      {/* Indicador de acción */}
      <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
    </button>
  );
};

export default PrintPageButton;
