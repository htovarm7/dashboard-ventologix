"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Settings,
  Calendar,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  type Compressor,
  type MaintenanceRecord,
  type CompressorMaintenance,
} from "@/lib/types";
import { useDialog } from "@/hooks/useDialog";
import MaintenanceForm from "../../../components/MaintenanceForm";
import MaintenanceStatusCard from "../../../components/MaintenanceStatusCard";
import MaintenanceFilters, {
  type FilterOptions,
} from "../../../components/MaintenanceFilters";

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
  const [loading, setLoading] = useState(true);
  const [compresores, setCompresores] = useState<Compressor[]>([]);
  const [numeroCliente, setNumeroCliente] = useState<number>(0);
  const [rol, setRol] = useState<number>(0);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { showSuccess } = useDialog();

  const mockMaintenanceRecords: MaintenanceRecord[] = [
    {
      id: "m1",
      compressorId: "1",
      compressorAlias: "Compresor Principal",
      type: "Preventivo",
      frequency: 1000,
      lastMaintenanceDate: "2024-09-15",
      nextMaintenanceDate: "2025-01-15",
      isActive: true,
      description: "Mantenimiento general y limpieza",
      createdAt: "2024-09-01",
    },
    {
      id: "m2",
      compressorId: "1",
      compressorAlias: "Compresor Principal",
      type: "Correctivo",
      frequency: 2000,
      lastMaintenanceDate: "2024-08-20",
      nextMaintenanceDate: "2025-04-20",
      isActive: true,
      description: "Reparación de válvulas",
      createdAt: "2024-08-15",
    },
    {
      id: "m3",
      compressorId: "2",
      compressorAlias: "Compresor Secundario",
      type: "Preventivo",
      frequency: 1500,
      lastMaintenanceDate: "2024-10-01",
      nextMaintenanceDate: "2025-03-01",
      isActive: true,
      description: "Cambio de filtros y lubricantes",
      createdAt: "2024-09-25",
    },
  ];

  useEffect(() => {
    const loadUserData = () => {
      const userData = sessionStorage.getItem("userData");
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          setIsAuthorized(true);
          setCompresores(parsedData.compresores || []);
          setNumeroCliente(parsedData.numero_cliente);
          setRol(parsedData.rol);

          const userCompressors: Compressor[] = (
            parsedData.compresores || []
          ).map((comp: any, index: number) => ({
            id:
              comp.linea ||
              comp.id ||
              `comp_${parsedData.numero_cliente}_${index}`,
            linea: comp.linea || comp.Linea || "",
            id_cliente: parsedData.numero_cliente,
            alias:
              comp.Alias || comp.alias || `Compresor ${comp.linea || comp.id}`,
            nombre_cliente: parsedData.name || "Cliente",
          }));

          const compressorMaintenanceData = userCompressors.map(
            (compressor) => ({
              compressor,
              maintenanceRecords: mockMaintenanceRecords.filter(
                (record) => record.compressorId === compressor.id
              ),
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

    setTimeout(loadUserData, 500);
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

  const applyFilters = (filters: FilterOptions) => {
    let filtered = compressorMaintenances
      .map((cm) => ({
        ...cm,
        maintenanceRecords: cm.maintenanceRecords.filter((record) => {
          if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            const matchesSearch =
              cm.compressor.alias.toLowerCase().includes(searchLower) ||
              record.type.toLowerCase().includes(searchLower) ||
              (record.description &&
                record.description.toLowerCase().includes(searchLower));
            if (!matchesSearch) return false;
          }

          if (
            filters.maintenanceType &&
            record.type !== filters.maintenanceType
          ) {
            return false;
          }

          if (filters.status) {
            if (filters.status === "active" && !record.isActive) return false;
            if (filters.status === "inactive" && record.isActive) return false;
          }

          if (filters.urgency && record.nextMaintenanceDate) {
            const nextDate = new Date(record.nextMaintenanceDate);
            const today = new Date();
            const daysUntil = Math.ceil(
              (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            switch (filters.urgency) {
              case "overdue":
                if (daysUntil >= 0) return false;
                break;
              case "urgent":
                if (daysUntil < 0 || daysUntil > 7) return false;
                break;
              case "upcoming":
                if (daysUntil < 8 || daysUntil > 30) return false;
                break;
              case "ontrack":
                if (daysUntil <= 30) return false;
                break;
            }
          }

          return true;
        }),
      }))
      .filter(
        (cm) => cm.maintenanceRecords.length > 0 || filters.searchTerm === ""
      );

    setFilteredMaintenances(filtered);
  };

  const toggleCompressorExpansion = (compressorId: string) => {
    const newExpanded = new Set(expandedCompressors);
    if (newExpanded.has(compressorId)) {
      newExpanded.delete(compressorId);
    } else {
      newExpanded.add(compressorId);
    }
    setExpandedCompressors(newExpanded);
  };

  const handleAddMaintenance = (
    maintenanceData: Omit<MaintenanceRecord, "id" | "createdAt">
  ) => {
    const newMaintenance: MaintenanceRecord = {
      ...maintenanceData,
      id: `m${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const updatedMaintenances = compressorMaintenances.map((cm) =>
      cm.compressor.id === maintenanceData.compressorId
        ? {
            ...cm,
            maintenanceRecords: [...cm.maintenanceRecords, newMaintenance],
          }
        : cm
    );

    setCompressorMaintenances(updatedMaintenances);
    setFilteredMaintenances(updatedMaintenances);
    setShowMaintenanceForm(false);
    showSuccess(
      "Mantenimiento agregado",
      "El mantenimiento se ha registrado exitosamente."
    );
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
          <button
            onClick={() => setShowMaintenanceForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Plus size={20} />
            Agregar Mantenimiento
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Compresores
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {compresores.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Mantenimientos Activos
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockMaintenanceRecords.filter((r) => r.isActive).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Próximos 30 días
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    mockMaintenanceRecords.filter((r) => {
                      if (!r.nextMaintenanceDate) return false;
                      const nextDate = new Date(r.nextMaintenanceDate);
                      const today = new Date();
                      const daysUntil = Math.ceil(
                        (nextDate.getTime() - today.getTime()) /
                          (1000 * 60 * 60 * 24)
                      );
                      return daysUntil <= 30 && daysUntil >= 0;
                    }).length
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vencidos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    mockMaintenanceRecords.filter((r) => {
                      if (!r.nextMaintenanceDate) return false;
                      const nextDate = new Date(r.nextMaintenanceDate);
                      const today = new Date();
                      return nextDate < today;
                    }).length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <MaintenanceFilters
          onFilterChange={applyFilters}
          compressorCount={filteredMaintenances.length}
          maintenanceCount={filteredMaintenances.reduce(
            (total, cm) => total + cm.maintenanceRecords.length,
            0
          )}
        />

        {/* Compressor List */}
        <div className="space-y-4">
          {filteredMaintenances.map((cm) => (
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
                      {cm.maintenanceRecords.filter((r) => r.isActive).length}{" "}
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
                        No hay mantenimientos registrados para este compresor
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
                        <MaintenanceStatusCard
                          key={record.id}
                          record={record}
                          onToggleStatus={(recordId) => {
                            const updatedMaintenances =
                              compressorMaintenances.map((compMaint) => ({
                                ...compMaint,
                                maintenanceRecords:
                                  compMaint.maintenanceRecords.map((rec) =>
                                    rec.id === recordId
                                      ? { ...rec, isActive: !rec.isActive }
                                      : rec
                                  ),
                              }));
                            setCompressorMaintenances(updatedMaintenances);
                            setFilteredMaintenances(updatedMaintenances);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredMaintenances.length === 0 && compresores.length === 0 && (
          <div className="text-center py-12">
            <Settings size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay compresores disponibles
            </h3>
            <p className="text-gray-600 mb-4">
              No tienes compresores asignados en tu cuenta. Contacta al
              administrador para obtener acceso.
            </p>
            <button
              onClick={() => (window.location.href = "/home")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        )}

        {/* No results with filters */}
        {filteredMaintenances.length === 0 &&
          compresores.length > 0 &&
          compressorMaintenances.length > 0 && (
            <div className="text-center py-12">
              <Settings size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No se encontraron resultados
              </h3>
              <p className="text-gray-600">
                Intenta ajustar los filtros para encontrar los mantenimientos
                que buscas.
              </p>
            </div>
          )}

        {/* No maintenance records yet */}
        {compresores.length > 0 &&
          compressorMaintenances.length > 0 &&
          compressorMaintenances.every(
            (cm) => cm.maintenanceRecords.length === 0
          ) && (
            <div className="text-center py-12">
              <Calendar size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¡Comienza a gestionar tus mantenimientos!
              </h3>
              <p className="text-gray-600 mb-4">
                No tienes mantenimientos registrados aún. Agrega el primer
                mantenimiento para comenzar.
              </p>
              <button
                onClick={() => setShowMaintenanceForm(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Agregar primer mantenimiento
              </button>
            </div>
          )}
      </div>

      {/* Maintenance Form Modal */}
      {showMaintenanceForm && (
        <MaintenanceForm
          compressors={compresores}
          onSubmit={handleAddMaintenance}
          onClose={() => setShowMaintenanceForm(false)}
        />
      )}
    </div>
  );
};

export default CompressorMaintenance;
