"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Compresor } from "../types/common";

interface DateReportDropdownProps {
  title: string;
  compresores: Compresor[];
  colorScheme: {
    text: string;
    icon: string;
    hover: string;
  };
}

const DateReportDropdown: React.FC<DateReportDropdownProps> = ({
  title,
  compresores,
  colorScheme,
}) => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0] // Fecha actual en formato YYYY-MM-DD
  );

  const handleCompressorSelect = (compresor: Compresor) => {
    if (!selectedDate) {
      alert("Por favor selecciona una fecha");
      return;
    }

    // Guardar datos en sessionStorage
    sessionStorage.setItem(
      "selectedCompresor",
      JSON.stringify({
        id_cliente: compresor.id_cliente,
        linea: compresor.linea,
        alias: compresor.alias,
        date: selectedDate,
      })
    );
    router.push("/graphsDateDay");
  };

  return (
    <div className="relative text-center group">
      <h2 className={`text-2xl ${colorScheme.text} hover:scale-110 cursor-pointer transition-transform flex items-center justify-center gap-2`}>
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
      {compresores.length > 0 && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-10">
          <div className="py-2">
            <div className="px-3 py-2 text-xs text-gray-500 font-medium uppercase tracking-wide border-b border-gray-100">
              Seleccionar Fecha y Compresor
            </div>
            
            {/* Selector de fecha */}
            <div className="px-4 py-3 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Seleccionar Fecha:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                max={new Date().toISOString().split('T')[0]} // No permitir fechas futuras
              />
            </div>
            
            {compresores.map((compresor) => (
              <button
                key={`date-${compresor.id_cliente}-${compresor.linea}`}
                onClick={() => handleCompressorSelect(compresor)}
                className={`block w-full px-4 py-3 text-left text-gray-700 ${colorScheme.hover} transition-colors border-b border-gray-50 last:border-b-0`}
              >
                <div className="font-medium text-center">
                  {compresor.alias}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DateReportDropdown;
