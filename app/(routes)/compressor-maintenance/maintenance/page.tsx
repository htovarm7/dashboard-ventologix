"use client";

import { useState, useEffect } from "react";
import {
  Plus,
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
  tipo: number;
  nombre_tipo: string;
  frecuencia: number;
  tipo_compresor: string;
};

type MaintenanceTypesResponse = {
  maintenance_types: MaintenanceType[];
};

const MaintenanceTimer = ({
  lastMaintenanceDate,
  frequency,
}: {
  lastMaintenanceDate?: string;
  frequency: number;
}) => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const parseDate = (d?: string) => {
    if (!d) return null;
    try {
      const date = d.includes("T") ? new Date(d) : new Date(`${d}T00:00:00`);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  const last = parseDate(lastMaintenanceDate);
  if (!last || !frequency || frequency <= 0) {
    return (
      <div className="mt-3 text-sm text-gray-500">
        Sin datos de temporizador
      </div>
    );
  }

  const elapsedMs = now.getTime() - last.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const remaining = frequency - elapsedHours;

  const progressPercent = Math.min(
    Math.max((elapsedHours / frequency) * 100, 0),
    100
  );

  const remainingPercent = Math.max(0, 100 - progressPercent);

  let status: "green" | "yellow" | "red" = "green";
  if (remainingPercent > 30) {
    status = "green";
  } else if (remainingPercent > 15) {
    status = "yellow";
  } else {
    status = "red";
  }

  if (frequency - elapsedHours <= 0) {
    status = "red";
  }

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

  const formatRemaining = (h: number) => {
    const abs = Math.abs(h);
    if (abs < 1) return `${Math.round(abs * 60)} min`;
    if (abs < 24) return `${Math.round(abs)} h`;
    const days = Math.floor(abs / 24);
    return `${days} d`;
  };

  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <div
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses}`}
      >
        {status === "green"
          ? "🟢 En tiempo"
          : status === "yellow"
          ? "🟡 Próximo"
          : "🔴 Urgente"}
      </div>

      <div className="flex-1 mx-3">
        <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
          <div
            style={{ width: `${progressPercent}%` }}
            className={`h-2 ${barClass}`}
          ></div>
        </div>
      </div>

      <div className="text-sm text-gray-600 whitespace-nowrap">
        {remaining >= 0
          ? `Restan ${formatRemaining(remaining)}`
          : `Vencido hace ${formatRemaining(-remaining)}`}
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
      tipo?: number;
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

  // Función para convertir registros de API a formato local
  const convertApiRecordToLocal = (apiRecord: {
    id: number;
    id_compresor: number;
    compressor_alias?: string;
    linea?: string;
    nombre_tipo?: string;
    tipo?: number;
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
      type: apiRecord.nombre_tipo || `Tipo ${apiRecord.tipo}`,
      frequency: apiRecord.frecuencia_horas || 0,
      lastMaintenanceDate: apiRecord.ultimo_mantenimiento || "",
      nextMaintenanceDate: "", // Calcular si es necesario
      isActive: apiRecord.activo || false,
      description:
        apiRecord.observaciones || `Mantenimiento ${apiRecord.nombre_tipo}`,
      createdAt: apiRecord.fecha_creacion || new Date().toISOString(),
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
          console.log(
            "Registros de mantenimiento obtenidos de la API:",
            maintenanceApiRecords
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
  }, []);

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

  // Verificar que solo el rol 2 (VAST) pueda acceder a esta página
  if (!loading && isAuthorized && userRole !== 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Settings size={64} className="mx-auto mb-4 text-red-300" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Pagina en desarollo
          </h2>
          <button
            onClick={() => (window.location.href = "/home")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al Dashboard
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
      // Para mantenimientos personalizados, usar el tipo 30
      const tipoMantenimiento = 30;

      // Crear el mantenimiento en la base de datos
      const maintenanceRequest = {
        id_compresor: parseInt(maintenanceData.compressorId),
        tipo: tipoMantenimiento,
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

      console.log(
        "Tipo de compresor a usar:",
        tipoCompresor,
        "Original:",
        compressor.tipo
      );
      console.log("Datos del compresor completo:", compressor);

      // Obtener los tipos de mantenimiento del endpoint
      const response = await fetch(
        `${URL_API}/web/maintenance/types?tipo=${tipoCompresor}`
      );

      if (!response.ok) {
        throw new Error("Error al obtener tipos de mantenimiento");
      }

      const data: MaintenanceTypesResponse = await response.json();
      console.log("Tipos de mantenimiento obtenidos:", data);

      // Crear registros de mantenimiento en la base de datos usando el API
      const maintenanceRecords: MaintenanceRecord[] = [];
      const createdByName = userData?.name || "Usuario desconocido";
      const today = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD

      for (const type of data.maintenance_types) {
        const maintenanceRequest = {
          id_compresor: parseInt(compressor.id),
          tipo: type.tipo,
          frecuencia_horas: type.frecuencia,
          ultimo_mantenimiento: today,
          activo: true,
          observaciones: "", // Como es dar de alta, va vacío
          costo: 0,
          creado_por: createdByName,
          fecha_creacion: today,
        };

        console.log("Creando mantenimiento:", maintenanceRequest);

        const addResponse = await fetch(`${URL_API}/web/maintenance/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(maintenanceRequest),
        });

        if (addResponse.ok) {
          const addResult = await addResponse.json();
          console.log("Mantenimiento creado exitosamente:", addResult);

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
          {userRole === 2 && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowCompressorRegistrationModal(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-lg"
              >
                <Plus size={20} />
                Dar de alta compresor
              </button>
              <button
                onClick={() => setShowMaintenanceForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                <Plus size={20} />
                Agregar Mantenimiento
              </button>
            </div>
          )}
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
                                                    Frecuencia:
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
                                                    Último:
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
                                        Frecuencia:
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
                                        Último:
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
