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
} from "lucide-react";
import BackButton from "@/components/BackButton";
import Image from "next/image";

// Tipos
type MaintenanceTask = {
  id: string;
  name: string;
  completed: boolean;
  comments: string;
};

type Visit = {
  id: string;
  date: string;
  technician: string;
  tasks: MaintenanceTask[];
  photos: string[];
};

type Compressor = {
  id: string;
  name: string;
  visits: Visit[];
};

type Client = {
  id: string;
  name: string;
  compressors: Compressor[];
};

// Mock data solo para visitas y detalles
const getMockVisitsForCompressor = (compressorId: string): Visit[] => {
  const visits: Visit[] = [
    {
      id: `v1-${compressorId}`,
      date: "2024-01-02",
      technician: "Ivan",
      tasks: [
        {
          id: "t1",
          name: "Filtro de aire",
          completed: true,
          comments: "Estaba bien sucio y lo cambié",
        },
        {
          id: "t2",
          name: "Limpieza de bandas",
          completed: true,
          comments: "Ya le urgía!",
        },
        {
          id: "t3",
          name: "Cambio de aceite",
          completed: true,
          comments: "",
        },
      ],
      photos: [
        "https://via.placeholder.com/200x150/4285F4/FFFFFF?text=Foto+1",
        "https://via.placeholder.com/200x150/34A853/FFFFFF?text=Foto+2",
      ],
    },
    {
      id: `v2-${compressorId}`,
      date: "2024-02-21",
      technician: "Ivan",
      tasks: [
        {
          id: "t5",
          name: "Inspección general",
          completed: true,
          comments: "Todo en buen estado",
        },
        {
          id: "t6",
          name: "Limpieza de radiador",
          completed: true,
          comments: "",
        },
      ],
      photos: [],
    },
    {
      id: `v3-${compressorId}`,
      date: "2024-05-11",
      technician: "Carlos",
      tasks: [
        {
          id: "t7",
          name: "Mantenimiento preventivo",
          completed: true,
          comments: "Revisión completa realizada",
        },
      ],
      photos: ["https://via.placeholder.com/200x150/FBBC04/FFFFFF?text=Foto+1"],
    },
    {
      id: `v4-${compressorId}`,
      date: "2024-11-07",
      technician: "Ivan",
      tasks: [
        {
          id: "t8",
          name: "Filtro de aire",
          completed: true,
          comments: "Cambio programado",
        },
        {
          id: "t9",
          name: "Verificación de fugas",
          completed: true,
          comments: "Sin fugas detectadas",
        },
      ],
      photos: [],
    },
  ];

  return visits;
};

const Visitas = () => {
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

  useEffect(() => {
    const loadUserData = () => {
      const userData = sessionStorage.getItem("userData");
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          const compresores = parsedData.compresores || [];

          // Agrupar compresores por cliente
          const clientsMap = new Map<string, Compressor[]>();

          compresores.forEach(
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
              },
              index: number
            ) => {
              const clientName =
                comp.nombre_cliente ||
                `Cliente ${comp.numero_cliente || parsedData.numero_cliente}`;
              const compressorId = `${comp.id_compresor || index}`;
              const compressorName =
                comp.alias ||
                comp.Alias ||
                `Compresor ${comp.linea || comp.id || index + 1}`;

              if (!clientsMap.has(clientName)) {
                clientsMap.set(clientName, []);
              }

              const compressor: Compressor = {
                id: compressorId,
                name: compressorName,
                visits: getMockVisitsForCompressor(compressorId),
              };

              clientsMap.get(clientName)!.push(compressor);
            }
          );

          // Convertir el mapa a array de clientes
          const clients: Client[] = Array.from(clientsMap.entries()).map(
            ([clientName, compressors], index) => ({
              id: `client-${index}`,
              name: clientName,
              compressors: compressors,
            })
          );

          setClientsData(clients);
          setLoading(false);
        } catch (error) {
          console.error("Error parsing userData:", error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

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
      <div className="max-w-7xl mx-auto">
        {/* Botón de regresar */}
        <div className="mb-4">
          <BackButton />
        </div>

        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          Bitácora de Visitas de Mantenimiento
        </h1>

        {/* Lista de clientes */}
        <div className="space-y-4">
          {clientsData.map((client) => (
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
                                <button
                                  onClick={() => openVisitDetails(visit)}
                                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                >
                                  Detalles
                                </button>
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

              {/* Fotos */}
              {selectedVisit.photos.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Camera className="text-gray-700" size={24} />
                    <h4 className="text-xl font-bold text-gray-900">Fotos</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedVisit.photos.map((photo, index) => (
                      <div
                        key={index}
                        className="aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                      >
                        <Image
                          src={photo}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedVisit.photos.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Camera className="mx-auto text-gray-300 mb-2" size={48} />
                  <p className="text-gray-500">
                    No se agregaron fotos en esta visita
                  </p>
                </div>
              )}
            </div>

            {/* Footer del modal */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowDetails(false)}
                className="w-full md:w-auto px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
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
