"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import CompressorSearch from "@/components/CompressorSearch";
import { URL_API } from "@/lib/global";

interface DraftReport {
  id: string;
  folio: string;
  clientName: string;
  serialNumber: string;
  lastModified: string;
  reportType: string;
}

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
  priority: string;
  scheduledDate: string;
  hora: string;
  technician: string;
}

const TypeReportes = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftReports, setDraftReports] = useState<DraftReport[]>([]);
  const [rol, setRol] = useState<number | null>(null);
  const [isClienteEventual, setIsClienteEventual] = useState(false);
  const [selectedCompressor, setSelectedCompressor] =
    useState<CompressorSearchResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<CompressorSearchResult[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [ordenServicio, setOrdenServicio] = useState<OrdenServicio | null>(
    null
  );
  const [loadingOrden, setLoadingOrden] = useState(false);
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
    priority: "media",
    scheduledDate: "",
    hora: "no-aplica",
    technician: "",
  });

  // Load user role on mount
  useEffect(() => {
    const userData = sessionStorage.getItem("userData");
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        setRol(parsedData.rol);
      } catch (error) {
        console.error("Error parsing userData:", error);
      }
    }
  }, []);

  // Load orden de servicio from URL for VAST view (rol 2)
  useEffect(() => {
    const folio = searchParams.get("folio");
    if (folio && rol === 2) {
      fetchOrdenServicio(folio);
    } else if (rol === 2 && !folio) {
      // Fetch all ordenes if no folio specified
      fetchAllOrdenes();
    }
  }, [searchParams, rol]);

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

  // Fetch orden de servicio by folio
  const fetchOrdenServicio = async (folio: string) => {
    setLoadingOrden(true);
    try {
      const response = await fetch(`${URL_API}/ordenes/`);
      const data = await response.json();

      if (data.data) {
        const orden = data.data.find((o: OrdenServicio) => o.folio === folio);
        if (orden) {
          setOrdenServicio(orden);
        } else {
          alert(
            "No se encontró la orden de servicio con el folio especificado"
          );
        }
      }
    } catch (error) {
      console.error("Error fetching orden de servicio:", error);
      alert("Error al cargar la orden de servicio");
    } finally {
      setLoadingOrden(false);
    }
  };

  // Load draft reports on mount
  useEffect(() => {
    const loadDraftReports = () => {
      const drafts = localStorage.getItem("draftReports");
      if (drafts) {
        setDraftReports(JSON.parse(drafts));
      }
    };
    loadDraftReports();
  }, []);

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
        `${URL_API}/compresores/compresor-cliente/${encodeURIComponent(query)}`
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
    serialNumber: string
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
      priority: "media",
      scheduledDate: "",
      hora: "no-aplica",
      technician: "",
    });
  };

  // Toggle cliente eventual
  const handleClienteEventual = () => {
    setIsClienteEventual(true);
    setSelectedCompressor(null);
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
      priority: "media",
      scheduledDate: "",
      hora: "no-aplica",
      technician: "",
    });
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
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
      // Prepare the data for the API
      const ordenData = {
        folio: ticketData.folio,
        id_cliente: isClienteEventual ? 0 : selectedCompressor?.id_cliente || 0,
        id_cliente_eventual: isClienteEventual ? 1 : 0,
        nombre_cliente: ticketData.clientName,
        numero_cliente: parseInt(ticketData.numeroCliente) || 0,
        alias_compresor: ticketData.alias,
        numero_serie: ticketData.serialNumber,
        hp: parseInt(ticketData.hp) || 0,
        tipo: ticketData.tipo,
        marca: ticketData.marca,
        anio: parseInt(ticketData.anio) || 0,
        tipo_visita: ticketData.problemDescription,
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
          priority: "media",
          scheduledDate: "",
          hora: "no-aplica",
          technician: "",
        });
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

  const deleteDraft = (draftId: string) => {
    const updatedDrafts = draftReports.filter((d) => d.id !== draftId);
    setDraftReports(updatedDrafts);
    localStorage.setItem("draftReports", JSON.stringify(updatedDrafts));
  };

  const loadDraft = (draft: DraftReport) => {
    // Navigate to create page with draft data
    router.push(
      `/features/compressor-maintenance/technician/reports/create?draftId=${draft.id}`
    );
  };

  // Función para ir atrás
  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
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
          <span className="text-lg font-medium">Atrás</span>
        </button>

        {/* VISTA PARA ROL 2 (VAST) - Ver/Editar Orden de Servicio */}
        {rol === 2 && (
          <>
            {/* VASTview - Mostrar orden de servicio desde URL */}
            {ordenServicio ? (
              <>
                <div className="mt-24 mb-12 text-center">
                  <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 mb-3">
                    Orden de Servicio
                  </h1>
                  <p className="text-cyan-200/80 text-xl">
                    Folio: {ordenServicio.folio}
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 rounded-3xl opacity-30 blur-xl"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/95 via-blue-900/95 to-slate-800/95 rounded-3xl shadow-2xl border border-cyan-500/30 p-8">
                    {loadingOrden ? (
                      <div className="text-center py-16">
                        <div className="text-4xl mb-4">⏳</div>
                        <p className="text-cyan-300">
                          Cargando orden de servicio...
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-xl border-2 border-purple-500/50">
                          <div className="flex items-center gap-3">
                            <span className="text-purple-300 font-semibold text-lg">
                              ESTADO:
                            </span>
                            <span
                              className={`px-4 py-2 rounded-full font-bold ${
                                ordenServicio.estado === "pendiente"
                                  ? "bg-amber-500 text-white"
                                  : ordenServicio.estado === "en_proceso"
                                  ? "bg-blue-500 text-white"
                                  : ordenServicio.estado === "completado"
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-500 text-white"
                              }`}
                            >
                              {ordenServicio.estado
                                .toUpperCase()
                                .replace("_", " ")}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-cyan-300 mb-4">
                              Información del Cliente
                            </h3>
                            <div>
                              <label className="block text-cyan-300/70 text-sm mb-1">
                                Nombre del Cliente
                              </label>
                              <p className="text-cyan-100 text-lg font-semibold">
                                {ordenServicio.nombre_cliente}
                              </p>
                            </div>
                            <div>
                              <label className="block text-cyan-300/70 text-sm mb-1">
                                Número de Cliente
                              </label>
                              <p className="text-cyan-100 text-lg">
                                {ordenServicio.numero_cliente}
                              </p>
                            </div>
                            {ordenServicio.id_cliente_eventual && (
                              <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg">
                                <p className="text-amber-300 font-semibold">
                                  Cliente Eventual
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-cyan-300 mb-4">
                              Información del Compresor
                            </h3>
                            <div>
                              <label className="block text-cyan-300/70 text-sm mb-1">
                                Alias
                              </label>
                              <p className="text-cyan-100 text-lg font-semibold">
                                {ordenServicio.alias_compresor}
                              </p>
                            </div>
                            <div>
                              <label className="block text-cyan-300/70 text-sm mb-1">
                                Número de Serie
                              </label>
                              <p className="text-cyan-100 text-lg">
                                {ordenServicio.numero_serie}
                              </p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-cyan-300/70 text-sm mb-1">
                                  HP
                                </label>
                                <p className="text-cyan-100 text-lg">
                                  {ordenServicio.hp}
                                </p>
                              </div>
                              <div>
                                <label className="block text-cyan-300/70 text-sm mb-1">
                                  Tipo
                                </label>
                                <p className="text-cyan-100 text-lg">
                                  {ordenServicio.tipo}
                                </p>
                              </div>
                              <div>
                                <label className="block text-cyan-300/70 text-sm mb-1">
                                  Marca
                                </label>
                                <p className="text-cyan-100 text-lg">
                                  {ordenServicio.marca}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-cyan-300 mb-4">
                              Detalles del Servicio
                            </h3>
                            <div>
                              <label className="block text-cyan-300/70 text-sm mb-1">
                                Tipo de Visita
                              </label>
                              <p className="text-cyan-100 text-lg">
                                {ordenServicio.tipo_visita}
                              </p>
                            </div>
                            <div>
                              <label className="block text-cyan-300/70 text-sm mb-1">
                                Prioridad
                              </label>
                              <span
                                className={`px-3 py-1 rounded-full font-semibold ${
                                  ordenServicio.prioridad === "urgente"
                                    ? "bg-red-500 text-white"
                                    : ordenServicio.prioridad === "alta"
                                    ? "bg-orange-500 text-white"
                                    : ordenServicio.prioridad === "media"
                                    ? "bg-yellow-500 text-white"
                                    : "bg-blue-500 text-white"
                                }`}
                              >
                                {ordenServicio.prioridad.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <label className="block text-cyan-300/70 text-sm mb-1">
                                Fecha Programada
                              </label>
                              <p className="text-cyan-100 text-lg">
                                {ordenServicio.fecha_programada} -{" "}
                                {ordenServicio.hora_programada}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-cyan-300 mb-4">
                              Información Adicional
                            </h3>
                            <div>
                              <label className="block text-cyan-300/70 text-sm mb-1">
                                Fecha de Creación
                              </label>
                              <p className="text-cyan-100 text-lg">
                                {new Date(
                                  ordenServicio.fecha_creacion
                                ).toLocaleString("es-MX")}
                              </p>
                            </div>
                            {ordenServicio.reporte_url && (
                              <div>
                                <label className="block text-cyan-300/70 text-sm mb-1">
                                  Reporte
                                </label>
                                <a
                                  href={ordenServicio.reporte_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 underline"
                                >
                                  Ver Reporte
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-8 flex gap-4">
                          <button
                            onClick={() => {
                              const params = new URLSearchParams({
                                folio: ordenServicio.folio,
                                clientId: ordenServicio.id_cliente.toString(),
                                clientName: ordenServicio.nombre_cliente,
                                numeroCliente:
                                  ordenServicio.numero_cliente.toString(),
                                compressorId: ordenServicio.numero_serie,
                                serialNumber: ordenServicio.numero_serie,
                                brand: ordenServicio.marca,
                                model: ordenServicio.tipo,
                                hp: ordenServicio.hp.toString(),
                                year: ordenServicio.anio.toString(),
                                tipo: ordenServicio.tipo,
                                alias: ordenServicio.alias_compresor,
                                tipoVisita: ordenServicio.tipo_visita,
                                isEventual:
                                  ordenServicio.id_cliente_eventual === 1
                                    ? "true"
                                    : "false",
                              });
                              router.push(
                                `/features/compressor-maintenance/technician/reports/create?${params.toString()}`
                              );
                            }}
                            className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all font-bold text-lg shadow-xl hover:shadow-emerald-500/50 border-2 border-emerald-400/50"
                          >
                            Crear Reporte
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Show list of all ordenes when no folio in URL */
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {ordenesServicio.map((orden) => (
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
                                  {orden.estado.toUpperCase().replace("_", " ")}
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
                              <p className="font-bold text-cyan-100 text-lg truncate">
                                {orden.nombre_cliente}
                              </p>
                              <p className="text-sm text-cyan-200/80 mt-2">
                                <span className="font-medium">Folio:</span>{" "}
                                {orden.folio}
                              </p>
                              <p className="text-sm text-cyan-200/80">
                                <span className="font-medium">Compresor:</span>{" "}
                                {orden.alias_compresor}
                              </p>
                              <p className="text-sm text-cyan-200/80">
                                <span className="font-medium">Serie:</span>{" "}
                                {orden.numero_serie}
                              </p>
                              <p className="text-sm text-cyan-200/80">
                                <span className="font-medium">Tipo:</span>{" "}
                                {orden.tipo_visita}
                              </p>
                              <p className="text-sm text-cyan-200/80 mt-2">
                                <span className="font-medium">Programada:</span>{" "}
                                {orden.fecha_programada} {orden.hora_programada}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/features/compressor-maintenance/technician/reports?folio=${orden.folio}`
                                  )
                                }
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-lg"
                              >
                                Ver Detalles
                              </button>
                              <button
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    folio: orden.folio,
                                    clientId: orden.id_cliente.toString(),
                                    clientName: orden.nombre_cliente,
                                    numeroCliente:
                                      orden.numero_cliente.toString(),
                                    compressorId: orden.numero_serie,
                                    serialNumber: orden.numero_serie,
                                    brand: orden.marca,
                                    model: orden.tipo,
                                    hp: orden.hp.toString(),
                                    year: orden.anio.toString(),
                                    tipo: orden.tipo,
                                    alias: orden.alias_compresor,
                                    tipoVisita: orden.tipo_visita,
                                    isEventual:
                                      orden.id_cliente_eventual === 1
                                        ? "true"
                                        : "false",
                                  });
                                  router.push(
                                    `/features/compressor-maintenance/technician/reports/create?${params.toString()}`
                                  );
                                }}
                                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg"
                                title="Crear Reporte"
                              >
                                📝
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* VISTA PARA ROL 0 y 1 - Crear Ticket de Servicio */}
        {(rol === 0 || rol === 1) && (
          <>
            <div className="mt-24 mb-12 text-center">
              <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 mb-3">
                Crear Ticket de Servicio
              </h1>
              <p className="text-cyan-200/80 text-xl">
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
                                {result.tipo} | {result.hp} HP | {result.marca}
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
                          className="w-full px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
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
                            <option value="09:00">09:00</option>
                            <option value="10:00">10:00</option>
                            <option value="11:00">11:00</option>
                            <option value="12:00">12:00</option>
                            <option value="13:00">13:00</option>
                            <option value="14:00">14:00</option>
                            <option value="15:00">15:00</option>
                            <option value="16:00">16:00</option>
                            <option value="17:00">17:00</option>
                            <option value="18:00">18:00</option>
                            <option value="18:00">19:00</option>
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
                        ℹ️ <strong>Info:</strong> El ticket se creará con estado
                        "No Iniciado" y podrá ser asignado a un técnico
                        posteriormente.
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TypeReportes;
