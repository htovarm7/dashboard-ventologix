"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface BackButtonProps {
  className?: string;
  variant?: "normal" | "ghost";
  showText?: boolean;
  customText?: string;
  position?: "fixed" | "relative";
  onClick?: () => void;
  fallbackUrl?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  className = "",
  variant = "normal",
  showText = true,
  customText = "Atrás",
  position = "relative",
  onClick,
  fallbackUrl = "/home",
}) => {
  const router = useRouter();

  const handleClick = () => {
    // Ejecutar callback personalizado si existe
    if (onClick) {
      onClick();
    }

    // Intentar regresar a la página anterior
    if (window.history.length > 1) {
      router.back();
    } else {
      // Si no hay historial, ir a la URL de respaldo
      router.push(fallbackUrl);
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case "ghost":
        return "bg-transparent text-gray-700 hover:bg-gray-100 border border-gray-300";
      default: // normal
        return "bg-blue-800 text-white hover:bg-blue-900";
    }
  };

  return (
    <div
      className={`w-full flex ${position === "fixed" ? "" : "justify-start"}`}
    >
      <button
        onClick={handleClick}
        className={`
        flex items-center gap-2 px-4 py-3 rounded-lg shadow-md hover:shadow-lg
        ${getVariantClasses()}
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50
        ${className}
      `}
        aria-label="Regresar a la página anterior"
        data-exclude-pdf="true"
      >
        {/* Icono de flecha hacia atrás */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>

        {/* Texto del botón */}
        {showText && <span className="text-lg font-medium">{customText}</span>}
      </button>
    </div>
  );
};

export default BackButton;
