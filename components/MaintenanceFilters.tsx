"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";

interface MaintenanceFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  compressorCount: number;
  maintenanceCount: number;
}

export interface FilterOptions {
  searchTerm: string;
  maintenanceType: string;
  status: string;
  urgency: string;
}

const MaintenanceFilters = ({
  onFilterChange,
  compressorCount,
  maintenanceCount,
}: MaintenanceFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: "",
    maintenanceType: "",
    status: "",
    urgency: "",
  });

  const maintenanceTypes = [
    "Preventivo",
    "Correctivo",
    "Predictivo",
    "Emergencia",
    "Rutinario",
  ];
  const statusOptions = [
    { value: "active", label: "Solo activos" },
    { value: "inactive", label: "Solo inactivos" },
    { value: "all", label: "Todos" },
  ];
  const urgencyOptions = [
    { value: "overdue", label: "Vencidos" },
    { value: "urgent", label: "Urgentes (≤7 días)" },
    { value: "upcoming", label: "Próximos (≤30 días)" },
    { value: "ontrack", label: "Al día" },
  ];

  const updateFilter = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: FilterOptions = {
      searchTerm: "",
      maintenanceType: "",
      status: "",
      urgency: "",
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      {/* Search bar always visible */}
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar por compresor, tipo de mantenimiento o descripción..."
              value={filters.searchTerm}
              onChange={(e) => updateFilter("searchTerm", e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              hasActiveFilters || isExpanded
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Filter size={20} />
            Filtros
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                {Object.values(filters).filter((v) => v !== "").length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-red-600 hover:text-red-800 transition-colors"
            >
              <X size={16} />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipo de mantenimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de mantenimiento
              </label>
              <select
                value={filters.maintenanceType}
                onChange={(e) =>
                  updateFilter("maintenanceType", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                {maintenanceTypes.map((type, index) => (
                  <option key={`${type}_${index}`} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                {statusOptions.map((option, index) => (
                  <option key={`${option.value}_${index}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Urgencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urgencia
              </label>
              <select
                value={filters.urgency}
                onChange={(e) => updateFilter("urgency", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las urgencias</option>
                {urgencyOptions.map((option, index) => (
                  <option key={`${option.value}_${index}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Mostrando {maintenanceCount} mantenimiento
                {maintenanceCount !== 1 ? "s" : ""}
                en {compressorCount} compresor
                {compressorCount !== 1 ? "es" : ""}
              </span>
              {hasActiveFilters && (
                <span className="text-blue-600">Filtros activos aplicados</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceFilters;
