"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/BackButton";
import LoadingOverlay from "@/components/LoadingOverlay";
import { URL_API } from "@/lib/global";
import Image from "next/image";
import {
  FileText,
  X,
  Thermometer,
  Gauge,
  Zap,
  Clock,
  Wrench,
  Wind,
  CheckCircle,
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

// ── Interfaces ───────────────────────────────────────────────────────────────

interface DryerReport {
  id: number;
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
  tipo_refrigerante: string | null;
  ubicacion: string;
  horometro: string | number | null;
  voltaje: string | number | null;
  amperaje: string | number | null;
  ciclo_refrigeracion: string | number | null;
  ciclo_drenado: string | number | null;
  tiempo_drenado: string | number | null;
  tiempo_ciclo: string | number | null;
  presion_alta: string | number | null;
  presion_baja: string | number | null;
  temp_entrada_aire: string | number | null;
  temp_salida_aire: string | number | null;
  punto_rocio: string | number | null;
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
  estado: string;
  nombre_persona_cargo: string | null;
  firma_persona_cargo: string | null;
  firma_tecnico_ventologix: string | null;
  created_at: string;
  updated_at: string;
  fotos_por_categoria: Record<string, string[]>;
}

const COMPONENT_FIELDS: { key: keyof DryerReport; label: string }[] = [
  { key: "drenaje_condensado", label: "Drenaje de Condensado" },
  { key: "intercambiador_calor", label: "Intercambiador de Calor" },
  { key: "evaporadora", label: "Evaporadora" },
  { key: "valvula_expansion", label: "Válvula de Expansión" },
  { key: "filtro_deshidratador", label: "Filtro Deshidratador" },
  { key: "condensador", label: "Condensador" },
  { key: "ventiladores_condensador", label: "Ventiladores del Condensador" },
  { key: "motor_ventilador", label: "Motor del Ventilador" },
  { key: "compresor_refrigeracion", label: "Compresor de Refrigeración" },
  { key: "cableado_electrico", label: "Cableado Eléctrico" },
  { key: "contactores_relevadores", label: "Contactores y Relevadores" },
  { key: "tarjeta_control", label: "Tarjeta de Control" },
  { key: "drenaje_automatico", label: "Drenaje Automático" },
  { key: "sensor_punto_rocio", label: "Sensor de Punto de Rocío" },
  { key: "estado_general", label: "Estado General" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function rv(value: string | number | null | undefined, suffix = "") {
  if (value === null || value === undefined || value === "") return "N/A";
  return suffix ? `${value}${suffix}` : String(value);
}

function statusBadgeClass(value: string | null | undefined) {
  if (!value) return "bg-gray-100 text-gray-500 border-gray-200";
  const v = value.toLowerCase();
  if (v === "buen estado") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v === "regular") return "bg-amber-50 text-amber-700 border-amber-200";
  if (v === "requiere atención" || v === "requiere atencion")
    return "bg-red-50 text-red-700 border-red-200";
  return "bg-gray-100 text-gray-500 border-gray-200";
}

function formatDate(s: string | null | undefined) {
  if (!s) return "N/A";
  return new Date(s).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────

function DataCard({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: string | number | null | undefined;
  suffix?: string;
  icon?: React.ReactNode;
}) {
  const display = rv(value, suffix);
  const isNA = display === "N/A";
  return (
    <div
      className={`relative rounded-xl border p-4 ${
        isNA
          ? "bg-gray-50/50 border-gray-200"
          : "bg-white border-gray-200 shadow-sm hover:shadow-md"
      }`}
    >
      {icon && <div className="absolute top-3 right-3 text-gray-300">{icon}</div>}
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-lg font-semibold ${isNA ? "text-gray-400" : "text-gray-900"}`}>
        {display}
      </p>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value || "—";
  const badgeClass = statusBadgeClass(value);
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-all">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}>
        {display}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

function ViewDryerReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [report, setReport] = useState<DryerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<{ open: boolean; src: string }>({
    open: false,
    src: "",
  });
  const [nombrePersonaCargo, setNombrePersonaCargo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const clientSignatureRef = useRef<SignatureCanvas>(null);

  const folio = searchParams.get("folio");

  useEffect(() => {
    if (!folio) {
      setError("No se proporcionó un folio");
      setLoading(false);
      return;
    }
    fetch(`${URL_API}/reporte_secadora/reporte-completo/${folio}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setReport(res.data);
        } else {
          setError(res.error || "Reporte no encontrado");
        }
      })
      .catch(() => setError("Error al cargar el reporte"))
      .finally(() => setLoading(false));
  }, [folio]);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!folio) return;
    setIsDownloadingPdf(true);
    try {
      const response = await fetch(`${URL_API}/reporte_secadora/descargar-pdf/${folio}`);
      if (!response.ok) {
        alert("Error al generar el PDF. Inténtalo de nuevo.");
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
      alert("Error al descargar el PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSaveSignatureAndFinish = async () => {
    if (!folio) return;
    if (!clientSignatureRef.current || clientSignatureRef.current.isEmpty()) {
      alert("Por favor agregue la firma del cliente antes de guardar.");
      return;
    }
    setIsSaving(true);
    try {
      const firmaCliente = clientSignatureRef.current.getCanvas().toDataURL("image/png");

      const signRes = await fetch(`${URL_API}/reporte_secadora/firmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folio,
          firma_tecnico_ventologix: "/firma_ivan.png",
          firma_persona_cargo: firmaCliente,
          nombre_persona_cargo: nombrePersonaCargo || null,
        }),
      });
      if (!signRes.ok) {
        const r = await signRes.json();
        alert("Error al guardar la firma: " + (r?.detail || "Error desconocido"));
        return;
      }

      const finalRes = await fetch(
        `${URL_API}/reporte_secadora/finalizar-reporte/${folio}`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      const finalData = await finalRes.json();
      if (finalData.success) {
        alert("Reporte firmado y terminado exitosamente!");
        // Reload
        const r = await fetch(`${URL_API}/reporte_secadora/reporte-completo/${folio}`).then((x) =>
          x.json(),
        );
        if (r.success) setReport(r.data);
      } else {
        alert("Error al finalizar: " + (finalData.error || "Error desconocido"));
      }
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading / Error ──────────────────────────────────────────────────────

  if (loading) return <LoadingOverlay isVisible message="Cargando reporte..." />;

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-600 text-lg">{error || "Reporte no encontrado"}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const fotos = report.fotos_por_categoria || {};

  // ── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50/30 p-4 md:p-8">
      <div className="no-print">
        <BackButton />
      </div>

      <div className="max-w-6xl mx-auto mt-4 space-y-6">
        {/* ─── Header ──────────────────────────────────────────────────── */}
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
                    alt="Ventologix"
                    width={48}
                    height={48}
                    style={{ width: "auto", height: "auto" }}
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">VENTOLOGIX</h1>
                  <p className="text-cyan-200 text-sm font-medium mt-0.5">
                    Reporte de Mantenimiento — Secadora
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-cyan-300 uppercase tracking-wider">Folio</p>
                <p className="text-3xl font-bold mt-1">{report.folio}</p>
                <p className="text-sm text-cyan-200 mt-2">{formatDate(report.fecha)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Información General ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-cyan-500 rounded-full" />
              Información General
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DataCard label="Cliente" value={report.cliente} />
            <DataCard label="No. Cliente" value={report.numero_cliente} />
            <DataCard label="RFC" value={report.rfc} />
            <DataCard label="Dirección" value={report.direccion} />
            <DataCard label="Ingeniero de Obra" value={report.ingeniero_obra} />
            <DataCard label="Ingeniero Ventologix" value={report.ingeniero_ventologix} />
          </div>
        </div>

        {/* ─── Datos del Equipo ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-500 rounded-full" />
              <Wrench size={18} className="text-blue-500" />
              Datos del Equipo
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DataCard label="Equipo" value={report.equipo} />
            <DataCard label="Modelo" value={report.modelo} />
            <DataCard label="No. Serie" value={report.no_serie} />
            <DataCard label="Tipo Refrigerante / Desecante" value={report.tipo_refrigerante} />
            <DataCard label="Ubicación" value={report.ubicacion} />
            <DataCard label="Horómetro" value={report.horometro} suffix=" h" icon={<Clock size={16} />} />
          </div>
        </div>

        {/* ─── Lecturas Eléctricas ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-yellow-500 rounded-full" />
              <Zap size={18} className="text-yellow-500" />
              Lecturas Eléctricas
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <DataCard label="Voltaje" value={report.voltaje} suffix=" V" icon={<Zap size={16} />} />
            <DataCard label="Amperaje" value={report.amperaje} suffix=" A" icon={<Zap size={16} />} />
          </div>
        </div>

        {/* ─── Ciclos y Tiempos ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-violet-500 rounded-full" />
              <Clock size={18} className="text-violet-500" />
              Ciclos y Tiempos
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DataCard label="Ciclo de Refrigeración" value={report.ciclo_refrigeracion} suffix=" s" />
            <DataCard label="Ciclo de Drenado" value={report.ciclo_drenado} suffix=" s" />
            <DataCard label="Tiempo de Drenado" value={report.tiempo_drenado} suffix=" s" />
            <DataCard label="Tiempo de Ciclo" value={report.tiempo_ciclo} suffix=" s" />
          </div>
        </div>

        {/* ─── Presiones y Temperaturas ────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-amber-500 rounded-full" />
              <Gauge size={18} className="text-amber-500" />
              Presiones y Temperaturas
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataCard label="Presión Alta" value={report.presion_alta} suffix=" psig" icon={<Gauge size={16} />} />
              <DataCard label="Presión Baja" value={report.presion_baja} suffix=" psig" icon={<Gauge size={16} />} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DataCard label="Temp. Entrada Aire" value={report.temp_entrada_aire} suffix=" °C" icon={<Thermometer size={16} />} />
              <DataCard label="Temp. Salida Aire" value={report.temp_salida_aire} suffix=" °C" icon={<Thermometer size={16} />} />
              <DataCard label="Punto de Rocío" value={report.punto_rocio} suffix=" °C" icon={<Wind size={16} />} />
            </div>
          </div>
        </div>

        {/* ─── Estado de Componentes ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-emerald-500 rounded-full" />
              <CheckCircle size={18} className="text-emerald-500" />
              Estado de Componentes
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            {COMPONENT_FIELDS.map(({ key, label }) => (
              <StatusItem key={key} label={label} value={report[key] as string} />
            ))}
          </div>
        </div>

        {/* ─── Observaciones ───────────────────────────────────────────── */}
        {report.observaciones && (
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
                  {report.observaciones}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Fotos ───────────────────────────────────────────────────── */}
        {Object.keys(fotos).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-cyan-500 rounded-full" />
              Evidencia Fotográfica
            </h2>
            {Object.entries(fotos).map(([cat, urls]) => (
              <div key={cat} className="mb-6">
                <h3 className="font-medium text-gray-600 mb-3 text-sm uppercase tracking-wider px-1">
                  {cat.replace(/_/g, " ")}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {urls.map((url, i) => (
                    <div
                      key={i}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-gray-100 hover:border-cyan-300 transition-all hover:shadow-lg"
                      onClick={() => setImageModal({ open: true, src: url })}
                    >
                      <Image
                        src={url}
                        width={400}
                        height={400}
                        unoptimized
                        alt={`${cat} - Foto ${i + 1}`}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Firmas ──────────────────────────────────────────────────── */}
        {report.firma_persona_cargo ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-emerald-500 rounded-full" />
              Firmas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">
                  Cliente / Persona a Cargo
                  {report.nombre_persona_cargo && (
                    <span className="ml-2 text-gray-400 font-normal">
                      — {report.nombre_persona_cargo}
                    </span>
                  )}
                </h3>
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.firma_persona_cargo}
                    alt="Firma cliente"
                    className="max-h-32 object-contain"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Técnico Ventologix</h3>
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex items-center justify-center" style={{ minHeight: 100 }}>
                  <Image
                    src="/firma_ivan.png"
                    alt="Firma técnico"
                    width={200}
                    height={80}
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Pending signature */
          <div className="no-print bg-white rounded-2xl shadow-sm border-2 border-cyan-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
              <div className="w-1 h-6 bg-cyan-500 rounded-full" />
              Firma del Cliente — Pendiente
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Para finalizar el reporte se requiere la firma del cliente o persona a cargo.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 text-sm">
                  Firma del Cliente / Persona a Cargo
                </h3>
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">Nombre</label>
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
                  className="mt-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs font-medium"
                >
                  Limpiar
                </button>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 text-sm">Técnico Ventologix</h3>
                <div
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex items-center justify-center"
                  style={{ height: 220 }}
                >
                  <Image
                    src="/firma_ivan.png"
                    alt="Firma técnico"
                    width={200}
                    height={100}
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveSignatureAndFinish}
                disabled={isSaving}
                className="px-8 py-3 bg-cyan-700 text-white rounded-xl hover:bg-cyan-800 font-medium text-sm disabled:opacity-50 shadow-sm"
              >
                {isSaving ? "Guardando..." : "Guardar Firma y Terminar Reporte"}
              </button>
            </div>
          </div>
        )}

        {/* ─── Footer ──────────────────────────────────────────────────── */}
        <div className="no-print bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium text-sm"
          >
            Volver
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className={`px-5 py-2.5 text-white rounded-xl font-medium text-sm flex items-center space-x-2 shadow-sm ${
              isDownloadingPdf ? "bg-cyan-400 cursor-not-allowed" : "bg-cyan-700 hover:bg-cyan-800"
            }`}
          >
            {isDownloadingPdf ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Generando PDF...</span>
              </>
            ) : (
              <>
                <FileText size={18} />
                <span>Descargar PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Image Modal ─────────────────────────────────────────────── */}
      {imageModal.open && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]"
          onClick={() => setImageModal({ open: false, src: "" })}
        >
          <button
            onClick={() => setImageModal({ open: false, src: "" })}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 z-10"
          >
            <X size={28} />
          </button>
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            <Image
              src={imageModal.src}
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
    <Suspense fallback={<LoadingOverlay isVisible message="Cargando..." />}>
      <ViewDryerReportContent />
    </Suspense>
  );
}
