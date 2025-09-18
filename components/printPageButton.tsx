"use client";

import React from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

const PrintPageButton: React.FC = () => {
  const downloadAsPDF = async () => {
    const element = document.body; // o un div específico con id="reporte"

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
      className="fixed bottom-4 right-4 p-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition-colors"
    >
      Descargar PDF
    </button>
  );
};

export default PrintPageButton;
