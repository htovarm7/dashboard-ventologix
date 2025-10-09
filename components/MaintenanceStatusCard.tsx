"use client";

import { AlertCircle, Clock, CheckCircle, Calendar } from "lucide-react";
import { MaintenanceRecord } from "@/lib/types";

interface MaintenanceStatusCardProps {
  record: MaintenanceRecord;
  onEdit?: (record: MaintenanceRecord) => void;
  onToggleStatus?: (recordId: string) => void;
}

const MaintenanceStatusCard = ({
  record,
  onEdit,
  onToggleStatus,
}: MaintenanceStatusCardProps) => {
  const getStatusInfo = () => {
    if (!record.nextMaintenanceDate) {
      return {
        status: "sin-fecha",
        color: "bg-gray-50 border-gray-200",
        textColor: "text-gray-700",
        icon: Clock,
        iconColor: "text-gray-500",
        message: "Sin fecha programada",
      };
    }

    const nextDate = new Date(record.nextMaintenanceDate);
    const today = new Date();
    const daysUntil = Math.ceil(
      (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0) {
      return {
        status: "vencido",
        color: "bg-red-50 border-red-200",
        textColor: "text-red-700",
        icon: AlertCircle,
        iconColor: "text-red-500",
        message: `Vencido hace ${Math.abs(daysUntil)} día${
          Math.abs(daysUntil) !== 1 ? "s" : ""
        }`,
      };
    }

    if (daysUntil <= 7) {
      return {
        status: "urgente",
        color: "bg-orange-50 border-orange-200",
        textColor: "text-orange-700",
        icon: AlertCircle,
        iconColor: "text-orange-500",
        message: `Vence en ${daysUntil} día${daysUntil !== 1 ? "s" : ""}`,
      };
    }

    if (daysUntil <= 30) {
      return {
        status: "proximo",
        color: "bg-yellow-50 border-yellow-200",
        textColor: "text-yellow-700",
        icon: Clock,
        iconColor: "text-yellow-500",
        message: `Vence en ${daysUntil} días`,
      };
    }

    return {
      status: "al-dia",
      color: "bg-green-50 border-green-200",
      textColor: "text-green-700",
      icon: CheckCircle,
      iconColor: "text-green-500",
      message: `Vence en ${daysUntil} días`,
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className={`p-4 rounded-lg border transition-all hover:shadow-md ${statusInfo.color}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <StatusIcon size={20} className={statusInfo.iconColor} />
          <div>
            <h4 className={`font-semibold ${statusInfo.textColor}`}>
              {record.type}
            </h4>
            <p className={`text-sm ${statusInfo.textColor} opacity-80`}>
              {statusInfo.message}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              record.isActive
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            {record.isActive ? "Activo" : "Inactivo"}
          </span>
          {onToggleStatus && (
            <button
              onClick={() => onToggleStatus(record.id)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {record.isActive ? "Desactivar" : "Activar"}
            </button>
          )}
        </div>
      </div>

      {record.description && (
        <p className={`text-sm mb-3 ${statusInfo.textColor} opacity-90`}>
          {record.description}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className={`${statusInfo.textColor} opacity-80`}>
          <div className="flex items-center gap-1 mb-1">
            <Clock size={14} />
            <span className="font-medium">Frecuencia</span>
          </div>
          <p>Cada {record.frequency} horas</p>
        </div>

        <div className={`${statusInfo.textColor} opacity-80`}>
          <div className="flex items-center gap-1 mb-1">
            <Calendar size={14} />
            <span className="font-medium">Último</span>
          </div>
          <p>{formatDate(record.lastMaintenanceDate)}</p>
        </div>

        {record.nextMaintenanceDate && (
          <div className={`${statusInfo.textColor} opacity-80`}>
            <div className="flex items-center gap-1 mb-1">
              <Calendar size={14} />
              <span className="font-medium">Próximo</span>
            </div>
            <p>{formatDate(record.nextMaintenanceDate)}</p>
          </div>
        )}
      </div>

      {onEdit && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <button
            onClick={() => onEdit(record)}
            className={`text-sm font-medium hover:underline ${statusInfo.textColor}`}
          >
            Editar mantenimiento
          </button>
        </div>
      )}

      {/* Progress bar for maintenance schedule */}
      {record.nextMaintenanceDate && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className={`${statusInfo.textColor} opacity-80`}>
              Progreso hasta próximo mantenimiento
            </span>
            <span className={`${statusInfo.textColor} opacity-80`}>
              {(() => {
                const lastDate = new Date(record.lastMaintenanceDate);
                const nextDate = new Date(record.nextMaintenanceDate);
                const today = new Date();
                const totalDays = Math.ceil(
                  (nextDate.getTime() - lastDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                const elapsedDays = Math.ceil(
                  (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                const progress = Math.min(
                  Math.max((elapsedDays / totalDays) * 100, 0),
                  100
                );
                return `${Math.round(progress)}%`;
              })()}
            </span>
          </div>
          <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                statusInfo.status === "vencido"
                  ? "bg-red-500"
                  : statusInfo.status === "urgente"
                  ? "bg-orange-500"
                  : statusInfo.status === "proximo"
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{
                width: `${(() => {
                  const lastDate = new Date(record.lastMaintenanceDate);
                  const nextDate = new Date(record.nextMaintenanceDate);
                  const today = new Date();
                  const totalDays = Math.ceil(
                    (nextDate.getTime() - lastDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  const elapsedDays = Math.ceil(
                    (today.getTime() - lastDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return Math.min(
                    Math.max((elapsedDays / totalDays) * 100, 0),
                    100
                  );
                })()}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceStatusCard;
