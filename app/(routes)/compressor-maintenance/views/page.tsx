"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  Camera,
  CheckSquare,
  MessageSquare,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import { URL_API } from "@/lib/global";
import { Visit } from "@/lib/types";

type Compressor = {
  id: string;
  name: string;
  numero_serie?: string;
  visits: Visit[];
};

type Client = {
  id: string;
  name: string;
  compressors: Compressor[];
};

interface UserCompressor {
  numero_cliente?: number;
  [key: string]: unknown;
}

const Visitas = () => {
  const router = useRouter();
  const [expandedClients, setExpandedClients] = useState<Set<string>>(
    new Set()
  );
  const [expandedCompressors, setExpandedCompressors] = useState<Set<string>>(
    new Set()
  );
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [clientsData, setClientsData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportLinks, setReportLinks] = useState<Map<string, string>>(
    new Map()
  );
  const [userRole, setUserRole] = useState<number>(0);

  useEffect(() => {
    const loadUserData = async () => {
      const userData = sessionStorage.getItem("userData");
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          const rol = parsedData.rol || 0;
          setUserRole(rol);

          const compresores = parsedData.compresores || [];

          // Si no hay compresores, no hay datos para mostrar
          if (compresores.length === 0) {
            console.error("No hay compresores disponibles");
            setLoading(false);
            return;
          }

          const serialToAliasMap = new Map<string, string>();
          compresores.forEach(
            (
              comp: UserCompressor & { numero_serie?: string; alias?: string }
            ) => {
              if (comp.numero_serie && comp.alias) {
                serialToAliasMap.set(comp.numero_serie, comp.alias);
              }
            }
          );

          // Fetch maintenance records from API
          const allRegistros: Visit[] = [];

          // Si el rol es 3 o 4 (clientes), solo obtener sus datos
          if (rol === 3 || rol === 4) {
            // Obtener los números de serie de los compresores del usuario para filtrar
            const userSerialNumbers = new Set<string>();
            compresores.forEach(
              (comp: UserCompressor & { numero_serie?: string }) => {
                if (comp.numero_serie) {
                  userSerialNumbers.add(comp.numero_serie);
                }
              }
            );

            // Obtener todos los números de cliente únicos de los compresores
            const numerosCliente = new Set<number>();
            compresores.forEach((comp: UserCompressor) => {
              const numCliente =
                comp.numero_cliente || parsedData.numero_cliente;
              if (numCliente) {
                numerosCliente.add(numCliente);
              }
            });

            if (numerosCliente.size === 0) {
              console.error("No se encontró número de cliente");
              setLoading(false);
              return;
            }

            for (const numeroCliente of Array.from(numerosCliente)) {
              try {
                const response = await fetch(
                  `${URL_API}/web/registros-mantenimiento?numero_cliente=${numeroCliente}`
                );

                if (response.ok) {
                  const registros = await response.json();
                  // Filtrar solo los registros que pertenecen a los compresores del usuario
                  const registrosFiltrados = registros.filter(
                    (registro: Visit) =>
                      registro.numero_serie &&
                      userSerialNumbers.has(registro.numero_serie)
                  );
                  allRegistros.push(...registrosFiltrados);
                }
              } catch (err) {
                console.error(
                  `Error fetching data for client ${numeroCliente}:`,
                  err
                );
              }
            }
          } else {
            // Para otros roles, obtener todos los registros de mantenimiento
            try {
              const response = await fetch(
                `${URL_API}/web/registros-mantenimiento`
              );

              if (response.ok) {
                const registros = await response.json();
                allRegistros.push(...registros);
              }
            } catch (err) {
              console.error("Error fetching all maintenance records:", err);
            }
          }

          // Agrupar registros por cliente y compresor
          const clientsMap = new Map<string, Client>();

          if (rol === 3 || rol === 4) {
            // Para clientes, agrupar solo por compresor (sin mostrar nivel de cliente)
            allRegistros.forEach((registro) => {
              const compressorKey = `${registro.compresor}-${registro.numero_serie}`;
              const compressorName =
                (registro.numero_serie &&
                  serialToAliasMap.get(registro.numero_serie)) ||
                registro.compresor ||
                "Compresor";
              const clientKey = "Mi Empresa"; // Usar un solo "cliente" virtual para clientes

              // Crear cliente virtual si no existe
              if (!clientsMap.has(clientKey)) {
                clientsMap.set(clientKey, {
                  id: clientKey,
                  name: clientKey,
                  compressors: [],
                });
              }

              const client = clientsMap.get(clientKey)!;

              // Buscar o crear compresor
              let compressor = client.compressors.find(
                (c) => c.id === compressorKey
              );

              if (!compressor) {
                compressor = {
                  id: compressorKey,
                  name: compressorName,
                  numero_serie: registro.numero_serie,
                  visits: [],
                };
                client.compressors.push(compressor);
              }

              compressor.visits.push(registro);
            });
          } else {
            // Para otros roles, agrupar por cliente y luego por compresor
            allRegistros.forEach((registro) => {
              const clientKey = registro.cliente || "Sin cliente";
              const compressorKey = `${registro.compresor}-${registro.numero_serie}`;
              const compressorName =
                (registro.numero_serie &&
                  serialToAliasMap.get(registro.numero_serie)) ||
                registro.compresor ||
                "Compresor";

              // Crear cliente si no existe
              if (!clientsMap.has(clientKey)) {
                clientsMap.set(clientKey, {
                  id: clientKey,
                  name: clientKey,
                  compressors: [],
                });
              }

              const client = clientsMap.get(clientKey)!;

              // Buscar o crear compresor dentro del cliente
              let compressor = client.compressors.find(
                (c) => c.id === compressorKey
              );

              if (!compressor) {
                compressor = {
                  id: compressorKey,
                  name: compressorName,
                  numero_serie: registro.numero_serie,
                  visits: [],
                };
                client.compressors.push(compressor);
              }

              // Agregar visita al compresor
              compressor.visits.push(registro);
            });
          }

          const clients = Array.from(clientsMap.values());

          // Si la API no devolvió clientes (p. ej. 422) intentar mostrar
          // solamente compresores del usuario que tengan visitas (coincidan en número de serie)
          if (clients.length === 0 && compresores.length > 0) {
            // Crear set de números de serie que aparecen en los registros
            const registroSerials = new Set<string>();
            allRegistros.forEach((r) => {
              if (r.numero_serie) registroSerials.add(r.numero_serie);
            });

            // Si no hay registros con número de serie, no mostrar fallback
            if (registroSerials.size === 0) {
              setClientsData([]);
            } else {
              const fallbackMap = new Map<string, Client>();

              compresores.forEach((comp: UserCompressor) => {
                const compSerie =
                  (comp as { numero_serie?: string }).numero_serie || "";
                if (!compSerie || !registroSerials.has(compSerie)) return; // solo los que tienen visitas

                const clientKey =
                  (comp as { nombre_cliente?: string }).nombre_cliente ||
                  `Cliente ${
                    (comp as { numero_cliente?: number }).numero_cliente ||
                    "N/A"
                  }`;
                const compressorKey = `${
                  (comp as { alias?: string }).alias || "Compresor"
                }-${compSerie}`;

                if (!fallbackMap.has(clientKey)) {
                  fallbackMap.set(clientKey, {
                    id: clientKey,
                    name: clientKey,
                    compressors: [],
                  });
                }

                const clientObj = fallbackMap.get(clientKey)!;
                clientObj.compressors.push({
                  id: compressorKey,
                  name: (comp as { alias?: string }).alias || "Compresor",
                  numero_serie: compSerie || undefined,
                  visits: [],
                });
              });

              setClientsData(Array.from(fallbackMap.values()));
            }
          } else {
            setClientsData(clients);
          }

          // Cargar los links de reportes para todas las visitas (si hay)
          await loadReportLinks(allRegistros);

          setLoading(false);
        } catch (error) {
          console.error("Error loading data:", error);
          setLoading(false);
        }
      } else {
        console.error("No userData in sessionStorage");
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Función para cargar los links de reportes
  const loadReportLinks = async (registros: Visit[]) => {
    const linksMap = new Map<string, string>();

    for (const registro of registros) {
      try {
        const fecha = new Date(registro.date).toISOString().split("T")[0];
        const numeroCliente = registro.numero_cliente || 0;
        const numeroSerie = registro.numero_serie || "";

        const response = await fetch(
          `${URL_API}/web/maintenance/check-report?numero_cliente=${numeroCliente}&numero_serie=${numeroSerie}&fecha=${fecha}`
        );

        if (response.ok) {
          const result = await response.json();
          if (result.exists && result.report) {
            // Usar combinación única de fecha, cliente y número de serie como key
            const key = `${numeroCliente}-${numeroSerie}-${fecha}`;
            linksMap.set(key, result.report.link_reporte);
          }
        }
      } catch (error) {
        console.error("Error verificando reporte:", error);
      }
    }

    setReportLinks(linksMap);
  };

  // Función para obtener el link de reporte de una visita
  const getReportLink = (visit: Visit): string | null => {
    const fecha = new Date(visit.date).toISOString().split("T")[0];
    const numeroCliente = visit.numero_cliente || 0;
    const numeroSerie = visit.numero_serie || "";
    const key = `${numeroCliente}-${numeroSerie}-${fecha}`;
    return reportLinks.get(key) || null;
  };

  const toggleClient = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
      // También cerrar compresores de este cliente
      const client = clientsData.find((c) => c.id === clientId);
      client?.compressors.forEach((comp) => {
        expandedCompressors.delete(comp.id);
      });
      setExpandedCompressors(new Set(expandedCompressors));
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const toggleCompressor = (compressorId: string) => {
    const newExpanded = new Set(expandedCompressors);
    if (newExpanded.has(compressorId)) {
      newExpanded.delete(compressorId);
    } else {
      newExpanded.add(compressorId);
    }
    setExpandedCompressors(newExpanded);
  };

  const openVisitDetails = (visit: Visit) => {
    setSelectedVisit(visit);
    setShowDetails(true);
  };

  const handleGenerateReport = (visit: Visit) => {
    // Guardar los datos de la visita en sessionStorage
    sessionStorage.setItem(
      "selectedVisitData",
      JSON.stringify({
        id: visit.id,
        numero_serie: visit.numero_serie,
        date: visit.date,
        cliente: visit.cliente,
        technician: visit.technician,
      })
    );

    router.push(`/compressor-maintenance/views/generate-report`);
  };

  const handleViewReport = (visit: Visit) => {
    const link = getReportLink(visit);
    if (link) {
      window.open(link, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (clientsData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">
            No hay datos de compresores disponibles
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <BackButton />
      <div className="max-w-7xl mx-auto">
        {/* Botón de regresar */}

        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          Bitácora de Visitas de Mantenimiento
        </h1>

        {/* Lista de clientes o compresores según el rol */}
        <div className="space-y-4">
          {userRole === 3 || userRole === 4
            ? // Vista simplificada para clientes (roles 3 y 4): solo compresores
              clientsData[0]?.compressors.map((compressor) => (
                <div
                  key={compressor.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  {/* Header del compresor */}
                  <div
                    className="p-6 bg-gray-100 border-b-2 border-gray-300 cursor-pointer hover:bg-gray-200 transition-all"
                    onClick={() => toggleCompressor(compressor.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {expandedCompressors.has(compressor.id) ? (
                          <ChevronDown className="text-gray-700" size={24} />
                        ) : (
                          <ChevronRight className="text-gray-700" size={24} />
                        )}
                        <h2 className="text-2xl font-bold text-gray-900">
                          {compressor.name}
                        </h2>
                      </div>
                      <span className="bg-gray-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                        {compressor.visits.length} visita
                        {compressor.visits.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Lista de visitas */}
                  {expandedCompressors.has(compressor.id) && (
                    <div className="p-6 bg-white">
                      <div className="space-y-2">
                        {compressor.visits.map((visit) => (
                          <div
                            key={visit.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2 text-gray-600">
                                <Calendar size={16} />
                                <span className="font-medium">
                                  {new Date(visit.date).toLocaleDateString(
                                    "es-MX",
                                    {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                    }
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 text-gray-600">
                                <User size={16} />
                                <span>{visit.technician}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getReportLink(visit) ? (
                                <button
                                  onClick={() => handleViewReport(visit)}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
                                >
                                  <FileText size={16} />
                                  <span>Ver Reporte</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleGenerateReport(visit)}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
                                >
                                  <FileText size={16} />
                                  <span>Ver Reporte</span>
                                </button>
                              )}
                              <button
                                onClick={() => openVisitDetails(visit)}
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                              >
                                Detalles
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            : // Vista completa para otros roles: clientes → compresores
              clientsData.map((client) => (
                <div
                  key={client.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  {/* Header del cliente */}
                  <div
                    className="p-6 bg-gray-100 border-b-2 border-gray-300 cursor-pointer hover:bg-gray-200 transition-all"
                    onClick={() => toggleClient(client.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {expandedClients.has(client.id) ? (
                          <ChevronDown className="text-gray-700" size={24} />
                        ) : (
                          <ChevronRight className="text-gray-700" size={24} />
                        )}
                        <h2 className="text-2xl font-bold text-gray-900">
                          {client.name}
                        </h2>
                      </div>
                      <span className="bg-gray-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                        {client.compressors.length} compresor
                        {client.compressors.length !== 1 ? "es" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Compresores del cliente */}
                  {expandedClients.has(client.id) && (
                    <div className="p-6 space-y-4">
                      {client.compressors.map((compressor) => (
                        <div
                          key={compressor.id}
                          className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                          {/* Header del compresor */}
                          <div
                            className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => toggleCompressor(compressor.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {expandedCompressors.has(compressor.id) ? (
                                  <ChevronDown
                                    className="text-gray-600"
                                    size={20}
                                  />
                                ) : (
                                  <ChevronRight
                                    className="text-gray-600"
                                    size={20}
                                  />
                                )}
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {compressor.name}
                                </h3>
                              </div>
                              <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                                {compressor.visits.length} visita
                                {compressor.visits.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>

                          {/* Lista de visitas */}
                          {expandedCompressors.has(compressor.id) && (
                            <div className="p-4 bg-white">
                              <div className="space-y-2">
                                {compressor.visits.map((visit) => (
                                  <div
                                    key={visit.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                  >
                                    <div className="flex items-center space-x-4">
                                      <div className="flex items-center space-x-2 text-gray-600">
                                        <Calendar size={16} />
                                        <span className="font-medium">
                                          {new Date(
                                            visit.date
                                          ).toLocaleDateString("es-MX", {
                                            year: "numeric",
                                            month: "2-digit",
                                            day: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2 text-gray-600">
                                        <User size={16} />
                                        <span>{visit.technician}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {getReportLink(visit) ? (
                                        <button
                                          onClick={() =>
                                            handleViewReport(visit)
                                          }
                                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
                                        >
                                          <FileText size={16} />
                                          <span>Ver Reporte</span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() =>
                                            handleGenerateReport(visit)
                                          }
                                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
                                        >
                                          <FileText size={16} />
                                          <span>Generar Reporte</span>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => openVisitDetails(visit)}
                                        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                      >
                                        Detalles
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
                  )}
                </div>
              ))}
        </div>
      </div>

      {/* Modal de detalles de la visita */}
      {showDetails && selectedVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="sticky top-0 bg-gray-800 p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Detalles de la Visita
                  </h3>
                  <div className="flex items-center space-x-4 text-white text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar size={16} />
                      <span>
                        {new Date(selectedVisit.date).toLocaleDateString(
                          "es-MX",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User size={16} />
                      <span>Técnico: {selectedVisit.technician}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-white hover:bg-gray-700 rounded-full p-2 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              {/* Información del compresor */}
              {selectedVisit.compresor && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="font-semibold text-gray-700">
                        Compresor:
                      </span>{" "}
                      <span className="text-gray-900">
                        {selectedVisit.compresor}
                      </span>
                    </div>
                    {selectedVisit.numero_serie && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          Número de Serie:
                        </span>{" "}
                        <span className="text-gray-900">
                          {selectedVisit.numero_serie}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tareas realizadas */}
              <div className="mb-8">
                <div className="flex items-center space-x-2 mb-4">
                  <CheckSquare className="text-gray-700" size={24} />
                  <h4 className="text-xl font-bold text-gray-900">
                    Tareas Realizadas
                  </h4>
                </div>
                <div className="space-y-3">
                  {selectedVisit.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          readOnly
                          className="w-5 h-5 text-gray-600 rounded focus:ring-gray-500"
                        />
                      </div>
                      <div className="flex-grow">
                        <div className="font-medium text-gray-900 mb-1">
                          {task.name}
                        </div>
                        {task.comments && (
                          <div className="flex items-start space-x-2 text-sm text-gray-600">
                            <MessageSquare
                              size={14}
                              className="mt-0.5 flex-shrink-0"
                            />
                            <span className="italic">{task.comments}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comentarios */}
              {(selectedVisit.comentarios_generales ||
                selectedVisit.comentario_cliente) && (
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <MessageSquare className="text-gray-700" size={24} />
                    <h4 className="text-xl font-bold text-gray-900">
                      Comentarios
                    </h4>
                  </div>
                  {selectedVisit.comentarios_generales && (
                    <div className="mb-3 p-4 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-700 mb-1">
                        Comentarios del Técnico:
                      </div>
                      <div className="text-gray-900">
                        {selectedVisit.comentarios_generales}
                      </div>
                    </div>
                  )}
                  {selectedVisit.comentario_cliente && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="font-semibold text-gray-700 mb-1">
                        Comentarios del Cliente:
                      </div>
                      <div className="text-gray-900">
                        {selectedVisit.comentario_cliente}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Enlaces */}
              {(selectedVisit.carpeta_fotos || selectedVisit.link_form) && (
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <Camera className="text-gray-700" size={24} />
                    <h4 className="text-xl font-bold text-gray-900">
                      Recursos
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {selectedVisit.carpeta_fotos && (
                      <a
                        href={selectedVisit.carpeta_fotos}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <Camera className="text-green-600" size={20} />
                        <div>
                          <div className="font-semibold text-gray-900">
                            Carpeta de Fotos
                          </div>
                          <div className="text-sm text-gray-600">
                            Ver fotos en Google Drive
                          </div>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {!selectedVisit.carpeta_fotos &&
                !selectedVisit.link_form &&
                selectedVisit.photos.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Camera className="mx-auto text-gray-300 mb-2" size={48} />
                    <p className="text-gray-500">
                      No hay recursos adicionales para esta visita
                    </p>
                  </div>
                )}
            </div>

            {/* Footer del modal */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-lg flex justify-between items-center">
              {getReportLink(selectedVisit) ? (
                <button
                  onClick={() => handleViewReport(selectedVisit)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
                >
                  <FileText size={20} />
                  <span>Ver Reporte</span>
                </button>
              ) : (
                <button
                  onClick={() =>
                    userRole === 3 || userRole === 4
                      ? handleViewReport(selectedVisit)
                      : handleGenerateReport(selectedVisit)
                  }
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
                >
                  <FileText size={20} />
                  <span>
                    {userRole === 3 || userRole === 4
                      ? "Ver Reporte"
                      : "Generar Reporte"}
                  </span>
                </button>
              )}
              <button
                onClick={() => setShowDetails(false)}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visitas;
