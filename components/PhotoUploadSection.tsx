import React from "react";

interface PhotoUploadSectionProps {
  category: string;
  label: string;
  photos: File[];
  onPhotoAdd: (
    e: React.ChangeEvent<HTMLInputElement>,
    category: string,
  ) => void;
  onPhotoRemove: (category: string, index: number) => void;
  icon?: string;
  multiple?: boolean;
  uploadStatus?: "idle" | "uploading" | "success" | "error";
  uploadProgress?: number;
}

export const PhotoUploadSection: React.FC<PhotoUploadSectionProps> = ({
  category,
  label,
  photos,
  onPhotoAdd,
  onPhotoRemove,
  icon = "📷",
  multiple = true,
  uploadStatus = "idle",
  uploadProgress = 0,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {icon} {label}
      </label>
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => onPhotoAdd(e, category)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={uploadStatus === "uploading"}
      />
      {photos.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-xs text-gray-500">
            {photos.length} foto(s) seleccionada(s)
          </p>
          {photos.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm bg-green-50 px-2 py-1 rounded"
            >
              <span className="text-green-700 truncate flex-1">
                ✓ {file.name}
              </span>
              <button
                type="button"
                onClick={() => onPhotoRemove(category, idx)}
                className="ml-2 text-red-500 hover:text-red-700 font-bold"
                title="Eliminar foto"
                disabled={uploadStatus === "uploading"}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Estado de subida */}
      {uploadStatus === "uploading" && photos.length > 0 && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-sm text-blue-700 font-medium">
              Subiendo fotos... {uploadProgress > 0 ? `${uploadProgress}%` : ""}
            </span>
          </div>
        </div>
      )}

      {uploadStatus === "success" && photos.length > 0 && (
        <div className="mt-2 p-3 bg-green-100 border border-green-300 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 text-lg">✓</span>
            <span className="text-sm text-green-700 font-medium">
              ¡Fotos subidas exitosamente al servidor!
            </span>
          </div>
        </div>
      )}

      {uploadStatus === "error" && photos.length > 0 && (
        <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-red-600 text-lg">✕</span>
            <span className="text-sm text-red-700 font-medium">
              Error al subir las fotos. Intenta de nuevo.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
