"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { URL_API } from "@/lib/global";

interface CompressorSearchResult {
  hp: number;
  tipo: string;
  marca: string;
  numero_serie: string;
  anio: number;
  id_cliente: number;
  alias: string;
  nombre_cliente: string;
  numero_cliente: number;
}

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
  prioridad: string;
  fecha_programada: string;
  hora_programada: string;
  estado: string;
  fecha_creacion: string;
  reporte_url: string;
  tipo_mantenimiento: string;
}

interface EventualClient {
  id: number;
  nombre: string;
  nombre_cliente?: string;
  direccion?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
}

interface TicketFormData {
  folio: string;
  clientName: string;
  numeroCliente: string;
  alias: string;
  serialNumber: string;
  hp: string;
  tipo: string;
  marca: string;
  anio: string;
  problemDescription: string;
  tipoMantenimiento: string;
  priority: string;
  scheduledDate: string;
  hora: string;
  technician: string;
}

// Helper function to format date to DD/MM/YYYY
const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper function to format time to HH:MM
const formatTime = (timeString: string) => {
  if (!timeString) return "";
  // If already in HH:MM format, return as is
  if (/^\d{2}:\d{2}$/.test(timeString)) {
    return timeString;
  }
  // If in HH:MM:SS format, extract HH:MM
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
    return timeString.substring(0, 5);
  }
  return timeString;
};

const TypeReportes = () => {
  const router = useRouter();
  const [rol, setRol] = useState<number | null>(null);
  const [isClienteEventual, setIsClienteEventual] = useState(false);
  const [isNewEventual, setIsNewEventual] = useState(true);
  const [eventualClients, setEventualClients] = useState<EventualClient[]>([]);
  const [selectedEventualClient, setSelectedEventualClient] =
    useState<EventualClient | null>(null);
  const [selectedCompressor, setSelectedCompressor] =
    useState<CompressorSearchResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<CompressorSearchResult[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [ordenesServicio, setOrdenesServicio] = useState<OrdenServicio[]>([]);
  const [loadingOrdenes, setLoadingOrdenes] = useState(false);
  const [ticketData, setTicketData] = useState<TicketFormData>({
    folio: "",
    clientName: "",
    numeroCliente: "",
    alias: "",
    serialNumber: "",
    hp: "",
    tipo: "",
    marca: "",
    anio: "",
    problemDescription: "",
    tipoMantenimiento: "",
    priority: "media",
    scheduledDate: "",
    hora: "no-aplica",
    technician: "",
  });
  const [eventualClientInfo, setEventualClientInfo] = useState({
    telefono: "",
    email: "",
    direccion: "",
    rfc: "",
  });
  const [editingTicket, setEditingTicket] = useState<OrdenServicio | null>(
    null,
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTicketsList, setShowTicketsList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Load user role on mount and check authorization
  useEffect(() => {
    const userData = sessionStorage.getItem("userData");
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        const userRole = parsedData.rol;
        setRol(userRole);

        // Only allow ROL 0, 1, or 2
        if (userRole === 0 || userRole === 1 || userRole === 2) {
          setIsAuthorized(true);
        } else {
          // Redirect unauthorized users
          console.warn(`Unauthorized access attempt by rol ${userRole}`);
          router.push("/home");
        }
      } catch (error) {
        console.error("Error parsing userData:", error);
        router.push("/home");
      }
    } else {
      // No user data found, redirect to login
      router.push("/home");
    }
    setIsLoading(false);
  }, [router]);

  // Fetch eventual clients
  const fetchEventualClients = async () => {
    try {
      const response = await fetch(`${URL_API}/clients/eventuales`);
      const data = await response.json();
      if (data.data) {
        setEventualClients(data.data);
      }
    } catch (error) {
      console.error("Error fetching eventual clients:", error);
    }
  };

  // Load eventual clients when component mounts
  useEffect(() => {
    fetchEventualClients();
  }, []);

  // Load ordenes for roles 0 and 1
  useEffect(() => {
    if (rol === 0 || rol === 1) {
      fetchAllOrdenes();
    }
  }, [rol]);

  // Load ordenes for VAST view (rol 2)
  useEffect(() => {
    if (rol === 2) {
      fetchAllOrdenes();
    }
  }, [rol]);

  // Fetch all ordenes de servicio
  const fetchAllOrdenes = async () => {
    setLoadingOrdenes(true);
    try {
      const response = await fetch(`${URL_API}/ordenes/`);
      const data = await response.json();

      if (data.data) {
        setOrdenesServicio(data.data);
      } else {
        setOrdenesServicio([]);
      }
    } catch (error) {
      console.error("Error fetching ordenes de servicio:", error);
      alert("Error al cargar las órdenes de servicio");
    } finally {
      setLoadingOrdenes(false);
    }
  };

  // Search for compressors
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      const response = await fetch(
        `${URL_API}/compresores/compresor-cliente/${encodeURIComponent(query)}`,
      );
      const data = await response.json();

      if (data.data) {
        setSearchResults(data.data);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Error searching compressors:", error);
      setSearchResults([]);
      setShowResults(true);
    }
  };

  // Generate folio: id_cliente-last4digits-YYYYMMDD-HHMM
  const generateFolio = (
    idCliente: number | string,
    serialNumber: string,
  ): string => {
    const clientId =
      idCliente === "EVENTUAL" ? "00" : String(idCliente).padStart(2, "0");
    const last4Digits = serialNumber.slice(-4).padStart(4, "0");
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${clientId}-${last4Digits}-${year}${month}${day}-${hours}${minutes}`;
  };

  // Select compressor from search results
  const handleSelectCompressor = (compressor: CompressorSearchResult) => {
    setSelectedCompressor(compressor);
    setShowResults(false);
    setIsClienteEventual(false);
    const folio = generateFolio(compressor.id_cliente, compressor.numero_serie);
    setTicketData({
      folio: folio,
      clientName: compressor.nombre_cliente,
      numeroCliente: compressor.numero_cliente.toString(),
      alias: compressor.alias,
      serialNumber: compressor.numero_serie,
      hp: compressor.hp.toString(),
      tipo: compressor.tipo,
      marca: compressor.marca,
      anio: compressor.anio.toString(),
      problemDescription: "",
      tipoMantenimiento: "",
      priority: "media",
      scheduledDate: "",
      hora: "no-aplica",
      technician: "",
    });
  };

  // Toggle cliente eventual
  const handleClienteEventual = () => {
    setIsClienteEventual(true);
    setIsNewEventual(true);
    setSelectedCompressor(null);
    setSelectedEventualClient(null);
    setSearchQuery("");
    setShowResults(false);
    setTicketData({
      folio: "",
      clientName: "",
      numeroCliente: "EVENTUAL",
      alias: "",
      serialNumber: "",
      hp: "",
      tipo: "",
      marca: "",
      anio: "",
      problemDescription: "",
      tipoMantenimiento: "",
      priority: "media",
      scheduledDate: "",
      hora: "no-aplica",
      technician: "",
    });
    setEventualClientInfo({
      telefono: "",
      email: "",
      direccion: "",
      rfc: "",
    });
    fetchEventualClients();
  };

  // Handle eventual client selection
  const handleSelectEventualClient = (client: EventualClient) => {
    setSelectedEventualClient(client);
    setIsNewEventual(false);
    const clientName = client.nombre_cliente || client.nombre || "";
    setTicketData((prev) => ({
      ...prev,
      clientName: clientName,
      numeroCliente: "EVENTUAL",
    }));
    setEventualClientInfo({
      telefono: String(client.telefono || ""),
      email: String(client.email || ""),
      direccion: String(client.direccion || ""),
      rfc: "",
    });
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setTicketData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      // Regenerate folio for eventual clients when serial number changes
      if (isClienteEventual && name === "serialNumber" && value.length >= 4) {
        updated.folio = generateFolio("EVENTUAL", value);
      }

      return updated;
    });
  };

  // Submit ticket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let eventualClientId = 0;

      // If it's a new eventual client, create it first
      if (isClienteEventual && isNewEventual) {
        const eventualClientData = {
          nombre_cliente: ticketData.clientName,
          telefono: eventualClientInfo.telefono,
          email: eventualClientInfo.email,
          direccion: eventualClientInfo.direccion,
        };

        const eventualResponse = await fetch(`${URL_API}/clients/eventuales`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventualClientData),
        });

        const eventualResult = await eventualResponse.json();

        if (eventualResponse.ok) {
          eventualClientId = eventualResult.id;
          console.log("Eventual client created with ID:", eventualClientId);
        } else {
          throw new Error(
            `Error creating eventual client: ${
              eventualResult.detail || eventualResult.error
            }`,
          );
        }
      } else if (
        isClienteEventual &&
        !isNewEventual &&
        selectedEventualClient
      ) {
        eventualClientId = Number(selectedEventualClient.id) || 0;
      }

      // If it's an eventual client, also create the compressor
      if (isClienteEventual && eventualClientId > 0) {
        const eventualCompressorData = {
          hp: ticketData.hp ? parseInt(ticketData.hp) : null,
          tipo: ticketData.tipo || null,
          voltaje: null,
          marca: ticketData.marca || null,
          numero_serie: ticketData.serialNumber || null,
          anio: ticketData.anio ? parseInt(ticketData.anio) : null,
          id_cliente: eventualClientId,
          Amp_Load: null,
          Amp_No_Load: null,
          proyecto: null,
          linea: null,
          LOAD_NO_LOAD: null,
          Alias: ticketData.alias || null,
          segundosPorRegistro: 30,
          fecha_ultimo_mtto: null,
          modelo: null,
        };

        const compressorResponse = await fetch(
          `${URL_API}/compresores/eventuales`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventualCompressorData),
          },
        );

        const compressorResult = await compressorResponse.json();

        if (compressorResponse.ok) {
          console.log(
            "Eventual compressor created with ID:",
            compressorResult.id,
          );
        } else {
          throw new Error(
            `Error creating eventual compressor: ${
              compressorResult.detail || compressorResult.error
            }`,
          );
        }
      }

      // Prepare the data for the API
      const ordenData = {
        folio: ticketData.folio,
        id_cliente: isClienteEventual ? 0 : selectedCompressor?.id_cliente || 0,
        id_cliente_eventual: isClienteEventual ? eventualClientId : 0,
        nombre_cliente: ticketData.clientName,
        numero_cliente: parseInt(ticketData.numeroCliente) || 0,
        alias_compresor: ticketData.alias,
        numero_serie: ticketData.serialNumber,
        hp: parseInt(ticketData.hp) || 0,
        tipo: ticketData.tipo,
        marca: ticketData.marca,
        anio: parseInt(ticketData.anio) || 0,
        tipo_visita: ticketData.problemDescription,
        tipo_mantenimiento: ticketData.tipoMantenimiento,
        prioridad: ticketData.priority,
        fecha_programada:
          ticketData.scheduledDate || new Date().toISOString().split("T")[0],
        hora_programada:
          ticketData.hora !== "no-aplica" ? ticketData.hora : "00:00:00",
        estado: "no_iniciado",
        fecha_creacion: new Date().toISOString(),
        reporte_url: "",
      };

      console.log("Sending ticket data:", ordenData);

      const response = await fetch(`${URL_API}/ordenes/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ordenData),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Ticket creado exitosamente con folio: ${ticketData.folio}`);
        // Reset form
        setSelectedCompressor(null);
        setIsClienteEventual(false);
        setSearchQuery("");
        setShowResults(false);
        setTicketData({
          folio: "",
          clientName: "",
          numeroCliente: "",
          alias: "",
          serialNumber: "",
          hp: "",
          tipo: "",
          marca: "",
          anio: "",
          problemDescription: "",
          tipoMantenimiento: "",
          priority: "media",
          scheduledDate: "",
          hora: "no-aplica",
          technician: "",
        });
        setEventualClientInfo({
          telefono: "",
          email: "",
          direccion: "",
          rfc: "",
        });
        // Reload ordenes
        fetchAllOrdenes();
      } else {
        console.error("Error response:", result);

        // Handle different error formats
        let errorMessage = "Error desconocido";

        if (typeof result.detail === "string") {
          errorMessage = result.detail;
        } else if (typeof result.detail === "object") {
          errorMessage = JSON.stringify(result.detail);
        } else if (result.message) {
          errorMessage = result.message;
        } else if (result.error) {
          errorMessage = result.error;
        }

        alert(`❌ Error al crear el ticket: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error submitting ticket:", error);
      alert("❌ Error al enviar el ticket. Por favor, intente nuevamente.");
    }
  };

  // Edit ticket
  const handleEditTicket = (orden: OrdenServicio) => {
    setEditingTicket(orden);
    setShowEditModal(true);
  };

  // Update ticket
  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;

    try {
      const response = await fetch(
        `${URL_API}/ordenes/${editingTicket.folio}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editingTicket),
        },
      );

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Ticket actualizado exitosamente`);
        setShowEditModal(false);
        setEditingTicket(null);
        fetchAllOrdenes();
      } else {
        alert(
          `❌ Error al actualizar el ticket: ${
            result.detail ||
            result.message ||
            result.error ||
            "Error desconocido"
          }`,
        );
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      alert("❌ Error al actualizar el ticket. Por favor, intente nuevamente.");
    }
  };

  // Delete ticket
  const handleDeleteTicket = async (folio: string) => {
    if (!confirm(`¿Estás seguro de eliminar el ticket ${folio}?`)) return;

    try {
      const response = await fetch(`${URL_API}/ordenes/${folio}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Ticket eliminado exitosamente`);
        fetchAllOrdenes();
      } else {
        alert(
          `❌ Error al eliminar el ticket: ${
            result.detail ||
            result.message ||
            result.error ||
            "Error desconocido"
          }`,
        );
      }
    } catch (error) {
      console.error("Error deleting ticket:", error);
      alert("❌ Error al eliminar el ticket. Por favor, intente nuevamente.");
    }
  };

  // Función para ir atrás
  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  // Función para actualizar el estado de una orden
  const handleStartReport = async (orden: OrdenServicio) => {
    try {
      const response = await fetch(
        `${URL_API}/ordenes/${orden.folio}/estado?estado=en_progreso`,
        {
          method: "PATCH",
        },
      );

      if (response.ok) {
        // Navegar a la página de crear reporte
        const params = new URLSearchParams({
          folio: orden.folio,
        });
        router.push(
          `/features/compressor-maintenance/technician/reports/create?${params.toString()}`,
        );
      } else {
        const result = await response.json();
        console.error("Error response:", result);

        // Manejar diferentes formatos de error
        let errorMessage = "Error desconocido";

        if (typeof result.detail === "string") {
          errorMessage = result.detail;
        } else if (
          typeof result.detail === "object" &&
          result.detail !== null
        ) {
          errorMessage = JSON.stringify(result.detail);
        } else if (result.message) {
          errorMessage = result.message;
        } else if (result.error) {
          errorMessage = result.error;
        }

        alert(`❌ Error al actualizar el estado: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error updating orden estado:", error);
      alert("❌ Error al actualizar el estado. Por favor, intente nuevamente.");
    }
  };

  // Función para agrupar órdenes por fecha
  const groupOrdensByDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));

    const nextWeekEnd = new Date(endOfWeek);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

    const groups: {
      [key: string]: {
        title: string;
        orders: OrdenServicio[];
        priority: number;
      };
    } = {
      overdue: { title: "🔴 Atrasadas", orders: [], priority: 0 },
      today: { title: "🟠 Hoy", orders: [], priority: 1 },
      tomorrow: { title: "🟡 Mañana", orders: [], priority: 2 },
      thisWeek: { title: "🟢 Esta Semana", orders: [], priority: 3 },
      nextWeek: { title: "🔵 Próxima Semana", orders: [], priority: 4 },
      later: { title: "⚪ Más Adelante", orders: [], priority: 5 },
    };

    ordenesServicio.forEach((orden) => {
      // Parse the date from the API (format: YYYY-MM-DD)
      const [year, month, day] = orden.fecha_programada.split("-").map(Number);
      const ordenDate = new Date(year, month - 1, day);

      if (ordenDate < today) {
        groups.overdue.orders.push(orden);
      } else if (ordenDate.getTime() === today.getTime()) {
        groups.today.orders.push(orden);
      } else if (ordenDate.getTime() === tomorrow.getTime()) {
        groups.tomorrow.orders.push(orden);
      } else if (ordenDate > tomorrow && ordenDate <= endOfWeek) {
        groups.thisWeek.orders.push(orden);
      } else if (ordenDate > endOfWeek && ordenDate <= nextWeekEnd) {
        groups.nextWeek.orders.push(orden);
      } else {
        groups.later.orders.push(orden);
      }
    });

    // Ordenar las órdenes dentro de cada grupo por hora programada
    Object.values(groups).forEach((group) => {
      group.orders.sort((a, b) => {
        const timeA = a.hora_programada || "00:00:00";
        const timeB = b.hora_programada || "00:00:00";
        return timeA.localeCompare(timeB);
      });
    });

    // Filtrar grupos vacíos y ordenar por prioridad
    return Object.values(groups)
      .filter((group) => group.orders.length > 0)
      .sort((a, b) => a.priority - b.priority);
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      ></div>

      {/* Loading/Authorization Screen */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-cyan-300 text-xl">Verificando acceso...</p>
          </div>
        </div>
      )}

      {/* Unauthorized Screen */}
      {!isLoading && !isAuthorized && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold text-red-400 mb-2">
              Acceso Denegado
            </h1>
            <p className="text-red-300 mb-6">
              No tienes permiso para acceder a esta página
            </p>
            <button
              onClick={() => router.push("/home")}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-bold"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Only show if authorized and not loading */}
      {!isLoading && isAuthorized && (
        <div className="max-w-7xl mx-auto relative z-10">
          <button
            onClick={handleGoBack}
            className="absolute left-0 top-0 flex items-center gap-2 bg-gradient-to-r from-blue-700 to-blue-800 text-white hover:from-blue-800 hover:to-blue-900 transition-all duration-200 px-6 py-3 rounded-xl shadow-lg hover:shadow-blue-500/50 border border-blue-500/30"
            title="Atrás"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-lg font-bold">Atrás</span>
          </button>

          {/* VISTA PARA ROL 2 (VAST) - Ver Órdenes de Servicio */}
          {rol === 2 && (
            <>
              <div className="mt-24 mb-12 text-center">
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 mb-3">
                  Órdenes de Servicio
                </h1>
                <p className="text-cyan-200/80 text-xl">
                  Selecciona una orden para crear su reporte
                </p>
              </div>

              {/* Ordenes List Section */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 rounded-3xl opacity-30 blur-xl"></div>
                <div className="relative bg-gradient-to-br from-slate-800/95 via-blue-900/95 to-slate-800/95 rounded-3xl shadow-2xl border border-cyan-500/30 p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-cyan-300 flex items-center gap-3">
                      <span className="text-4xl">📋</span>
                      Órdenes Pendientes
                    </h2>
                    {ordenesServicio.length > 0 && (
                      <span className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full font-semibold text-sm shadow-lg">
                        {ordenesServicio.length}{" "}
                        {ordenesServicio.length === 1 ? "orden" : "órdenes"}
                      </span>
                    )}
                  </div>

                  {loadingOrdenes ? (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-4">⏳</div>
                      <p className="text-cyan-300">
                        Cargando órdenes de servicio...
                      </p>
                    </div>
                  ) : ordenesServicio.length === 0 ? (
                    <div className="text-center py-16 text-cyan-300/60">
                      <div className="text-8xl mb-6">📄</div>
                      <p className="text-xl font-medium text-cyan-200">
                        No hay órdenes de servicio disponibles
                      </p>
                      <p className="text-sm mt-3 text-cyan-300/60">
                        Las nuevas órdenes aparecerán aquí
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {groupOrdensByDate().map((group) => (
                        <div key={group.title} className="space-y-4">
                          {/* Header de fecha */}
                          <div className="flex items-center gap-4">
                            <h3 className="text-2xl font-bold text-cyan-100 flex items-center gap-2">
                              {group.title}
                            </h3>
                            <div className="flex-1 h-0.5 bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
                            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm font-semibold">
                              {group.orders.length}{" "}
                              {group.orders.length === 1 ? "orden" : "órdenes"}
                            </span>
                          </div>

                          {/* Grid de órdenes */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {group.orders.map((orden) => (
                              <div
                                key={orden.folio}
                                className="group relative p-5 rounded-2xl border-2 border-cyan-500/30 bg-gradient-to-br from-blue-800/40 to-cyan-800/40 hover:border-cyan-400/60 hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300"
                              >
                                <div className="mb-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <span
                                      className={`px-3 py-1 text-white text-xs font-bold rounded-lg shadow ${
                                        orden.estado === "no_iniciado"
                                          ? "bg-gray-500"
                                          : orden.estado === "en_proceso"
                                            ? "bg-blue-500"
                                            : orden.estado === "completado"
                                              ? "bg-green-500"
                                              : "bg-gray-500"
                                      }`}
                                    >
                                      {orden.estado
                                        .toUpperCase()
                                        .replace("_", " ")}
                                    </span>
                                    <span
                                      className={`px-2 py-1 text-xs font-semibold rounded ${
                                        orden.prioridad === "urgente"
                                          ? "bg-red-500 text-white"
                                          : orden.prioridad === "alta"
                                            ? "bg-orange-500 text-white"
                                            : orden.prioridad === "media"
                                              ? "bg-yellow-500 text-white"
                                              : "bg-blue-500 text-white"
                                      }`}
                                    >
                                      {orden.prioridad.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="font-bold text-white text-xl truncate">
                                    {orden.nombre_cliente}
                                  </p>
                                  <p className="text-sm text-white mt-2">
                                    <span className="font-bold">Folio:</span>{" "}
                                    {orden.folio}
                                  </p>
                                  <p className="text-sm text-white">
                                    <span className="font-bold">
                                      Compresor:
                                    </span>{" "}
                                    {orden.alias_compresor}
                                  </p>
                                  <p className="text-sm text-white">
                                    <span className="font-bold">Serie:</span>{" "}
                                    {orden.numero_serie}
                                  </p>
                                  <p className="text-sm text-white">
                                    <span className="font-bold">Marca:</span>{" "}
                                    {orden.marca}
                                  </p>
                                  <p className="text-sm text-white">
                                    <span className="font-bold">Modelo:</span>{" "}
                                    {orden.tipo}
                                  </p>
                                  <p className="text-sm text-white">
                                    <span className="font-bold">
                                      Tipo Visita:
                                    </span>{" "}
                                    {orden.tipo_visita}
                                  </p>
                                  <p className="text-sm text-white">
                                    <span className="font-bold">
                                      Mantenimiento:
                                    </span>{" "}
                                    {orden.tipo_mantenimiento ||
                                      "No especificado"}
                                  </p>
                                  <p className="text-sm text-white mt-2">
                                    <span className="font-bold">
                                      Programado para:
                                    </span>{" "}
                                    {formatDate(orden.fecha_programada)}{" "}
                                    {formatTime(orden.hora_programada)}
                                  </p>
                                </div>
                                <div className="flex">
                                  <button
                                    onClick={() => handleStartReport(orden)}
                                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg w-full"
                                    title="Crear Reporte"
                                  >
                                    Empezar Reporte
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* VISTA PARA ROL 0 y 1 - Crear Ticket de Servicio */}
          {(rol === 0 || rol === 1) && (
            <>
              <div className="mt-24 mb-12 text-center">
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 mb-3">
                  Crear Ticket de Servicio
                </h1>
                <p className="text-white text-xl">
                  Registra una nueva solicitud de mantenimiento
                </p>
              </div>

              {/* Search Section */}
              <div className="relative mb-8">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 rounded-3xl opacity-30 blur-xl"></div>
                <div className="relative bg-gradient-to-br from-slate-800/95 via-blue-900/95 to-slate-800/95 rounded-3xl shadow-2xl border border-cyan-500/30 p-8">
                  <h2 className="text-2xl font-bold text-cyan-300 mb-6">
                    Buscar Compresor
                  </h2>

                  <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Buscar por cliente, alias o número de serie..."
                        className="w-full px-6 py-4 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all text-lg"
                      />
                    </div>
                    <button
                      onClick={handleClienteEventual}
                      className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all font-semibold shadow-lg hover:shadow-amber-500/50 border border-amber-400/50"
                    >
                      Cliente Eventual
                    </button>
                  </div>

                  {/* Search Results */}
                  {showResults && searchResults.length > 0 && (
                    <div className="mt-4 max-h-96 overflow-y-auto bg-slate-900/50 rounded-xl border border-cyan-500/30 p-4">
                      <p className="text-cyan-300 text-sm mb-3 font-semibold">
                        {searchResults.length} resultado(s) encontrado(s)
                      </p>
                      <div className="space-y-2">
                        {searchResults.map((result, index) => (
                          <button
                            key={index}
                            onClick={() => handleSelectCompressor(result)}
                            className="w-full text-left p-4 bg-blue-800/40 hover:bg-blue-700/60 rounded-lg transition-all border border-cyan-500/30 hover:border-cyan-400/60"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-cyan-100 text-lg">
                                  {result.nombre_cliente}
                                </p>
                                <p className="text-cyan-200/80 text-sm mt-1">
                                  {result.alias} - Serie: {result.numero_serie}
                                </p>
                                <p className="text-cyan-300/60 text-xs mt-1">
                                  {result.marca} | {result.hp} HP |{" "}
                                  {result.tipo}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-cyan-600/50 text-white text-xs rounded-full">
                                Cliente #{result.numero_cliente}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {showResults && searchResults.length === 0 && (
                    <div className="mt-4 p-6 bg-slate-900/50 rounded-xl border border-cyan-500/30 text-center">
                      <p className="text-cyan-300/60">
                        No se encontraron resultados
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Form */}
              {(selectedCompressor || isClienteEventual) && (
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 rounded-3xl opacity-30 blur-xl"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/95 via-blue-900/95 to-slate-800/95 rounded-3xl shadow-2xl border border-cyan-500/30 p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-cyan-300">
                        Datos del Ticket
                      </h2>
                      {isClienteEventual && (
                        <span className="px-4 py-2 bg-amber-500/90 text-white rounded-full font-semibold text-sm">
                          Cliente Eventual
                        </span>
                      )}
                    </div>

                    {/* Eventual Client Selection */}
                    {isClienteEventual && (
                      <div className="mb-6 p-6 bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-xl border-2 border-amber-500/50">
                        <h3 className="text-xl font-bold text-amber-300 mb-4">
                          Tipo de Cliente Eventual
                        </h3>
                        <div className="flex gap-4 mb-4">
                          <button
                            type="button"
                            onClick={() => {
                              setIsNewEventual(true);
                              setSelectedEventualClient(null);
                              setTicketData((prev) => ({
                                ...prev,
                                clientName: "",
                              }));
                            }}
                            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                              isNewEventual
                                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg"
                                : "bg-slate-700/50 text-cyan-300 hover:bg-slate-700"
                            }`}
                          >
                            Nuevo Cliente
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsNewEventual(false);
                              setSelectedEventualClient(null);
                            }}
                            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                              !isNewEventual
                                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg"
                                : "bg-slate-700/50 text-cyan-300 hover:bg-slate-700"
                            }`}
                          >
                            Cliente Existente
                          </button>
                        </div>

                        {!isNewEventual && (
                          <div>
                            <label className="block text-amber-300 font-semibold mb-2">
                              Seleccionar Cliente Eventual
                            </label>
                            <select
                              value={String(selectedEventualClient?.id || "")}
                              onChange={(e) => {
                                const client = eventualClients.find(
                                  (c) =>
                                    Number(c.id) === parseInt(e.target.value),
                                );
                                if (client) {
                                  handleSelectEventualClient(client);
                                }
                              }}
                              className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-amber-500/50 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/50 transition-all"
                              required={!isNewEventual}
                            >
                              <option value="">
                                -- Seleccionar cliente --
                              </option>
                              {eventualClients.map((client) => (
                                <option
                                  key={String(client.id)}
                                  value={String(client.id)}
                                >
                                  {String(client.nombre_cliente || "")}
                                  {client.telefono
                                    ? ` - ${String(client.telefono || "")}`
                                    : ""}
                                </option>
                              ))}
                            </select>
                            {selectedEventualClient && (
                              <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                                <p className="text-cyan-200 text-sm">
                                  <span className="font-semibold">
                                    Teléfono:
                                  </span>{" "}
                                  {eventualClientInfo.telefono || "N/A"}
                                </p>
                                <p className="text-cyan-200 text-sm">
                                  <span className="font-semibold">Email:</span>{" "}
                                  {eventualClientInfo.email || "N/A"}
                                </p>
                                <p className="text-cyan-200 text-sm">
                                  <span className="font-semibold">
                                    Dirección:
                                  </span>{" "}
                                  {eventualClientInfo.direccion || "N/A"}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Contact information fields for new eventual clients */}
                        {isNewEventual && (
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <label className="block">
                              <span className="text-amber-300 font-semibold mb-2 block">
                                Teléfono *
                              </span>
                              <input
                                type="tel"
                                value={eventualClientInfo.telefono}
                                onChange={(e) =>
                                  setEventualClientInfo((prev) => ({
                                    ...prev,
                                    telefono: e.target.value,
                                  }))
                                }
                                placeholder="555-1234-5678"
                                required
                                className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-amber-500/50 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/50"
                              />
                            </label>

                            <label className="block">
                              <span className="text-amber-300 font-semibold mb-2 block">
                                Email *
                              </span>
                              <input
                                type="email"
                                value={eventualClientInfo.email}
                                onChange={(e) =>
                                  setEventualClientInfo((prev) => ({
                                    ...prev,
                                    email: e.target.value,
                                  }))
                                }
                                placeholder="cliente@ejemplo.com"
                                required
                                className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-amber-500/50 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/50"
                              />
                            </label>

                            <label className="block col-span-2">
                              <span className="text-amber-300 font-semibold mb-2 block">
                                Dirección *
                              </span>
                              <input
                                type="text"
                                value={eventualClientInfo.direccion}
                                onChange={(e) =>
                                  setEventualClientInfo((prev) => ({
                                    ...prev,
                                    direccion: e.target.value,
                                  }))
                                }
                                placeholder="Calle, Número, Colonia, Ciudad"
                                required
                                className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-amber-500/50 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/50"
                              />
                            </label>

                            <label className="block col-span-2">
                              <span className="text-amber-300 font-semibold mb-2 block">
                                RFC (opcional)
                              </span>
                              <input
                                type="text"
                                value={eventualClientInfo.rfc}
                                onChange={(e) =>
                                  setEventualClientInfo((prev) => ({
                                    ...prev,
                                    rfc: e.target.value.toUpperCase(),
                                  }))
                                }
                                placeholder="XAXX010101000"
                                maxLength={13}
                                className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-amber-500/50 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/50"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Display Folio */}
                    {ticketData.folio && (
                      <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-xl border-2 border-purple-500/50">
                        <div className="flex items-center gap-3">
                          <span className="text-purple-300 font-semibold text-lg">
                            FOLIO:
                          </span>
                          <span className="text-cyan-100 font-mono text-2xl font-bold tracking-wider">
                            {ticketData.folio}
                          </span>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleSubmitTicket} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Cliente Info */}
                        <div>
                          <label className="block text-cyan-300 font-semibold mb-2">
                            Nombre del Cliente *
                          </label>
                          <input
                            type="text"
                            name="clientName"
                            value={ticketData.clientName}
                            onChange={handleInputChange}
                            required
                            disabled={
                              isClienteEventual &&
                              !isNewEventual &&
                              !!selectedEventualClient
                            }
                            className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Nombre del cliente"
                          />
                        </div>

                        <div>
                          <label className="block text-cyan-300 font-semibold mb-2">
                            Número de Cliente
                          </label>
                          <input
                            type="text"
                            name="numeroCliente"
                            value={ticketData.numeroCliente}
                            onChange={handleInputChange}
                            readOnly={!isClienteEventual}
                            className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                            placeholder="Número de cliente"
                          />
                        </div>

                        {/* Compressor Info */}
                        <div>
                          <label className="block text-cyan-300 font-semibold mb-2">
                            Alias del Compresor *
                          </label>
                          <input
                            type="text"
                            name="alias"
                            value={ticketData.alias}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                            placeholder="Alias"
                          />
                        </div>

                        <div>
                          <label className="block text-cyan-300 font-semibold mb-2">
                            Número de Serie *
                          </label>
                          <input
                            type="text"
                            name="serialNumber"
                            value={ticketData.serialNumber}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                            placeholder="Número de serie"
                          />
                        </div>

                        <div>
                          <label className="block text-cyan-300 font-semibold mb-2">
                            HP *
                          </label>
                          <input
                            type="text"
                            name="hp"
                            value={ticketData.hp}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                            placeholder="HP"
                          />
                        </div>

                        <div>
                          <label className="block text-cyan-300 font-semibold mb-2">
                            Tipo *
                          </label>
                          <select
                            name="tipo"
                            value={ticketData.tipo}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                          >
                            <option value="">Seleccionar tipo</option>
                            <option value="tornillo">Tornillo</option>
                            <option value="piston">Piston</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-cyan-300 font-semibold mb-2">
                            Marca *
                          </label>
                          <input
                            type="text"
                            name="marca"
                            value={ticketData.marca}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                            placeholder="Marca"
                          />
                        </div>

                        <div>
                          <label className="block text-cyan-300 font-semibold mb-2">
                            Año
                          </label>
                          <input
                            type="text"
                            name="anio"
                            value={ticketData.anio}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                            placeholder="Año"
                          />
                        </div>

                        {/* Ticket Details - Pendientes de implementación */}
                        <div>
                          <label className="block text-cyan-300 font-semibold mb-2">
                            Prioridad *
                          </label>
                          <select
                            name="priority"
                            value={ticketData.priority}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                          >
                            <option value="baja">Baja</option>
                            <option value="media">Media</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                          </select>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-cyan-300 font-semibold mb-2">
                              Fecha Programada
                            </label>
                            <input
                              type="date"
                              name="scheduledDate"
                              value={ticketData.scheduledDate}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-cyan-300 font-semibold mb-2">
                              Hora
                            </label>
                            <select
                              name="hora"
                              value={ticketData.hora}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                            >
                              <option value="no-aplica">No aplica</option>
                              <option value="06:00">06:00</option>
                              <option value="06:30">06:30</option>
                              <option value="07:00">07:00</option>
                              <option value="07:30">07:30</option>
                              <option value="08:00">08:00</option>
                              <option value="08:30">08:30</option>
                              <option value="09:00">09:00</option>
                              <option value="09:30">09:30</option>
                              <option value="10:00">10:00</option>
                              <option value="10:30">10:30</option>
                              <option value="11:00">11:00</option>
                              <option value="11:30">11:30</option>
                              <option value="12:00">12:00</option>
                              <option value="12:30">12:30</option>
                              <option value="13:00">13:00</option>
                              <option value="13:30">13:30</option>
                              <option value="14:00">14:00</option>
                              <option value="14:30">14:30</option>
                              <option value="15:00">15:00</option>
                              <option value="15:30">15:30</option>
                              <option value="16:00">16:00</option>
                              <option value="16:30">16:30</option>
                              <option value="17:00">17:00</option>
                              <option value="17:30">17:30</option>
                              <option value="18:00">18:00</option>
                              <option value="18:30">18:30</option>
                              <option value="19:00">19:00</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Visit Type */}
                      <div>
                        <label className="block text-cyan-300 font-semibold mb-2">
                          Tipo de visita *
                        </label>
                        <select
                          name="problemDescription"
                          value={ticketData.problemDescription}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                        >
                          <option value="">Seleccionar tipo de visita</option>
                          <option value="1era Visita comercial">
                            1era Visita comercial
                          </option>
                          <option value="Diagnostico">Diagnostico</option>
                          <option value="Mantenimiento">Mantenimiento</option>
                        </select>
                      </div>

                      {/* Tipo de Mantenimiento */}
                      <div>
                        <label className="block text-cyan-300 font-semibold mb-2">
                          Tipo de Mantenimiento
                        </label>
                        <select
                          name="tipoMantenimiento"
                          value={ticketData.tipoMantenimiento}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                        >
                          <option value="">
                            Seleccionar tipo de mantenimiento
                          </option>
                          <option value="2,000 Hrs - Filtro Aire + Filtro Aceite">
                            2,000 Hrs - Filtro Aire + Filtro Aceite
                          </option>
                          <option value="4,000 hrs - Filtro Aire + Filtro Aceite + Separador Aceite">
                            4,000 hrs - Filtro Aire + Filtro Aceite + Separador
                            Aceite
                          </option>
                          <option value="6,000 Hrs - Filtro Aire + Filtro Aceite">
                            6,000 Hrs - Filtro Aire + Filtro Aceite
                          </option>
                          <option value="8,000 Hrs - Filtro Aire + Filtro Aceite + Separador Aceite + Aceite">
                            8,000 Hrs - Filtro Aire + Filtro Aceite + Separador
                            Aceite + Aceite
                          </option>
                        </select>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-4">
                        <button
                          type="submit"
                          className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all font-bold text-lg shadow-xl hover:shadow-emerald-500/50 border-2 border-emerald-400/50"
                        >
                          Crear Ticket
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompressor(null);
                            setIsClienteEventual(false);
                            setSearchQuery("");
                            setShowResults(false);
                          }}
                          className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all font-bold text-lg shadow-xl hover:shadow-red-500/50 border-2 border-red-400/50"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <p className="text-blue-300 text-sm">
                          ℹ️ <strong>Info:</strong> El ticket se creará con
                          estado &quot;No Iniciado&quot; y podrá ser asignado a
                          un técnico posteriormente.
                        </p>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Collapsible Tickets List - At the bottom */}
              <div className="relative mt-8">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 rounded-3xl opacity-30 blur-xl"></div>
                <div className="relative bg-gradient-to-br from-slate-800/95 via-blue-900/95 to-slate-800/95 rounded-3xl shadow-2xl border border-cyan-500/30 overflow-hidden">
                  {/* Collapsible Header */}
                  <button
                    onClick={() => setShowTicketsList(!showTicketsList)}
                    className="w-full p-6 flex justify-between items-center hover:bg-cyan-500/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-8 h-8 text-cyan-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <h2 className="text-3xl font-bold text-cyan-300">
                        Tickets Existentes
                      </h2>
                      {ordenesServicio.length > 0 && (
                        <span className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-full font-semibold text-sm">
                          {ordenesServicio.length} ticket(s)
                        </span>
                      )}
                    </div>
                    <svg
                      className={`w-6 h-6 text-cyan-300 transition-transform ${
                        showTicketsList ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Collapsible Content */}
                  {showTicketsList && (
                    <div className="p-8 pt-0">
                      {loadingOrdenes ? (
                        <div className="text-center py-16">
                          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto"></div>
                          <p className="text-cyan-300/60 mt-4">
                            Cargando tickets...
                          </p>
                        </div>
                      ) : ordenesServicio.length === 0 ? (
                        <div className="text-center py-16 text-cyan-300/60">
                          <svg
                            className="w-24 h-24 mx-auto mb-4 opacity-50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <p className="text-xl">No hay tickets registrados</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {groupOrdensByDate().map((group) => (
                            <div key={group.title}>
                              <h3 className="text-xl font-bold text-cyan-400 mb-3 flex items-center gap-2">
                                {group.title}
                                <span className="text-sm font-normal text-cyan-300/60">
                                  ({group.orders.length})
                                </span>
                              </h3>
                              <div className="space-y-3">
                                {group.orders.map((orden) => (
                                  <div
                                    key={orden.folio}
                                    className="p-4 bg-blue-800/40 rounded-xl border-2 border-cyan-500/30 hover:border-cyan-400/60 transition-all"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                          <span className="px-3 py-1 bg-purple-500/30 text-purple-200 rounded-full text-sm font-mono font-bold">
                                            {orden.folio}
                                          </span>
                                          <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                              orden.estado === "no_iniciado"
                                                ? "bg-gray-500/30 text-gray-200"
                                                : orden.estado === "en_progreso"
                                                  ? "bg-blue-500/30 text-blue-200"
                                                  : "bg-green-500/30 text-green-200"
                                            }`}
                                          >
                                            {orden.estado === "no_iniciado"
                                              ? "No Iniciado"
                                              : orden.estado === "en_progreso"
                                                ? "En Progreso"
                                                : "Completado"}
                                          </span>
                                          <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                              orden.prioridad === "baja"
                                                ? "bg-green-500/30 text-green-200"
                                                : orden.prioridad === "media"
                                                  ? "bg-yellow-500/30 text-yellow-200"
                                                  : orden.prioridad === "alta"
                                                    ? "bg-orange-500/30 text-orange-200"
                                                    : "bg-red-500/30 text-red-200"
                                            }`}
                                          >
                                            {orden.prioridad === "baja"
                                              ? "🟢 Baja"
                                              : orden.prioridad === "media"
                                                ? "🟡 Media"
                                                : orden.prioridad === "alta"
                                                  ? "🔴 Alta"
                                                  : "🚨 Urgente"}
                                          </span>
                                        </div>
                                        <p className="text-cyan-100 font-semibold mb-1">
                                          {orden.nombre_cliente} -{" "}
                                          {orden.alias_compresor}
                                        </p>
                                        <p className="text-cyan-300/70 text-sm">
                                          S/N: {orden.numero_serie}
                                        </p>
                                        <div className="flex gap-4 mt-2 text-sm">
                                          <div>
                                            <span className="text-cyan-400/80">
                                              Fecha:
                                            </span>{" "}
                                            <span className="text-cyan-100">
                                              {formatDate(
                                                orden.fecha_programada,
                                              )}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-cyan-400/80">
                                              Hora:
                                            </span>{" "}
                                            <span className="text-cyan-100">
                                              {formatTime(
                                                orden.hora_programada,
                                              )}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-cyan-400/80">
                                              Tipo:
                                            </span>{" "}
                                            <span className="text-cyan-100">
                                              {orden.tipo_visita}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 ml-4">
                                        <button
                                          onClick={() =>
                                            handleEditTicket(orden)
                                          }
                                          className="p-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-all"
                                          title="Editar"
                                        >
                                          <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDeleteTicket(orden.folio)
                                          }
                                          className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-all"
                                          title="Eliminar"
                                        >
                                          <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Edit Modal */}
          {showEditModal && editingTicket && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 rounded-3xl opacity-30 blur-xl"></div>
                <div className="relative bg-gradient-to-br from-slate-800/95 via-blue-900/95 to-slate-800/95 rounded-3xl shadow-2xl border border-cyan-500/30 p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-cyan-300">
                      Editar Ticket
                    </h2>
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingTicket(null);
                      }}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-all"
                    >
                      <svg
                        className="w-6 h-6 text-red-400"
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

                  <form onSubmit={handleUpdateTicket} className="space-y-6">
                    <div className="p-4 bg-purple-900/40 rounded-xl border-2 border-purple-500/50 mb-4">
                      <p className="text-lg font-bold text-purple-200">
                        Folio: {editingTicket.folio}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-cyan-300 font-semibold mb-2">
                          Cliente *
                        </label>
                        <input
                          type="text"
                          value={editingTicket.nombre_cliente}
                          onChange={(e) =>
                            setEditingTicket({
                              ...editingTicket,
                              nombre_cliente: e.target.value,
                            })
                          }
                          required
                          className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-cyan-300 font-semibold mb-2">
                          Alias Compresor *
                        </label>
                        <input
                          type="text"
                          value={editingTicket.alias_compresor}
                          onChange={(e) =>
                            setEditingTicket({
                              ...editingTicket,
                              alias_compresor: e.target.value,
                            })
                          }
                          required
                          className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-cyan-300 font-semibold mb-2">
                          Número de Serie *
                        </label>
                        <input
                          type="text"
                          value={editingTicket.numero_serie}
                          onChange={(e) =>
                            setEditingTicket({
                              ...editingTicket,
                              numero_serie: e.target.value,
                            })
                          }
                          required
                          className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-cyan-300 font-semibold mb-2">
                          Tipo de Visita *
                        </label>
                        <select
                          value={editingTicket.tipo_visita}
                          onChange={(e) =>
                            setEditingTicket({
                              ...editingTicket,
                              tipo_visita: e.target.value,
                            })
                          }
                          required
                          className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="1era Visita comercial">
                            1era Visita comercial
                          </option>
                          <option value="Diagnostico">Diagnóstico</option>
                          <option value="Mantenimiento">Mantenimiento</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-cyan-300 font-semibold mb-2">
                          Prioridad
                        </label>
                        <select
                          value={editingTicket.prioridad}
                          onChange={(e) =>
                            setEditingTicket({
                              ...editingTicket,
                              prioridad: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                        >
                          <option value="baja">🟢 Baja</option>
                          <option value="media">🟡 Media</option>
                          <option value="alta">🔴 Alta</option>
                          <option value="urgente">🚨 Urgente</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-cyan-300 font-semibold mb-2">
                          Fecha Programada
                        </label>
                        <input
                          type="date"
                          value={editingTicket.fecha_programada}
                          onChange={(e) =>
                            setEditingTicket({
                              ...editingTicket,
                              fecha_programada: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-cyan-300 font-semibold mb-2">
                          Hora Programada
                        </label>
                        <input
                          type="time"
                          value={editingTicket.hora_programada}
                          onChange={(e) =>
                            setEditingTicket({
                              ...editingTicket,
                              hora_programada: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="submit"
                        className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all font-bold text-lg shadow-xl hover:shadow-emerald-500/50 border-2 border-emerald-400/50"
                      >
                        💾 Guardar Cambios
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingTicket(null);
                        }}
                        className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all font-bold text-lg shadow-xl"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TypeReportes;
