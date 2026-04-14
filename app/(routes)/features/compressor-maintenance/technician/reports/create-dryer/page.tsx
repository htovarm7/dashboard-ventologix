"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter, useSearchParams } from "next/navigation";
import { URL_API } from "@/lib/global";
import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import { PhotoUploadSection } from "@/components/PhotoUploadSection";
import Image from "next/image";
import { todayString } from "@/lib/dateUtils";

interface ClientOption {
  numero_cliente: string | number;
  nombre_cliente: string;
  RFC: string;
  direccion: string;
  champion: string;
}

interface DryerFormData {
  folio: string;
  cliente: string;
  numero_cliente: string;
  rfc: string;
  direccion: string;
  ingeniero_obra: string;
  ingeniero_ventologix: string;
  fecha: string;
  equipo: string;
  modelo: string;
  no_serie: string;
  tipo_refrigerante: string;
  ubicacion: string;
  horometro: string;
  voltaje: string;
  amperaje: string;
  ciclo_refrigeracion: string;
  ciclo_drenado: string;
  tiempo_drenado: string;
  tiempo_ciclo: string;
  presion_alta: string;
  presion_baja: string;
  temp_entrada_aire: string;
  temp_salida_aire: string;
  punto_rocio: string;
  drenaje_condensado: string;
  intercambiador_calor: string;
  evaporadora: string;
  valvula_expansion: string;
  filtro_deshidratador: string;
  condensador: string;
  ventiladores_condensador: string;
  motor_ventilador: string;
  compresor_refrigeracion: string;
  cableado_electrico: string;
  contactores_relevadores: string;
  tarjeta_control: string;
  drenaje_automatico: string;
  sensor_punto_rocio: string;
  estado_general: string;
  observaciones: string;
}

const statusOptions = [
  { value: "", label: "-- Seleccionar --" },
  { value: "Buen estado", label: "Buen estado" },
  { value: "Regular", label: "Regular" },
  { value: "Requiere atención", label: "Requiere atención" },
  { value: "No aplica", label: "No aplica" },
];

function DryerReportForm() {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();
  const searchParams = useSearchParams();
  const folioParam = searchParams.get("folio");
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [savedFolio, setSavedFolio] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Client dropdown
  const [allClients, setAllClients] = useState<ClientOption[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Photo categories for dryer
  const [photosByCategory, setPhotosByCategory] = useState<{
    [category: string]: File[];
  }>({
    PLACAS_EQUIPO: [],
    DISPLAY_HORAS: [],
    COMPONENTES: [],
    REFRIGERACION: [],
    OTROS: [],
  });

  const [uploadStatus, setUploadStatus] = useState<{
    [key: string]: "idle" | "uploading" | "success" | "error";
  }>({});
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});

  const [formData, setFormData] = useState<DryerFormData>({
    folio: "",
    cliente: "",
    numero_cliente: "",
    rfc: "",
    direccion: "",
    ingeniero_obra: "",
    ingeniero_ventologix: "",
    fecha: todayString(),
    equipo: "",
    modelo: "",
    no_serie: "",
    tipo_refrigerante: "",
    ubicacion: "",
    horometro: "",
    voltaje: "",
    amperaje: "",
    ciclo_refrigeracion: "",
    ciclo_drenado: "",
    tiempo_drenado: "",
    tiempo_ciclo: "",
    presion_alta: "",
    presion_baja: "",
    temp_entrada_aire: "",
    temp_salida_aire: "",
    punto_rocio: "",
    drenaje_condensado: "",
    intercambiador_calor: "",
    evaporadora: "",
    valvula_expansion: "",
    filtro_deshidratador: "",
    condensador: "",
    ventiladores_condensador: "",
    motor_ventilador: "",
    compresor_refrigeracion: "",
    cableado_electrico: "",
    contactores_relevadores: "",
    tarjeta_control: "",
    drenaje_automatico: "",
    sensor_punto_rocio: "",
    estado_general: "",
    observaciones: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-generate folio when no_serie changes and client is selected but no folio yet
      if (name === "no_serie" && prev.numero_cliente && !prev.folio) {
        updated.folio = generateDryerFolio(prev.numero_cliente, value);
      }
      return updated;
    });
  };

  // Cargar lista de clientes (no requiere auth)
  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const res = await fetch(`${URL_API}/clients/`);
        if (res.ok) {
          const response = await res.json();
          setAllClients(response.data || []);
        }
      } catch (error) {
        console.error("Error cargando clientes:", error);
      } finally {
        setLoadingClients(false);
      }
    };
    loadClients();
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrar clientes por búsqueda
  const filteredClients = allClients.filter((c) => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return (
      String(c.numero_cliente).toLowerCase().includes(q) ||
      (c.nombre_cliente || "").toLowerCase().includes(q)
    );
  });

  // Generate folio for dryer reports: SEC-{clientId}-{last4serial}-{YYYYMMDD}-{HHMM}
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

  const selectClient = (client: ClientOption) => {
    const numCliente = String(client.numero_cliente);
    setFormData((prev) => {
      const folio = prev.folio || generateDryerFolio(numCliente, prev.no_serie);
      return {
        ...prev,
        numero_cliente: numCliente,
        cliente: client.nombre_cliente || "",
        rfc: client.RFC || "",
        direccion: client.direccion || "",
        ingeniero_obra: client.champion || "",
        folio,
      };
    });
    setClientSearch("");
    setShowClientDropdown(false);
  };

  // Cargar reporte existente o pre-llenar desde orden de servicio
  useEffect(() => {
    const loadReport = async () => {
      if (!folioParam || !isAuthenticated) return;
      setLoading(true);
      try {
        const token = await getAccessTokenSilently();

        // 1. Try loading from order to pre-fill client info
        try {
          const orderRes = await fetch(`${URL_API}/ordenes/${folioParam}`);
          if (orderRes.ok) {
            const orderResult = await orderRes.json();
            if (orderResult.data?.length > 0) {
              const orden = orderResult.data[0];
              // Pre-fill client info from order
              setFormData((prev) => ({
                ...prev,
                folio: orden.folio,
                numero_cliente: String(orden.numero_cliente || ""),
                cliente: orden.nombre_cliente || "",
                equipo: orden.alias_compresor || "",
                no_serie: orden.numero_serie || "",
              }));
              // Also fetch client details for RFC, direccion
              if (orden.numero_cliente) {
                try {
                  const clientRes = await fetch(`${URL_API}/clients/`);
                  if (clientRes.ok) {
                    const clientData = await clientRes.json();
                    const client = (clientData.data || []).find(
                      (c: { numero_cliente: number | string }) =>
                        String(c.numero_cliente) ===
                        String(orden.numero_cliente),
                    );
                    if (client) {
                      setFormData((prev) => ({
                        ...prev,
                        rfc: client.RFC || prev.rfc,
                        direccion: client.direccion || prev.direccion,
                        ingeniero_obra: client.champion || prev.ingeniero_obra,
                      }));
                    }
                  }
                } catch {
                  // Client details are non-critical
                }
              }
            }
          }
        } catch {
          // Order pre-fill is non-critical
        }

        // 2. Then try loading existing dryer report (overrides order data if exists)
        const res = await fetch(`${URL_API}/reporte_secadora/${folioParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setFormData((prev) => ({ ...prev, ...data }));
          setSavedFolio(folioParam);
        }
      } catch (error) {
        console.error("Error cargando reporte:", error);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [folioParam, isAuthenticated, getAccessTokenSilently]);

  // Handle categorized photo uploads
  const handleCategorizedPhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    category: string,
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setPhotosByCategory((prev) => ({
        ...prev,
        [category]: [...prev[category], ...fileArray],
      }));
    }
  };

  // Remove photo from category
  const removeCategorizedPhoto = (category: string, index: number) => {
    setPhotosByCategory((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
  };

  // Guardar reporte
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    setIsSaving(true);
    try {
      const token = await getAccessTokenSilently();

      // Ensure folio exists before saving
      let currentFormData = formData;
      if (!currentFormData.folio) {
        const folio = generateDryerFolio(
          currentFormData.numero_cliente,
          currentFormData.no_serie,
        );
        currentFormData = { ...currentFormData, folio };
        setFormData(currentFormData);
      }

      const form = new FormData();

      Object.entries(currentFormData).forEach(([key, value]) => {
        form.append(key, value as string);
      });

      // Add all photos from categories
      Object.entries(photosByCategory).forEach(([category, files]) => {
        files.forEach((file) => {
          form.append(`fotos_${category}`, file);
        });
      });

      const res = await fetch(`${URL_API}/reporte_secadora/guardar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (res.ok) {
        const data = await res.json();
        setSavedFolio(data.folio || formData.folio);
        alert("Reporte guardado exitosamente");
      } else {
        throw new Error("Error al guardar");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar el reporte");
    } finally {
      setIsSaving(false);
    }
  };

  // Descargar PDF
  const handleDownloadPdf = async () => {
    const folio = savedFolio || formData.folio;
    if (!folio) {
      alert("Guarde el reporte primero");
      return;
    }
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${URL_API}/reporte_secadora/pdf/${folio}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `reporte_secadora_${folio}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error("Error descargando PDF");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al descargar PDF");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return <LoadingOverlay isVisible={true} message="Cargando..." />;
  }

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <BackButton />

      <div className="max-w-7xl mx-auto mt-4">
        {/* Header Principal */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                  <Image
                    src="/Ventologix_05.png"
                    alt="Ventologix Logo"
                    width={64}
                    height={64}
                    style={{ width: "auto", height: "auto" }}
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">VENTOLOGIX</h1>
                  <p className="text-blue-200">
                    Reporte de Mantenimiento - Secadora
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">Folio</p>
                <p className="text-2xl">{formData.folio || "Sin asignar"}</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECCIÓN: Información del Cliente */}
          <div
            id="cliente-section"
            className="bg-white rounded-lg shadow-lg overflow-hidden mb-6"
          >
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white p-4">
              <h2 className="text-xl font-bold text-center">
                INFORMACIÓN DEL CLIENTE
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente *
                  </label>
                  <input
                    type="text"
                    name="cliente"
                    value={formData.cliente}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    readOnly
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RFC
                  </label>
                  <input
                    type="text"
                    name="rfc"
                    value={formData.rfc}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN: Datos del Equipo */}
          <div
            id="equipo-section"
            className="bg-white rounded-lg shadow-lg overflow-hidden mb-6"
          >
            <div className="bg-gradient-to-r from-purple-700 to-purple-800 text-white p-4">
              <h2 className="text-xl font-bold text-center">
                DATOS DEL EQUIPO
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <PhotoUploadSection
                    category="PLACAS_EQUIPO"
                    label="Fotos Placas del Equipo"
                    photos={photosByCategory.PLACAS_EQUIPO}
                    onPhotoAdd={handleCategorizedPhotoChange}
                    onPhotoRemove={removeCategorizedPhoto}
                    uploadStatus={uploadStatus.PLACAS_EQUIPO || "idle"}
                    uploadProgress={uploadProgress.PLACAS_EQUIPO || 0}
                    multiple={true}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Equipo / Marca
                  </label>
                  <input
                    type="text"
                    name="equipo"
                    value={formData.equipo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Marca del equipo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modelo
                  </label>
                  <input
                    type="text"
                    name="modelo"
                    value={formData.modelo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Modelo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    No. Serie
                  </label>
                  <input
                    type="text"
                    name="no_serie"
                    value={formData.no_serie}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Número de serie"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Refrigerante / Desecante
                  </label>
                  <input
                    type="text"
                    name="tipo_refrigerante"
                    value={formData.tipo_refrigerante}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ej: R-134a, R-410A, Desecante, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    name="ubicacion"
                    value={formData.ubicacion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ubicación del equipo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horómetro
                  </label>
                  <input
                    type="text"
                    name="horometro"
                    value={formData.horometro}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Horas de operación"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN: Parámetros Eléctricos */}
          <div
            id="parametros-section"
            className="bg-white rounded-lg shadow-lg overflow-hidden mb-6"
          >
            <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white p-4">
              <h2 className="text-xl font-bold text-center">
                PARÁMETROS ELÉCTRICOS
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voltaje (V)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="voltaje"
                    value={formData.voltaje}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amperaje (A)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="amperaje"
                    value={formData.amperaje}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN: Ciclos y Tiempos */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white p-4">
              <h2 className="text-xl font-bold text-center">
                CICLOS Y TIEMPOS
              </h2>
            </div>
            <div className="p-6">
              <div className="md:col-span-2 mb-6">
                <PhotoUploadSection
                  category="DISPLAY_HORAS"
                  label="Fotos Display / Horas de Trabajo"
                  photos={photosByCategory.DISPLAY_HORAS}
                  onPhotoAdd={handleCategorizedPhotoChange}
                  onPhotoRemove={removeCategorizedPhoto}
                  uploadStatus={uploadStatus.DISPLAY_HORAS || "idle"}
                  uploadProgress={uploadProgress.DISPLAY_HORAS || 0}
                  multiple={true}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ciclo de Refrigeración
                  </label>
                  <input
                    type="text"
                    name="ciclo_refrigeracion"
                    value={formData.ciclo_refrigeracion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ingrese valor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ciclo de Drenado
                  </label>
                  <input
                    type="text"
                    name="ciclo_drenado"
                    value={formData.ciclo_drenado}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ingrese valor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiempo de Drenado
                  </label>
                  <input
                    type="text"
                    name="tiempo_drenado"
                    value={formData.tiempo_drenado}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ingrese valor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiempo de Ciclo
                  </label>
                  <input
                    type="text"
                    name="tiempo_ciclo"
                    value={formData.tiempo_ciclo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ingrese valor"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN: Presiones y Lecturas */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white p-4">
              <h2 className="text-xl font-bold text-center">
                PRESIONES Y LECTURAS
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Presión Alta (PSI)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="presion_alta"
                    value={formData.presion_alta}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Presión Baja (PSI)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="presion_baja"
                    value={formData.presion_baja}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temp. Entrada Aire (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="temp_entrada_aire"
                    value={formData.temp_entrada_aire}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temp. Salida Aire (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="temp_salida_aire"
                    value={formData.temp_salida_aire}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Punto de Rocío (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="punto_rocio"
                    value={formData.punto_rocio}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN: Estado de Componentes */}
          <div
            id="componentes-section"
            className="bg-white rounded-lg shadow-lg overflow-hidden mb-6"
          >
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-4">
              <h2 className="text-xl font-bold text-center">
                ESTADO DE COMPONENTES
              </h2>
            </div>
            <div className="p-6">
              <div className="md:col-span-2 mb-6">
                <PhotoUploadSection
                  category="COMPONENTES"
                  label="Fotos de Componentes"
                  photos={photosByCategory.COMPONENTES}
                  onPhotoAdd={handleCategorizedPhotoChange}
                  onPhotoRemove={removeCategorizedPhoto}
                  uploadStatus={uploadStatus.COMPONENTES || "idle"}
                  uploadProgress={uploadProgress.COMPONENTES || 0}
                  multiple={true}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drenaje de Condensado
                  </label>
                  <select
                    name="drenaje_condensado"
                    value={formData.drenaje_condensado}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intercambiador de Calor
                  </label>
                  <select
                    name="intercambiador_calor"
                    value={formData.intercambiador_calor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evaporadora
                  </label>
                  <select
                    name="evaporadora"
                    value={formData.evaporadora}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Válvula de Expansión
                  </label>
                  <select
                    name="valvula_expansion"
                    value={formData.valvula_expansion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filtro Deshidratador
                  </label>
                  <select
                    name="filtro_deshidratador"
                    value={formData.filtro_deshidratador}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condensador
                  </label>
                  <select
                    name="condensador"
                    value={formData.condensador}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ventiladores del Condensador
                  </label>
                  <select
                    name="ventiladores_condensador"
                    value={formData.ventiladores_condensador}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motor del Ventilador
                  </label>
                  <select
                    name="motor_ventilador"
                    value={formData.motor_ventilador}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compresor de Refrigeración
                  </label>
                  <select
                    name="compresor_refrigeracion"
                    value={formData.compresor_refrigeracion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cableado Eléctrico
                  </label>
                  <select
                    name="cableado_electrico"
                    value={formData.cableado_electrico}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contactores y Relevadores
                  </label>
                  <select
                    name="contactores_relevadores"
                    value={formData.contactores_relevadores}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tarjeta de Control
                  </label>
                  <select
                    name="tarjeta_control"
                    value={formData.tarjeta_control}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drenaje Automático
                  </label>
                  <select
                    name="drenaje_automatico"
                    value={formData.drenaje_automatico}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sensor Punto de Rocío
                  </label>
                  <select
                    name="sensor_punto_rocio"
                    value={formData.sensor_punto_rocio}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN: Estado General y Observaciones */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-4">
              <h2 className="text-xl font-bold text-center">
                ESTADO GENERAL Y OBSERVACIONES
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado General del Equipo
                  </label>
                  <select
                    name="estado_general"
                    value={formData.estado_general}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                    placeholder="Notas adicionales sobre el equipo..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN: Fotos Adicionales */}
          <div
            id="fotos-section"
            className="bg-white rounded-lg shadow-lg overflow-hidden mb-6"
          >
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
              <h2 className="text-xl font-bold text-center">
                DOCUMENTACIÓN FOTOGRÁFICA ADICIONAL
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PhotoUploadSection
                  category="REFRIGERACION"
                  label="Fotos Sistema de Refrigeración"
                  photos={photosByCategory.REFRIGERACION}
                  onPhotoAdd={handleCategorizedPhotoChange}
                  onPhotoRemove={removeCategorizedPhoto}
                  uploadStatus={uploadStatus.REFRIGERACION || "idle"}
                  uploadProgress={uploadProgress.REFRIGERACION || 0}
                  multiple={true}
                />
                <PhotoUploadSection
                  category="OTROS"
                  label="Otras Fotos"
                  photos={photosByCategory.OTROS}
                  onPhotoAdd={handleCategorizedPhotoChange}
                  onPhotoRemove={removeCategorizedPhoto}
                  uploadStatus={uploadStatus.OTROS || "idle"}
                  uploadProgress={uploadProgress.OTROS || 0}
                  multiple={true}
                />
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "Guardar Reporte"}
              </button>
              {savedFolio && (
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Descargar PDF
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateDryerReport() {
  return (
    <Suspense
      fallback={<LoadingOverlay isVisible={true} message="Cargando..." />}
    >
      <DryerReportForm />
    </Suspense>
  );
}
