"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Clock, Type, Tag, FileText, Users } from "lucide-react";
import { Compressor, MaintenanceRecord } from "@/lib/types";
import { URL_API } from "@/lib/global";

interface MaintenanceFormProps {
  compressors: Compressor[];
  onSubmit: (
    maintenanceData: Omit<MaintenanceRecord, "id" | "createdAt"> & {
      customType?: number;
    }
  ) => void;
  onClose: () => void;
}

type MaintenanceType = {
  tipo: number;
  nombre_tipo: string;
  frecuencia: number;
  tipo_compresor: string;
};

const MaintenanceForm = ({
  compressors,
  onSubmit,
  onClose,
}: MaintenanceFormProps) => {
  const [formData, setFormData] = useState({
    clientName: "",
    compressorId: "",
    compressorAlias: "",
    type: "Mantenimiento Personalizado",
    frequency: "",
    lastMaintenanceDate: "",
    isActive: true,
    description: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableClients, setAvailableClients] = useState<string[]>([]);
  const [clientCompressors, setClientCompressors] = useState<Compressor[]>([]);

  // Obtener clientes únicos al cargar el componente
  useEffect(() => {
    const clients = Array.from(
      new Set(
        compressors
          .map((c) => c.nombre_cliente)
          .filter(
            (name): name is string => name !== undefined && name.trim() !== ""
          )
      )
    );
    setAvailableClients(clients);
  }, [compressors]);

  // Función para manejar cambio de cliente
  const handleClientChange = (clientName: string) => {
    setFormData((prev) => ({
      ...prev,
      clientName,
      compressorId: "",
      compressorAlias: "",
    }));

    // Filtrar compresores del cliente seleccionado
    const clientComps = compressors.filter(
      (c) => c.nombre_cliente === clientName
    );
    setClientCompressors(clientComps);

    // Limpiar error del cliente si se selecciona uno
    if (errors.clientName) {
      setErrors((prev) => ({ ...prev, clientName: "" }));
    }
  };

  const handleCompressorChange = (compressorId: string) => {
    const selectedCompressor = clientCompressors.find(
      (c) => c.id === compressorId
    );
    setFormData((prev) => ({
      ...prev,
      compressorId,
      compressorAlias: selectedCompressor?.alias || "",
    }));

    // Limpiar error del compresor si se selecciona uno
    if (errors.compressorId) {
      setErrors((prev) => ({ ...prev, compressorId: "" }));
    }
  };

  const calculateNextMaintenanceDate = (
    lastDate: string,
    frequency: number
  ): string => {
    const last = new Date(lastDate);
    // Asumiendo que cada hora de trabajo equivale aproximadamente a 1 día
    // En una implementación real, esto dependería de las horas de operación del compresor
    const estimatedDays = Math.floor(frequency / 24); // Asumiendo 24 horas de operación por día
    const nextDate = new Date(
      last.getTime() + estimatedDays * 24 * 60 * 60 * 1000
    );
    return nextDate.toISOString().split("T")[0];
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientName) {
      newErrors.clientName = "Debe seleccionar un cliente";
    }

    if (!formData.compressorId) {
      newErrors.compressorId = "Debe seleccionar un compresor";
    }

    if (!formData.frequency || parseInt(formData.frequency) <= 0) {
      newErrors.frequency =
        "Debe especificar una frecuencia válida (mayor a 0)";
    }

    if (!formData.lastMaintenanceDate) {
      newErrors.lastMaintenanceDate =
        "Debe seleccionar la fecha del último mantenimiento";
    } else {
      const selectedDate = new Date(formData.lastMaintenanceDate);
      const today = new Date();
      if (selectedDate > today) {
        newErrors.lastMaintenanceDate = "La fecha no puede ser futura";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const frequency = parseInt(formData.frequency);
    const nextMaintenanceDate = calculateNextMaintenanceDate(
      formData.lastMaintenanceDate,
      frequency
    );

    const maintenanceData: Omit<MaintenanceRecord, "id" | "createdAt"> & {
      customType?: number;
    } = {
      compressorId: formData.compressorId,
      compressorAlias: formData.compressorAlias,
      type: formData.type,
      frequency,
      lastMaintenanceDate: formData.lastMaintenanceDate,
      nextMaintenanceDate,
      isActive: formData.isActive,
      description: formData.description.trim() || undefined,
      customType: 30, // Tipo fijo 30 para mantenimientos personalizados
    };

    onSubmit(maintenanceData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Agregar Nuevo Mantenimiento
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Selección de Cliente */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Users size={16} />
              Cliente
            </label>
            <select
              value={formData.clientName}
              onChange={(e) => handleClientChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.clientName ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Seleccionar cliente...</option>
              {availableClients.map((client, index) => (
                <option key={`client_${index}`} value={client}>
                  {client}
                </option>
              ))}
            </select>
            {errors.clientName && (
              <p className="mt-1 text-sm text-red-600">{errors.clientName}</p>
            )}
          </div>

          {/* Selección de Compresor */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Tag size={16} />
              Compresor
            </label>
            <select
              value={formData.compressorId}
              onChange={(e) => handleCompressorChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.compressorId ? "border-red-500" : "border-gray-300"
              }`}
              disabled={!formData.clientName}
            >
              <option value="">
                {!formData.clientName
                  ? "Selecciona un cliente primero"
                  : "Seleccionar compresor..."}
              </option>
              {clientCompressors.map((compressor, index) => (
                <option
                  key={`${compressor.id}_${compressor.linea}_${index}`}
                  value={compressor.id}
                >
                  {compressor.alias} - Línea: {compressor.linea}
                </option>
              ))}
            </select>
            {errors.compressorId && (
              <p className="mt-1 text-sm text-red-600">{errors.compressorId}</p>
            )}
          </div>

          {/* Tipo de Mantenimiento (Fijo) */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Type size={16} />
              Tipo de Mantenimiento
            </label>
            <input
              type="text"
              value={formData.type}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-gray-500">
              Este es un mantenimiento personalizado (Tipo 30)
            </p>
          </div>

          {/* Frecuencia (Editable) */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock size={16} />
              Frecuencia (horas)
            </label>
            <input
              type="number"
              min="1"
              value={formData.frequency}
              onChange={(e) => handleInputChange("frequency", e.target.value)}
              placeholder="Ingrese la frecuencia en horas"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.frequency ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.frequency && (
              <p className="mt-1 text-sm text-red-600">{errors.frequency}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Especifica cada cuántas horas de operación se debe realizar este
              mantenimiento
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} />
              Fecha del Último Mantenimiento
            </label>
            <input
              type="date"
              value={formData.lastMaintenanceDate}
              onChange={(e) =>
                handleInputChange("lastMaintenanceDate", e.target.value)
              }
              max={new Date().toISOString().split("T")[0]}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.lastMaintenanceDate
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {errors.lastMaintenanceDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.lastMaintenanceDate}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText size={16} />
              Descripción (Opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Detalles adicionales sobre el mantenimiento..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Estado Activo */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange("isActive", e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="isActive"
              className="ml-2 text-sm font-medium text-gray-700"
            >
              Mantenimiento activo
            </label>
            <p className="ml-2 text-sm text-gray-500">
              (Se incluirá en los cálculos de próximos mantenimientos)
            </p>
          </div>

          {/* Vista Previa de Próximo Mantenimiento */}
          {formData.lastMaintenanceDate && formData.frequency && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Vista Previa
              </h4>
              <p className="text-sm text-blue-700">
                Próximo mantenimiento estimado:{" "}
                <span className="font-medium">
                  {new Date(
                    calculateNextMaintenanceDate(
                      formData.lastMaintenanceDate,
                      parseInt(formData.frequency) || 0
                    )
                  ).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                *Basado en{" "}
                {Math.floor((parseInt(formData.frequency) || 0) / 24)} días
                estimados de operación
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Agregar Mantenimiento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceForm;
