"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/BackButton";
import LoadingOverlay from "@/components/LoadingOverlay";
import { URL_API } from "@/lib/global";
import { CheckCircle, XCircle, FileText, X, Pencil, Save, XOctagon } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { useDialog } from "@/hooks/useDialog";

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
  display_enciende_final?: string;
  horas_totales_final?: number;
  horas_carga_final?: number;
  horas_descarga_final?: number;
  voltaje_alimentacion_final?: number;
  amperaje_motor_carga_final?: number;
  amperaje_ventilador_final?: number;
  fugas_aceite_final?: string;
  fugas_aire_final?: string;
  aceite_oscuro_final?: string;
  temp_ambiente_final?: number;
  temp_compresion_display_final?: number;
  temp_compresion_laser_final?: number;
  temp_separador_aceite_final?: number;
  temp_interna_cuarto_final?: number;
  delta_t_enfriador_aceite_final?: number;
  temp_motor_electrico_final?: number;
  presion_carga_final?: number;
  presion_descarga_final?: number;
  delta_p_separador_final?: number;
  nombre_persona_cargo?: string;
  firma_persona_cargo?: string;
  firma_tecnico_ventologix?: string;
}

interface FotosPorCategoria {
  [category: string]: string[];
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
  const { showSuccess, showError, showWarning } = useDialog();

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [preMaintenanceData, setPreMaintenanceData] =
    useState<PreMaintenanceData | null>(null);
  const [maintenanceData, setMaintenanceData] =
    useState<MaintenanceData | null>(null);
  const [postMaintenanceData, setPostMaintenanceData] =
    useState<PostMaintenanceData | null>(null);
  const [fotosPorCategoria, setFotosPorCategoria] = useState<FotosPorCategoria>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<ImageModalState>({
    isOpen: false,
    imageSrc: "",
  });
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [nombrePersonaCargo, setNombrePersonaCargo] = useState("");
  const clientSignatureRef = useRef<SignatureCanvas>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPre, setEditedPre] = useState<PreMaintenanceData | null>(null);
  const [editedMaintenance, setEditedMaintenance] = useState<MaintenanceData | null>(null);
  const [editedPost, setEditedPost] = useState<PostMaintenanceData | null>(null);

  useEffect(() => {
    const folio = searchParams.get("folio");
    if (folio) {
      loadAllReportData(folio);
    } else {
      setError("No se proporcionó un folio");
      setLoading(false);
    }
    // Auto-enter edit mode if ?edit=true
    if (searchParams.get("edit") === "true") {
      setIsEditing(true);
    }
  }, [searchParams]);

  const loadAllReportData = async (folio: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch complete report data (includes photos)
      const completeReportRes = await fetch(
        `${URL_API}/reporte_mtto/reporte-completo/${folio}`,
      );

      if (!completeReportRes.ok) {
        setError("No se encontró el reporte");
        setLoading(false);
        return;
      }

      const completeResult = await completeReportRes.json();

      if (!completeResult.success) {
        setError(completeResult.error || "Error al cargar el reporte");
        setLoading(false);
        return;
      }

      const reportData = completeResult.data;

      // Set all report data
      if (reportData.orden) {
        setOrderData(reportData.orden);
      }
      if (reportData.pre_mantenimiento) {
        setPreMaintenanceData(reportData.pre_mantenimiento);
      }
      if (reportData.mantenimiento) {
        setMaintenanceData(reportData.mantenimiento);
      }
      if (reportData.post_mantenimiento) {
        setPostMaintenanceData(reportData.post_mantenimiento);
      }
      if (reportData.fotos_por_categoria && Object.keys(reportData.fotos_por_categoria).length > 0) {
        setFotosPorCategoria(reportData.fotos_por_categoria);
      } else if (reportData.fotos_drive && reportData.fotos_drive.length > 0) {
        setFotosPorCategoria({ OTROS: reportData.fotos_drive });
      }

      // If edit mode was requested, populate edited data
      if (searchParams.get("edit") === "true") {
        if (reportData.pre_mantenimiento) setEditedPre({ ...reportData.pre_mantenimiento });
        if (reportData.mantenimiento) setEditedMaintenance({ ...reportData.mantenimiento });
        if (reportData.post_mantenimiento) setEditedPost({ ...reportData.post_mantenimiento });
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

  const openImageModal = (imageSrc: string) => {
    setImageModal({ isOpen: true, imageSrc });
  };

  const closeImageModal = () => {
    setImageModal({ isOpen: false, imageSrc: "" });
  };

  const handleViewPdf = async () => {
    const folio = searchParams.get("folio");
    if (!folio) return;

    setIsDownloadingPdf(true);
    try {
      const response = await fetch(
        `${URL_API}/reporte_mtto/descargar-pdf-react/${folio}`,
        { signal: AbortSignal.timeout(120000) }, // 2 minutos de timeout para reportes con muchas fotos
      );
      if (!response.ok) {
        showError("Error", "No se pudo generar el PDF. Inténtalo de nuevo.");
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
      showError("Error", "No se pudo descargar el PDF. Inténtalo de nuevo.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSaveSignatureAndFinish = async () => {
    const folio = searchParams.get("folio");
    if (!folio) return;

    if (!clientSignatureRef.current || clientSignatureRef.current.isEmpty()) {
      showWarning("Firma requerida", "Por favor agregue la firma del cliente/persona a cargo antes de guardar.");
      return;
    }

    setIsSavingSignature(true);
    try {
      const clientCanvas = clientSignatureRef.current.getCanvas();
      const clientSignatureData = clientCanvas.toDataURL("image/png");

      // Save client signature + static technician signature
      const saveSignResponse = await fetch(`${URL_API}/reporte_mtto/post-mtto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folio,
          firma_tecnico_ventologix: "/firma_ivan.png",
          firma_persona_cargo: clientSignatureData,
          nombre_persona_cargo: nombrePersonaCargo || undefined,
        }),
      });

      if (!saveSignResponse.ok) {
        const signResult = await saveSignResponse.json();
        showError("Error al guardar firma", signResult?.error || signResult?.detail || "Error desconocido");
        return;
      }

      // Finalize the report (sets status to terminado)
      const finalizeResponse = await fetch(
        `${URL_API}/reporte_mtto/finalizar-reporte/${folio}`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      const finalizeResult = await finalizeResponse.json();

      if (finalizeResult?.success) {
        showSuccess("Reporte Finalizado", "El reporte fue firmado y terminado exitosamente");
        loadAllReportData(folio);
      } else {
        const errorMsg = finalizeResult?.error || "Error desconocido al finalizar";
        showError("Error al finalizar reporte", errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showError("Error", errorMsg);
    } finally {
      setIsSavingSignature(false);
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

  // Start editing - clone all data
  const startEditing = () => {
    setEditedPre(preMaintenanceData ? { ...preMaintenanceData } : null);
    setEditedMaintenance(maintenanceData ? { ...maintenanceData } : null);
    setEditedPost(postMaintenanceData ? { ...postMaintenanceData } : null);
    setIsEditing(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditedPre(null);
    setEditedMaintenance(null);
    setEditedPost(null);
    setIsEditing(false);
  };

  // Save all edited data
  const saveEdits = async () => {
    const folio = searchParams.get("folio");
    if (!folio) return;

    setIsSaving(true);
    try {
      const sections: { name: string; promise: Promise<Response> }[] = [];

      if (editedPre) {
        sections.push({
          name: "Pre-mantenimiento",
          promise: fetch(`${URL_API}/reporte_mtto/pre-mtto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editedPre),
          }),
        });
      }

      if (editedMaintenance) {
        sections.push({
          name: "Mantenimiento",
          promise: fetch(`${URL_API}/reporte_mantenimiento/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editedMaintenance),
          }),
        });
      }

      if (editedPost) {
        sections.push({
          name: "Post-mantenimiento",
          promise: fetch(`${URL_API}/reporte_mtto/post-mtto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editedPost),
          }),
        });
      }

      const results = await Promise.all(sections.map((s) => s.promise));
      const errors: string[] = [];

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (!res.ok) {
          errors.push(`${sections[i].name}: Error HTTP ${res.status}`);
          continue;
        }
        const body = await res.json();
        if (body.success === false) {
          errors.push(`${sections[i].name}: ${body.error || "Error desconocido"}`);
        }
      }

      if (errors.length === 0) {
        showSuccess("Reporte Actualizado", "Los cambios se guardaron correctamente");
        setIsEditing(false);
        setEditedPre(null);
        setEditedMaintenance(null);
        setEditedPost(null);
        loadAllReportData(folio);
      } else {
        showError("Error al guardar cambios", errors.join("\n"));
      }
    } catch (err) {
      console.error("Error saving edits:", err);
      showError("Error", "No se pudieron guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  // Editable field renderer
  const renderField = (
    dataObj: Record<string, unknown> | null,
    field: string,
    editedObj: Record<string, unknown> | null,
    setEditedObj: (obj: Record<string, unknown> | null) => void,
    options?: { suffix?: string; type?: "text" | "number" | "select"; selectOptions?: string[] },
  ) => {
    const value = dataObj ? dataObj[field] : undefined;

    if (!isEditing || !editedObj) {
      return (
        <p className="text-gray-800 font-semibold bg-gray-100 p-2 rounded">
          {renderValue(value as string | number | boolean | undefined | null, options?.suffix)}
        </p>
      );
    }

    const editValue = editedObj[field] ?? "";

    if (options?.type === "select" && options.selectOptions) {
      return (
        <select
          value={String(editValue)}
          onChange={(e) => setEditedObj({ ...editedObj, [field]: e.target.value })}
          className="w-full p-2 border border-blue-300 rounded bg-blue-50 font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">—</option>
          {options.selectOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={options?.type === "number" ? "number" : "text"}
        value={String(editValue)}
        onChange={(e) => {
          const val = options?.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value;
          setEditedObj({ ...editedObj, [field]: val });
        }}
        className="w-full p-2 border border-blue-300 rounded bg-blue-50 font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    );
  };

  // Shortcut helpers
  const preField = (field: string, opts?: { suffix?: string; type?: "text" | "number" | "select"; selectOptions?: string[] }) =>
    renderField(
      preMaintenanceData as unknown as Record<string, unknown>,
      field,
      editedPre as unknown as Record<string, unknown>,
      (obj) => setEditedPre(obj as unknown as PreMaintenanceData),
      opts,
    );

  const postField = (field: string, opts?: { suffix?: string; type?: "text" | "number" | "select"; selectOptions?: string[] }) =>
    renderField(
      postMaintenanceData as unknown as Record<string, unknown>,
      field,
      editedPost as unknown as Record<string, unknown>,
      (obj) => setEditedPost(obj as unknown as PostMaintenanceData),
      opts,
    );

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

  // Render a photo section block with multiple categories
  const renderPhotoSection = (
    categories: { key: string; label: string }[],
    sectionTitle: string,
    bgColor: string,
  ) => {
    const allPhotos: { url: string; label: string }[] = [];
    categories.forEach(({ key, label }) => {
      const photos = fotosPorCategoria[key];
      if (photos && photos.length > 0) {
        photos.forEach((url) => allPhotos.push({ url, label }));
      }
    });
    if (allPhotos.length === 0) return null;

    // Group by label for display
    const grouped: { label: string; urls: string[] }[] = [];
    categories.forEach(({ key, label }) => {
      const photos = fotosPorCategoria[key];
      if (photos && photos.length > 0) {
        grouped.push({ label, urls: photos });
      }
    });

    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2
          className={`text-white ${bgColor} px-4 py-2 rounded font-bold mb-4`}
        >
          {sectionTitle}
        </h2>
        {grouped.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-6" : ""}>
            <h3 className="font-semibold text-gray-700 mb-3 text-base px-2">
              {group.label}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-2">
              {group.urls.map((fotoUrl, index) => (
                <div
                  key={index}
                  className="cursor-pointer transform hover:scale-[1.02] transition-transform"
                  onClick={() => openImageModal(fotoUrl)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fotoUrl}
                    alt={`${group.label} - Foto ${index + 1}`}
                    className="rounded-lg shadow-md w-full h-56 md:h-64 object-cover"
                    loading="eager"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Generate automatic diagnostic based on pre-maintenance data
  const generateDiagnostico = () => {
    if (!preMaintenanceData) return null;

    const positivos: string[] = [];
    const causas: string[] = [];
    const acciones: string[] = [];
    const consecuencias: { [key: string]: number } = {};

    const agregar_consecuencia = (desc: string, grav: number) => {
      if (consecuencias[desc]) {
        consecuencias[desc] = Math.max(consecuencias[desc], grav);
      } else {
        consecuencias[desc] = grav;
      }
    };

    // Temperatura de compresión
    const tempComp = parseFloat(
      String(preMaintenanceData.temp_compresion_display || preMaintenanceData.temp_compresion_laser || "0"),
    );
    if (tempComp >= 80 && tempComp <= 95) {
      positivos.push("Temperatura de compresión dentro de rango óptimo");
    } else if (tempComp > 95 && tempComp <= 105) {
      positivos.push("Temperatura de compresión aceptable para operación continua");
    } else if (tempComp > 0) {
      causas.push("Temperatura de compresión fuera de rango");
      agregar_consecuencia("Riesgo de paro por alta temperatura", 3);
      agregar_consecuencia("Degradación acelerada del aceite", 2);
      acciones.push("Revisar enfriadores, ventilación y aceite");
    }

    // Temperatura del separador
    const tempSep = parseFloat(String(preMaintenanceData.temp_separador_aceite || "0"));
    if (tempSep > 0 && tempSep <= 90) {
      positivos.push("Temperatura del separador aire-aceite adecuada");
    } else if (tempSep <= 95) {
      positivos.push("Temperatura del separador cercana al límite, pero aceptable");
    } else if (tempSep > 95) {
      causas.push("Separador aire-aceite sobrecalentado");
      agregar_consecuencia("Arrastre de aceite a la red", 3);
      acciones.push("Revisar estado del separador y retorno de aceite");
    }

    // Delta T enfriador de aceite
    const deltaT = parseFloat(String(preMaintenanceData.delta_t_enfriador_aceite || "0"));
    if (deltaT >= 15) {
      positivos.push("Enfriador de aceite operando con buena eficiencia térmica");
    } else if (deltaT >= 10 && deltaT < 15) {
      positivos.push("Enfriador de aceite con eficiencia térmica aceptable");
    } else if (deltaT > 0) {
      causas.push("Baja eficiencia del enfriador de aceite");
      agregar_consecuencia("Alta temperatura interna del compresor", 2);
      acciones.push("Limpiar enfriador y revisar ventilador");
    }

    // Diferencial de presión del separador
    const deltaP = parseFloat(String(preMaintenanceData.delta_p_separador || "0"));
    if (deltaP > 0 && deltaP <= 0.2) {
      positivos.push("Separador aire-aceite en condición óptima");
    } else if (deltaP <= 0.7) {
      positivos.push("Separador aire-aceite en condición aceptable");
    } else if (deltaP > 0.7) {
      causas.push("Separador aire-aceite saturado");
      agregar_consecuencia("Incremento en consumo eléctrico", 1);
      agregar_consecuencia("Sobrecarga térmica del compresor", 2);
      acciones.push("Reemplazar separador aire-aceite");
    }

    // Temperatura del motor
    const tempMotor = parseFloat(String(preMaintenanceData.temp_motor_electrico || "0"));
    if (tempMotor > 0 && tempMotor <= 85) {
      positivos.push("Temperatura del motor eléctrico dentro de rango normal");
    } else if (tempMotor <= 90) {
      positivos.push("Temperatura del motor elevada pero aceptable");
    } else if (tempMotor > 90) {
      causas.push("Sobrecalentamiento del motor eléctrico");
      agregar_consecuencia("Disparo de protecciones térmicas", 3);
      agregar_consecuencia("Reducción de vida útil del motor", 2);
      acciones.push("Revisar amperajes, voltaje y presión");
    }

    // Condiciones ambientales
    const polvo = preMaintenanceData.operacion_muchos_polvos === "Sí";
    const ventDeficiente = preMaintenanceData.expulsion_aire_caliente === "Interno al cuarto";
    if (!polvo && !ventDeficiente) {
      positivos.push("Condiciones ambientales y ventilación adecuadas");
    } else {
      causas.push("Condiciones ambientales desfavorables");
      agregar_consecuencia("Ensuciamiento acelerado de enfriadores", 1);
      acciones.push("Mejorar limpieza y ventilación del cuarto");
    }

    // Condición del aceite
    if (preMaintenanceData.aceite_oscuro_degradado === "No") {
      positivos.push("Aceite en buen estado visual");
    } else if (preMaintenanceData.aceite_oscuro_degradado === "Sí") {
      causas.push("Aceite degradado");
      agregar_consecuencia("Lubricación deficiente del tornillo", 3);
      acciones.push("Cambio de aceite y revisión térmica");
    }

    const gravedadGlobal = Math.max(...Object.values(consecuencias), 0);
    const estadoEquipo =
      {
        0: "CONDICIÓN GENERAL BUENA",
        1: "CONDICIÓN ACEPTABLE",
        2: "REQUIERE ATENCIÓN",
        3: "CONDICIÓN CRÍTICA",
      }[gravedadGlobal] || "Sin diagnóstico";

    return { positivos, causas, acciones, consecuencias, estadoEquipo };
  };

  // Categories grouped by report section
  const preMaintenanceCategories = [
    { key: "PLACAS_EQUIPO", label: "Placas del Equipo" },
    { key: "DISPLAY_HORAS", label: "Display / Horas" },
    { key: "TEMPERATURAS", label: "Temperaturas" },
    { key: "PRESIONES", label: "Presiones" },
    { key: "ACEITE", label: "Aceite" },
    { key: "CONDICIONES_AMBIENTALES", label: "Condiciones Ambientales" },
    { key: "TANQUES", label: "Tanques" },
  ];

  const maintenanceCategories = [
    { key: "MANTENIMIENTO", label: "Fotos del Mantenimiento" },
  ];

  const postMaintenanceCategories = [
    { key: "DISPLAY_HORAS_POST", label: "Display / Horas" },
    { key: "ACEITE_POST", label: "Aceite" },
    { key: "TEMPERATURAS_POST", label: "Temperaturas" },
    { key: "PRESIONES_POST", label: "Presiones" },
    { key: "OTROS_POST", label: "Otros" },
  ];

  // All known inline categories
  const inlineKeys = new Set([
    ...preMaintenanceCategories.map((c) => c.key),
    ...maintenanceCategories.map((c) => c.key),
    ...postMaintenanceCategories.map((c) => c.key),
  ]);

  // Remaining categories (OTROS, or anything unexpected)
  const remainingCategories = Object.keys(fotosPorCategoria).filter(
    (cat) => !inlineKeys.has(cat),
  );

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
      <div className="no-print">
        <BackButton />
      </div>

      <div className="max-w-7xl mx-auto mt-4">
        {/* Edit Mode Banner */}
        {isEditing && (
          <div className="no-print bg-amber-50 border-2 border-amber-400 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Pencil className="text-amber-600" size={24} />
              <div>
                <p className="font-bold text-amber-900">Modo Edición</p>
                <p className="text-sm text-amber-700">Los campos editables se muestran con fondo azul. Haz clic en &quot;Guardar Cambios&quot; cuando termines.</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={cancelEditing}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdits}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        )}

        {/* Header Principal */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
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
                <p className="text-3xl font-bold text-white">
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
            <div className="p-4">
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
            <div className="p-4">
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
                  {preField("equipo_enciende", { type: "select", selectOptions: ["Sí", "No"] })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    ¿Display enciende?
                  </label>
                  {preField("display_enciende", { type: "select", selectOptions: ["Sí", "No"] })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Compresor es Master/Slave
                  </label>
                  {preField("compresor_es_master", { type: "select", selectOptions: ["Master", "Slave", "Independiente"] })}
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="p-4 mb-4">
              <h3 className="font-bold text-purple-900 mb-4 text-lg">
                HORAS DE OPERACIÓN
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Horas Totales
                  </label>
                  {preField("horas_totales", { suffix: " hrs", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Horas en Carga
                  </label>
                  {preField("horas_carga", { suffix: " hrs", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Horas en Descarga
                  </label>
                  {preField("horas_descarga", { suffix: " hrs", type: "number" })}
                </div>
              </div>
            </div>

            {/* Electrical Measurements */}
            <div className="p-4 mb-4">
              <h3 className="font-bold text-purple-900 mb-4 text-lg">
                MEDICIONES ELÉCTRICAS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Voltaje de Alimentación
                  </label>
                  {preField("voltaje_alimentacion", { suffix: " V", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Amperaje Motor en Carga
                  </label>
                  {preField("amperaje_motor_carga", { suffix: " A", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Amperaje Ventilador
                  </label>
                  {preField("amperaje_ventilador", { suffix: " A", type: "number" })}
                </div>
              </div>
            </div>

            {/* Temperatures */}
            <div className="p-4 mb-4">
              <h3 className="font-bold text-purple-900 mb-4 text-lg">
                TEMPERATURAS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Temp. Compresión (Display)
                  </label>
                  {preField("temp_compresion_display", { suffix: " °C", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Temp. Compresión (Láser)
                  </label>
                  {preField("temp_compresion_laser", { suffix: " °C", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Temp. Separador Aceite
                  </label>
                  {preField("temp_separador_aceite", { suffix: " °C", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Temp. Interna Cuarto
                  </label>
                  {preField("temp_interna_cuarto", { suffix: " °C", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Delta T Enfriador Aceite
                  </label>
                  {preField("delta_t_enfriador_aceite", { suffix: " °C", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Temp. Motor Eléctrico
                  </label>
                  {preField("temp_motor_electrico", { suffix: " °C", type: "number" })}
                </div>
              </div>
            </div>

            {/* Pressures */}
            <div className="p-4 mb-4">
              <h3 className="font-bold text-purple-900 mb-4 text-lg">
                PRESIONES
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Método Control Presión
                  </label>
                  {preField("metodo_control_presion")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Presión en Carga
                  </label>
                  {preField("presion_carga", { suffix: " Psi", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Presión en Descarga
                  </label>
                  {preField("presion_descarga", { suffix: " Psi", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Delta P Separador
                  </label>
                  {preField("delta_p_separador", { suffix: " Psi", type: "number" })}
                </div>
              </div>
            </div>

            {/* Leaks & Oil */}
            <div className="p-4 mb-4">
              <h3 className="font-bold text-purple-900 mb-4 text-lg">
                FUGAS Y ACEITE
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Fugas de Aceite Visibles
                  </label>
                  {preField("fugas_aceite_visibles", { type: "select", selectOptions: ["Sí", "No"] })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Fugas de Aire Audibles
                  </label>
                  {preField("fugas_aire_audibles", { type: "select", selectOptions: ["Sí", "No"] })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Aceite Oscuro/Degradado
                  </label>
                  {preField("aceite_oscuro_degradado", { type: "select", selectOptions: ["Sí", "No"] })}
                </div>
              </div>
            </div>

            {/* Environmental Conditions */}
            <div className="p-4">
              <h3 className="font-bold text-purple-900 mb-4 text-lg">
                CONDICIONES AMBIENTALES
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Ubicación del Compresor
                  </label>
                  {preField("ubicacion_compresor")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Expulsión Aire Caliente
                  </label>
                  {preField("expulsion_aire_caliente", { type: "select", selectOptions: ["Al exterior", "Interno al cuarto"] })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-1">
                    Operación con Muchos Polvos
                  </label>
                  {preField("operacion_muchos_polvos", { type: "select", selectOptions: ["Sí", "No"] })}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Automatic Diagnostic Summary */}
        {preMaintenanceData && (() => {
          const diagnostico = generateDiagnostico();
          if (!diagnostico) return null;
          return (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                RESUMEN DE DIAGNÓSTICO AUTOMÁTICO - PRE-MANTENIMIENTO
              </h2>
              <div className="space-y-4">
                {/* Estado General */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">
                    Estado General del Equipo
                  </h3>
                  <p className="text-xl font-bold">
                    {diagnostico.estadoEquipo}
                  </p>
                </div>

                {/* Aspectos Positivos */}
                {diagnostico.positivos.length > 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="font-bold text-green-900 mb-3">
                      ✔️ Aspectos Positivos Detectados
                    </h3>
                    <ul className="space-y-2">
                      {diagnostico.positivos.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-green-600 mr-2">✔️</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Causas Detectadas */}
                {diagnostico.causas.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="font-bold text-yellow-900 mb-3">
                      ⚠️ Causas Detectadas
                    </h3>
                    <ul className="space-y-2">
                      {diagnostico.causas.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-yellow-600 mr-2">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Consecuencias Probables */}
                {Object.keys(diagnostico.consecuencias).length > 0 && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h3 className="font-bold text-orange-900 mb-3">
                      ⚠️ Consecuencias Probables
                    </h3>
                    <ul className="space-y-2">
                      {Object.entries(diagnostico.consecuencias).map(
                        ([cons, grav], idx) => {
                          const icono =
                            { 1: "🟡", 2: "🟠", 3: "🔴" }[grav] || "⚠️";
                          return (
                            <li key={idx} className="flex items-start">
                              <span className="mr-2">{icono}</span>
                              <span>{cons}</span>
                            </li>
                          );
                        },
                      )}
                    </ul>
                  </div>
                )}

                {/* Acciones Recomendadas */}
                {diagnostico.acciones.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-bold text-blue-900 mb-3">
                      🔧 Acciones Recomendadas
                    </h3>
                    <ul className="space-y-2">
                      {diagnostico.acciones.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-blue-600 mr-2">➤</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Pre-Maintenance Photos Section */}
        {renderPhotoSection(
          preMaintenanceCategories,
          "FOTOS PRE-MANTENIMIENTO",
          "bg-purple-700",
        )}

        {/* Maintenance Tasks */}
        {maintenanceItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-white bg-green-700 px-4 py-2 rounded font-bold mb-4">
              TRABAJOS REALIZADOS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
              {isEditing && editedMaintenance
                ? Object.entries(maintenanceFieldsMap).map(([field, displayName]) => {
                    const value = (editedMaintenance as unknown as Record<string, string>)[field];
                    const isChecked = value === "Sí";
                    return (
                      <div
                        key={field}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${
                          isChecked ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                        }`}
                        onClick={() => {
                          setEditedMaintenance({
                            ...editedMaintenance,
                            [field]: isChecked ? "No" : "Sí",
                          } as MaintenanceData);
                        }}
                      >
                        <span className="text-gray-900 font-medium">{displayName}</span>
                        {isChecked ? (
                          <CheckCircle className="text-green-600" size={24} />
                        ) : (
                          <XCircle className="text-gray-400" size={24} />
                        )}
                      </div>
                    );
                  })
                : maintenanceItems.map((item, index) => (
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

        {/* Maintenance Photos Section */}
        {renderPhotoSection(
          maintenanceCategories,
          "FOTOS DEL MANTENIMIENTO",
          "bg-green-600",
        )}

        {/* Post-Maintenance Photos Section */}
        {renderPhotoSection(
          postMaintenanceCategories,
          "FOTOS POST-MANTENIMIENTO",
          "bg-purple-600",
        )}

        {/* Comments */}
        {(maintenanceData?.comentarios_generales ||
          maintenanceData?.comentario_cliente ||
          isEditing) && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-white bg-gray-700 px-4 py-2 rounded font-bold mb-4">
              COMENTARIOS
            </h2>
            <div className="space-y-4 p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentarios del Técnico
                </label>
                {isEditing && editedMaintenance ? (
                  <textarea
                    value={editedMaintenance.comentarios_generales || ""}
                    onChange={(e) =>
                      setEditedMaintenance({ ...editedMaintenance, comentarios_generales: e.target.value })
                    }
                    className="w-full p-4 border border-blue-300 rounded-lg bg-blue-50 text-gray-800 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                ) : maintenanceData?.comentarios_generales ? (
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {maintenanceData.comentarios_generales}
                    </p>
                  </div>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentarios del Cliente
                </label>
                {isEditing && editedMaintenance ? (
                  <textarea
                    value={editedMaintenance.comentario_cliente || ""}
                    onChange={(e) =>
                      setEditedMaintenance({ ...editedMaintenance, comentario_cliente: e.target.value })
                    }
                    className="w-full p-4 border border-blue-300 rounded-lg bg-blue-50 text-gray-800 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                ) : maintenanceData?.comentario_cliente ? (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {maintenanceData.comentario_cliente}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Comparison Table PRE vs POST */}
        {preMaintenanceData && postMaintenanceData && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-white bg-orange-600 px-4 py-2 rounded font-bold mb-2">
              COMPARATIVA PRE vs POST MANTENIMIENTO
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Resumen de las mediciones tomadas antes y después del mantenimiento.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 w-1/3">
                      Parámetro
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-purple-800 w-1/3">
                      PRE-Mantenimiento
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-orange-700 w-1/3">
                      POST-Mantenimiento
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Display Enciende", pre: preMaintenanceData.display_enciende, post: postMaintenanceData.display_enciende_final },
                    { label: "Horas Totales", pre: preMaintenanceData.horas_totales, post: postMaintenanceData.horas_totales_final, unit: " hrs" },
                    { label: "Horas en Carga", pre: preMaintenanceData.horas_carga, post: postMaintenanceData.horas_carga_final, unit: " hrs" },
                    { label: "Horas en Descarga", pre: preMaintenanceData.horas_descarga, post: postMaintenanceData.horas_descarga_final, unit: " hrs" },
                    { label: "Voltaje Alimentación (V)", pre: preMaintenanceData.voltaje_alimentacion, post: postMaintenanceData.voltaje_alimentacion_final },
                    { label: "Amperaje Motor en Carga (A)", pre: preMaintenanceData.amperaje_motor_carga, post: postMaintenanceData.amperaje_motor_carga_final },
                    { label: "Amperaje Ventilador (A)", pre: preMaintenanceData.amperaje_ventilador, post: postMaintenanceData.amperaje_ventilador_final },
                    { label: "Fugas de Aceite", pre: preMaintenanceData.fugas_aceite_visibles, post: postMaintenanceData.fugas_aceite_final },
                    { label: "Aceite Oscuro/Degradado", pre: preMaintenanceData.aceite_oscuro_degradado, post: postMaintenanceData.aceite_oscuro_final },
                    { label: "Fugas de Aire", pre: preMaintenanceData.fugas_aire_audibles, post: postMaintenanceData.fugas_aire_final },
                    { label: "Temp. Compresión Display (°C)", pre: preMaintenanceData.temp_compresion_display, post: postMaintenanceData.temp_compresion_display_final },
                    { label: "Temp. Compresión Láser (°C)", pre: preMaintenanceData.temp_compresion_laser, post: postMaintenanceData.temp_compresion_laser_final },
                    { label: "Temp. Separador Aceite (°C)", pre: preMaintenanceData.temp_separador_aceite, post: postMaintenanceData.temp_separador_aceite_final },
                    { label: "Temp. Interna Cuarto (°C)", pre: preMaintenanceData.temp_interna_cuarto, post: postMaintenanceData.temp_interna_cuarto_final },
                    { label: "Delta T Enfriador Aceite (°C)", pre: preMaintenanceData.delta_t_enfriador_aceite, post: postMaintenanceData.delta_t_enfriador_aceite_final },
                    { label: "Temp. Motor Eléctrico (°C)", pre: preMaintenanceData.temp_motor_electrico, post: postMaintenanceData.temp_motor_electrico_final },
                    { label: "Presión Carga (PSI)", pre: preMaintenanceData.presion_carga, post: postMaintenanceData.presion_carga_final },
                    { label: "Presión Descarga (PSI)", pre: preMaintenanceData.presion_descarga, post: postMaintenanceData.presion_descarga_final },
                    { label: "Delta P Separador (PSI)", pre: preMaintenanceData.delta_p_separador, post: postMaintenanceData.delta_p_separador_final },
                  ].map((row, idx) => {
                    const preStr = row.pre !== undefined && row.pre !== null ? String(row.pre) + (row.unit || "") : "—";
                    const postStr = row.post !== undefined && row.post !== null ? String(row.post) + (row.unit || "") : "—";
                    const hasPost = row.post !== undefined && row.post !== null;
                    const changed = hasPost && String(row.pre) !== String(row.post);
                    const worsened =
                      hasPost &&
                      String(row.post) === "Sí" &&
                      String(row.pre) === "No" &&
                      ["Fugas de Aceite", "Aceite Oscuro/Degradado", "Fugas de Aire"].includes(row.label);
                    const improved =
                      hasPost &&
                      String(row.post) === "No" &&
                      String(row.pre) === "Sí" &&
                      ["Fugas de Aceite", "Aceite Oscuro/Degradado", "Fugas de Aire"].includes(row.label);

                    return (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-300 px-3 py-2 font-medium text-gray-700">
                          {row.label}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center text-purple-900">
                          {preStr}
                        </td>
                        <td
                          className={`border border-gray-300 px-3 py-2 text-center font-semibold ${
                            worsened
                              ? "bg-red-100 text-red-700"
                              : improved
                              ? "bg-green-100 text-green-700"
                              : changed
                              ? "bg-yellow-100 text-yellow-700"
                              : "text-gray-700"
                          }`}
                        >
                          {postStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-200 inline-block"></span> Mejorado
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-yellow-200 inline-block"></span> Cambió
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-200 inline-block"></span> Empeoró
              </span>
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
                  <label className="block text-sm font-medium text-orange-800 mb-1">Display Enciende (Final)</label>
                  {postField("display_enciende_final", { type: "select", selectOptions: ["Sí", "No"] })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Horas Totales (Final)</label>
                  {postField("horas_totales_final", { suffix: " hrs", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Horas Carga (Final)</label>
                  {postField("horas_carga_final", { suffix: " hrs", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Horas Descarga (Final)</label>
                  {postField("horas_descarga_final", { suffix: " hrs", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Voltaje (Final)</label>
                  {postField("voltaje_alimentacion_final", { suffix: " V", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Amperaje Motor (Final)</label>
                  {postField("amperaje_motor_carga_final", { suffix: " A", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Amperaje Ventilador (Final)</label>
                  {postField("amperaje_ventilador_final", { suffix: " A", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Fugas Aceite (Final)</label>
                  {postField("fugas_aceite_final", { type: "select", selectOptions: ["Sí", "No"] })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Aceite Oscuro (Final)</label>
                  {postField("aceite_oscuro_final", { type: "select", selectOptions: ["Sí", "No"] })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Temp. Ambiente (Final)</label>
                  {postField("temp_ambiente_final", { suffix: " °C", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Temp. Compresión Display (Final)</label>
                  {postField("temp_compresion_display_final", { suffix: " °C", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Temp. Compresión Láser (Final)</label>
                  {postField("temp_compresion_laser_final", { suffix: " °C", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Temp. Separador Aceite (Final)</label>
                  {postField("temp_separador_aceite_final", { suffix: " °C", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Temp. Interna Cuarto (Final)</label>
                  {postField("temp_interna_cuarto_final", { suffix: " °C", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Delta T Enfriador Aceite (Final)</label>
                  {postField("delta_t_enfriador_aceite_final", { suffix: " °C", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Temp. Motor Eléctrico (Final)</label>
                  {postField("temp_motor_electrico_final", { suffix: " °C", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Presión Carga (Final)</label>
                  {postField("presion_carga_final", { suffix: " bar", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Presión Descarga (Final)</label>
                  {postField("presion_descarga_final", { suffix: " bar", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Delta P Separador (Final)</label>
                  {postField("delta_p_separador_final", { suffix: " bar", type: "number" })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-1">Fugas Aire (Final)</label>
                  {postField("fugas_aire_final", { type: "select", selectOptions: ["Sí", "No"] })}
                </div>
              </div>
            </div>

            {/* Signatures */}
            {(postMaintenanceData.nombre_persona_cargo ||
              postMaintenanceData.firma_persona_cargo ||
              postMaintenanceData.firma_tecnico_ventologix) && (
              <div className="p-4">
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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={postMaintenanceData.firma_persona_cargo}
                            alt="Firma del cliente"
                            className="mx-auto max-w-[200px] h-auto"
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={postMaintenanceData.firma_tecnico_ventologix}
                          alt="Firma del técnico"
                          className="mx-auto max-w-[200px] h-auto"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Remaining Photos (uncategorized / OTROS) */}
        {remainingCategories.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-white bg-gray-700 px-4 py-2 rounded font-bold mb-4">
              OTRAS FOTOS
            </h2>
            {remainingCategories.map((cat) => (
              <div key={cat} className={remainingCategories.indexOf(cat) > 0 ? "mt-6" : ""}>
                {remainingCategories.length > 1 && (
                  <h3 className="font-semibold text-gray-700 mb-3 text-base px-2">
                    {cat.replace(/_/g, " ")}
                  </h3>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-2">
                  {fotosPorCategoria[cat].map((fotoUrl, index) => (
                    <div
                      key={index}
                      className="cursor-pointer transform hover:scale-[1.02] transition-transform"
                      onClick={() => openImageModal(fotoUrl)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fotoUrl}
                        alt={`${cat} - Foto ${index + 1}`}
                        className="rounded-lg shadow-md w-full h-56 md:h-64 object-cover"
                        loading="eager"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Signature Section - only shown when por_firmar */}
        {orderData?.estado === "por_firmar" && (
          <div className="no-print bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
              FIRMA DEL CLIENTE — PENDIENTE DE FIRMA
            </h2>
            <p className="text-gray-600 mb-6">
              Para finalizar el reporte se requiere la firma del cliente o persona a cargo.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Client signature */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Firma del Cliente / Persona a Cargo</h3>
                <div className="mb-3">
                  <label className="block text-sm text-gray-600 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={nombrePersonaCargo}
                    onChange={(e) => setNombrePersonaCargo(e.target.value)}
                    placeholder="Nombre completo..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
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
                  className="mt-2 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Limpiar
                </button>
              </div>

              {/* Static technician signature preview */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Técnico Ventologix</h3>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center justify-center" style={{ height: 220 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/firma_ivan.png"
                    alt="Firma del técnico Ventologix"
                    className="object-contain max-w-[200px] h-auto"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSignatureAndFinish}
                disabled={isSavingSignature}
                className="px-8 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingSignature ? "Guardando..." : "✅ Guardar Firma y Terminar Reporte"}
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="no-print bg-white rounded-lg shadow-lg p-6 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Volver
          </button>
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={cancelEditing}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center space-x-2"
                >
                  <X size={20} />
                  <span>Cancelar</span>
                </button>
                <button
                  onClick={saveEdits}
                  disabled={isSaving}
                  className={`px-6 py-3 text-white rounded-lg transition-colors font-medium flex items-center space-x-2 ${
                    isSaving ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEditing}
                  className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center space-x-2"
                >
                  <Pencil size={20} />
                  <span>Editar Reporte</span>
                </button>
                <button
                  onClick={handleViewPdf}
                  disabled={isDownloadingPdf}
                  className={`px-6 py-3 text-white rounded-lg transition-colors font-medium flex items-center space-x-2 ${
                    isDownloadingPdf
                      ? "bg-red-400 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {isDownloadingPdf ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      <span>Generando PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={20} />
                      <span>Descargar PDF</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal - Blur background */}
      {imageModal.isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]"
          onClick={closeImageModal}
        >
          <button
            onClick={closeImageModal}
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors z-10"
          >
            <X size={28} />
          </button>
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageModal.imageSrc}
              alt="Foto ampliada"
              className="object-contain max-w-full max-h-[85vh]"
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
