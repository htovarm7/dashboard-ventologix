"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface BackButtonProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline";
  showText?: boolean;
  customText?: string;
  position?: "fixed" | "relative";
  onClick?: () => void; // Para acciones adicionales antes de navegar
}

const BackButton: React.FC<BackButtonProps> = ({
  className = "",
  size = "md",
  variant = "primary",
  showText = true,
  customText = "Regresar al Menú",
  position = "relative",
  onClick,
}) => {
  const router = useRouter();

  const handleClick = () => {
    // Ejecutar callback personalizado si existe
    if (onClick) {
      onClick();
    }

    // Navegar al home
    router.push("/home");
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
        return "border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white bg-transparent";
      default:
        return "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl";
    }
  };

  const getPositionClasses = () => {
    return position === "fixed" ? "fixed top-4 left-4 z-50" : "relative";
  };

  const iconSize =
    size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";

  return (
    <button
      onClick={handleClick}
      className={`
        ${getPositionClasses()}
        ${getSizeClasses()}
        ${getVariantClasses()}
        flex items-center space-x-2 rounded-lg font-medium
        transition-all duration-300 ease-in-out
        hover:scale-105 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        ${className}
      `}
      aria-label="Regresar al menú principal"
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
  );
};

export default BackButton;
