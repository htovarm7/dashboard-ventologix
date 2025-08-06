"use client";
import React from "react";
import { Compresor } from "../types/common";

interface ReportDropdownProps {
  title: string;
  compresores: Compresor[];
  colorScheme: {
    text: string;
    icon: string;
    hover: string;
  };
  onCompressorSelect: (compresor: Compresor) => void;
  children?: React.ReactNode;
}

const ReportDropdown: React.FC<ReportDropdownProps> = ({
  title,
  compresores,
  colorScheme,
  onCompressorSelect,
  children,
}) => {
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
      {compresores.length > 0 && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-10">
          <div className="py-2">
            <div className="px-3 py-2 text-xs text-gray-500 font-medium uppercase tracking-wide border-b border-gray-100">
              Seleccionar Compresor
            </div>

            {/* Contenido adicional (como selector de fecha) */}
            {children}

            {compresores.map((compresor) => (
              <button
                key={`${title.toLowerCase()}-${compresor.id_cliente}-${
                  compresor.linea
                }`}
                onClick={() => onCompressorSelect(compresor)}
                className={`block w-full px-4 py-3 text-left text-gray-700 ${colorScheme.hover} transition-colors border-b border-gray-50 last:border-b-0`}
              >
                <div className="font-medium text-center">{compresor.alias}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportDropdown;
