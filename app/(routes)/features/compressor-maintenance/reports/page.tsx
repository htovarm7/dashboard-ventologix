"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  FileText,
  Wrench,
  Building2,
  Eye,
  Download,
} from "lucide-react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import { URL_API } from "@/lib/global";

interface OrdenServicio {
  folio: string;
  id_cliente: number;
  id_cliente_eventual: number;
  nombre_cliente: string;
  numero_cliente: number;
  alias_compresor: string;
  numero_serie: string;
  hp: number;
  tipo: string;
  marca: string;
  anio: number;
  tipo_visita: string;
  tipo_mantenimiento: string;
  prioridad: string;
  fecha_programada: string;
  hora_programada: string;
  estado: string;
  fecha_creacion: string;
  reporte_url: string;
}

interface ReportsByClient {
  clientName: string;
  numeroCliente: number;
  reports: OrdenServicio[];
}

const Reports = () => {
  const router = useRouter();
  const [reportsByClient, setReportsByClient] = useState<ReportsByClient[]>([]);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserDataAndReports();
  }, []);

  const loadUserDataAndReports = async () => {
    try {
      setLoading(true);

      // Get user data from sessionStorage
      const userData = sessionStorage.getItem("userData");
      let rol = 0;
      let numeroCliente: number | null = null;

      if (userData) {
        const parsedData = JSON.parse(userData);
        rol = parsedData.rol || 0;
        numeroCliente = parsedData.numero_cliente || null;
      }

      // Fetch all orders from /ordenes/ endpoint
      const response = await fetch(`${URL_API}/ordenes/`);

      if (!response.ok) {
        throw new Error("Error fetching orders");
      }

      const result = await response.json();
      const ordenes: OrdenServicio[] = result.data || [];

      // Filter by role - roles 3 and 4 can only see their own client's reports
      let filteredOrdenes = ordenes;
      if ((rol === 3 || rol === 4) && numeroCliente) {
        filteredOrdenes = ordenes.filter(
          (orden) => orden.numero_cliente === numeroCliente,
        );
      }

      // Group reports by client name
      const clientsMap = new Map<string, ReportsByClient>();

      filteredOrdenes.forEach((orden) => {
        const clientName = orden.nombre_cliente || "Sin cliente";
        const clientKey = `${clientName}-${orden.numero_cliente}`;

        if (!clientsMap.has(clientKey)) {
          clientsMap.set(clientKey, {
            clientName,
            numeroCliente: orden.numero_cliente,
            reports: [],
          });
        }

        clientsMap.get(clientKey)!.reports.push(orden);
      });

      // Convert map to array and sort
      const groupedReports: ReportsByClient[] = Array.from(clientsMap.values())
        .map((group) => ({
          ...group,
          reports: group.reports.sort(
            (a, b) =>
              new Date(b.fecha_creacion || "").getTime() -
              new Date(a.fecha_creacion || "").getTime(),
          ),
        }))
        .sort((a, b) => a.clientName.localeCompare(b.clientName));

      setReportsByClient(groupedReports);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClient = (clientName: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientName)) {
      newExpanded.delete(clientName);
    } else {
      newExpanded.add(clientName);
    }
    setExpandedClients(newExpanded);
  };

  const handleViewReport = (orden: OrdenServicio) => {
    // Navigate to the report view page using folio
    router.push(
      `/features/compressor-maintenance/reports/view?folio=${orden.folio}`,
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleViewPdf = (orden: OrdenServicio) => {
    if (orden.reporte_url) {
      window.open(orden.reporte_url, "_blank");
    }
  };

  const handleDownloadPdf = async (folio: string) => {
    try {
      const response = await fetch(`${URL_API}/reporte_mtto/descargar-pdf/${folio}`);
      if (!response.ok) {
        alert("Error al descargar el PDF");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_${folio.replace(/\//g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Error al descargar el PDF");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  if (reportsByClient.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center relative">
        <div className="absolute top-4 left-4">
          <BackButton />
        </div>
        <div className="text-center">
          <FileText className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-600 text-lg">No hay reportes disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <BackButton />
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          Reportes de Mantenimiento
        </h1>

        {/* Client list */}
        <div className="space-y-4">
          {reportsByClient.map((clientGroup) => (
            <div
              key={`${clientGroup.clientName}-${clientGroup.numeroCliente}`}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              {/* Client header */}
              <div
                className="p-6 bg-gray-100 border-b-2 border-gray-300 cursor-pointer hover:bg-gray-200 transition-all"
                onClick={() => toggleClient(clientGroup.clientName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {expandedClients.has(clientGroup.clientName) ? (
                      <ChevronDown className="text-gray-700" size={24} />
                    ) : (
                      <ChevronRight className="text-gray-700" size={24} />
                    )}
                    <Building2 className="text-gray-600" size={24} />
                    <h2 className="text-2xl font-bold text-gray-900">
                      {clientGroup.clientName}
                    </h2>
                  </div>
                  <span className="bg-gray-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                    {clientGroup.reports.length} reporte
                    {clientGroup.reports.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Reports list */}
              {expandedClients.has(clientGroup.clientName) && (
                <div className="p-6 bg-white">
                  <div className="space-y-3">
                    {clientGroup.reports.map((orden) => (
                      <div
                        key={orden.folio}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-6 mb-2">
                            <div className="flex items-center space-x-2 text-gray-700">
                              <Wrench size={18} />
                              <span className="font-semibold">
                                {orden.alias_compresor || "Compresor"}
                              </span>
                            </div>
                            {orden.numero_serie && (
                              <span className="text-sm text-gray-500">
                                S/N: {orden.numero_serie}
                              </span>
                            )}
                            <span className="text-sm text-blue-600 font-medium">
                              Folio: {orden.folio}
                            </span>
                          </div>
                          <div className="flex items-center space-x-6 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <Calendar size={16} />
                              <span>{formatDate(orden.fecha_programada)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <FileText size={16} />
                              <span>
                                {orden.tipo_visita || "Mantenimiento"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User size={16} />
                              <span>{orden.tipo_mantenimiento || "N/A"}</span>
                            </div>
                            {orden.estado && (
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  orden.estado === "terminado"
                                    ? "bg-green-100 text-green-800"
                                    : orden.estado === "Completado"
                                      ? "bg-green-100 text-green-800"
                                      : orden.estado === "En progreso"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {orden.estado === "terminado" ? "Terminado" : orden.estado}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {orden.estado === "terminado" && (
                            <button
                              onClick={() => handleDownloadPdf(orden.folio)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center space-x-2"
                            >
                              <Download size={16} />
                              <span>PDF</span>
                            </button>
                          )}
                          {orden.reporte_url && orden.estado !== "terminado" && (
                            <button
                              onClick={() => handleViewPdf(orden)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center space-x-2"
                            >
                              <FileText size={16} />
                              <span>PDF</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleViewReport(orden)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
                          >
                            <Eye size={16} />
                            <span>Ver Reporte</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reports;
