"use client";

import { parseLocalDate } from "@/lib/dateUtils";
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
  Pencil,
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
  tipo_equipo: string;
}

interface DryerReport {
  id: number;
  folio: string;
  cliente: string;
  numero_cliente: string;
  equipo: string;
  modelo: string;
  no_serie: string;
  fecha: string;
  estado: string;
  created_at: string;
}

interface CompressorGroup {
  key: string;
  alias: string;
  numeroSerie: string;
  reports: OrdenServicio[];
}

interface ReportsByClient {
  clientName: string;
  numeroCliente: number;
  compressors: CompressorGroup[];
  totalReports: number;
}

interface DryerGroup {
  key: string;
  equipo: string;
  modelo: string;
  noSerie: string;
  reports: DryerReport[];
}

interface DryerReportsByClient {
  clientName: string;
  numeroCliente: string;
  dryers: DryerGroup[];
  totalReports: number;
}

const groupOrdenesByCompressor = (
  reports: OrdenServicio[],
): CompressorGroup[] => {
  const map = new Map<string, CompressorGroup>();
  reports.forEach((orden) => {
    const key =
      orden.numero_serie ||
      orden.alias_compresor ||
      `__sin_compresor_${orden.folio}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        alias: orden.alias_compresor || "Compresor",
        numeroSerie: orden.numero_serie || "",
        reports: [],
      });
    }
    map.get(key)!.reports.push(orden);
  });
  return Array.from(map.values())
    .map((group) => ({
      ...group,
      reports: group.reports.sort(
        (a, b) =>
          parseLocalDate(b.fecha_creacion || "").getTime() -
          parseLocalDate(a.fecha_creacion || "").getTime(),
      ),
    }))
    .sort((a, b) => a.alias.localeCompare(b.alias));
};

const groupDryersByEquipment = (reports: DryerReport[]): DryerGroup[] => {
  const map = new Map<string, DryerGroup>();
  reports.forEach((report) => {
    const key =
      report.no_serie || report.equipo || `__sin_equipo_${report.folio}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        equipo: report.equipo || "Secadora",
        modelo: report.modelo || "",
        noSerie: report.no_serie || "",
        reports: [],
      });
    }
    map.get(key)!.reports.push(report);
  });
  return Array.from(map.values())
    .map((group) => ({
      ...group,
      reports: group.reports.sort(
        (a, b) =>
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime(),
      ),
    }))
    .sort((a, b) => a.equipo.localeCompare(b.equipo));
};

const Reports = () => {
  const router = useRouter();
  const [reportsByClient, setReportsByClient] = useState<ReportsByClient[]>([]);
  const [flatCompressors, setFlatCompressors] = useState<CompressorGroup[]>([]);
  const [flatReportsCount, setFlatReportsCount] = useState(0);
  const [userRole, setUserRole] = useState<number>(0);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(
    new Set(),
  );
  const [expandedCompressors, setExpandedCompressors] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [downloadingFolio, setDownloadingFolio] = useState<string | null>(null);
  const [dryerReportsByClient, setDryerReportsByClient] = useState<
    DryerReportsByClient[]
  >([]);
  const [flatDryers, setFlatDryers] = useState<DryerGroup[]>([]);
  const [flatDryerReportsCount, setFlatDryerReportsCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"compresores" | "secadoras">(
    "compresores",
  );
  const [expandedDryerClients, setExpandedDryerClients] = useState<Set<string>>(
    new Set(),
  );
  const [expandedDryers, setExpandedDryers] = useState<Set<string>>(new Set());

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
        setUserRole(rol);
      }

      // Fetch all orders from /ordenes/ endpoint
      const response = await fetch(`${URL_API}/ordenes/`);

      if (!response.ok) {
        throw new Error("Error fetching orders");
      }

      const result = await response.json();
      const ordenes: OrdenServicio[] = result.data || [];

      // All roles see terminado + por_firmar reports
      const visibleOrdenes = ordenes.filter(
        (orden) =>
          orden.estado === "terminado" || orden.estado === "por_firmar",
      );

      // Filter by role - roles 3 and 4 can only see their own client's reports
      let filteredOrdenes = visibleOrdenes;
      if ((rol === 3 || rol === 4) && numeroCliente) {
        filteredOrdenes = visibleOrdenes.filter(
          (orden) => orden.numero_cliente === numeroCliente,
        );
      }

      // For client roles (3 & 4), show grouped-by-compressor list; for others,
      // group by client and then by compressor.
      if ((rol === 3 || rol === 4) && numeroCliente) {
        setFlatCompressors(groupOrdenesByCompressor(filteredOrdenes));
        setFlatReportsCount(filteredOrdenes.length);
      } else {
        const clientsMap = new Map<
          string,
          { clientName: string; numeroCliente: number; reports: OrdenServicio[] }
        >();

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

        const groupedReports: ReportsByClient[] = Array.from(
          clientsMap.values(),
        )
          .map((group) => ({
            clientName: group.clientName,
            numeroCliente: group.numeroCliente,
            compressors: groupOrdenesByCompressor(group.reports),
            totalReports: group.reports.length,
          }))
          .sort((a, b) => a.clientName.localeCompare(b.clientName));

        setReportsByClient(groupedReports);
      }

      // Load dryer reports for all roles
      try {
        const dryerRes = await fetch(`${URL_API}/reporte_secadora/listar`);
        if (dryerRes.ok) {
          const dryerResult = await dryerRes.json();
          if (dryerResult.success) {
            let dryerData: DryerReport[] = dryerResult.data || [];

            // Filter by client for roles 3 & 4
            if ((rol === 3 || rol === 4) && numeroCliente) {
              dryerData = dryerData.filter(
                (r) => String(r.numero_cliente) === String(numeroCliente),
              );
              setFlatDryers(groupDryersByEquipment(dryerData));
              setFlatDryerReportsCount(dryerData.length);
            } else {
              const dryerClientsMap = new Map<
                string,
                {
                  clientName: string;
                  numeroCliente: string;
                  reports: DryerReport[];
                }
              >();
              dryerData.forEach((report) => {
                const clientName = report.cliente || "Sin cliente";
                const clientKey = `${clientName}-${report.numero_cliente}`;
                if (!dryerClientsMap.has(clientKey)) {
                  dryerClientsMap.set(clientKey, {
                    clientName,
                    numeroCliente: report.numero_cliente,
                    reports: [],
                  });
                }
                dryerClientsMap.get(clientKey)!.reports.push(report);
              });

              const groupedDryer: DryerReportsByClient[] = Array.from(
                dryerClientsMap.values(),
              )
                .map((group) => ({
                  clientName: group.clientName,
                  numeroCliente: group.numeroCliente,
                  dryers: groupDryersByEquipment(group.reports),
                  totalReports: group.reports.length,
                }))
                .sort((a, b) => a.clientName.localeCompare(b.clientName));

              setDryerReportsByClient(groupedDryer);
            }
          }
        }
      } catch (dryerError) {
        console.error("Error loading dryer reports:", dryerError);
      }
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

  const toggleDryerClient = (clientName: string) => {
    const newExpanded = new Set(expandedDryerClients);
    if (newExpanded.has(clientName)) {
      newExpanded.delete(clientName);
    } else {
      newExpanded.add(clientName);
    }
    setExpandedDryerClients(newExpanded);
  };

  const toggleCompressor = (key: string) => {
    const newExpanded = new Set(expandedCompressors);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedCompressors(newExpanded);
  };

  const toggleDryer = (key: string) => {
    const newExpanded = new Set(expandedDryers);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedDryers(newExpanded);
  };

  const handleViewReport = (orden: OrdenServicio) => {
    // Navigate to the report view page using folio
    router.push(
      `/features/compressor-maintenance/reports/view?folio=${orden.folio}`,
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDownloadPdf = async (folio: string) => {
    setDownloadingFolio(folio);
    try {
      const response = await fetch(
        `${URL_API}/reporte_mtto/descargar-pdf-react/${folio}`,
      );
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
    } finally {
      setDownloadingFolio(null);
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

  const handleDownloadDryerPdf = async (folio: string) => {
    setDownloadingFolio(folio);
    try {
      const response = await fetch(
        `${URL_API}/reporte_secadora/descargar-pdf/${folio}`,
      );
      if (!response.ok) {
        alert("Error al descargar el PDF");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Secadora_${folio.replace(/\//g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Error al descargar el PDF");
    } finally {
      setDownloadingFolio(null);
    }
  };

  const isClientRole = userRole === 3 || userRole === 4;
  const hasNoReports = isClientRole
    ? flatCompressors.length === 0 && flatDryers.length === 0
    : reportsByClient.length === 0 && dryerReportsByClient.length === 0;

  if (hasNoReports) {
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
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          Reportes de Mantenimiento
        </h1>

        {/* Tabs — always shown so clients can navigate between equipment types */}
        <div className="flex space-x-1 bg-gray-200 rounded-lg p-1 mb-6 max-w-md">
          <button
            onClick={() => setActiveTab("compresores")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "compresores"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Compresores (
            {isClientRole
              ? flatReportsCount
              : reportsByClient.reduce((sum, g) => sum + g.totalReports, 0)}
            )
          </button>
          <button
            onClick={() => setActiveTab("secadoras")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "secadoras"
                ? "bg-white text-cyan-700 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Secadoras (
            {isClientRole
              ? flatDryerReportsCount
              : dryerReportsByClient.reduce(
                  (sum, g) => sum + g.totalReports,
                  0,
                )}
            )
          </button>
        </div>

        {/* Reports list */}
        <div
          className="space-y-4"
          style={{
            display: activeTab === "compresores" ? undefined : "none",
          }}
        >
          {isClientRole ? (
            /* Flat list for client roles (3 & 4), grouped by compressor */
            <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
              <div className="space-y-3">
                {flatCompressors.map((compressor) => {
                  const compKey = `flat-${compressor.key}`;
                  const isExpanded = expandedCompressors.has(compKey);
                  return (
                    <div
                      key={compKey}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div
                        className="p-4 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => toggleCompressor(compKey)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                            {isExpanded ? (
                              <ChevronDown
                                className="text-blue-700"
                                size={20}
                              />
                            ) : (
                              <ChevronRight
                                className="text-blue-700"
                                size={20}
                              />
                            )}
                            <Wrench className="text-blue-600" size={20} />
                            <span className="font-semibold text-gray-900">
                              {compressor.alias}
                            </span>
                            {compressor.numeroSerie && (
                              <span className="text-sm text-gray-500">
                                S/N: {compressor.numeroSerie}
                              </span>
                            )}
                          </div>
                          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                            {compressor.reports.length} reporte
                            {compressor.reports.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="p-4 bg-white space-y-3">
                          {compressor.reports.map((orden) => (
                            <div
                              key={orden.folio}
                              className={`flex items-center justify-between p-4 rounded-lg transition-colors border ${
                                orden.estado === "por_firmar"
                                  ? "bg-yellow-50 border-yellow-300 hover:bg-yellow-100"
                                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-4 mb-2 flex-wrap gap-y-1">
                                  <span className="text-sm text-blue-600 font-medium">
                                    Folio: {orden.folio}
                                  </span>
                                  {orden.estado === "por_firmar" && (
                                    <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full">
                                      Pendiente de firma
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-6 text-sm text-gray-600 flex-wrap gap-y-1">
                                  <div className="flex items-center space-x-2">
                                    <Calendar size={16} />
                                    <span>
                                      {formatDate(orden.fecha_programada)}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <FileText size={16} />
                                    <span>
                                      {orden.tipo_visita || "Mantenimiento"}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <User size={16} />
                                    <span>
                                      {orden.tipo_mantenimiento || "N/A"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {orden.estado === "por_firmar" ? (
                                  <button
                                    onClick={() => handleViewReport(orden)}
                                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium flex items-center space-x-2"
                                  >
                                    <span>✍️ Firmar Reporte</span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleDownloadPdf(orden.folio)
                                      }
                                      disabled={
                                        downloadingFolio === orden.folio
                                      }
                                      className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2 ${
                                        downloadingFolio === orden.folio
                                          ? "bg-red-400 cursor-not-allowed"
                                          : "bg-red-600 hover:bg-red-700"
                                      }`}
                                    >
                                      {downloadingFolio === orden.folio ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                          <span>Generando...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Download size={16} />
                                          <span>PDF</span>
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleViewReport(orden)}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
                                    >
                                      <Eye size={16} />
                                      <span>Ver Reporte</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Grouped view for admin/technician roles */
            reportsByClient.map((clientGroup) => (
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
                      {clientGroup.totalReports} reporte
                      {clientGroup.totalReports !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Compressor groups */}
                {expandedClients.has(clientGroup.clientName) && (
                  <div className="p-6 bg-white">
                    <div className="space-y-3">
                      {clientGroup.compressors.map((compressor) => {
                        const compKey = `${clientGroup.numeroCliente}-${compressor.key}`;
                        const isExpanded = expandedCompressors.has(compKey);
                        return (
                          <div
                            key={compKey}
                            className="border border-gray-200 rounded-lg overflow-hidden"
                          >
                            <div
                              className="p-4 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                              onClick={() => toggleCompressor(compKey)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                                  {isExpanded ? (
                                    <ChevronDown
                                      className="text-blue-700"
                                      size={20}
                                    />
                                  ) : (
                                    <ChevronRight
                                      className="text-blue-700"
                                      size={20}
                                    />
                                  )}
                                  <Wrench
                                    className="text-blue-600"
                                    size={20}
                                  />
                                  <span className="font-semibold text-gray-900">
                                    {compressor.alias}
                                  </span>
                                  {compressor.numeroSerie && (
                                    <span className="text-sm text-gray-500">
                                      S/N: {compressor.numeroSerie}
                                    </span>
                                  )}
                                </div>
                                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                                  {compressor.reports.length} reporte
                                  {compressor.reports.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="p-4 bg-white space-y-3">
                                {compressor.reports.map((orden) => (
                                  <div
                                    key={orden.folio}
                                    className={`flex items-center justify-between p-4 rounded-lg transition-colors border ${
                                      orden.estado === "por_firmar"
                                        ? "bg-yellow-50 border-yellow-300 hover:bg-yellow-100"
                                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                    }`}
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-4 mb-2 flex-wrap gap-y-1">
                                        <span className="text-sm text-blue-600 font-medium">
                                          Folio: {orden.folio}
                                        </span>
                                        {orden.estado === "por_firmar" && (
                                          <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full">
                                            Pendiente de firma
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-6 text-sm text-gray-600 flex-wrap gap-y-1">
                                        <div className="flex items-center space-x-2">
                                          <Calendar size={16} />
                                          <span>
                                            {formatDate(
                                              orden.fecha_programada,
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <FileText size={16} />
                                          <span>
                                            {orden.tipo_visita ||
                                              "Mantenimiento"}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <User size={16} />
                                          <span>
                                            {orden.tipo_mantenimiento ||
                                              "N/A"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() =>
                                          handleDownloadPdf(orden.folio)
                                        }
                                        disabled={
                                          downloadingFolio === orden.folio
                                        }
                                        className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2 ${
                                          downloadingFolio === orden.folio
                                            ? "bg-red-400 cursor-not-allowed"
                                            : "bg-red-600 hover:bg-red-700"
                                        }`}
                                      >
                                        {downloadingFolio === orden.folio ? (
                                          <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                            <span>Generando...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Download size={16} />
                                            <span>PDF</span>
                                          </>
                                        )}
                                      </button>
                                      <button
                                        onClick={() =>
                                          router.push(
                                            `/features/compressor-maintenance/reports/view?folio=${orden.folio}&edit=true`,
                                          )
                                        }
                                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium flex items-center space-x-2"
                                      >
                                        <Pencil size={16} />
                                        <span>Editar</span>
                                      </button>
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Dryer Reports Section - Flat list for clients, grouped by dryer */}
        {isClientRole && activeTab === "secadoras" && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
            {flatDryers.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500">No hay reportes de secadoras</p>
              </div>
            ) : (
              <div className="space-y-3">
                {flatDryers.map((dryer) => {
                  const dryerKey = `flat-dryer-${dryer.key}`;
                  const isExpanded = expandedDryers.has(dryerKey);
                  return (
                    <div
                      key={dryerKey}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div
                        className="p-4 bg-cyan-50 cursor-pointer hover:bg-cyan-100 transition-colors"
                        onClick={() => toggleDryer(dryerKey)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                            {isExpanded ? (
                              <ChevronDown
                                className="text-cyan-700"
                                size={20}
                              />
                            ) : (
                              <ChevronRight
                                className="text-cyan-700"
                                size={20}
                              />
                            )}
                            <Wrench className="text-cyan-600" size={20} />
                            <span className="font-semibold text-gray-900">
                              {dryer.equipo}
                            </span>
                            {dryer.modelo && (
                              <span className="text-sm text-gray-500">
                                Modelo: {dryer.modelo}
                              </span>
                            )}
                            {dryer.noSerie && (
                              <span className="text-sm text-gray-500">
                                S/N: {dryer.noSerie}
                              </span>
                            )}
                          </div>
                          <span className="bg-cyan-600 text-white px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                            {dryer.reports.length} reporte
                            {dryer.reports.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="p-4 bg-white space-y-3">
                          {dryer.reports.map((report) => (
                            <div
                              key={report.folio}
                              className={`flex items-center justify-between p-4 rounded-lg transition-colors border ${
                                report.estado === "por_firmar"
                                  ? "bg-yellow-50 border-yellow-300 hover:bg-yellow-100"
                                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-4 mb-2 flex-wrap gap-y-1">
                                  <span className="text-sm text-blue-600 font-medium">
                                    Folio: {report.folio}
                                  </span>
                                  {report.estado === "por_firmar" && (
                                    <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full">
                                      Pendiente de firma
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-6 text-sm text-gray-600 flex-wrap gap-y-1">
                                  <div className="flex items-center space-x-2">
                                    <Calendar size={16} />
                                    <span>
                                      {formatDate(
                                        report.fecha || report.created_at,
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <FileText size={16} />
                                    <span>Secadora</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() =>
                                    handleDownloadDryerPdf(report.folio)
                                  }
                                  disabled={downloadingFolio === report.folio}
                                  className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2 ${
                                    downloadingFolio === report.folio
                                      ? "bg-red-400 cursor-not-allowed"
                                      : "bg-red-600 hover:bg-red-700"
                                  }`}
                                >
                                  {downloadingFolio === report.folio ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                      <span>Generando...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Download size={16} />
                                      <span>PDF</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/features/compressor-maintenance/reports/view-dryer?folio=${report.folio}`,
                                    )
                                  }
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
                                >
                                  <Eye size={16} />
                                  <span>Ver Reporte</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Dryer Reports Section - Grouped by Client */}
        {!isClientRole && activeTab === "secadoras" && (
          <div className="space-y-4">
            {dryerReportsByClient.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
                <div className="text-center py-8">
                  <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-500">No hay reportes de secadoras</p>
                </div>
              </div>
            ) : (
              dryerReportsByClient.map((clientGroup) => (
                <div
                  key={`dryer-${clientGroup.clientName}-${clientGroup.numeroCliente}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  {/* Client header */}
                  <div
                    className="p-6"
                    onClick={() => toggleDryerClient(clientGroup.clientName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {expandedDryerClients.has(clientGroup.clientName) ? (
                          <ChevronDown className="text-blue-700" size={24} />
                        ) : (
                          <ChevronRight className="text-blue-700" size={24} />
                        )}
                        <Building2 className="text-blue-600" size={24} />
                        <h2 className="text-2xl font-bold text-gray-900">
                          {clientGroup.clientName}
                        </h2>
                      </div>
                      <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                        {clientGroup.totalReports} reporte
                        {clientGroup.totalReports !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Dryer groups */}
                  {expandedDryerClients.has(clientGroup.clientName) && (
                    <div className="p-6 bg-white">
                      <div className="space-y-3">
                        {clientGroup.dryers.map((dryer) => {
                          const dryerKey = `${clientGroup.numeroCliente}-dryer-${dryer.key}`;
                          const isExpanded = expandedDryers.has(dryerKey);
                          return (
                            <div
                              key={dryerKey}
                              className="border border-gray-200 rounded-lg overflow-hidden"
                            >
                              <div
                                className="p-4 bg-cyan-50 cursor-pointer hover:bg-cyan-100 transition-colors"
                                onClick={() => toggleDryer(dryerKey)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                                    {isExpanded ? (
                                      <ChevronDown
                                        className="text-cyan-700"
                                        size={20}
                                      />
                                    ) : (
                                      <ChevronRight
                                        className="text-cyan-700"
                                        size={20}
                                      />
                                    )}
                                    <Wrench
                                      className="text-cyan-600"
                                      size={20}
                                    />
                                    <span className="font-semibold text-gray-900">
                                      {dryer.equipo}
                                    </span>
                                    {dryer.modelo && (
                                      <span className="text-sm text-gray-500">
                                        Modelo: {dryer.modelo}
                                      </span>
                                    )}
                                    {dryer.noSerie && (
                                      <span className="text-sm text-gray-500">
                                        S/N: {dryer.noSerie}
                                      </span>
                                    )}
                                  </div>
                                  <span className="bg-cyan-600 text-white px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                                    {dryer.reports.length} reporte
                                    {dryer.reports.length !== 1 ? "s" : ""}
                                  </span>
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="p-4 bg-white space-y-3">
                                  {dryer.reports.map((report) => (
                                    <div
                                      key={report.folio}
                                      className={`flex items-center justify-between p-4 rounded-lg transition-colors border ${
                                        report.estado === "por_firmar"
                                          ? "bg-yellow-50 border-yellow-300 hover:bg-yellow-100"
                                          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                      }`}
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-4 mb-2 flex-wrap gap-y-1">
                                          <span className="text-sm text-blue-600 font-medium">
                                            Folio: {report.folio}
                                          </span>
                                          {report.estado === "por_firmar" && (
                                            <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full">
                                              Pendiente de firma
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-6 text-sm text-gray-600 flex-wrap gap-y-1">
                                          <div className="flex items-center space-x-2">
                                            <Calendar size={16} />
                                            <span>
                                              {formatDate(
                                                report.fecha ||
                                                  report.created_at,
                                              )}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <FileText size={16} />
                                            <span>Secadora</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() =>
                                            handleDownloadDryerPdf(
                                              report.folio,
                                            )
                                          }
                                          disabled={
                                            downloadingFolio === report.folio
                                          }
                                          className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2 ${
                                            downloadingFolio === report.folio
                                              ? "bg-red-400 cursor-not-allowed"
                                              : "bg-red-600 hover:bg-red-700"
                                          }`}
                                        >
                                          {downloadingFolio ===
                                          report.folio ? (
                                            <>
                                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                              <span>Generando...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Download size={16} />
                                              <span>PDF</span>
                                            </>
                                          )}
                                        </button>
                                        <button
                                          onClick={() =>
                                            router.push(
                                              `/features/compressor-maintenance/reports/view-dryer?folio=${report.folio}`,
                                            )
                                          }
                                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
                                        >
                                          <Eye size={16} />
                                          <span>Ver Reporte</span>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
