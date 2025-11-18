"use client";

import React from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

interface PrintPageButtonProps {
  reportType?: "reporte" | "reporte-visita";
}

const PrintPageButton: React.FC<PrintPageButtonProps> = ({
  reportType = "reporte",
}) => {
  const downloadAsPDF = async () => {
    // Para reporte-visita, generar y descargar PDF automáticamente usando html2canvas
    if (reportType === "reporte-visita") {
      try {
        // Ocultar elementos no deseados
        const elementsToHide = document.querySelectorAll(
          '.no-print, nav, aside, [class*="sidebar"], [class*="Sidebar"], [class*="sideBar"], button, .fixed'
        );
        elementsToHide.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.display = "none";
          }
        });

        // Obtener el elemento a capturar (el reporte)
        const reportElement = document.querySelector(
          ".bg-white.rounded-lg.shadow-lg"
        ) as HTMLElement;
        if (!reportElement) {
          throw new Error("No se encontró el elemento del reporte");
        }

        // Resetear zoom y guardar estilos originales
        const originalZoom = document.body.style.zoom || "1";
        document.body.style.zoom = "1";

        const originalStyles = {
          transform: reportElement.style.transform,
          boxShadow: reportElement.style.boxShadow,
          borderRadius: reportElement.style.borderRadius,
        };

        // Quitar sombras y bordes redondeados para el PDF
        reportElement.style.transform = "scale(0.9)";
        reportElement.style.transformOrigin = "top center";
        reportElement.style.boxShadow = "none";
        reportElement.style.borderRadius = "0";

        // Generar imagen del contenido sin fondo blanco extra
        const canvas = await toPng(reportElement, {
          cacheBust: true,
          backgroundColor: "transparent",
          pixelRatio: 2,
          quality: 1,
          width: reportElement.scrollWidth,
          height: reportElement.scrollHeight,
        });

        // Extraer enlaces del reporte antes de convertir a imagen
        const links: { url: string; text: string; rect: DOMRect }[] = [];
        const linkElements = reportElement.querySelectorAll("a[href]");
        linkElements.forEach((link) => {
          if (link instanceof HTMLAnchorElement) {
            const rect = link.getBoundingClientRect();
            const reportRect = reportElement.getBoundingClientRect();
            // Calcular posición relativa al reporte
            const relativeRect = new DOMRect(
              rect.left - reportRect.left,
              rect.top - reportRect.top,
              rect.width,
              rect.height
            );
            links.push({
              url: link.href,
              text: link.textContent || "",
              rect: relativeRect,
            });
          }
        });

        // Restaurar estilos
        reportElement.style.transform = originalStyles.transform;
        reportElement.style.boxShadow = originalStyles.boxShadow;
        reportElement.style.borderRadius = originalStyles.borderRadius;
        document.body.style.zoom = originalZoom;
        elementsToHide.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.display = "";
          }
        });

        // Crear PDF en formato A3 sin márgenes
        const pdf = new jsPDF("p", "mm", "a3");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const img = new Image();
        img.src = canvas;

        await new Promise<void>((resolve) => {
          img.onload = () => {
            // Calcular dimensiones para ajustar al ancho de la página
            const imgWidth = pageWidth;
            const imgHeight = (img.height * imgWidth) / img.width;
            const scale = imgWidth / reportElement.scrollWidth;

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

            // Agregar enlaces clickeables al PDF
            links.forEach((link) => {
              const x = link.rect.left * scale * 0.264583; // Convertir px a mm
              const y = link.rect.top * scale * 0.264583;
              const width = link.rect.width * scale * 0.264583;
              const height = link.rect.height * scale * 0.264583;

              // Determinar en qué página está el enlace
              const pageNum = Math.floor(y / pageHeight) + 1;
              const yInPage = y % pageHeight;

              if (pageNum <= pdf.getNumberOfPages()) {
                pdf.setPage(pageNum);
                pdf.link(x, yInPage, width, height, { url: link.url });
              }
            });

            const reportData = sessionStorage.getItem("currentReportData");
            let fileName = `Reporte_Mantenimiento_${
              new Date().toISOString().split("T")[0]
            }.pdf`;

            if (reportData) {
              try {
                const data = JSON.parse(reportData);
                const numeroCliente = data.numero_cliente || "Cliente";
                const cliente = (data.cliente || "Cliente").replace(
                  /[^a-zA-Z0-9]/g,
                  "_"
                );
                const fecha = data.timestamp
                  ? new Date(data.timestamp).toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0];
                fileName = `Reporte_Mantenimiento_${numeroCliente}_${cliente}_${fecha}.pdf`;
              } catch (e) {
                console.error("Error parsing report data:", e);
              }
            }

            pdf.save(fileName);
            resolve();
          };
        });
      } catch (error) {
        console.error("Error al generar PDF:", error);
        alert("Error al generar el PDF. Por favor, inténtalo de nuevo.");
      }
      return;
    }

    // Para otros reportes, continuar con la generación de PDF personalizada
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

      const pageFormat = "a4";
      const pdf = new jsPDF("p", "mm", pageFormat);
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
            return `Reporte_Diario_${cleanCompresorName}_${date}.pdf`;
          } else if (currentPath.includes("graphsDateWeek")) {
            const year = new Date(date).getFullYear();
            const weekText = weekNumber
              ? `Semana${weekNumber}`
              : "SemanaActual";
            return `Reporte_Semanal_${cleanCompresorName}_${weekText}_${year}.pdf`;
          } else {
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
