"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/BackButton";
import LoadingOverlay from "@/components/LoadingOverlay";
import { URL_API } from "@/lib/global";
import Image from "next/image";
import { CheckCircle, XCircle, FileText, X } from "lucide-react";

interface MaintenanceItem {
  nombre: string;
  realizado: boolean;
}

interface OrderData {
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

interface PreMaintenanceData {
  folio: string;
  equipo_enciende?: string;
  display_enciende?: string;
  horas_totales?: number;
  horas_carga?: number;
  horas_descarga?: number;
  mantenimiento_proximo?: string;
  compresor_es_master?: string;
  amperaje_maximo_motor?: number;
  ubicacion_compresor?: string;
  expulsion_aire_caliente?: string;
  operacion_muchos_polvos?: string;
  compresor_bien_instalado?: string;
  condiciones_especiales?: string;
  voltaje_alimentacion?: number;
  amperaje_motor_carga?: number;
  amperaje_ventilador?: number;
  fugas_aceite_visibles?: string;
  fugas_aire_audibles?: string;
  aceite_oscuro_degradado?: string;
  temp_compresion_display?: number;
  temp_compresion_laser?: number;
  temp_separador_aceite?: number;
  temp_interna_cuarto?: number;
  delta_t_enfriador_aceite?: number;
  temp_motor_electrico?: number;
  metodo_control_presion?: string;
  presion_carga?: number;
  presion_descarga?: number;
  diferencial_presion?: string;
  delta_p_separador?: number;
  tipo_valvula_admision?: string;
  funcionamiento_valvula_admision?: string;
  wet_tank_existe?: boolean;
  wet_tank_litros?: number;
  wet_tank_valvula_seguridad?: boolean;
  wet_tank_dren?: boolean;
  dry_tank_existe?: boolean;
  dry_tank_litros?: number;
  dry_tank_valvula_seguridad?: boolean;
  dry_tank_dren?: boolean;
  exceso_polvo_suciedad?: boolean;
  hay_manual?: boolean;
  tablero_electrico_enciende?: boolean;
  giro_correcto_motor?: boolean;
  unidad_compresion_gira?: boolean;
  motor_ventilador_funciona?: boolean;
  razon_paro_mantenimiento?: string;
  alimentacion_electrica_conectada?: boolean;
  pastilla_adecuada_amperajes?: boolean;
  tuberia_descarga_conectada_a?: string;
}

interface MaintenanceData {
  folio: string;
  cambio_aceite?: string;
  cambio_filtro_aceite?: string;
  cambio_filtro_aire?: string;
  cambio_separador_aceite?: string;
  revision_valvula_admision?: string;
  revision_valvula_descarga?: string;
  limpieza_radiador?: string;
  revision_bandas_correas?: string;
  revision_fugas_aire?: string;
  revision_fugas_aceite?: string;
  revision_conexiones_electricas?: string;
  revision_presostato?: string;
  revision_manometros?: string;
  lubricacion_general?: string;
  limpieza_general?: string;
  comentarios_generales?: string;
  comentario_cliente?: string;
}

interface PostMaintenanceData {
  folio: string;
  display_enciende?: string;
  horas_totales?: number;
  horas_carga?: number;
  horas_descarga?: number;
  voltaje_alimentacion?: number;
  amperaje_motor_carga?: number;
  amperaje_ventilador?: number;
  fugas_aceite_visibles?: string;
  fugas_aire_audibles?: string;
  aceite_oscuro_degradado?: string;
  temp_ambiente?: number;
  temp_compresion_display?: number;
  temp_compresion_laser?: number;
  temp_separador_aceite?: number;
  temp_interna_cuarto?: number;
  delta_t_enfriador_aceite?: number;
  temp_motor_electrico?: number;
  presion_carga?: number;
  presion_descarga?: number;
  delta_p_separador?: number;
  nombre_persona_cargo?: string;
  firma_persona_cargo?: string;
  firma_tecnico_ventologix?: string;
}

interface ImageModalState {
  isOpen: boolean;
  imageSrc: string;
}

// Map database fields to display names for maintenance tasks
const maintenanceFieldsMap: { [key: string]: string } = {
  cambio_aceite: "Cambio de aceite",
  cambio_filtro_aceite: "Cambio de filtro de aceite",
  cambio_filtro_aire: "Cambio de filtro de aire",
  cambio_separador_aceite: "Cambio de separador de aceite",
  revision_valvula_admision: "Revisión de válvula de admisión",
  revision_valvula_descarga: "Revisión de válvula de descarga",
  limpieza_radiador: "Limpieza de radiador",
  revision_bandas_correas: "Revisión de bandas/correas",
  revision_fugas_aire: "Revisión de fugas de aire",
  revision_fugas_aceite: "Revisión de fugas de aceite",
  revision_conexiones_electricas: "Revisión de conexiones eléctricas",
  revision_presostato: "Revisión de presostato",
  revision_manometros: "Revisión de manómetros",
  lubricacion_general: "Lubricación general",
  limpieza_general: "Limpieza general del equipo",
};

function ViewReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [preMaintenanceData, setPreMaintenanceData] =
    useState<PreMaintenanceData | null>(null);
  const [maintenanceData, setMaintenanceData] =
    useState<MaintenanceData | null>(null);
  const [postMaintenanceData, setPostMaintenanceData] =
    useState<PostMaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<ImageModalState>({
    isOpen: false,
    imageSrc: "",
  });

  useEffect(() => {
    const folio = searchParams.get("folio");
    if (folio) {
      loadAllReportData(folio);
    } else {
      setError("No se proporcionó un folio");
      setLoading(false);
    }
  }, [searchParams]);

  const loadAllReportData = async (folio: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [orderRes, preRes, maintenanceRes, postRes] = await Promise.all([
        fetch(`${URL_API}/ordenes/${folio}`),
        fetch(`${URL_API}/reporte_mtto/pre-mtto/${folio}`),
        fetch(`${URL_API}/reporte_mantenimiento/${folio}`),
        fetch(`${URL_API}/reporte_mtto/post-mtto/${folio}`),
      ]);

      // Process order data
      if (orderRes.ok) {
        const orderResult = await orderRes.json();
        if (orderResult.data && orderResult.data.length > 0) {
          setOrderData(orderResult.data[0]);
        }
      }

      // Process pre-maintenance data
      if (preRes.ok) {
        const preResult = await preRes.json();
        if (preResult.data) {
          setPreMaintenanceData(preResult.data);
        }
      }

      // Process maintenance tasks data
      if (maintenanceRes.ok) {
        const maintenanceResult = await maintenanceRes.json();
        if (maintenanceResult.data) {
          setMaintenanceData(maintenanceResult.data);
        }
      }

      // Process post-maintenance data
      if (postRes.ok) {
        const postResult = await postRes.json();
        if (postResult.data) {
          setPostMaintenanceData(postResult.data);
        }
      }

      // Check if we got at least the order data
      if (!orderRes.ok) {
        setError("No se encontró la orden de servicio");
      }
    } catch (err) {
      console.error("Error loading report data:", err);
      setError("Error al cargar los datos del reporte");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // const openImageModal = (imageSrc: string) => {
  //   setImageModal({ isOpen: true, imageSrc });
  // };

  const closeImageModal = () => {
    setImageModal({ isOpen: false, imageSrc: "" });
  };

  const handleViewPdf = () => {
    if (orderData?.reporte_url) {
      window.open(orderData.reporte_url, "_blank");
    }
  };

  const renderValue = (
    value: string | number | boolean | undefined | null,
    suffix?: string,
  ) => {
    if (value === undefined || value === null || value === "") return "N/A";
    if (typeof value === "boolean") return value ? "Sí" : "No";
    return suffix ? `${value}${suffix}` : String(value);
  };

  // Convert maintenance data to display items
  const getMaintenanceItems = (): MaintenanceItem[] => {
    if (!maintenanceData) return [];

    const items: MaintenanceItem[] = [];
    Object.entries(maintenanceFieldsMap).forEach(([field, displayName]) => {
      const value = maintenanceData[field as keyof MaintenanceData];
      if (value !== undefined) {
        items.push({
          nombre: displayName,
          realizado: value === "Sí",
        });
      }
    });
    return items;
  };

  if (loading) {
    return <LoadingOverlay isVisible={true} message="Cargando reporte..." />;
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-600 text-lg">
            {error || "Reporte no encontrado"}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const maintenanceItems = getMaintenanceItems();

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
                  <p className="text-blue-200">Reporte de Mantenimiento</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">Folio</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {orderData.folio}
                </p>
                <p className="text-sm text-blue-200 mt-2">
                  {formatDate(orderData.fecha_creacion)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Client & Order Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
            INFORMACIÓN DEL CLIENTE Y ORDEN
          </h2>
          <div className="space-y-6">
            {/* Client Info */}
            <div className="p-4">
              <h3 className="font-bold text-blue-900 mb-4 text-lg">
                INFORMACIÓN DEL CLIENTE
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Nombre Cliente
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {orderData.nombre_cliente || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    No. Cliente
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {orderData.numero_cliente || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Compressor Info */}
            <div className="p-4 border-t">
              <h3 className="font-bold text-blue-900 mb-4 text-lg">
                INFORMACIÓN DEL COMPRESOR
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Alias Compresor
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {orderData.alias_compresor || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Número de Serie
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {orderData.numero_serie || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    HP
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {orderData.hp || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Tipo
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {orderData.tipo || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Marca
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {orderData.marca || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Año
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {orderData.anio || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Info */}
            <div className="p-4 border-t">
              <h3 className="font-bold text-blue-900 mb-4 text-lg">
                INFORMACIÓN DE LA ORDEN DE SERVICIO
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Tipo de Visita
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {orderData.tipo_visita || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Tipo de Mantenimiento
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {orderData.tipo_mantenimiento || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Fecha Programada
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {formatDate(orderData.fecha_programada)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Hora Programada
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {orderData.hora_programada || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Estado
                  </label>
                  <p
                    className={`font-semibold p-2 rounded ${
                      orderData.estado === "Completado"
                        ? "bg-green-100 text-green-800"
                        : orderData.estado === "En progreso"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {orderData.estado || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Prioridad
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {orderData.prioridad || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pre-Maintenance Data */}
        {preMaintenanceData && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
              PRE-MANTENIMIENTO
            </h2>

            {/* Initial Status */}
            <div className="p-4 mb-4">
              <h3 className="font-bold text-purple-900 mb-4 text-lg">
                ESTADO INICIAL
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    ¿Equipo enciende?
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.equipo_enciende)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    ¿Display enciende?
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.display_enciende)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Compresor es Master/Slave
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.compresor_es_master)}
                  </p>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="p-4 mb-4 border-t">
              <h3 className="font-bold text-purple-900 mb-4 text-lg">
                HORAS DE OPERACIÓN
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Horas Totales
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.horas_totales, " hrs")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Horas en Carga
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.horas_carga, " hrs")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Horas en Descarga
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.horas_descarga, " hrs")}
                  </p>
                </div>
              </div>
            </div>

            {/* Electrical Measurements */}
            <div className="p-4 mb-4 border-t">
              <h3 className="font-bold text-purple-900 mb-4 text-lg">
                MEDICIONES ELÉCTRICAS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Voltaje de Alimentación
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.voltaje_alimentacion, " V")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Amperaje Motor en Carga
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.amperaje_motor_carga, " A")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Amperaje Ventilador
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.amperaje_ventilador, " A")}
                  </p>
                </div>
              </div>
            </div>

            {/* Temperatures */}
            <div className="p-4 mb-4 border-t">
              <h3 className="font-bold text-purple-900 mb-4 text-lg">
                TEMPERATURAS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Temp. Compresión (Display)
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(
                      preMaintenanceData.temp_compresion_display,
                      " °C",
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Temp. Compresión (Láser)
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(
                      preMaintenanceData.temp_compresion_laser,
                      " °C",
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Temp. Separador Aceite
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(
                      preMaintenanceData.temp_separador_aceite,
                      " °C",
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Temp. Interna Cuarto
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.temp_interna_cuarto, " °C")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Delta T Enfriador Aceite
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(
                      preMaintenanceData.delta_t_enfriador_aceite,
                      " °C",
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Temp. Motor Eléctrico
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(
                      preMaintenanceData.temp_motor_electrico,
                      " °C",
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Pressures */}
            <div className="p-4 mb-4 border-t">
              <h3 className="font-bold text-purple-900 mb-4 text-lg">
                PRESIONES
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Método Control Presión
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.metodo_control_presion)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Presión en Carga
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.presion_carga, " Psi")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Presión en Descarga
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.presion_descarga, " Psi")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Delta P Separador
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.delta_p_separador, " Psi")}
                  </p>
                </div>
              </div>
            </div>

            {/* Leaks & Oil */}
            <div className="p-4 mb-4 border-t">
              <h3 className="font-bold text-purple-900 mb-4 text-lg">
                FUGAS Y ACEITE
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Fugas de Aceite Visibles
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.fugas_aceite_visibles)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Fugas de Aire Audibles
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.fugas_aire_audibles)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Aceite Oscuro/Degradado
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.aceite_oscuro_degradado)}
                  </p>
                </div>
              </div>
            </div>

            {/* Environmental Conditions */}
            <div className="p-4 border-t">
              <h3 className="font-bold text-purple-900 mb-4 text-lg">
                CONDICIONES AMBIENTALES
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Ubicación del Compresor
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.ubicacion_compresor)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Expulsión Aire Caliente
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.expulsion_aire_caliente)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Operación con Muchos Polvos
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(preMaintenanceData.operacion_muchos_polvos)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Tasks */}
        {maintenanceItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-white bg-green-700 px-4 py-2 rounded font-bold mb-4">
              TRABAJOS REALIZADOS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
              {maintenanceItems.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    item.realizado
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <span className="text-gray-900 font-medium">
                    {item.nombre}
                  </span>
                  {item.realizado ? (
                    <CheckCircle className="text-green-600" size={24} />
                  ) : (
                    <XCircle className="text-gray-400" size={24} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        {(maintenanceData?.comentarios_generales ||
          maintenanceData?.comentario_cliente) && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-white bg-gray-700 px-4 py-2 rounded font-bold mb-4">
              COMENTARIOS
            </h2>
            <div className="space-y-4 p-4">
              {maintenanceData?.comentarios_generales && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentarios del Técnico
                  </label>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {maintenanceData.comentarios_generales}
                    </p>
                  </div>
                </div>
              )}
              {maintenanceData?.comentario_cliente && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentarios del Cliente
                  </label>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {maintenanceData.comentario_cliente}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Post-Maintenance Data */}
        {postMaintenanceData && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-white bg-orange-600 px-4 py-2 rounded font-bold mb-4">
              POST-MANTENIMIENTO
            </h2>

            {/* Final Readings */}
            <div className="p-4 mb-4">
              <h3 className="font-bold text-orange-900 mb-4 text-lg">
                LECTURAS FINALES
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">
                    Horas Totales (Final)
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(postMaintenanceData.horas_totales, " hrs")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">
                    Voltaje (Final)
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(
                      postMaintenanceData.voltaje_alimentacion,
                      " V",
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">
                    Amperaje Motor (Final)
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(
                      postMaintenanceData.amperaje_motor_carga,
                      " A",
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">
                    Temp. Compresión (Final)
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(
                      postMaintenanceData.temp_compresion_display,
                      " °C",
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">
                    Presión Carga (Final)
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(postMaintenanceData.presion_carga, " Psi")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">
                    Presión Descarga (Final)
                  </label>
                  <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
                    {renderValue(postMaintenanceData.presion_descarga, " Psi")}
                  </p>
                </div>
              </div>
            </div>

            {/* Signatures */}
            {(postMaintenanceData.nombre_persona_cargo ||
              postMaintenanceData.firma_persona_cargo ||
              postMaintenanceData.firma_tecnico_ventologix) && (
              <div className="p-4 border-t">
                <h3 className="font-bold text-orange-900 mb-4 text-lg">
                  FIRMAS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {postMaintenanceData.nombre_persona_cargo && (
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-1">
                        Persona a Cargo
                      </label>
                      <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded mb-2">
                        {postMaintenanceData.nombre_persona_cargo}
                      </p>
                      {postMaintenanceData.firma_persona_cargo && (
                        <div className="border rounded-lg p-2 bg-white">
                          <Image
                            src={postMaintenanceData.firma_persona_cargo}
                            alt="Firma del cliente"
                            width={200}
                            height={100}
                            className="mx-auto"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {postMaintenanceData.firma_tecnico_ventologix && (
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-1">
                        Técnico Ventologix
                      </label>
                      <div className="border rounded-lg p-2 bg-white">
                        <Image
                          src={postMaintenanceData.firma_tecnico_ventologix}
                          alt="Firma del técnico"
                          width={200}
                          height={100}
                          className="mx-auto"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Volver
          </button>
          {orderData.reporte_url && (
            <button
              onClick={handleViewPdf}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center space-x-2"
            >
              <FileText size={20} />
              <span>Ver PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {imageModal.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-[60]"
          onClick={closeImageModal}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors z-10"
            >
              <X size={32} />
            </button>
            <Image
              src={imageModal.imageSrc}
              alt="Foto ampliada"
              fill
              className="object-contain"
              sizes="100vw"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ViewReport() {
  return (
    <Suspense
      fallback={<LoadingOverlay isVisible={true} message="Cargando..." />}
    >
      <ViewReportContent />
    </Suspense>
  );
}
