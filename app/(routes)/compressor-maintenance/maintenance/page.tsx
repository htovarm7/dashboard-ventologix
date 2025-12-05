"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Settings,
  Calendar,
  Clock,
  Edit,
  Save,
  X,
} from "lucide-react";
import {
  type Compressor,
  type MaintenanceRecord,
  type CompressorMaintenance,
} from "@/lib/types";
import { useDialog } from "@/hooks/useDialog";
import MaintenanceForm from "@/components/MaintenanceForm";
import { URL_API } from "@/lib/global";
import BackButton from "@/components/BackButton";

type MaintenanceType = {
  id_mantenimiento: number;
  nombre_tipo: string;
  frecuencia: number;
  tipo_compresor: string;
};

type MaintenanceTypesResponse = {
  maintenance_types: MaintenanceType[];
};

const MaintenanceTimer = ({
  frequency,
  horasTranscurridas,
}: {
  lastMaintenanceDate?: string;
  frequency: number;
  horasTranscurridas?: number;
}) => {
  // Validación inicial
  if (!frequency || frequency <= 0) {
    return (
      <div className="mt-3 p-3 bg-gray-100 rounded-lg border border-gray-300">
        <div className="text-sm text-gray-600">⚠️ Configuración incompleta</div>
      </div>
    );
  }

  // Horas usadas desde el último mantenimiento (0 si no hay dato)
  const hoursUsed = horasTranscurridas ?? 0;

  // CORRECCIÓN: Asegurarnos de que hoursUsed sea un número válido
  const validHoursUsed = isNaN(hoursUsed) ? 0 : Math.max(0, hoursUsed);

  // Horas restantes hasta el próximo mantenimiento
  const remaining = frequency - validHoursUsed;

  // Porcentaje de progreso (cuánto de la vida útil se ha consumido)
  const usagePercent = Math.min(
    Math.max((validHoursUsed / frequency) * 100, 0),
    100
  );

  // Porcentaje restante (vida útil que le queda)
  const remainingPercent = 100 - usagePercent;

  // Determinar estado del semáforo
  let status: "green" | "yellow" | "red" = "green";
  if (remaining <= 10) {
    status = "red"; // Vencido
  } else if (remainingPercent <= 20) {
    status = "yellow"; // Próximo a vencer (queda menos del 15%)
  } else {
    status = "green"; // En tiempo
  }

  // Clases de estilo según estado
  const statusClasses =
    status === "green"
      ? "bg-green-100 text-green-800"
      : status === "yellow"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  const barClass =
    status === "green"
      ? "bg-green-600"
      : status === "yellow"
      ? "bg-yellow-500"
      : "bg-red-600";

  const formatValue = (val: number) => {
    return Math.round(val).toLocaleString();
  };

  return (
    <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
      {/* Badge de estado */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClasses}`}
        >
          {status === "green"
            ? "🟢 En tiempo"
            : status === "yellow"
            ? "🟡 Próximo"
            : "🔴 Vencido"}
        </span>
      </div>

      {/* Información detallada */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Horas usadas:</span>
          <span className="font-semibold text-gray-900">
            {formatValue(validHoursUsed)} h
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">
            {remaining >= 0 ? "Horas restantes:" : "Vencido por:"}
          </span>
          <span
            className={`font-semibold ${
              remaining >= 0 ? "text-green-700" : "text-red-700"
            }`}
          >
            {formatValue(Math.abs(remaining))} h
          </span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-3">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barClass}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>

        {/* Escala visual */}
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0h</span>
          <span>{formatValue(validHoursUsed)}h uso</span>
          <span>{formatValue(frequency)}h</span>
        </div>
      </div>

      {/* Mensaje de resumen */}
      <div className="mt-2 text-xs text-gray-600 text-center">
        {remaining >= 0
          ? `Restan ${formatValue(remaining)} h (${remainingPercent.toFixed(
              1
            )}% de vida útil)`
          : `Vencido por ${formatValue(Math.abs(remaining))} h`}
      </div>
    </div>
  );
};

const CompressorRegistrationModal = ({
  availableClients,
  onClientSelect,
  onClose,
  onRegister,
}: {
  availableClients: string[];
  onClientSelect: (clientName: string) => Compressor[];
  onClose: () => void;
  onRegister: (compressor: Compressor) => void;
}) => {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [availableCompressors, setAvailableCompressors] = useState<
    Compressor[]
  >([]);
  const [selectedCompressor, setSelectedCompressor] =
    useState<Compressor | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClientSelect = (clientName: string) => {
    setSelectedClient(clientName);
    setAvailableCompressors(onClientSelect(clientName));
    setSelectedCompressor(null);
  };

  const handleGenerate = async () => {
    if (!selectedCompressor) return;

    setIsGenerating(true);
    try {
      await onRegister(selectedCompressor);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Dar de alta compresor
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Selección de cliente */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Cliente
            </label>
            {availableClients.length === 0 ? (
              <p className="text-gray-500 text-sm bg-gray-50 p-3 rounded">
                Todos los clientes tienen sus compresores dados de alta.
              </p>
            ) : (
              <select
                value={selectedClient}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Seleccione un cliente --</option>
                {availableClients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedClient && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Compresor
              </label>
              {availableCompressors.length === 0 ? (
                <p className="text-gray-500 text-sm bg-gray-50 p-3 rounded">
                  No hay compresores disponibles para este cliente.
                </p>
              ) : (
                <select
                  value={selectedCompressor?.id || ""}
                  onChange={(e) => {
                    const compressor = availableCompressors.find(
                      (c) => c.id === e.target.value
                    );
                    setSelectedCompressor(compressor || null);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Seleccione un compresor --</option>
                  {availableCompressors.map((compressor) => (
                    <option key={compressor.id} value={compressor.id}>
                      {compressor.alias} (Línea: {compressor.linea})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {selectedCompressor && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">
                Compresor seleccionado:
              </h3>
              <p className="text-sm text-blue-700">
                <strong>Nombre:</strong> {selectedCompressor.alias}
              </p>
              <p className="text-sm text-blue-700">
                <strong>Línea:</strong> {selectedCompressor.linea}
              </p>
              <p className="text-sm text-blue-700">
                <strong>Tipo:</strong> {selectedCompressor.tipo}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={isGenerating}
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={!selectedCompressor || isGenerating}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generando..." : "Generar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditMaintenanceModal = ({
  maintenance,
  onClose,
  onRefresh,
}: {
  maintenance: MaintenanceRecord | null;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) => {
  const [editData, setEditData] = useState({
    type: maintenance?.type || "",
    frequency: maintenance?.frequency || 0,
    lastMaintenanceDate: maintenance?.lastMaintenanceDate || "",
    description: maintenance?.description || "",
    isActive: maintenance?.isActive ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!maintenance) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userDataStr = sessionStorage.getItem("userData");
      const currentUserName = userDataStr
        ? JSON.parse(userDataStr)?.name || "Usuario desconocido"
        : "Usuario desconocido";

      const response = await fetch(
        `${URL_API}/web/maintenance/${maintenance.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            frecuencia_horas: editData.frequency,
            ultimo_mantenimiento: editData.lastMaintenanceDate,
            observaciones: editData.description,
            activo: editData.isActive,
            editado_por: currentUserName,
          }),
        }
      );

      if (response.ok) {
        await onRefresh();
        onClose();
      } else {
        const errorData = await response.json();
        console.error("Error al actualizar mantenimiento:", errorData);
        alert(
          "Error al actualizar el mantenimiento: " +
            (errorData.detail || "Error desconocido")
        );
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión al actualizar el mantenimiento");
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Editar Mantenimiento
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frecuencia (horas)
              </label>
              <input
                type="number"
                value={editData.frequency}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    frequency: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Último Mantenimiento
              </label>
              <input
                type="date"
                value={editData.lastMaintenanceDate}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    lastMaintenanceDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                value={editData.description}
                onChange={(e) =>
                  setEditData({ ...editData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Agregar observaciones del mantenimiento..."
              />
            </div>

            {/* Estado activo */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={editData.isActive}
                onChange={(e) =>
                  setEditData({ ...editData, isActive: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Mantenimiento activo
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                "Guardando..."
              ) : (
                <>
                  <Save size={16} />
                  Guardar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompressorMaintenance = () => {
  const [compressorMaintenances, setCompressorMaintenances] = useState<
    CompressorMaintenance[]
  >([]);
  const [filteredMaintenances, setFilteredMaintenances] = useState<
    CompressorMaintenance[]
  >([]);

  const isMaintenanceNext = (
    record: MaintenanceRecord,
    horasTranscurridas?: number
  ): boolean => {
    if (!record.frequency || record.frequency <= 0) {
      return false;
    }
    const hoursUsed = horasTranscurridas ?? 0;
    return hoursUsed >= record.frequency * 0.8 && hoursUsed < record.frequency;
  };
  const isMaintenanceUrgent = (
    record: MaintenanceRecord,
    horasTranscurridas?: number
  ): boolean => {
    if (!record.frequency || record.frequency <= 0) {
      return false;
    }

    // Usar horas de uso (0 si no hay dato)
    const hoursUsed = horasTranscurridas ?? 0;
    const remaining = record.frequency - hoursUsed;

    // Porcentaje restante de vida
    const remainingPercent = (remaining / record.frequency) * 100;

    // Urgente si quedan 0 o menos horas, o si queda menos del 15% de vida
    return remaining <= 0 || remainingPercent <= 15;
  };

  const [expandedCompressors, setExpandedCompressors] = useState<Set<string>>(
    new Set()
  );
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showCompressorRegistrationModal, setShowCompressorRegistrationModal] =
    useState(false);
  const [showEditMaintenanceModal, setShowEditMaintenanceModal] =
    useState(false);
  const [editingMaintenance, setEditingMaintenance] =
    useState<MaintenanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [allCompresores, setAllCompresores] = useState<Compressor[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<number>(0);
  // semaforoData: { [id_compresor]: { [id_mantenimiento]: horas_acumuladas } }
  const [semaforoData, setSemaforoData] = useState<
    Record<number, Record<number, number>>
  >({});
  const [userData, setUserData] = useState<{
    numeroCliente?: number;
    nombre?: string;
    name?: string;
    compresores?: Array<{
      id_compresor?: number;
      id?: string | number;
      linea?: string;
      Linea?: string;
      alias?: string;
      Alias?: string;
      numero_cliente?: number;
      nombre_cliente?: string;
      tipo?: string;
      tipo_compresor?: string;
    }>;
    numero_cliente?: number;
    rol?: number;
  } | null>(null);

  const { showSuccess } = useDialog();

  // Función para obtener y actualizar registros de mantenimiento
  const fetchMaintenanceRecordsAndUpdate = async () => {
    try {
      const maintenanceApiRecords = await fetchMaintenanceRecords(
        userData?.numeroCliente
      );

      const maintenanceRecords = maintenanceApiRecords.map(
        convertApiRecordToLocal
      );

      const maintenanceByCompressor = maintenanceRecords.reduce(
        (
          acc: Record<string, MaintenanceRecord[]>,
          record: MaintenanceRecord
        ) => {
          if (!acc[record.compressorId]) {
            acc[record.compressorId] = [];
          }
          acc[record.compressorId].push(record);
          return acc;
        },
        {} as Record<string, MaintenanceRecord[]>
      );

      // Solo mostrar compresores que ya tienen mantenimientos
      const compressorsWithMaintenance = allCompresores.filter(
        (comp) => maintenanceByCompressor[comp.id]
      );

      const compressorMaintenanceData = compressorsWithMaintenance.map(
        (compressor) => ({
          compressor,
          maintenanceRecords: maintenanceByCompressor[compressor.id] || [],
        })
      );

      setCompressorMaintenances(compressorMaintenanceData);
      setFilteredMaintenances(compressorMaintenanceData);

      // Actualizar datos del semáforo para todos los compresores
      await fetchAllSemaforoData(allCompresores);
    } catch (error) {
      console.error("Error refrescando registros de mantenimiento:", error);
    }
  };

  // Función para abrir modal de edición
  const handleEditMaintenance = (maintenance: MaintenanceRecord) => {
    setEditingMaintenance(maintenance);
    setShowEditMaintenanceModal(true);
  };

  // Función para obtener registros de mantenimiento desde la API
  const fetchMaintenanceRecords = async (
    numeroCliente?: number
  ): Promise<
    Array<{
      id: number;
      id_compresor: number;
      compressor_alias?: string;
      linea?: string;
      nombre_tipo?: string;
      id_mantenimiento?: number;
      frecuencia_horas?: number;
      ultimo_mantenimiento?: string;
      activo?: boolean;
      observaciones?: string;
      fecha_creacion?: string;
    }>
  > => {
    try {
      const url = numeroCliente
        ? `${URL_API}/web/maintenance/list?numero_cliente=${numeroCliente}`
        : `${URL_API}/web/maintenance/list`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Error al obtener registros de mantenimiento");
      }

      const data = await response.json();
      return data.maintenance_records || [];
    } catch (error) {
      console.error("Error fetching maintenance records:", error);
      return [];
    }
  };

  // Función para obtener datos del semáforo de mantenimientos para un compresor específico
  const fetchSemaforoData = useCallback(async (id_compresor: number) => {
    try {
      const response = await fetch(
        `${URL_API}/web/maintenance/semaforo/${id_compresor}`
      );
      if (!response.ok) {
        throw new Error("Error al obtener datos del semáforo");
      }

      const data = await response.json();
      console.log("Semaforo API response:", { id_compresor, data });

      // El API retorna: { id_compresor, mantenimientos: [{id_mantenimiento, horas_acumuladas}] }
      if (data.mantenimientos && Array.isArray(data.mantenimientos)) {
        // Guardar por compresor y por mantenimiento
        const mantenimientosPorCompresor: Record<number, number> = {};
        data.mantenimientos.forEach(
          (mant: { id_mantenimiento: number; horas_acumuladas: number }) => {
            mantenimientosPorCompresor[mant.id_mantenimiento] =
              mant.horas_acumuladas;
          }
        );
        setSemaforoData((prev) => ({
          ...prev,
          [id_compresor]: mantenimientosPorCompresor,
        }));
      }
    } catch (error) {
      console.error(
        `Error fetching semaforo data for compresor ${id_compresor}:`,
        error
      );
    }
  }, []);

  // Función para obtener datos del semáforo de todos los compresores
  const fetchAllSemaforoData = useCallback(
    async (compresores: Compressor[]) => {
      try {
        // Hacer llamadas en paralelo para todos los compresores
        await Promise.all(
          compresores.map((comp) => fetchSemaforoData(parseInt(comp.id)))
        );
      } catch (error) {
        console.error("Error fetching all semaforo data:", error);
      }
    },
    [fetchSemaforoData]
  );

  // Función para convertir registros de API a formato local
  const convertApiRecordToLocal = (apiRecord: {
    id: number;
    id_compresor: number;
    compressor_alias?: string;
    linea?: string;
    nombre_tipo?: string;
    id_mantenimiento?: number;
    frecuencia_horas?: number;
    ultimo_mantenimiento?: string;
    activo?: boolean;
    observaciones?: string;
    fecha_creacion?: string;
  }): MaintenanceRecord => {
    return {
      id: apiRecord.id.toString(),
      compressorId: apiRecord.id_compresor.toString(),
      compressorAlias:
        apiRecord.compressor_alias || `Compresor ${apiRecord.linea}`,
      type: apiRecord.nombre_tipo || `Tipo ${apiRecord.id_mantenimiento}`,
      frequency: apiRecord.frecuencia_horas || 0,
      lastMaintenanceDate: apiRecord.ultimo_mantenimiento || "",
      nextMaintenanceDate: "", // Calcular si es necesario
      isActive: apiRecord.activo || false,
      description:
        apiRecord.observaciones || `Mantenimiento ${apiRecord.nombre_tipo}`,
      createdAt: apiRecord.fecha_creacion || new Date().toISOString(),
      id_mantenimiento: apiRecord.id_mantenimiento, // Agregar el ID de mantenimiento
    };
  };

  // Función para agrupar mantenimientos por cliente (solo para rol 2)
  const groupMaintenancesByClient = (maintenances: CompressorMaintenance[]) => {
    if (userRole !== 2) {
      return maintenances;
    }

    const grouped = maintenances.reduce((acc, cm) => {
      const clientName = cm.compressor.nombre_cliente || "Cliente Desconocido";
      if (!acc[clientName]) {
        acc[clientName] = [];
      }
      acc[clientName].push(cm);
      return acc;
    }, {} as Record<string, CompressorMaintenance[]>);

    return grouped;
  };

  // Función para obtener clientes disponibles (que no tienen todos sus compresores dados de alta)
  const getAvailableClients = () => {
    const clientsWithAllCompressors = new Map<
      string,
      { total: number; registered: number }
    >();

    // Contar todos los compresores por cliente
    allCompresores.forEach((comp) => {
      const clientName = comp.nombre_cliente || "Cliente Desconocido";
      if (!clientsWithAllCompressors.has(clientName)) {
        clientsWithAllCompressors.set(clientName, { total: 0, registered: 0 });
      }
      clientsWithAllCompressors.get(clientName)!.total++;
    });

    // Contar compresores dados de alta por cliente
    compressorMaintenances.forEach((cm) => {
      const clientName = cm.compressor.nombre_cliente || "Cliente Desconocido";
      if (clientsWithAllCompressors.has(clientName)) {
        clientsWithAllCompressors.get(clientName)!.registered++;
      }
    });

    // Filtrar clientes que no tienen todos sus compresores dados de alta
    const availableClients: string[] = [];
    clientsWithAllCompressors.forEach((counts, clientName) => {
      if (counts.registered < counts.total) {
        availableClients.push(clientName);
      }
    });

    return availableClients;
  };

  // Función para obtener compresores disponibles de un cliente específico
  const getAvailableCompressorsByClient = (clientName: string) => {
    const registeredCompressorIds = new Set(
      compressorMaintenances.map((cm) => cm.compressor.id)
    );

    return allCompresores.filter(
      (comp) =>
        comp.nombre_cliente === clientName &&
        !registeredCompressorIds.has(comp.id)
    );
  };

  useEffect(() => {
    const loadUserData = async () => {
      const userData = sessionStorage.getItem("userData");
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          setIsAuthorized(true);
          setUserRole(parsedData.rol || 0);
          setUserData(parsedData);

          // Guardar todos los compresores disponibles
          const allUserCompressors: Compressor[] = (
            parsedData.compresores || []
          ).map(
            (
              comp: {
                id_compresor?: number;
                id?: string | number;
                linea?: string;
                Linea?: string;
                alias?: string;
                Alias?: string;
                numero_cliente?: number;
                nombre_cliente?: string;
                tipo?: string;
                tipo_compresor?: string;
              },
              index: number
            ) => {
              const uniqueId = `${comp.id_compresor || index}`;

              return {
                id: uniqueId,
                linea: comp.linea || comp.Linea || "",
                id_cliente: comp.numero_cliente || parsedData.numero_cliente,
                alias:
                  comp.alias ||
                  comp.Alias ||
                  `Compresor ${comp.linea || comp.id || index + 1}`,
                nombre_cliente:
                  comp.nombre_cliente ||
                  `Cliente ${comp.numero_cliente || parsedData.numero_cliente}`,
                tipo_compresor: comp.tipo || "piston", // Usar 'tipo' del userData, no 'tipo_compresor'
              };
            }
          );

          setAllCompresores(allUserCompressors);

          // Obtener registros de mantenimiento desde la API
          const maintenanceApiRecords = await fetchMaintenanceRecords(
            parsedData.numeroCliente
          );

          const maintenanceRecords = maintenanceApiRecords.map(
            convertApiRecordToLocal
          );

          const maintenanceByCompressor = maintenanceRecords.reduce(
            (
              acc: Record<string, MaintenanceRecord[]>,
              record: MaintenanceRecord
            ) => {
              if (!acc[record.compressorId]) {
                acc[record.compressorId] = [];
              }
              acc[record.compressorId].push(record);
              return acc;
            },
            {} as Record<string, MaintenanceRecord[]>
          );

          // Solo mostrar compresores que ya tienen mantenimientos
          const compressorsWithMaintenance = allUserCompressors.filter(
            (comp) => maintenanceByCompressor[comp.id]
          );

          const compressorMaintenanceData = compressorsWithMaintenance.map(
            (compressor) => ({
              compressor,
              maintenanceRecords: maintenanceByCompressor[compressor.id] || [],
            })
          );

          setCompressorMaintenances(compressorMaintenanceData);
          setFilteredMaintenances(compressorMaintenanceData);

          // Obtener datos del semáforo de mantenimientos para todos los compresores
          await fetchAllSemaforoData(allUserCompressors);

          setLoading(false);
        } catch (error) {
          console.error("Error parsing user data:", error);
          setIsAuthorized(false);
          setLoading(false);
        }
      } else {
        setIsAuthorized(false);
        setLoading(false);
      }
    };

    setTimeout(() => {
      loadUserData().catch(console.error);
    }, 500);
  }, [fetchAllSemaforoData]);

  if (!loading && !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Settings size={64} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Acceso Requerido
          </h2>
          <p className="text-gray-600 mb-4">
            Necesitas iniciar sesión para acceder a esta página.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  const toggleCompressorExpansion = (compressorId: string) => {
    const newExpanded = new Set(expandedCompressors);
    if (newExpanded.has(compressorId)) {
      newExpanded.delete(compressorId);
    } else {
      newExpanded.add(compressorId);
    }
    setExpandedCompressors(newExpanded);
  };

  const handleAddMaintenance = async (
    maintenanceData: Omit<MaintenanceRecord, "id" | "createdAt"> & {
      customType?: number;
    }
  ) => {
    try {
      const tipoMantenimiento = 30;

      const maintenanceRequest = {
        id_compresor: parseInt(maintenanceData.compressorId),
        id_mantenimiento: tipoMantenimiento,
        frecuencia_horas: maintenanceData.frequency,
        ultimo_mantenimiento: maintenanceData.lastMaintenanceDate,
        activo: maintenanceData.isActive,
        observaciones: maintenanceData.description || "",
        costo: 0,
        creado_por: userData?.name || "Usuario desconocido",
        fecha_creacion: new Date().toISOString().split("T")[0],
      };

      const addResponse = await fetch(`${URL_API}/web/maintenance/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(maintenanceRequest),
      });

      if (!addResponse.ok) {
        const errorData = await addResponse.json();
        console.error("Error en la respuesta del servidor:", errorData);
        throw new Error(errorData.detail || "Error al crear mantenimiento");
      }

      // Refrescar los datos desde la API
      await fetchMaintenanceRecordsAndUpdate();

      setShowMaintenanceForm(false);
      showSuccess(
        "Mantenimiento agregado",
        "El mantenimiento personalizado se ha registrado exitosamente en la base de datos."
      );
    } catch (error) {
      console.error("Error al agregar mantenimiento:", error);
      showSuccess(
        "Error",
        `Hubo un error al agregar el mantenimiento: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  };

  // Función para dar de alta un compresor con sus mantenimientos
  const handleRegisterCompressor = async (compressor: Compressor) => {
    try {
      // Validar y limpiar el tipo de compresor
      const tipoCompresor =
        compressor.tipo && compressor.tipo !== "0" && compressor.tipo !== null
          ? compressor.tipo
          : "piston";

      // Obtener los tipos de mantenimiento del endpoint
      const response = await fetch(
        `${URL_API}/web/maintenance/types?tipo=${tipoCompresor}`
      );

      if (!response.ok) {
        throw new Error("Error al obtener tipos de mantenimiento");
      }

      const data: MaintenanceTypesResponse = await response.json();

      // Crear registros de mantenimiento en la base de datos usando el API
      const maintenanceRecords: MaintenanceRecord[] = [];
      const createdByName = userData?.name || "Usuario desconocido";
      const today = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD

      for (const type of data.maintenance_types) {
        const maintenanceRequest = {
          id_compresor: parseInt(compressor.id),
          id_mantenimiento: type.id_mantenimiento,
          frecuencia_horas: type.frecuencia,
          ultimo_mantenimiento: today,
          activo: true,
          observaciones: "", // Como es dar de alta, va vacío
          costo: 0,
          creado_por: createdByName,
          fecha_creacion: today,
        };

        const addResponse = await fetch(`${URL_API}/web/maintenance/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(maintenanceRequest),
        });

        if (addResponse.ok) {
          const addResult = await addResponse.json();

          // Crear el objeto MaintenanceRecord para el estado local
          maintenanceRecords.push({
            id: addResult.id.toString(),
            compressorId: compressor.id,
            compressorAlias: compressor.alias,
            type: type.nombre_tipo,
            frequency: type.frecuencia,
            lastMaintenanceDate: today,
            nextMaintenanceDate: "",
            isActive: true,
            createdAt: new Date().toISOString(),
          });
        } else {
          console.error(
            "Error al crear mantenimiento:",
            await addResponse.text()
          );
          throw new Error(`Error al crear mantenimiento ${type.nombre_tipo}`);
        }
      }

      // Agregar el compresor con sus mantenimientos a la lista
      const newCompressorMaintenance: CompressorMaintenance = {
        compressor,
        maintenanceRecords,
      };

      const updatedMaintenances = [
        ...compressorMaintenances,
        newCompressorMaintenance,
      ];
      setCompressorMaintenances(updatedMaintenances);
      setFilteredMaintenances(updatedMaintenances);
      setShowCompressorRegistrationModal(false);

      showSuccess(
        "Compresor dado de alta",
        `El compresor ${compressor.alias} se ha dado de alta exitosamente con ${data.maintenance_types.length} tipos de mantenimiento.`
      );
    } catch (error) {
      console.error("Error al dar de alta el compresor:", error);
      showSuccess(
        "Error",
        "Hubo un error al dar de alta el compresor. Por favor intenta de nuevo."
      );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Cargando mantenimientos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <BackButton className="fixed" />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-bold text-gray-900">
              Mantenimiento de Compresores
            </h1>
            <p className="text-2xl text-gray-600 mt-2">
              Gestiona los mantenimientos programados y correctivos de tus
              compresores
            </p>
          </div>
        </div>

        {/* Compressor List */}
        <div className="space-y-4">
          {userRole === 2
            ? // Agrupación por cliente para rol 2 (VAST)
              (() => {
                const groupedData =
                  groupMaintenancesByClient(filteredMaintenances);
                return Object.entries(groupedData).map(
                  ([clientName, clientMaintenances]) => (
                    <div
                      key={clientName}
                      className="bg-white rounded-lg shadow overflow-hidden"
                    >
                      {/* Client Header */}
                      <div className="bg-blue-50 p-4 border-b border-blue-200">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-bold text-blue-900">
                            {clientName}
                          </h2>
                          <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm font-medium">
                            {clientMaintenances.length} compresor
                            {clientMaintenances.length !== 1 ? "es" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Client's Compressors */}
                      <div className="divide-y divide-gray-200">
                        {clientMaintenances.map((cm: CompressorMaintenance) => (
                          <div key={cm.compressor.id}>
                            {/* Compressor Header */}
                            <div
                              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() =>
                                toggleCompressorExpansion(cm.compressor.id)
                              }
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  {expandedCompressors.has(cm.compressor.id) ? (
                                    <ChevronDown
                                      size={20}
                                      className="text-gray-500"
                                    />
                                  ) : (
                                    <ChevronRight
                                      size={20}
                                      className="text-gray-500"
                                    />
                                  )}
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      {cm.compressor.alias}
                                    </h3>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                    {cm.maintenanceRecords.length} mantenimiento
                                    {cm.maintenanceRecords.length !== 1
                                      ? "s"
                                      : ""}
                                  </span>
                                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                    {
                                      cm.maintenanceRecords.filter(
                                        (r: MaintenanceRecord) => r.isActive
                                      ).length
                                    }{" "}
                                    activo
                                    {cm.maintenanceRecords.filter(
                                      (r: MaintenanceRecord) => r.isActive
                                    ).length !== 1
                                      ? "s"
                                      : ""}
                                  </span>
                                  {(() => {
                                    const urgentCount =
                                      cm.maintenanceRecords.filter(
                                        (r: MaintenanceRecord) =>
                                          r.isActive &&
                                          isMaintenanceUrgent(
                                            r,
                                            r.id_mantenimiento &&
                                              cm.compressor.id &&
                                              semaforoData[
                                                Number(cm.compressor.id)
                                              ]
                                              ? semaforoData[
                                                  Number(cm.compressor.id)
                                                ][Number(r.id_mantenimiento)]
                                              : undefined
                                          )
                                      ).length;
                                    const nextCount =
                                      cm.maintenanceRecords.filter(
                                        (r: MaintenanceRecord) =>
                                          r.isActive &&
                                          !isMaintenanceUrgent(
                                            r,
                                            r.id_mantenimiento &&
                                              cm.compressor.id &&
                                              semaforoData[
                                                Number(cm.compressor.id)
                                              ]
                                              ? semaforoData[
                                                  Number(cm.compressor.id)
                                                ][Number(r.id_mantenimiento)]
                                              : undefined
                                          ) &&
                                          isMaintenanceNext(
                                            r,
                                            r.id_mantenimiento &&
                                              cm.compressor.id &&
                                              semaforoData[
                                                Number(cm.compressor.id)
                                              ]
                                              ? semaforoData[
                                                  Number(cm.compressor.id)
                                                ][Number(r.id_mantenimiento)]
                                              : undefined
                                          )
                                      ).length;
                                    return (
                                      <>
                                        {urgentCount > 0 && (
                                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                            🔴 {urgentCount} urgente
                                            {urgentCount !== 1 ? "s" : ""}
                                          </span>
                                        )}
                                        {nextCount > 0 && (
                                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                                            🟡 {nextCount} próximo
                                            {nextCount !== 1 ? "s" : ""}
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* Maintenance Records */}
                            {expandedCompressors.has(cm.compressor.id) && (
                              <div className="p-6 bg-gray-50">
                                {cm.maintenanceRecords.length === 0 ? (
                                  <div className="text-center py-8 text-gray-500">
                                    <Settings
                                      size={48}
                                      className="mx-auto mb-4 text-gray-300"
                                    />
                                    <p>
                                      No hay mantenimientos registrados para
                                      este compresor
                                    </p>
                                    <button
                                      onClick={() =>
                                        setShowMaintenanceForm(true)
                                      }
                                      className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                      Agregar el primer mantenimiento
                                    </button>
                                  </div>
                                ) : (
                                  <div className="grid gap-4">
                                    {cm.maintenanceRecords.map(
                                      (record: MaintenanceRecord) => (
                                        <div
                                          key={record.id}
                                          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                                        >
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-3 mb-3">
                                                <h4 className="font-semibold text-gray-900 text-lg">
                                                  {record.type}
                                                </h4>
                                                <span
                                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    record.isActive
                                                      ? "bg-green-100 text-green-800"
                                                      : "bg-gray-100 text-gray-600"
                                                  }`}
                                                >
                                                  {record.isActive
                                                    ? "Activo"
                                                    : "Inactivo"}
                                                </span>
                                              </div>

                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                  <Clock
                                                    size={16}
                                                    className="text-gray-400"
                                                  />
                                                  <span className="text-gray-600">
                                                    Frecuencia de Cambio:
                                                  </span>
                                                  <span className="font-medium">
                                                    {record.frequency} horas
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Calendar
                                                    size={16}
                                                    className="text-gray-400"
                                                  />
                                                  <span className="text-gray-600">
                                                    Último Mantenimiento:
                                                  </span>
                                                  <span className="font-medium">
                                                    {record.lastMaintenanceDate
                                                      ? record.lastMaintenanceDate.split(
                                                          "T"
                                                        )[0]
                                                      : "No registrado"}
                                                  </span>
                                                </div>
                                              </div>

                                              {/* Contador por horas y semáforo */}
                                              <MaintenanceTimer
                                                lastMaintenanceDate={
                                                  record.lastMaintenanceDate
                                                }
                                                frequency={record.frequency}
                                                horasTranscurridas={
                                                  record.id_mantenimiento &&
                                                  cm.compressor.id &&
                                                  semaforoData[
                                                    Number(cm.compressor.id)
                                                  ]
                                                    ? semaforoData[
                                                        Number(cm.compressor.id)
                                                      ][
                                                        Number(
                                                          record.id_mantenimiento
                                                        )
                                                      ]
                                                    : undefined
                                                }
                                              />

                                              {record.description && (
                                                <div className="mt-3 pt-3 border-t border-gray-100">
                                                  <p className="text-sm text-gray-600">
                                                    <strong>
                                                      Observaciones:
                                                    </strong>{" "}
                                                    {record.description}
                                                  </p>
                                                </div>
                                              )}
                                            </div>

                                            {userRole === 2 && (
                                              <button
                                                onClick={() =>
                                                  handleEditMaintenance(record)
                                                }
                                                className="ml-4 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar mantenimiento"
                                              >
                                                <Edit size={18} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                );
              })()
            : // Lista normal para otros roles
              filteredMaintenances.map((cm) => (
                <div
                  key={cm.compressor.id}
                  className="bg-white rounded-lg shadow overflow-hidden"
                >
                  {/* Compressor Header */}
                  <div
                    className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleCompressorExpansion(cm.compressor.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {expandedCompressors.has(cm.compressor.id) ? (
                          <ChevronDown size={20} className="text-gray-500" />
                        ) : (
                          <ChevronRight size={20} className="text-gray-500" />
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {cm.compressor.alias}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {cm.maintenanceRecords.length} mantenimiento
                          {cm.maintenanceRecords.length !== 1 ? "s" : ""}
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          {
                            cm.maintenanceRecords.filter((r) => r.isActive)
                              .length
                          }{" "}
                          activo
                          {cm.maintenanceRecords.filter((r) => r.isActive)
                            .length !== 1
                            ? "s"
                            : ""}
                        </span>
                        {(() => {
                          const urgentCount = cm.maintenanceRecords.filter(
                            (r) =>
                              r.isActive &&
                              isMaintenanceUrgent(
                                r,
                                r.id_mantenimiento &&
                                  cm.compressor.id &&
                                  semaforoData[Number(cm.compressor.id)]
                                  ? semaforoData[Number(cm.compressor.id)][
                                      Number(r.id_mantenimiento)
                                    ]
                                  : undefined
                              )
                          ).length;
                          return urgentCount > 0 ? (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                              🔴 {urgentCount} urgente
                              {urgentCount !== 1 ? "s" : ""}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Records */}
                  {expandedCompressors.has(cm.compressor.id) && (
                    <div className="p-6">
                      {cm.maintenanceRecords.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Settings
                            size={48}
                            className="mx-auto mb-4 text-gray-300"
                          />
                          <p>
                            No hay mantenimientos registrados para este
                            compresor
                          </p>
                          <button
                            onClick={() => setShowMaintenanceForm(true)}
                            className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Agregar el primer mantenimiento
                          </button>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {cm.maintenanceRecords.map((record) => (
                            <div
                              key={record.id}
                              className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <h4 className="font-semibold text-gray-900 text-lg">
                                      {record.type}
                                    </h4>
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        record.isActive
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-600"
                                      }`}
                                    >
                                      {record.isActive ? "Activo" : "Inactivo"}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Clock
                                        size={16}
                                        className="text-gray-400"
                                      />
                                      <span className="text-gray-600">
                                        Frecuencia de Cambio:
                                      </span>
                                      <span className="font-medium">
                                        {record.frequency} horas
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Calendar
                                        size={16}
                                        className="text-gray-400"
                                      />
                                      <span className="text-gray-600">
                                        Último Mantenimiento:
                                      </span>
                                      <span className="font-medium">
                                        {record.lastMaintenanceDate ||
                                          "No registrado"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Contador por horas y semáforo */}
                                  <MaintenanceTimer
                                    lastMaintenanceDate={
                                      record.lastMaintenanceDate
                                    }
                                    frequency={record.frequency}
                                    horasTranscurridas={
                                      record.id_mantenimiento &&
                                      cm.compressor.id &&
                                      semaforoData[Number(cm.compressor.id)]
                                        ? semaforoData[
                                            Number(cm.compressor.id)
                                          ][Number(record.id_mantenimiento)]
                                        : undefined
                                    }
                                  />

                                  {record.description && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                      <p className="text-sm text-gray-600">
                                        <strong>Observaciones:</strong>{" "}
                                        {record.description}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {userRole === 2 && (
                                  <button
                                    onClick={() =>
                                      handleEditMaintenance(record)
                                    }
                                    className="ml-4 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Editar mantenimiento"
                                  >
                                    <Edit size={18} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>

      {/* Compressor Registration Modal */}
      {showCompressorRegistrationModal && (
        <CompressorRegistrationModal
          availableClients={getAvailableClients()}
          onClientSelect={getAvailableCompressorsByClient}
          onClose={() => setShowCompressorRegistrationModal(false)}
          onRegister={handleRegisterCompressor}
        />
      )}

      {/* Maintenance Form Modal */}
      {showMaintenanceForm && (
        <MaintenanceForm
          compressors={allCompresores}
          onSubmit={handleAddMaintenance}
          onClose={() => setShowMaintenanceForm(false)}
        />
      )}

      {/* Edit Maintenance Modal */}
      {showEditMaintenanceModal && (
        <EditMaintenanceModal
          maintenance={editingMaintenance}
          onClose={() => {
            setShowEditMaintenanceModal(false);
            setEditingMaintenance(null);
          }}
          onRefresh={fetchMaintenanceRecordsAndUpdate}
        />
      )}
    </div>
  );
};

export default CompressorMaintenance;
