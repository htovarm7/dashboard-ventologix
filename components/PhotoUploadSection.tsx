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
}

export const PhotoUploadSection: React.FC<PhotoUploadSectionProps> = ({
  category,
  label,
  photos,
  onPhotoAdd,
  onPhotoRemove,
  icon = "📷",
  multiple = true,
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
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
