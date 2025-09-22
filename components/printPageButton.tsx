"use client";

import React from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

const PrintPageButton: React.FC = () => {
  const downloadAsPDF = async () => {
    try {
      const elementsToHide = [
        'button[title="Descargar página como PDF"]',
        ".fixed",
        '[class*="BackButton"]',
        "nav",
        ".sidebar",
        "[data-exclude-pdf]",
      ];

      const hiddenElements: HTMLElement[] = [];
      elementsToHide.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if (el instanceof HTMLElement && el.style.display !== "none") {
            hiddenElements.push(el);
            el.style.display = "none";
          }
        });
      });

      let elementToCapture = document.querySelector("main") as HTMLElement;

      if (!elementToCapture) {
        elementToCapture =
          (document.querySelector('[class*="content"]') as HTMLElement) ||
          (document.querySelector(".container") as HTMLElement) ||
          (document.querySelector(
            "#__next > div > div:last-child"
          ) as HTMLElement) ||
          (document.querySelector('div[class*="relative"]') as HTMLElement) ||
          document.body;
      }

      const originalStyle = elementToCapture.style.cssText;
      elementToCapture.style.background = "#ffffff";
      elementToCapture.style.minHeight = "auto";

      const options = {
        cacheBust: true,
        height: elementToCapture.scrollHeight,
        width: elementToCapture.scrollWidth,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      };

      const dataUrl = await toPng(elementToCapture, options);

      hiddenElements.forEach((el) => {
        el.style.display = "";
      });
      elementToCapture.style.cssText = originalStyle;

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

        // Generar nombre del archivo basado en el tipo de reporte
        const generateFileName = () => {
          const currentPath = window.location.pathname;
          const currentDate = new Date().toISOString().split("T")[0];

          // Obtener información del compresor del sessionStorage
          const savedCompresor = sessionStorage.getItem("selectedCompresor");
          let compresorName = "Compresor";
          let date = currentDate;
          let weekNumber = null;

          if (savedCompresor) {
            const compresorData = JSON.parse(savedCompresor);
            compresorName =
              compresorData.alias ||
              `Compresor_${compresorData.id_cliente}-${compresorData.linea}`;
            date = compresorData.date || currentDate;
            weekNumber = compresorData.weekNumber;
          }

          // Limpiar nombre del compresor para el archivo (remover caracteres especiales)
          const cleanCompresorName = compresorName.replace(
            /[^a-zA-Z0-9]/g,
            "_"
          );

          if (currentPath.includes("graphsDateDay")) {
            // Formato: Reporte_Diario_[CompresorAlias]_[YYYY-MM-DD].pdf
            return `Reporte_Diario_${cleanCompresorName}_${date}.pdf`;
          } else if (currentPath.includes("graphsDateWeek")) {
            // Formato: Reporte_Semanal_[CompresorAlias]_Semana[Número]_[Año].pdf
            const year = new Date(date).getFullYear();
            const weekText = weekNumber
              ? `Semana${weekNumber}`
              : "SemanaActual";
            return `Reporte_Semanal_${cleanCompresorName}_${weekText}_${year}.pdf`;
          } else {
            // Formato genérico
            return `Reporte_${cleanCompresorName}_${currentDate}.pdf`;
          }
        };

        const fileName = generateFileName();
        pdf.save(fileName);
      };
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar el PDF. Por favor, inténtalo de nuevo.");
    }
  };

  return (
    <button
      onClick={downloadAsPDF}
      className="fixed bottom-6 right-6 z-50 group bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 ease-in-out border-2 border-white/20 backdrop-blur-sm"
      title="Descargar página como PDF"
      data-exclude-pdf="true"
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

      <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></div>

      <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
    </button>
  );
};

export default PrintPageButton;
