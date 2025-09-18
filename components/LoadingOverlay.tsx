import React from "react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  spinnerSize?: "sm" | "md" | "lg";
  blurIntensity?: "light" | "medium" | "heavy";
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = "Cargando...",
  spinnerSize = "md",
  blurIntensity = "medium",
}) => {
  if (!isVisible) return null;

  const getSizeClasses = () => {
    switch (spinnerSize) {
      case "sm":
        return "h-8 w-8 border-2";
      case "lg":
        return "h-16 w-16 border-4";
      default:
        return "h-12 w-12 border-3";
    }
  };

  const getBlurClasses = () => {
    switch (blurIntensity) {
      case "light":
        return "backdrop-blur-sm";
      case "heavy":
        return "backdrop-blur-lg";
      default:
        return "backdrop-blur-md";
    }
  };

  return (
    <div
      className={`
      fixed inset-0 z-50 flex items-center justify-center
      bg-white/30 ${getBlurClasses()}
      transition-all duration-300 ease-in-out
    `}
    >
      <div
        className="
        bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl
        border border-white/20 max-w-sm mx-4
        animate-in fade-in-0 zoom-in-95 duration-300
      "
      >
        <div className="flex flex-col items-center space-y-4">
          {/* Spinner */}
          <div
            className={`
            animate-spin rounded-full border-blue-600 border-t-transparent
            ${getSizeClasses()}
          `}
          ></div>

          {/* Mensaje de carga */}
          <p className="text-gray-700 font-medium text-center">{message}</p>

          {/* Puntos animados */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
