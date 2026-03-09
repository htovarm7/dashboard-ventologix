"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/BackButton";
import LoadingOverlay from "@/components/LoadingOverlay";
import { URL_API } from "@/lib/global";
import Image from "next/image";
import {
  CheckCircle,
  XCircle,
  FileText,
  X,
  Thermometer,
  Gauge,
  Zap,
  Wind,
  Clock,
  Wrench,
  AlertCircle,
  Info,
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

// ── Interfaces ──────────────────────────────────────────────────────────────

interface OrderData {
  folio: string;
  id_cliente: number;
  id_cliente_eventual: number;
  nombre_cliente: string;
  numero_cliente: number;
  area?: string;
  alias_equipo: string;
  numero_serie: string;
  marca: string;
  modelo: string;
  tipo_visita: string;
  tipo_mantenimiento: string;
  prioridad: string;
  fecha_programada: string;
  hora_programada: string;
  estado: string;
  fecha_creacion: string;
  tecnico?: string;
  reporte_url: string;
}

interface EquipmentData {
  folio: string;
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  arrancador?: string;
  tipo_compresor?: string;
  hp_compresor?: string;
  tipo_refrigerante?: string;
  voltaje?: number;
  marca_motor?: string;
  hp_motor_condensador?: string;
}

interface CyclesTimesData {
  folio: string;
  punto_rocio?: string;
  ciclos?: number;
  tiempo?: string;
  pre_filtro?: string;
  post_filtro?: string;
}

interface PressuresReadingsData {
  folio: string;
  manometro_torre_1?: number;
  manometro_torre_2?: number;
  presion_descarga?: number;
  presion_succion?: number;
  temp_aire_entrada?: number;
  temp_aire_salida?: number;
  amperaje?: number;
  amperaje_condensador?: number;
  voltaje_compresor?: number;
  voltaje_motor_condensador?: number;
}

interface ElementFunctioningData {
  folio: string;
  carga_gas?: string;
  fugas_tuberias?: string;
  baleros_motor_condensador?: string;
  indicador_presion?: string;
  valvula_expansion?: string;
  presostatos?: string;
  termoswitch?: string;
  instalacion_electrica?: string;
  nivel_aceite?: string;
  valvula_solenoide?: string;
  panel_condensador?: string;
  indicador_temperatura?: string;
  filtros?: string;
  valvulas_dren_condensados?: string;
}

interface DryerReportData {
  orden: OrderData;
  equipo: EquipmentData;
  ciclos_tiempos: CyclesTimesData;
  presiones_lecturas: PressuresReadingsData;
  funcionamiento_elementos: ElementFunctioningData;
  observaciones?: string;
  fotos_por_categoria?: { [category: string]: string[] };
  fotos_drive?: string[];
}

interface FotosPorCategoria {
  [category: string]: string[];
}

interface ImageModalState {
  isOpen: boolean;
  imageSrc: string;
}

// ── Field Maps for element functioning ──────────────────────────────────────

const elementFunctioningFieldsMap: { [key: string]: string } = {
  carga_gas: "Carga de Gas",
  fugas_tuberias: "Fugas (Tuberías)",
  baleros_motor_condensador: "Baleros de Motor Condensador",
  indicador_presion: "Indicador de Presión",
  valvula_expansion: "Válvula de Expansión",
  presostatos: "Presostatos",
  termoswitch: "Termoswitch",
  instalacion_electrica: "Instalación Eléctrica",
  nivel_aceite: "Nivel de Aceite",
  valvula_solenoide: "Válvula Solenoide",
  panel_condensador: "Panel de Condensador",
  indicador_temperatura: "Indicador de Temperatura",
  filtros: "Filtros",
  valvulas_dren_condensados: "Válvulas Dren Condensados",
};

// ── Component ───────────────────────────────────────────────────────────────

function ViewDryerReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [reportData, setReportData] = useState<DryerReportData | null>(null);
  const [fotosPorCategoria, setFotosPorCategoria] =
    useState<FotosPorCategoria>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<ImageModalState>({
    isOpen: false,
    imageSrc: "",
  });
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [nombrePersonaCargo, setNombrePersonaCargo] = useState("");
  const clientSignatureRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    const folio = searchParams.get("folio");
    if (folio) {
      loadReportData(folio);
    } else {
      setError("No se proporcionó un folio");
      setLoading(false);
    }
  }, [searchParams]);

  const loadReportData = async (folio: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `${URL_API}/reporte_secadora/reporte-completo/${folio}`,
      );

      if (!res.ok) {
        setError("No se encontró el reporte de secadora");
        setLoading(false);
        return;
      }

      const result = await res.json();

      if (!result.success) {
        setError(result.error || "Error al cargar el reporte");
        setLoading(false);
        return;
      }

      const data = result.data;
      setReportData(data);

      if (
        data.fotos_por_categoria &&
        Object.keys(data.fotos_por_categoria).length > 0
      ) {
        setFotosPorCategoria(data.fotos_por_categoria);
      } else if (data.fotos_drive && data.fotos_drive.length > 0) {
        setFotosPorCategoria({ OTROS: data.fotos_drive });
      }
    } catch (err) {
      console.error("Error loading dryer report:", err);
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

  const openImageModal = (imageSrc: string) => {
    setImageModal({ isOpen: true, imageSrc });
  };

  const closeImageModal = () => {
    setImageModal({ isOpen: false, imageSrc: "" });
  };

  const renderValue = (
    value: string | number | boolean | undefined | null,
    suffix?: string,
  ) => {
    if (value === undefined || value === null || value === "") return "N/A";
    if (typeof value === "boolean") return value ? "Sí" : "No";
    return suffix ? `${value}${suffix}` : String(value);
  };

  // Status badge styling
  const getStatusBadge = (value: string | undefined | null) => {
    if (!value || value === "N/A")
      return "bg-gray-100 text-gray-500 border-gray-200";
    const v = value.toLowerCase();
    if (v === "correcto" || v === "sí" || v === "bueno" || v === "ok")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (v === "incorrecto" || v === "no" || v === "malo")
      return "bg-red-50 text-red-700 border-red-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const handleViewPdf = () => {
    const folio = searchParams.get("folio");
    if (folio) {
      const pdfUrl = `${URL_API}/reporte_secadora/descargar-pdf/${folio}`;
      window.open(pdfUrl, "_blank");
    }
  };

  const handleSaveSignatureAndFinish = async () => {
    const folio = searchParams.get("folio");
    if (!folio) return;

    if (!clientSignatureRef.current || clientSignatureRef.current.isEmpty()) {
      alert(
        "Por favor agregue la firma del cliente/persona a cargo antes de guardar.",
      );
      return;
    }

    setIsSavingSignature(true);
    try {
      const clientCanvas = clientSignatureRef.current.getCanvas();
      const clientSignatureData = clientCanvas.toDataURL("image/png");

      const saveSignResponse = await fetch(
        `${URL_API}/reporte_secadora/firmar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folio,
            firma_tecnico_ventologix: "/firma_ivan.png",
            firma_persona_cargo: clientSignatureData,
            nombre_persona_cargo: nombrePersonaCargo || undefined,
          }),
        },
      );

      if (!saveSignResponse.ok) {
        const signResult = await saveSignResponse.json();
        alert(
          "Error al guardar la firma: " +
            (signResult?.error || signResult?.detail || "Error desconocido"),
        );
        return;
      }

      const finalizeResponse = await fetch(
        `${URL_API}/reporte_secadora/finalizar-reporte/${folio}`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      const finalizeResult = await finalizeResponse.json();

      if (finalizeResult?.success) {
        alert("Reporte firmado y terminado exitosamente!");
        loadReportData(folio);
      } else {
        alert(
          "Error al finalizar el reporte: " +
            (finalizeResult?.error || "Error desconocido"),
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert("Error: " + errorMsg);
    } finally {
      setIsSavingSignature(false);
    }
  };

  // ── Render a data card ──────────────────────────────────────────────────

  const DataCard = ({
    label,
    value,
    suffix,
    icon,
  }: {
    label: string;
    value: string | number | boolean | undefined | null;
    suffix?: string;
    icon?: React.ReactNode;
  }) => {
    const displayValue = renderValue(value, suffix);
    const isNA = displayValue === "N/A";

    return (
      <div
        className={`relative rounded-xl border p-4 transition-all ${
          isNA
            ? "bg-gray-50/50 border-gray-200"
            : "bg-white border-gray-200 shadow-sm hover:shadow-md"
        }`}
      >
        {icon && (
          <div className="absolute top-3 right-3 text-gray-300">{icon}</div>
        )}
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
          {label}
        </p>
        <p
          className={`text-lg font-semibold ${isNA ? "text-gray-400" : "text-gray-900"}`}
        >
          {displayValue}
        </p>
      </div>
    );
  };

  // ── Render a status item (for element functioning) ────────────────────

  const StatusItem = ({
    label,
    value,
  }: {
    label: string;
    value: string | undefined | null;
  }) => {
    const displayValue = value || "N/A";
    const badgeClass = getStatusBadge(value);
    const isNA = !value || value === "N/A";

    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-all">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}
        >
          {isNA ? (
            <span className="flex items-center gap-1">
              <AlertCircle size={12} /> N/A
            </span>
          ) : (
            displayValue
          )}
        </span>
      </div>
    );
  };

  // ── Render photo section ──────────────────────────────────────────────

  const renderPhotoSection = (
    categories: { key: string; label: string }[],
    sectionTitle: string,
  ) => {
    const grouped: { label: string; urls: string[] }[] = [];
    categories.forEach(({ key, label }) => {
      const photos = fotosPorCategoria[key];
      if (photos && photos.length > 0) {
        grouped.push({ label, urls: photos });
      }
    });

    if (grouped.length === 0) return null;

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-cyan-500 rounded-full" />
          {sectionTitle}
        </h2>
        {grouped.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-6" : ""}>
            <h3 className="font-medium text-gray-600 mb-3 text-sm uppercase tracking-wider px-1">
              {group.label}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.urls.map((fotoUrl, index) => (
                <div
                  key={index}
                  className="cursor-pointer group relative rounded-xl overflow-hidden border border-gray-100 hover:border-cyan-300 transition-all hover:shadow-lg"
                  onClick={() => openImageModal(fotoUrl)}
                >
                  <Image
                    src={fotoUrl}
                    width={400}
                    height={400}
                    unoptimized
                    alt={`${group.label} - Foto ${index + 1}`}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Photo categories
  const photoCategories = [
    { key: "PRESIONES", label: "Presiones e Indicadores" },
    { key: "EQUIPO", label: "Equipo General" },
    { key: "MANTENIMIENTO", label: "Mantenimiento" },
    { key: "OTROS", label: "Otros" },
  ];

  const knownKeys = new Set(photoCategories.map((c) => c.key));
  const remainingCategories = Object.keys(fotosPorCategoria).filter(
    (cat) => !knownKeys.has(cat),
  );

  // ── Loading / Error states ────────────────────────────────────────────

  if (loading) {
    return (
      <LoadingOverlay isVisible={true} message="Cargando reporte..." />
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-600 text-lg">
            {error || "Reporte no encontrado"}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const { orden, equipo, ciclos_tiempos, presiones_lecturas, funcionamiento_elementos, observaciones } = reportData;

  // ── Main Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50/30 p-4 md:p-8">
      <div className="no-print">
        <BackButton />
      </div>

      <div className="max-w-6xl mx-auto mt-4 space-y-6">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-700 via-cyan-800 to-blue-900 text-white shadow-xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-5">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                  <Image
                    src="/Ventologix_05.png"
                    alt="Ventologix Logo"
                    width={48}
                    height={48}
                    style={{ width: "auto", height: "auto" }}
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    VENTOLOGIX
                  </h1>
                  <p className="text-cyan-200 text-sm font-medium mt-0.5">
                    Reporte de Mantenimiento — Secadora
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-cyan-300 uppercase tracking-wider">
                  Folio
                </p>
                <p className="text-3xl font-bold mt-1">{orden.folio}</p>
                <p className="text-sm text-cyan-200 mt-2">
                  {formatDate(orden.fecha_creacion)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Client & Order Info ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-cyan-500 rounded-full" />
              Informaci&oacute;n General
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <DataCard
                label="Cliente"
                value={orden.nombre_cliente}
                icon={<Info size={16} />}
              />
              <DataCard label="&Aacute;rea" value={orden.area} />
              <DataCard
                label="Fecha"
                value={formatDate(orden.fecha_programada)}
              />
              <DataCard label="T&eacute;cnico" value={orden.tecnico} />
              <DataCard
                label="Tipo de Visita"
                value={orden.tipo_visita}
              />
              <DataCard
                label="Tipo de Mantenimiento"
                value={orden.tipo_mantenimiento}
              />
              <DataCard label="Prioridad" value={orden.prioridad} />
              <div
                className={`relative rounded-xl border p-4 transition-all ${
                  orden.estado === "terminado"
                    ? "bg-emerald-50 border-emerald-200"
                    : orden.estado === "en_progreso"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-white border-gray-200 shadow-sm"
                }`}
              >
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Estado
                </p>
                <p
                  className={`text-lg font-semibold ${
                    orden.estado === "terminado"
                      ? "text-emerald-700"
                      : orden.estado === "en_progreso"
                        ? "text-amber-700"
                        : "text-gray-900"
                  }`}
                >
                  {orden.estado || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Equipment Data ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-500 rounded-full" />
              <Wrench size={18} className="text-blue-500" />
              Datos del Equipo
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DataCard label="Marca" value={equipo?.marca} />
              <DataCard label="Modelo" value={equipo?.modelo} />
              <DataCard
                label="N&uacute;mero de Serie"
                value={equipo?.numero_serie}
              />
              <DataCard label="Arrancador" value={equipo?.arrancador} />
              <DataCard
                label="Tipo de Compresor"
                value={equipo?.tipo_compresor}
              />
              <DataCard
                label="HP de Compresor"
                value={equipo?.hp_compresor}
              />
              <DataCard
                label="Tipo de Refrigerante"
                value={equipo?.tipo_refrigerante}
              />
              <DataCard
                label="Voltaje"
                value={equipo?.voltaje}
                suffix=" V"
                icon={<Zap size={16} />}
              />
              <DataCard
                label="Marca de Motor"
                value={equipo?.marca_motor}
              />
              <DataCard
                label="HP Motor Condensador"
                value={equipo?.hp_motor_condensador}
              />
            </div>
          </div>
        </div>

        {/* ─── Cycles & Times ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-violet-500 rounded-full" />
              <Clock size={18} className="text-violet-500" />
              Ciclos y Tiempos
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DataCard
                label="Punto de Roc&iacute;o"
                value={ciclos_tiempos?.punto_rocio}
                icon={<Thermometer size={16} />}
              />
              <DataCard label="Ciclos" value={ciclos_tiempos?.ciclos} />
              <DataCard
                label="Tiempo"
                value={ciclos_tiempos?.tiempo}
                icon={<Clock size={16} />}
              />
              <DataCard
                label="Pre Filtro"
                value={ciclos_tiempos?.pre_filtro}
              />
              <DataCard
                label="Post Filtro"
                value={ciclos_tiempos?.post_filtro}
              />
            </div>
          </div>
        </div>

        {/* ─── Pressures & Readings ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-amber-500 rounded-full" />
              <Gauge size={18} className="text-amber-500" />
              Presiones y Lecturas
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Pressure gauges */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Man&oacute;metros y Presiones
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DataCard
                  label="Man&oacute;metro Torre 1"
                  value={presiones_lecturas?.manometro_torre_1}
                  suffix=" psig"
                  icon={<Gauge size={16} />}
                />
                <DataCard
                  label="Man&oacute;metro Torre 2"
                  value={presiones_lecturas?.manometro_torre_2}
                  suffix=" psig"
                  icon={<Gauge size={16} />}
                />
                <DataCard
                  label="Presi&oacute;n Descarga"
                  value={presiones_lecturas?.presion_descarga}
                  suffix=" psig"
                />
                <DataCard
                  label="Presi&oacute;n Succi&oacute;n"
                  value={presiones_lecturas?.presion_succion}
                  suffix=" psig"
                />
              </div>
            </div>

            {/* Temperatures */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Temperaturas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DataCard
                  label="Temperatura Aire Entrada"
                  value={presiones_lecturas?.temp_aire_entrada}
                  suffix=" &deg;C"
                  icon={<Thermometer size={16} />}
                />
                <DataCard
                  label="Temperatura Aire Salida"
                  value={presiones_lecturas?.temp_aire_salida}
                  suffix=" &deg;C"
                  icon={<Thermometer size={16} />}
                />
              </div>
            </div>

            {/* Electrical */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Lecturas El&eacute;ctricas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DataCard
                  label="Amperaje"
                  value={presiones_lecturas?.amperaje}
                  suffix=" A"
                  icon={<Zap size={16} />}
                />
                <DataCard
                  label="Amperaje Condensador"
                  value={presiones_lecturas?.amperaje_condensador}
                  suffix=" A"
                />
                <DataCard
                  label="Voltaje Compresor"
                  value={presiones_lecturas?.voltaje_compresor}
                  suffix=" V"
                  icon={<Zap size={16} />}
                />
                <DataCard
                  label="Voltaje Motor Condensador"
                  value={presiones_lecturas?.voltaje_motor_condensador}
                  suffix=" V"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Element Functioning ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-emerald-500 rounded-full" />
              <CheckCircle size={18} className="text-emerald-500" />
              Funcionamiento de Elementos
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(elementFunctioningFieldsMap).map(
                ([field, displayName]) => (
                  <StatusItem
                    key={field}
                    label={displayName}
                    value={
                      funcionamiento_elementos?.[
                        field as keyof ElementFunctioningData
                      ] as string
                    }
                  />
                ),
              )}
            </div>
          </div>
        </div>

        {/* ─── Observations ───────────────────────────────────────────── */}
        {observaciones && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <div className="w-1 h-6 bg-gray-500 rounded-full" />
                <FileText size={18} className="text-gray-500" />
                Observaciones
              </h2>
            </div>
            <div className="p-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-5 border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {observaciones}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Photos ─────────────────────────────────────────────────── */}
        {renderPhotoSection(photoCategories, "Evidencia Fotogr\u00e1fica")}

        {/* Remaining uncategorized photos */}
        {remainingCategories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-gray-400 rounded-full" />
              Otras Fotos
            </h2>
            {remainingCategories.map((cat) => (
              <div
                key={cat}
                className={
                  remainingCategories.indexOf(cat) > 0 ? "mt-6" : ""
                }
              >
                {remainingCategories.length > 1 && (
                  <h3 className="font-medium text-gray-600 mb-3 text-sm uppercase tracking-wider px-1">
                    {cat.replace(/_/g, " ")}
                  </h3>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {fotosPorCategoria[cat].map((fotoUrl, index) => (
                    <div
                      key={index}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-gray-100 hover:border-cyan-300 transition-all hover:shadow-lg"
                      onClick={() => openImageModal(fotoUrl)}
                    >
                      <Image
                        src={fotoUrl}
                        width={400}
                        height={400}
                        unoptimized
                        alt={`${cat} - Foto ${index + 1}`}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Signature Section (when pending) ───────────────────────── */}
        {orden?.estado === "por_firmar" && (
          <div className="no-print bg-white rounded-2xl shadow-sm border-2 border-cyan-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
              <div className="w-1 h-6 bg-cyan-500 rounded-full" />
              Firma del Cliente — Pendiente
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Para finalizar el reporte se requiere la firma del cliente o
              persona a cargo.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 text-sm">
                  Firma del Cliente / Persona a Cargo
                </h3>
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={nombrePersonaCargo}
                    onChange={(e) => setNombrePersonaCargo(e.target.value)}
                    placeholder="Nombre completo..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
                  />
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
                  <SignatureCanvas
                    ref={clientSignatureRef}
                    penColor="black"
                    canvasProps={{
                      width: 500,
                      height: 180,
                      className: "w-full",
                      style: { touchAction: "none" },
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => clientSignatureRef.current?.clear()}
                  className="mt-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                >
                  Limpiar
                </button>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2 text-sm">
                  T&eacute;cnico Ventologix
                </h3>
                <div
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex items-center justify-center"
                  style={{ height: 220 }}
                >
                  <Image
                    src="/firma_ivan.png"
                    alt="Firma del t&eacute;cnico Ventologix"
                    width={200}
                    height={100}
                    className="object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSignatureAndFinish}
                disabled={isSavingSignature}
                className="px-8 py-3 bg-cyan-700 text-white rounded-xl hover:bg-cyan-800 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isSavingSignature
                  ? "Guardando..."
                  : "Guardar Firma y Terminar Reporte"}
              </button>
            </div>
          </div>
        )}

        {/* ─── Footer Actions ─────────────────────────────────────────── */}
        <div className="no-print bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            Volver
          </button>
          <button
            onClick={handleViewPdf}
            className="px-5 py-2.5 bg-cyan-700 text-white rounded-xl hover:bg-cyan-800 transition-colors font-medium text-sm flex items-center space-x-2 shadow-sm"
          >
            <FileText size={18} />
            <span>Descargar PDF</span>
          </button>
        </div>
      </div>

      {/* ─── Image Modal ────────────────────────────────────────────── */}
      {imageModal.isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]"
          onClick={closeImageModal}
        >
          <button
            onClick={closeImageModal}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors z-10 backdrop-blur-sm"
          >
            <X size={28} />
          </button>
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            <Image
              src={imageModal.imageSrc}
              alt="Foto ampliada"
              fill
              unoptimized
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

export default function ViewDryerReport() {
  return (
    <Suspense
      fallback={<LoadingOverlay isVisible={true} message="Cargando..." />}
    >
      <ViewDryerReportContent />
    </Suspense>
  );
}
