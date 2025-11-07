"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface BackButtonProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline" | "ghost";
  showText?: boolean;
  customText?: string;
  position?: "fixed" | "relative";
  onClick?: () => void;
  fallbackUrl?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  className = "",
  size = "md",
  variant = "ghost",
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

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "px-3 py-2 text-sm";
      case "lg":
        return "px-8 py-4 text-lg";
      default:
        return "px-6 py-3 text-base";
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case "secondary":
        return "bg-gray-600 hover:bg-gray-700 text-white shadow-lg hover:shadow-xl";
      case "outline":
        return "border-2 border-gray-600 text-gray-600 hover:bg-gray-600 hover:text-white bg-transparent";
      case "ghost":
        return "bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 shadow-sm hover:shadow-md";
      default:
        return "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl";
    }
  };

  const iconSize =
    size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";

  return (
    <div
      className={`w-full flex ${position === "fixed" ? "" : "justify-start"}`}
    >
      <button
        onClick={handleClick}
        className={`
        ${getSizeClasses()}
        ${getVariantClasses()}
        flex items-center space-x-2 rounded-lg font-medium
        x-0
        transition-all duration-200 ease-in-out
        hover:scale-105 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50
        ${className}
      `}
        aria-label="Regresar a la página anterior"
        data-exclude-pdf="true"
      >
        {/* Icono de flecha hacia atrás */}
        <svg
          className={iconSize}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>

        {/* Texto del botón */}
        {showText && <span className="font-medium">{customText}</span>}
      </button>
    </div>
  );
};

export default BackButton;
