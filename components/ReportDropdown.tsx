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
  Rol?: number;
  selectedCompresor?: Compresor | null;
  staticMode?: boolean;
}

const ReportDropdown: React.FC<ReportDropdownProps> = ({
  title,
  compresores,
  colorScheme,
  onCompressorSelect,
  children,
  Rol = 2,
  selectedCompresor = null,
  staticMode = false,
}) => {
  const handleClick = () => {
    if (staticMode && selectedCompresor) {
      onCompressorSelect(selectedCompresor);
    }
  };

  return (
    <div className="relative text-center group">
      <h2
        className={`text-2xl ${colorScheme.text} hover:scale-110 cursor-pointer transition-transform flex items-center justify-center gap-2`}
        onClick={staticMode ? handleClick : undefined}
      >
        {title}
        {!staticMode && (
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
        )}
      </h2>
      {!staticMode && compresores.length > 0 && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-10">
          <div className="py-2">
            <div className="px-3 py-2 text-xs text-gray-500 font-medium uppercase tracking-wide border-b border-gray-100">
              Seleccionar Compresor
            </div>

            {/* Contenido adicional (como selector de fecha) */}
            {children}

            {/* Lista scrolleable de compresores */}
            <div className="max-h-64 overflow-y-auto">
              {compresores.map((compresor) => (
                <button
                  key={`${title.toLowerCase()}-${compresor.id_cliente}-${
                    compresor.linea
                  }`}
                  onClick={() => onCompressorSelect(compresor)}
                  className={`block w-full px-4 py-3 text-left text-gray-700 ${colorScheme.hover} transition-colors border-b border-gray-50 last:border-b-0`}
                >
                  <div className="text-center">
                    <div className="font-medium">{compresor.alias}</div>
                    {Rol && compresor.nombre_cliente && (
                      <div className="text-sm text-gray-500 mt-1">
                        {compresor.nombre_cliente}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportDropdown;
