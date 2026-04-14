"use client";

import { parseLocalDate, todayString } from "@/lib/dateUtils";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { URL_API } from "@/lib/global";
import { useDialog } from "@/hooks/useDialog";

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
  tipo_mantenimiento: string;
  descripcion_proyecto: string;
  prioridad: string;
  fecha_programada: string;
  hora_programada: string;
  estado: string;
  fecha_creacion: string;
  reporte_url: string;
  tipo_equipo: string;
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

interface ClientOption {
  numero_cliente: string | number;
  nombre_cliente: string;
  RFC: string;
  direccion: string;
  champion: string;
  id_cliente?: number;
}

interface SecadoraSearchResult {
  id: number;
  tipo: string;
  alias: string | null;
  numero_serie: string | null;
  marca: string | null;
  anio: number | null;
  numero_cliente: number | null;
  nombre_cliente: string | null;
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
  descripcionProyecto: string;
  priority: string;
  scheduledDate: string;
  hora: string;
  technician: string;
}

// Helper function to format date to DD/MM/YYYY
const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = parseLocalDate(dateString);
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
  const { showSuccess, showError } = useDialog();
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
    descripcionProyecto: "",
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

  // Equipment type toggle (compresor vs secadora)
  const [tipoEquipo, setTipoEquipo] = useState<"compresor" | "secadora">(
    "compresor",
  );

  // Dryer search
  const [dryerSearch, setDryerSearch] = useState("");
  const [dryerSearchResults, setDryerSearchResults] = useState<
    SecadoraSearchResult[]
  >([]);
  const [showDryerResults, setShowDryerResults] = useState(false);
  const [selectedDryer, setSelectedDryer] =
    useState<SecadoraSearchResult | null>(null);
  const [isNewDryer, setIsNewDryer] = useState(false);
  // Client picker for new dryer registration
  const [allClients, setAllClients] = useState<ClientOption[]>([]);
  const [newDryerClientSearch, setNewDryerClientSearch] = useState("");
  const [showNewDryerClientDropdown, setShowNewDryerClientDropdown] =
    useState(false);
  const [selectedNewDryerClient, setSelectedNewDryerClient] =
    useState<ClientOption | null>(null);

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
        // Filter out completed/terminado orders
        const activeOrders = data.data.filter(
          (orden: OrdenServicio) => orden.estado !== "terminado",
        );
        setOrdenesServicio(activeOrders);
      } else {
        setOrdenesServicio([]);
      }
    } catch (error) {
      console.error("Error fetching ordenes de servicio:", error);
      showError("Error", "No se pudieron cargar las órdenes de servicio");
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
        // Filter results to also include matches by client name
        const filteredResults = data.data.filter(
          (result: CompressorSearchResult) => {
            const lowerQuery = query.toLowerCase();
            return (
              result.nombre_cliente?.toLowerCase().includes(lowerQuery) ||
              result.alias?.toLowerCase().includes(lowerQuery) ||
              result.numero_serie?.toLowerCase().includes(lowerQuery) ||
              result.numero_cliente?.toString().includes(query)
            );
          },
        );

        setSearchResults(filteredResults);
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
    const last4Digits = (serialNumber ?? "").slice(-4).padStart(4, "0");
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${clientId}-${last4Digits}-${year}${month}${day}-${hours}${minutes}`;
  };

  // Generate folio for dryer: SEC-{clientId}-{last4serial}-{YYYYMMDD}-{HHMM}
  const generateDryerFolio = (
    numCliente: string | number,
    noSerie: string,
  ): string => {
    const clientId = String(numCliente || "00").padStart(2, "0");
    const last4 = (noSerie ?? "").slice(-4).padStart(4, "0");
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `SEC-${clientId}-${last4}-${year}${month}${day}-${hours}${minutes}`;
  };

  // Load clients for dryer orders
  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await fetch(`${URL_API}/clients/`);
        if (res.ok) {
          const response = await res.json();
          setAllClients(response.data || []);
        }
      } catch (error) {
        console.error("Error cargando clientes:", error);
      }
    };
    loadClients();
  }, []);

  // Search dryers from the secadoras table
  const handleDryerSearch = async (query: string) => {
    setDryerSearch(query);
    setSelectedDryer(null);
    setIsNewDryer(false);
    if (!query.trim()) {
      setDryerSearchResults([]);
      setShowDryerResults(false);
      return;
    }
    try {
      const res = await fetch(
        `${URL_API}/secadoras/search/${encodeURIComponent(query)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setDryerSearchResults(data.data || []);
        setShowDryerResults(true);
      }
    } catch (err) {
      console.error("Error buscando secadoras:", err);
    }
  };

  // Select an existing dryer — auto-fill the form
  const handleSelectDryer = (dryer: SecadoraSearchResult) => {
    setSelectedDryer(dryer);
    setIsNewDryer(false);
    setShowDryerResults(false);
    setDryerSearch(dryer.alias || dryer.numero_serie || "");
    const numCliente = String(dryer.numero_cliente || "");
    const serial = dryer.numero_serie || "";
    setTicketData((prev) => ({
      ...prev,
      clientName: dryer.nombre_cliente || "",
      numeroCliente: numCliente,
      alias: dryer.alias || "",
      serialNumber: serial,
      tipo: dryer.tipo || "",
      marca: dryer.marca || "",
      anio: dryer.anio ? String(dryer.anio) : "",
      folio: serial.length >= 4 ? generateDryerFolio(numCliente, serial) : "",
    }));
  };

  // Register as a new dryer (not in DB yet)
  const handleRegisterNewDryer = () => {
    setIsNewDryer(true);
    setSelectedDryer(null);
    setShowDryerResults(false);
  };

  // Filter clients for new-dryer client picker
  const filteredNewDryerClients = allClients.filter((c) => {
    if (!newDryerClientSearch.trim()) return true;
    const q = newDryerClientSearch.toLowerCase();
    return (
      String(c.numero_cliente).toLowerCase().includes(q) ||
      (c.nombre_cliente || "").toLowerCase().includes(q)
    );
  });

  // Select client when registering a new dryer
  const handleSelectNewDryerClient = (client: ClientOption) => {
    setSelectedNewDryerClient(client);
    setShowNewDryerClientDropdown(false);
    setNewDryerClientSearch("");
    const numCliente = String(client.numero_cliente);
    setTicketData((prev) => ({
      ...prev,
      clientName: client.nombre_cliente || "",
      numeroCliente: numCliente,
      folio:
        prev.serialNumber.length >= 4
          ? generateDryerFolio(numCliente, prev.serialNumber)
          : "",
    }));
  };

  // Select compressor from search results
  const handleSelectCompressor = (compressor: CompressorSearchResult) => {
    setSelectedCompressor(compressor);
    setShowResults(false);
    setIsClienteEventual(false);
    const folio = generateFolio(compressor.id_cliente, compressor.numero_serie);
    setTicketData({
      folio: folio,
      clientName: compressor.nombre_cliente ?? "",
      numeroCliente: compressor.numero_cliente?.toString() ?? "",
      alias: compressor.alias ?? "",
      serialNumber: compressor.numero_serie ?? "",
      hp: compressor.hp?.toString() ?? "",
      tipo: compressor.tipo ?? "",
      marca: compressor.marca ?? "",
      anio: compressor.anio?.toString() ?? "",
      problemDescription: "",
      tipoMantenimiento: "",
      descripcionProyecto: "",
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
      descripcionProyecto: "",
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

      // Regenerate folio for dryer orders when serial number changes
      if (
        tipoEquipo === "secadora" &&
        name === "serialNumber" &&
        value.length >= 4
      ) {
        updated.folio = generateDryerFolio(updated.numeroCliente, value);
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

      // If it's a new dryer (not yet in DB), register it first
      if (tipoEquipo === "secadora" && isNewDryer && selectedNewDryerClient) {
        const newDryerPayload = {
          tipo: ticketData.tipo || "refrigeracion",
          alias: ticketData.alias || null,
          numero_serie: ticketData.serialNumber || null,
          marca: ticketData.marca || null,
          anio: ticketData.anio ? parseInt(ticketData.anio) : null,
          numero_cliente:
            parseInt(String(selectedNewDryerClient.numero_cliente)) || null,
        };
        try {
          const dryerRes = await fetch(`${URL_API}/secadoras/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newDryerPayload),
          });
          if (!dryerRes.ok) {
            const err = await dryerRes.json();
            throw new Error(err.detail || "Error al registrar la secadora");
          }
        } catch (err) {
          showError("Error", String(err instanceof Error ? err.message : err));
          return;
        }
      }

      // Prepare the data for the API
      const ordenData = {
        folio: ticketData.folio,
        id_cliente:
          tipoEquipo === "secadora"
            ? 0
            : isClienteEventual
              ? 0
              : selectedCompressor?.id_cliente || 0,
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
        descripcion_proyecto: ticketData.descripcionProyecto || null,
        prioridad: ticketData.priority,
        fecha_programada: ticketData.scheduledDate || todayString(),
        hora_programada:
          ticketData.hora !== "no-aplica" ? ticketData.hora : "00:00:00",
        estado: "no_iniciado",
        fecha_creacion: new Date().toISOString(),
        reporte_url: "",
        tipo_equipo: tipoEquipo,
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
        showSuccess("Ticket Creado", `Folio: ${ticketData.folio}`);
        // Reset form
        setSelectedCompressor(null);
        setSelectedDryer(null);
        setIsNewDryer(false);
        setDryerSearch("");
        setDryerSearchResults([]);
        setSelectedNewDryerClient(null);
        setNewDryerClientSearch("");
        setIsClienteEventual(false);
        setSearchQuery("");
        setShowResults(false);
        setTipoEquipo("compresor");
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
          descripcionProyecto: "",
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

        showError("Error al crear ticket", errorMessage);
      }
    } catch (error) {
      console.error("Error submitting ticket:", error);
      showError(
        "Error",
        "No se pudo enviar el ticket. Por favor, intente nuevamente.",
      );
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
          body: JSON.stringify({
            ...editingTicket,
            tipo_equipo: editingTicket.tipo_equipo,
          }),
        },
      );

      const result = await response.json();

      if (response.ok) {
        showSuccess(
          "Ticket Actualizado",
          "Los cambios se guardaron correctamente",
        );
        setShowEditModal(false);
        setEditingTicket(null);
        fetchAllOrdenes();
      } else {
        const detail = result.detail;
        const errorMsg = Array.isArray(detail)
          ? detail.map((e: { msg: string }) => e.msg).join(", ")
          : detail || result.message || result.error || "Error desconocido";
        showError("Error al actualizar ticket", errorMsg);
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      showError(
        "Error",
        "No se pudo actualizar el ticket. Por favor, intente nuevamente.",
      );
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
        showSuccess(
          "Ticket Eliminado",
          "El ticket fue eliminado correctamente",
        );
        fetchAllOrdenes();
      } else {
        showError(
          "Error al eliminar ticket",
          result.detail ||
            result.message ||
            result.error ||
            "Error desconocido",
        );
      }
    } catch (error) {
      console.error("Error deleting ticket:", error);
      showError(
        "Error",
        "No se pudo eliminar el ticket. Por favor, intente nuevamente.",
      );
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
        const params = new URLSearchParams({
          folio: orden.folio,
        });
        const basePath =
          orden.tipo_equipo === "secadora"
            ? `/features/compressor-maintenance/technician/reports/create-dryer`
            : `/features/compressor-maintenance/technician/reports/create`;
        router.push(`${basePath}?${params.toString()}`);
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

        showError("Error al actualizar estado", errorMessage);
      }
    } catch (error) {
      console.error("Error updating orden estado:", error);
      showError(
        "Error",
        "No se pudo actualizar el estado. Por favor, intente nuevamente.",
      );
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
    <div className="min-h-screen p-8 bg-white">
      {/* Loading/Authorization Screen */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto mb-4"></div>
            <p className="text-blue-800 text-xl">Verificando acceso...</p>
          </div>
        </div>
      )}

      {/* Unauthorized Screen */}
      {!isLoading && !isAuthorized && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-8V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-3"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-blue-900 mb-2">
              Acceso Denegado
            </h1>
            <p className="text-blue-800 mb-6">
              No tienes permiso para acceder a esta página
            </p>
            <button
              onClick={() => router.push("/home")}
              className="px-6 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors font-medium text-lg"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Only show if authorized and not loading */}
      {!isLoading && isAuthorized && (
        <div className="max-w-7xl mx-auto">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 text-blue-800 hover:text-blue-900 transition-colors mb-6"
            title="Atrás"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-medium">Atrás</span>
          </button>

          {/* VISTA PARA ROL 2 (VAST) - Ver Órdenes de Servicio */}
          {rol === 2 && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-semibold text-blue-900 mb-2">
                  Órdenes de Servicio
                </h1>
                <p className="text-blue-700 text-lg">
                  Selecciona una orden para crear su reporte
                </p>
              </div>

              {/* Ordenes List Section */}
              <div>
                <div className="bg-white rounded-lg border border-blue-200 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-blue-900">
                      Órdenes Pendientes
                    </h2>
                    {ordenesServicio.length > 0 && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-base font-medium">
                        {ordenesServicio.length}{" "}
                        {ordenesServicio.length === 1 ? "orden" : "órdenes"}
                      </span>
                    )}
                  </div>

                  {loadingOrdenes ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-800 mx-auto mb-3"></div>
                      <p className="text-blue-700 text-base">
                        Cargando órdenes de servicio...
                      </p>
                    </div>
                  ) : ordenesServicio.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-14 h-14 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-7 h-7 text-blue-600"
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
                      </div>
                      <p className="text-blue-900 font-medium text-lg">
                        No hay órdenes de servicio disponibles
                      </p>
                      <p className="text-base text-blue-600 mt-1">
                        Las nuevas órdenes aparecerán aquí
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {groupOrdensByDate().map((group) => (
                        <div key={group.title} className="space-y-3">
                          {/* Header de fecha */}
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-semibold text-blue-800 uppercase tracking-wide">
                              {group.title}
                            </h3>
                            <div className="flex-1 h-px bg-blue-200"></div>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                              {group.orders.length}
                            </span>
                          </div>

                          {/* Grid de órdenes */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.orders.map((orden) => (
                              <div
                                key={orden.folio}
                                className="p-5 rounded-lg border border-blue-200 bg-white hover:border-blue-800 hover:shadow-md transition-all"
                              >
                                <div className="mb-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <span
                                      className={`px-2 py-1 text-sm font-medium rounded ${
                                        orden.estado === "no_iniciado"
                                          ? "bg-blue-50 text-blue-700"
                                          : orden.estado === "en_proceso" ||
                                              orden.estado === "en_progreso"
                                            ? "bg-blue-100 text-blue-800"
                                            : orden.estado === "por_firmar"
                                              ? "bg-yellow-100 text-yellow-800"
                                              : orden.estado === "completado"
                                                ? "bg-green-100 text-green-700"
                                                : orden.estado === "terminado"
                                                  ? "bg-gray-100 text-gray-600"
                                                  : "bg-blue-50 text-blue-700"
                                      }`}
                                    >
                                      {orden.estado.replace(/_/g, " ")}
                                    </span>
                                    <span
                                      className={`px-2 py-1 text-sm font-medium rounded ${
                                        orden.prioridad === "urgente"
                                          ? "bg-red-100 text-red-700"
                                          : orden.prioridad === "alta"
                                            ? "bg-orange-100 text-orange-700"
                                            : orden.prioridad === "media"
                                              ? "bg-yellow-100 text-yellow-700"
                                              : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {orden.prioridad}
                                    </span>
                                  </div>
                                  <p className="font-semibold text-blue-900 text-lg truncate mb-3">
                                    {orden.nombre_cliente}
                                  </p>
                                  <div className="space-y-1.5 text-base">
                                    <p className="text-blue-800">
                                      <span className="text-blue-600">
                                        Folio:
                                      </span>{" "}
                                      {orden.folio}
                                    </p>
                                    <p className="text-blue-800">
                                      <span className="text-blue-600">
                                        Equipo:
                                      </span>{" "}
                                      <span
                                        className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-1 ${
                                          orden.tipo_equipo === "secadora"
                                            ? "bg-purple-100 text-purple-700"
                                            : "bg-blue-100 text-blue-700"
                                        }`}
                                      >
                                        {orden.tipo_equipo === "secadora"
                                          ? "Secadora"
                                          : "Compresor"}
                                      </span>
                                      {orden.alias_compresor}
                                    </p>
                                    <p className="text-blue-800">
                                      <span className="text-blue-600">
                                        Serie:
                                      </span>{" "}
                                      {orden.numero_serie}
                                    </p>
                                    <p className="text-blue-800">
                                      <span className="text-blue-600">
                                        Marca:
                                      </span>{" "}
                                      {orden.marca}
                                    </p>
                                    <p className="text-blue-800">
                                      <span className="text-blue-600">
                                        Modelo:
                                      </span>{" "}
                                      {orden.tipo}
                                    </p>
                                    <p className="text-blue-800">
                                      <span className="text-blue-600">
                                        Tipo Visita:
                                      </span>{" "}
                                      {orden.tipo_visita}
                                    </p>
                                    <p className="text-blue-800">
                                      <span className="text-blue-600">
                                        Mantenimiento:
                                      </span>{" "}
                                      {orden.tipo_mantenimiento ||
                                        "No especificado"}
                                    </p>
                                    <p className="text-blue-800 pt-1">
                                      <span className="text-blue-600">
                                        Programado:
                                      </span>{" "}
                                      {formatDate(orden.fecha_programada)}{" "}
                                      {formatTime(orden.hora_programada)}
                                    </p>
                                  </div>
                                </div>
                                {orden.estado === "por_firmar" ? (
                                  <button
                                    onClick={() => {
                                      const viewPath =
                                        orden.tipo_equipo === "secadora"
                                          ? `/features/compressor-maintenance/reports/view-dryer?folio=${orden.folio}`
                                          : `/features/compressor-maintenance/reports/view?folio=${orden.folio}`;
                                      router.push(viewPath);
                                    }}
                                    className="w-full px-4 py-3 bg-yellow-600 text-white text-base font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                                    title="Firmar Reporte"
                                  >
                                    Firmar Reporte
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleStartReport(orden)}
                                    className="w-full px-4 py-3 bg-blue-800 text-white text-base font-medium rounded-lg hover:bg-blue-900 transition-colors"
                                    title="Crear Reporte"
                                  >
                                    Empezar Reporte
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de Navegación */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                {/* Tabla de Mantenimientos */}
                <button
                  className="w-full p-5 bg-white border border-blue-200 rounded-lg hover:border-blue-800 hover:shadow-md transition-all text-left"
                  onClick={() =>
                    router.push("/features/compressor-maintenance/maintenance")
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-blue-800"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900 text-lg">
                        Tabla de Mantenimientos
                      </h3>
                      <p className="text-blue-600 text-base">
                        Gestiona mantenimientos activos
                      </p>
                    </div>
                  </div>
                </button>

                {/* Reportes */}
                <button
                  className="w-full p-5 bg-white border border-blue-200 rounded-lg hover:border-blue-800 hover:shadow-md transition-all text-left"
                  onClick={() =>
                    router.push("/features/compressor-maintenance/reports/")
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-blue-800"
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
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900 text-lg">
                        Reportes
                      </h3>
                      <p className="text-blue-600 text-base">
                        Ver historial de reportes
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* VISTA PARA ROL 0 y 1 - Crear Ticket de Servicio */}
          {(rol === 0 || rol === 1) && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-semibold text-blue-900 mb-2">
                  Crear Ticket de Servicio
                </h1>
                <p className="text-blue-700 text-lg">
                  Registra una nueva solicitud de mantenimiento
                </p>
              </div>

              {/* Search Section */}
              <div className="mb-6">
                <div className="bg-white rounded-lg border border-blue-200 p-6">
                  {/* Equipment Type Toggle */}
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-semibold text-blue-900">
                      Tipo de Equipo
                    </h2>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTipoEquipo("compresor");
                          setSelectedDryer(null);
                          setIsNewDryer(false);
                          setDryerSearch("");
                          setDryerSearchResults([]);
                          setSelectedNewDryerClient(null);
                          setNewDryerClientSearch("");
                          setSelectedCompressor(null);
                          setIsClienteEventual(false);
                          setSearchQuery("");
                          setShowResults(false);
                          setTicketData((prev) => ({
                            ...prev,
                            folio: "",
                            clientName: "",
                            numeroCliente: "",
                            alias: "",
                            serialNumber: "",
                            hp: "",
                            tipo: "",
                            marca: "",
                            anio: "",
                          }));
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors text-base ${
                          tipoEquipo === "compresor"
                            ? "bg-blue-800 text-white"
                            : "bg-white text-blue-800 border border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        Compresor
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTipoEquipo("secadora");
                          setSelectedCompressor(null);
                          setIsClienteEventual(false);
                          setSearchQuery("");
                          setShowResults(false);
                          setSelectedDryer(null);
                          setIsNewDryer(false);
                          setDryerSearch("");
                          setDryerSearchResults([]);
                          setSelectedNewDryerClient(null);
                          setNewDryerClientSearch("");
                          setTicketData((prev) => ({
                            ...prev,
                            folio: "",
                            clientName: "",
                            numeroCliente: "",
                            alias: "",
                            serialNumber: "",
                            hp: "",
                            tipo: "",
                            marca: "",
                            anio: "",
                          }));
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors text-base ${
                          tipoEquipo === "secadora"
                            ? "bg-purple-700 text-white"
                            : "bg-white text-purple-700 border border-purple-300 hover:bg-purple-50"
                        }`}
                      >
                        Secadora
                      </button>
                    </div>
                  </div>

                  {/* Compressor Search (only when tipoEquipo === "compresor") */}
                  {tipoEquipo === "compresor" && (
                    <>
                      <h2 className="text-lg font-semibold text-blue-900 mb-3">
                        Buscar Compresor
                      </h2>
                      <div className="flex gap-3 mb-4">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Buscar por nombre de cliente, alias, número de serie o número de cliente..."
                            className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                          />
                        </div>
                        <button
                          onClick={handleClienteEventual}
                          className="px-5 py-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors font-medium border border-blue-300 text-base"
                        >
                          Cliente Eventual
                        </button>
                      </div>
                    </>
                  )}

                  {/* Dryer Search (only when tipoEquipo === "secadora") */}
                  {tipoEquipo === "secadora" && (
                    <>
                      <h2 className="text-lg font-semibold text-blue-900 mb-3">
                        Buscar Secadora
                      </h2>
                      <div className="relative mb-4">
                        <input
                          type="text"
                          value={dryerSearch}
                          onChange={(e) => handleDryerSearch(e.target.value)}
                          onFocus={() =>
                            dryerSearchResults.length > 0 &&
                            setShowDryerResults(true)
                          }
                          placeholder="Buscar por alias, número de serie o cliente..."
                          className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                        />
                        {showDryerResults && dryerSearchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-purple-200 rounded-lg shadow-lg">
                            {dryerSearchResults.map((dryer) => (
                              <button
                                key={dryer.id}
                                type="button"
                                onClick={() => handleSelectDryer(dryer)}
                                className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-purple-100 last:border-b-0"
                              >
                                <p className="font-medium text-purple-900">
                                  {dryer.alias ||
                                    dryer.numero_serie ||
                                    `Secadora #${dryer.id}`}
                                </p>
                                <p className="text-sm text-purple-600">
                                  {dryer.nombre_cliente} · Serie:{" "}
                                  {dryer.numero_serie || "—"} · {dryer.tipo}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                        {showDryerResults &&
                          dryerSearchResults.length === 0 &&
                          dryerSearch.trim() && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-purple-200 rounded-lg shadow-lg p-4 text-center">
                              <p className="text-gray-600 text-sm mb-3">
                                No se encontró ninguna secadora registrada
                              </p>
                              <button
                                type="button"
                                onClick={handleRegisterNewDryer}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                              >
                                + Registrar como nueva secadora
                              </button>
                            </div>
                          )}
                      </div>

                      {/* Selected existing dryer */}
                      {selectedDryer && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 mb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-purple-900 font-medium">
                                {selectedDryer.alias ||
                                  `Secadora #${selectedDryer.id}`}
                              </p>
                              <p className="text-purple-700 text-sm">
                                {selectedDryer.nombre_cliente} · Serie:{" "}
                                {selectedDryer.numero_serie || "—"} ·{" "}
                                {selectedDryer.tipo}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDryer(null);
                                setDryerSearch("");
                              }}
                              className="text-purple-400 hover:text-purple-700 text-lg leading-none"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}

                      {/* New dryer: client picker */}
                      {isNewDryer && (
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 mb-4">
                          <p className="text-purple-800 text-sm font-semibold mb-3">
                            Nueva secadora — selecciona el cliente y completa
                            los datos del equipo abajo
                          </p>
                          <div className="relative">
                            <input
                              type="text"
                              value={newDryerClientSearch}
                              onChange={(e) => {
                                setNewDryerClientSearch(e.target.value);
                                setShowNewDryerClientDropdown(true);
                              }}
                              onFocus={() =>
                                setShowNewDryerClientDropdown(true)
                              }
                              placeholder="Buscar cliente por nombre o número..."
                              className="w-full px-4 py-2 bg-white text-blue-900 border border-purple-300 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-colors text-sm"
                            />
                            {showNewDryerClientDropdown &&
                              filteredNewDryerClients.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-purple-200 rounded-lg shadow-lg">
                                  {filteredNewDryerClients
                                    .slice(0, 20)
                                    .map((client) => (
                                      <button
                                        key={String(client.numero_cliente)}
                                        type="button"
                                        onClick={() =>
                                          handleSelectNewDryerClient(client)
                                        }
                                        className="w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors border-b border-purple-100 last:border-b-0 text-sm"
                                      >
                                        <span className="font-medium text-purple-900">
                                          {client.nombre_cliente}
                                        </span>
                                        <span className="text-purple-600 ml-2">
                                          #{client.numero_cliente}
                                        </span>
                                      </button>
                                    ))}
                                </div>
                              )}
                          </div>
                          {selectedNewDryerClient && (
                            <p className="mt-2 text-purple-700 text-sm font-medium">
                              ✓ {selectedNewDryerClient.nombre_cliente} #
                              {selectedNewDryerClient.numero_cliente}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Search Results */}
                  {showResults && searchResults.length > 0 && (
                    <div className="mt-4 max-h-80 overflow-y-auto border border-blue-200 rounded-lg">
                      <p className="text-blue-700 text-base p-3 border-b border-blue-200 bg-blue-50">
                        {searchResults.length} resultado(s) encontrado(s)
                      </p>
                      <div className="divide-y divide-blue-100">
                        {searchResults.map((result, index) => (
                          <button
                            key={index}
                            onClick={() => handleSelectCompressor(result)}
                            className="w-full text-left p-4 hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-blue-900 text-base">
                                  {result.nombre_cliente}
                                </p>
                                <p className="text-blue-700 text-base mt-0.5">
                                  {result.alias} - Serie: {result.numero_serie}
                                </p>
                                <p className="text-blue-600 text-sm mt-0.5">
                                  {result.marca} | {result.hp} HP |{" "}
                                  {result.tipo}
                                </p>
                              </div>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded font-medium">
                                #{result.numero_cliente}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {showResults && searchResults.length === 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                      <p className="text-blue-700 text-base">
                        No se encontraron resultados
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Form */}
              {(selectedCompressor ||
                isClienteEventual ||
                selectedDryer ||
                isNewDryer) && (
                <div className="mb-6">
                  <div className="bg-white rounded-lg border border-blue-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-blue-900">
                        Datos del Ticket
                      </h2>
                      {isClienteEventual && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-base font-medium">
                          Cliente Eventual
                        </span>
                      )}
                    </div>

                    {/* Eventual Client Selection */}
                    {isClienteEventual && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-base font-semibold text-blue-900 mb-3">
                          Tipo de Cliente Eventual
                        </h3>
                        <div className="flex gap-3 mb-3">
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
                            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors text-base ${
                              isNewEventual
                                ? "bg-blue-800 text-white"
                                : "bg-white text-blue-800 border border-blue-300 hover:bg-blue-50"
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
                            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors text-base ${
                              !isNewEventual
                                ? "bg-blue-800 text-white"
                                : "bg-white text-blue-800 border border-blue-300 hover:bg-blue-50"
                            }`}
                          >
                            Cliente Existente
                          </button>
                        </div>

                        {!isNewEventual && (
                          <div>
                            <label className="block text-blue-800 text-base font-medium mb-1">
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
                              className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
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
                              <div className="mt-2 p-3 bg-white rounded-lg border border-blue-200">
                                <p className="text-blue-800 text-base">
                                  <span className="font-medium text-blue-900">
                                    Teléfono:
                                  </span>{" "}
                                  {eventualClientInfo.telefono || "N/A"}
                                </p>
                                <p className="text-blue-800 text-base">
                                  <span className="font-medium text-blue-900">
                                    Email:
                                  </span>{" "}
                                  {eventualClientInfo.email || "N/A"}
                                </p>
                                <p className="text-blue-800 text-base">
                                  <span className="font-medium text-blue-900">
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
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <label className="block">
                              <span className="text-blue-800 text-base font-medium mb-1 block">
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
                                className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 text-base"
                              />
                            </label>

                            <label className="block">
                              <span className="text-blue-800 text-base font-medium mb-1 block">
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
                                className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 text-base"
                              />
                            </label>

                            <label className="block col-span-2">
                              <span className="text-blue-800 text-base font-medium mb-1 block">
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
                                className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 text-base"
                              />
                            </label>

                            <label className="block col-span-2">
                              <span className="text-blue-800 text-base font-medium mb-1 block">
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
                                className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 text-base"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Display Folio */}
                    {ticketData.folio && (
                      <div className="mb-4 p-4 bg-blue-100 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-800 font-medium text-base">
                            FOLIO:
                          </span>
                          <span className="text-blue-900 font-mono text-xl font-semibold">
                            {ticketData.folio}
                          </span>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleSubmitTicket} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Cliente Info */}
                        <div>
                          <label className="block text-blue-800 text-base font-medium mb-1">
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
                            className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors disabled:bg-blue-50 disabled:cursor-not-allowed text-base"
                            placeholder="Nombre del cliente"
                          />
                        </div>

                        <div>
                          <label className="block text-blue-800 text-base font-medium mb-1">
                            Número de Cliente
                          </label>
                          <input
                            type="text"
                            name="numeroCliente"
                            value={ticketData.numeroCliente}
                            onChange={handleInputChange}
                            readOnly={!isClienteEventual}
                            className="w-full px-4 py-3 bg-blue-50 text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                            placeholder="Número de cliente"
                          />
                        </div>

                        {/* Equipment Info */}
                        <div>
                          <label className="block text-blue-800 text-base font-medium mb-1">
                            {tipoEquipo === "secadora"
                              ? "Nombre del Equipo *"
                              : "Alias del Compresor *"}
                          </label>
                          <input
                            type="text"
                            name="alias"
                            value={ticketData.alias}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                            placeholder={
                              tipoEquipo === "secadora"
                                ? "Nombre del equipo"
                                : "Alias"
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-blue-800 text-base font-medium mb-1">
                            Número de Serie *
                          </label>
                          <input
                            type="text"
                            name="serialNumber"
                            value={ticketData.serialNumber}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                            placeholder="Número de serie"
                          />
                        </div>

                        {tipoEquipo === "compresor" && (
                          <div>
                            <label className="block text-blue-800 text-base font-medium mb-1">
                              HP *
                            </label>
                            <input
                              type="text"
                              name="hp"
                              value={ticketData.hp}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                              placeholder="HP"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-blue-800 text-base font-medium mb-1">
                            {tipoEquipo === "secadora"
                              ? "Tipo de Secadora *"
                              : "Tipo *"}
                          </label>
                          {tipoEquipo === "secadora" ? (
                            <select
                              name="tipo"
                              value={ticketData.tipo}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                            >
                              <option value="">Seleccionar tipo</option>
                              <option value="refrigeracion">
                                Refrigeración
                              </option>
                              <option value="desecante">Desecante</option>
                            </select>
                          ) : (
                            <select
                              name="tipo"
                              value={ticketData.tipo}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                            >
                              <option value="">Seleccionar tipo</option>
                              <option value="tornillo">Tornillo</option>
                              <option value="piston">Piston</option>
                            </select>
                          )}
                        </div>

                        <div>
                          <label className="block text-blue-800 text-base font-medium mb-1">
                            Marca *
                          </label>
                          <input
                            type="text"
                            name="marca"
                            value={ticketData.marca}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                            placeholder="Marca"
                          />
                        </div>

                        <div>
                          <label className="block text-blue-800 text-base font-medium mb-1">
                            Año
                          </label>
                          <input
                            type="text"
                            name="anio"
                            value={ticketData.anio}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                            placeholder="Año"
                          />
                        </div>

                        {/* Ticket Details */}
                        <div>
                          <label className="block text-blue-800 text-base font-medium mb-1">
                            Prioridad *
                          </label>
                          <select
                            name="priority"
                            value={ticketData.priority}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                          >
                            <option value="baja">Baja</option>
                            <option value="media">Media</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                          </select>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-blue-800 text-base font-medium mb-1">
                              Fecha Programada
                            </label>
                            <input
                              type="date"
                              name="scheduledDate"
                              value={ticketData.scheduledDate}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                            />
                          </div>
                          <div>
                            <label className="block text-blue-800 text-base font-medium mb-1">
                              Hora
                            </label>
                            <select
                              name="hora"
                              value={ticketData.hora}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
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
                        <label className="block text-blue-800 text-base font-medium mb-1">
                          Tipo de visita *
                        </label>
                        <select
                          name="problemDescription"
                          value={ticketData.problemDescription}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
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
                        <label className="block text-blue-800 text-base font-medium mb-1">
                          Tipo de Mantenimiento
                        </label>
                        <select
                          name="tipoMantenimiento"
                          value={ticketData.tipoMantenimiento}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                        >
                          <option value="">
                            Seleccionar tipo de mantenimiento
                          </option>
                          <option value="700 horas - Mantenimiento E (Limpieza y Parametros)">
                            700 horas - Mantenimiento E (Limpieza y Parametros)
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
                          <option value="Mantenimiento Especial">
                            Mantenimiento Especial
                          </option>
                        </select>
                      </div>

                      {/* Descripción de Proyecto (solo para Mantenimiento Especial) */}
                      {ticketData.tipoMantenimiento ===
                        "Mantenimiento Especial" && (
                        <div>
                          <label className="block text-blue-800 text-base font-medium mb-1">
                            Descripción del Proyecto
                          </label>
                          <textarea
                            name="descripcionProyecto"
                            value={ticketData.descripcionProyecto}
                            onChange={handleInputChange}
                            placeholder="Describa el proyecto o trabajo especial a realizar..."
                            rows={4}
                            className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base resize-vertical"
                          />
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4">
                        <button
                          type="submit"
                          className="flex-1 px-5 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors font-medium text-base"
                        >
                          Crear Ticket
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompressor(null);
                            setSelectedDryer(null);
                            setIsNewDryer(false);
                            setDryerSearch("");
                            setDryerSearchResults([]);
                            setSelectedNewDryerClient(null);
                            setNewDryerClientSearch("");
                            setIsClienteEventual(false);
                            setSearchQuery("");
                            setShowResults(false);
                          }}
                          className="px-5 py-3 bg-white text-blue-800 rounded-lg hover:bg-blue-50 transition-colors font-medium border border-blue-300 text-base"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="mt-4 p-4 bg-blue-100 border border-blue-200 rounded-lg">
                        <p className="text-blue-800 text-base">
                          El ticket se creará con estado &quot;No Iniciado&quot;
                          y podrá ser asignado a un técnico posteriormente.
                        </p>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Collapsible Tickets List - At the bottom */}
              <div className="mt-6">
                <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                  {/* Collapsible Header */}
                  <button
                    onClick={() => setShowTicketsList(!showTicketsList)}
                    className="w-full p-5 flex justify-between items-center hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-6 h-6 text-blue-800"
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
                      <h2 className="text-xl font-semibold text-blue-900">
                        Tickets Existentes
                      </h2>
                      {ordenesServicio.length > 0 && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-base font-medium">
                          {ordenesServicio.length}
                        </span>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-blue-600 transition-transform ${
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
                    <div className="p-5 pt-0 border-t border-blue-200">
                      {loadingOrdenes ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-800 mx-auto"></div>
                          <p className="text-blue-700 mt-3 text-base">
                            Cargando tickets...
                          </p>
                        </div>
                      ) : ordenesServicio.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-14 h-14 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg
                              className="w-7 h-7 text-blue-600"
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
                          </div>
                          <p className="text-blue-900 font-medium text-lg">
                            No hay tickets registrados
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 mt-4">
                          {groupOrdensByDate().map((group) => (
                            <div key={group.title}>
                              <h3 className="text-base font-semibold text-blue-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                                {group.title}
                                <span className="text-sm font-normal text-blue-600">
                                  ({group.orders.length})
                                </span>
                              </h3>
                              <div className="space-y-3">
                                {group.orders.map((orden) => (
                                  <div
                                    key={orden.folio}
                                    className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-800 transition-colors"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono font-medium">
                                            {orden.folio}
                                          </span>
                                          <span
                                            className={`px-2 py-1 rounded text-sm font-medium ${
                                              orden.estado === "no_iniciado"
                                                ? "bg-blue-100 text-blue-700"
                                                : orden.estado === "en_progreso"
                                                  ? "bg-blue-200 text-blue-800"
                                                  : "bg-green-100 text-green-700"
                                            }`}
                                          >
                                            {orden.estado === "no_iniciado"
                                              ? "No Iniciado"
                                              : orden.estado === "en_progreso"
                                                ? "En Progreso"
                                                : "Completado"}
                                          </span>
                                          <span
                                            className={`px-2 py-1 rounded text-sm font-medium ${
                                              orden.prioridad === "baja"
                                                ? "bg-green-100 text-green-700"
                                                : orden.prioridad === "media"
                                                  ? "bg-yellow-100 text-yellow-700"
                                                  : orden.prioridad === "alta"
                                                    ? "bg-orange-100 text-orange-700"
                                                    : "bg-red-100 text-red-700"
                                            }`}
                                          >
                                            {orden.prioridad}
                                          </span>
                                          <span
                                            className={`px-2 py-1 rounded text-sm font-medium ${
                                              orden.tipo_equipo === "secadora"
                                                ? "bg-purple-100 text-purple-700"
                                                : "bg-blue-100 text-blue-700"
                                            }`}
                                          >
                                            {orden.tipo_equipo === "secadora"
                                              ? "Secadora"
                                              : "Compresor"}
                                          </span>
                                        </div>
                                        <p className="text-blue-900 font-medium text-base">
                                          {orden.nombre_cliente} -{" "}
                                          {orden.alias_compresor}
                                        </p>
                                        <p className="text-blue-700 text-sm mt-0.5">
                                          S/N: {orden.numero_serie}
                                        </p>
                                        <div className="flex gap-4 mt-2 text-sm text-blue-800">
                                          <span>
                                            <span className="text-blue-600">
                                              Fecha:
                                            </span>{" "}
                                            {formatDate(orden.fecha_programada)}
                                          </span>
                                          <span>
                                            <span className="text-blue-600">
                                              Hora:
                                            </span>{" "}
                                            {formatTime(orden.hora_programada)}
                                          </span>
                                          <span>
                                            <span className="text-blue-600">
                                              Tipo:
                                            </span>{" "}
                                            {orden.tipo_visita}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 ml-3">
                                        <button
                                          onClick={() =>
                                            handleEditTicket(orden)
                                          }
                                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
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
                                          className="p-2 text-blue-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
            <div className="fixed inset-0 bg-blue-900/30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-blue-200">
                <div className="flex justify-between items-center p-5 border-b border-blue-200">
                  <h2 className="text-xl font-semibold text-blue-900">
                    Editar Ticket
                  </h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTicket(null);
                    }}
                    className="p-1 text-blue-600 hover:text-blue-800 rounded transition-colors"
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

                <form onSubmit={handleUpdateTicket} className="p-5 space-y-4">
                  <div className="p-4 bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-3">
                    <p className="text-base font-medium text-blue-800">
                      Folio:{" "}
                      <span className="font-mono text-blue-900">
                        {editingTicket.folio}
                      </span>
                    </p>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        editingTicket.tipo_equipo === "secadora"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-200 text-blue-700"
                      }`}
                    >
                      {editingTicket.tipo_equipo === "secadora"
                        ? "Secadora"
                        : "Compresor"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-blue-800 text-base font-medium mb-1">
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
                        className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-blue-800 text-base font-medium mb-1">
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
                        className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-blue-800 text-base font-medium mb-1">
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
                        className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-blue-800 text-base font-medium mb-1">
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
                        className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
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
                      <label className="block text-blue-800 text-base font-medium mb-1">
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
                        className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                      >
                        <option value="baja">Baja</option>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-blue-800 text-base font-medium mb-1">
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
                        className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-blue-800 text-base font-medium mb-1">
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
                        className="w-full px-4 py-3 bg-white text-blue-900 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-colors text-base"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-blue-200">
                    <button
                      type="submit"
                      className="flex-1 px-5 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors font-medium text-base"
                    >
                      Guardar Cambios
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingTicket(null);
                      }}
                      className="px-5 py-3 bg-white text-blue-800 rounded-lg hover:bg-blue-50 transition-colors font-medium border border-blue-300 text-base"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TypeReportes;
