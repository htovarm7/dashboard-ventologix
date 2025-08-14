"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Compresor } from "@/types/common";

interface DateReportDropdownProps {
  title: string;
  compresores: Compresor[];
  colorScheme: {
    text: string;
    icon: string;
    hover: string;
  };
  Rol?: number;
  selectedCompresor?: Compresor | null;
  tipo?: string;
}

const DateReportDropdown: React.FC<DateReportDropdownProps> = ({
  title,
  compresores,
  colorScheme,
  tipo,
  Rol = 2,
  selectedCompresor = null,
}) => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const handleDateSelect = () => {
    if (!selectedDate) {
      alert("Por favor selecciona una fecha");
      return;
    }

    if (!selectedCompresor) {
      alert("No hay compresor seleccionado");
      return;
    }

    sessionStorage.setItem(
      "selectedCompresor",
      JSON.stringify({
        id_cliente: selectedCompresor.id_cliente,
        linea: selectedCompresor.linea,
        alias: selectedCompresor.alias,
        date: selectedDate,
      })
    );
    if (tipo === "DIARIO") {
      router.push("/graphsDateDay");
    }
    if (tipo === "SEMANAL") {
      router.push("/graphsDateWeek");
    }
  };

  return (
    <div className="relative text-center group">
      <h2
        className={`text-2xl ${colorScheme.text} hover:scale-110 cursor-pointer transition-transform flex items-center justify-center gap-2`}
      >
        {title}
        <svg
          className={`w-4 h-4 ${colorScheme.icon}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </h2>

      {selectedCompresor && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-10">
          <div className="py-2">
            {/* Selector de fecha */}
            <div className="px-4 py-3 border-b border-gray-100 flex flex-col items-center">
              <label className="block text-xl font-medium text-gray-700 mb-2 text-center">
                📅 Seleccionar Fecha:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-l w-2/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                max={new Date().toISOString().split("T")[0]} // No permitir fechas futuras
              />
            </div>

            {/* Botón para ir al reporte */}
            <div className="px-4 py-3">
              <button
                onClick={handleDateSelect}
                className={`w-full px-4 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors font-medium text-m`}
              >
                Ver Reporte de la Fecha <br /> {selectedDate}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateReportDropdown;
