"use client";

import React, { useState, Suspense, useEffect, useCallback, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import Image from "next/image";
import { URL_API } from "@/lib/global";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { PhotoUploadSection } from "@/components/PhotoUploadSection";

// ── Interfaces ──────────────────────────────────────────────────────────────

interface DryerFormData {
  // Order / Client info (read-only, loaded from orden)
  folio: string;
  clientId: string;
  clientName: string;
  area: string;
  tecnico: string;
  aliasEquipo: string;
  diagnosticType: string;
  maintenanceType: string;
  scheduledDate: string;
  scheduledTime: string;
  orderStatus: string;
  creationDate: string;

  // Equipment data
  marca: string;
  modelo: string;
  numeroSerie: string;
  arrancador: string;
  tipoCompresor: string;
  hpCompresor: string;
  tipoRefrigerante: string;
  voltaje: string;
  marcaMotor: string;
  hpMotorCondensador: string;

  // Cycles & Times
  puntoRocio: string;
  ciclos: string;
  tiempo: string;
  preFiltro: string;
  postFiltro: string;

  // Pressures & Readings
  manometroTorre1: string;
  manometroTorre2: string;
  presionDescarga: string;
  presionSuccion: string;
  tempAireEntrada: string;
  tempAireSalida: string;
  amperaje: string;
  amperajeCondensador: string;
  voltajeCompresor: string;
  voltajeMotorCondensador: string;

  // Element Functioning
  cargaGas: string;
  fugasTuberias: string;
  balerosMotorCondensador: string;
  indicadorPresion: string;
  valvulaExpansion: string;
  presostatos: string;
  termoswitch: string;
  instalacionElectrica: string;
  nivelAceite: string;
  valvulaSolenoide: string;
  panelCondensador: string;
  indicadorTemperatura: string;
  filtros: string;
  valvulasDrenCondensados: string;

  // Observations
  observaciones: string;
}

const defaultFormData: DryerFormData = {
  folio: "",
  clientId: "",
  clientName: "",
  area: "",
  tecnico: "",
  aliasEquipo: "",
  diagnosticType: "",
  maintenanceType: "",
  scheduledDate: "",
  scheduledTime: "",
  orderStatus: "",
  creationDate: "",

  marca: "",
  modelo: "",
  numeroSerie: "",
  arrancador: "",
  tipoCompresor: "",
  hpCompresor: "",
  tipoRefrigerante: "",
  voltaje: "",
  marcaMotor: "",
  hpMotorCondensador: "",

  puntoRocio: "",
  ciclos: "",
  tiempo: "",
  preFiltro: "",
  postFiltro: "",

  manometroTorre1: "",
  manometroTorre2: "",
  presionDescarga: "",
  presionSuccion: "",
  tempAireEntrada: "",
  tempAireSalida: "",
  amperaje: "",
  amperajeCondensador: "",
  voltajeCompresor: "",
  voltajeMotorCondensador: "",

  cargaGas: "",
  fugasTuberias: "",
  balerosMotorCondensador: "",
  indicadorPresion: "",
  valvulaExpansion: "",
  presostatos: "",
  termoswitch: "",
  instalacionElectrica: "",
  nivelAceite: "",
  valvulaSolenoide: "",
  panelCondensador: "",
  indicadorTemperatura: "",
  filtros: "",
  valvulasDrenCondensados: "",

  observaciones: "",
};

// Status options for element functioning fields
const statusOptions = [
  { value: "", label: "-- Seleccionar --" },
  { value: "Correcto", label: "Correcto" },
  { value: "Incorrecto", label: "Incorrecto" },
  { value: "N/A", label: "N/A" },
];

// ── Component ───────────────────────────────────────────────────────────────

function CreateDryerReport() {
  const { isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uploadPhotos, uploadStatus, uploadProgress } = usePhotoUpload();
  const dataLoadedRef = useRef<string | null>(null);

  const [formData, setFormData] = useState<DryerFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentStep, setCurrentStep] = useState(1); // 1=equipo, 2=lecturas, 3=funcionamiento

  const [photosByCategory, setPhotosByCategory] = useState<{
    [category: string]: File[];
  }>({
    EQUIPO: [],
    PRESIONES: [],
    MANTENIMIENTO: [],
    OTROS: [],
  });

  const [uploadedPhotosByCategory, setUploadedPhotosByCategory] = useState<{
    [category: string]: boolean;
  }>({
    EQUIPO: false,
    PRESIONES: false,
    MANTENIMIENTO: false,
    OTROS: false,
  });

  // ── Load order data from folio ──────────────────────────────────────────

  useEffect(() => {
    const folio = searchParams.get("folio");
    if (!folio || dataLoadedRef.current === folio) return;

    fetch(`${URL_API}/ordenes?folio=${folio}`)
      .then(async (res) => {
        const result = await res.json();
        if (result.data && result.data.length > 0) {
          const orden = result.data[0];
          setFormData((prev) => ({
            ...prev,
            folio: orden.folio,
            clientId: orden.id_cliente?.toString() || "",
            clientName: orden.nombre_cliente || "",
            area: orden.area || "",
            tecnico: orden.tecnico || "",
            aliasEquipo: orden.alias_compresor || orden.alias_equipo || "",
            diagnosticType: orden.tipo_visita || "",
            maintenanceType: orden.tipo_mantenimiento || "",
            scheduledDate: orden.fecha_programada || "",
            scheduledTime: orden.hora_programada || "",
            orderStatus: orden.estado || "",
            creationDate: orden.fecha_creacion || "",
            // Equipment info from order
            marca: orden.marca || "",
            modelo: orden.modelo || "",
            numeroSerie: orden.numero_serie || "",
          }));

          // Load previously saved dryer report data
          await loadDryerReportData(orden.folio);
          dataLoadedRef.current = folio;
        }
      })
      .catch((error) => {
        console.error("Error fetching orden:", error);
        alert("Error al cargar la orden de servicio");
      });
  }, [searchParams]);

  const loadDryerReportData = async (folio: string) => {
    try {
      const res = await fetch(`${URL_API}/reporte_secadora/${folio}`);
      if (!res.ok) return;
      const result = await res.json();
      if (!result.data) return;

      const d = result.data;
      setFormData((prev) => ({
        ...prev,
        // Equipment
        marca: d.marca || prev.marca,
        modelo: d.modelo || prev.modelo,
        numeroSerie: d.numero_serie || prev.numeroSerie,
        arrancador: d.arrancador || "",
        tipoCompresor: d.tipo_compresor || "",
        hpCompresor: d.hp_compresor || "",
        tipoRefrigerante: d.tipo_refrigerante || "",
        voltaje: d.voltaje?.toString() || "",
        marcaMotor: d.marca_motor || "",
        hpMotorCondensador: d.hp_motor_condensador || "",
        // Cycles
        puntoRocio: d.punto_rocio || "",
        ciclos: d.ciclos?.toString() || "",
        tiempo: d.tiempo || "",
        preFiltro: d.pre_filtro || "",
        postFiltro: d.post_filtro || "",
        // Pressures
        manometroTorre1: d.manometro_torre_1?.toString() || "",
        manometroTorre2: d.manometro_torre_2?.toString() || "",
        presionDescarga: d.presion_descarga?.toString() || "",
        presionSuccion: d.presion_succion?.toString() || "",
        tempAireEntrada: d.temp_aire_entrada?.toString() || "",
        tempAireSalida: d.temp_aire_salida?.toString() || "",
        amperaje: d.amperaje?.toString() || "",
        amperajeCondensador: d.amperaje_condensador?.toString() || "",
        voltajeCompresor: d.voltaje_compresor?.toString() || "",
        voltajeMotorCondensador: d.voltaje_motor_condensador?.toString() || "",
        // Functioning
        cargaGas: d.carga_gas || "",
        fugasTuberias: d.fugas_tuberias || "",
        balerosMotorCondensador: d.baleros_motor_condensador || "",
        indicadorPresion: d.indicador_presion || "",
        valvulaExpansion: d.valvula_expansion || "",
        presostatos: d.presostatos || "",
        termoswitch: d.termoswitch || "",
        instalacionElectrica: d.instalacion_electrica || "",
        nivelAceite: d.nivel_aceite || "",
        valvulaSolenoide: d.valvula_solenoide || "",
        panelCondensador: d.panel_condensador || "",
        indicadorTemperatura: d.indicador_temperatura || "",
        filtros: d.filtros || "",
        valvulasDrenCondensados: d.valvulas_dren_condensados || "",
        // Observations
        observaciones: d.observaciones || "",
      }));
    } catch (err) {
      console.error("Error loading dryer data:", err);
    }
  };

  // ── Auto-save ───────────────────────────────────────────────────────────

  const handleSaveDraft = useCallback(
    async (showAlert: boolean = true) => {
      if (!formData.folio) return;

      try {
        setIsSaving(true);

        const payload = {
          folio: formData.folio,
          // Equipment
          marca: formData.marca || undefined,
          modelo: formData.modelo || undefined,
          numero_serie: formData.numeroSerie || undefined,
          arrancador: formData.arrancador || undefined,
          tipo_compresor: formData.tipoCompresor || undefined,
          hp_compresor: formData.hpCompresor || undefined,
          tipo_refrigerante: formData.tipoRefrigerante || undefined,
          voltaje: formData.voltaje ? parseFloat(formData.voltaje) : undefined,
          marca_motor: formData.marcaMotor || undefined,
          hp_motor_condensador: formData.hpMotorCondensador || undefined,
          // Cycles
          punto_rocio: formData.puntoRocio || undefined,
          ciclos: formData.ciclos ? parseInt(formData.ciclos) : undefined,
          tiempo: formData.tiempo || undefined,
          pre_filtro: formData.preFiltro || undefined,
          post_filtro: formData.postFiltro || undefined,
          // Pressures
          manometro_torre_1: formData.manometroTorre1 ? parseFloat(formData.manometroTorre1) : undefined,
          manometro_torre_2: formData.manometroTorre2 ? parseFloat(formData.manometroTorre2) : undefined,
          presion_descarga: formData.presionDescarga ? parseFloat(formData.presionDescarga) : undefined,
          presion_succion: formData.presionSuccion ? parseFloat(formData.presionSuccion) : undefined,
          temp_aire_entrada: formData.tempAireEntrada ? parseFloat(formData.tempAireEntrada) : undefined,
          temp_aire_salida: formData.tempAireSalida ? parseFloat(formData.tempAireSalida) : undefined,
          amperaje: formData.amperaje ? parseFloat(formData.amperaje) : undefined,
          amperaje_condensador: formData.amperajeCondensador ? parseFloat(formData.amperajeCondensador) : undefined,
          voltaje_compresor: formData.voltajeCompresor ? parseFloat(formData.voltajeCompresor) : undefined,
          voltaje_motor_condensador: formData.voltajeMotorCondensador ? parseFloat(formData.voltajeMotorCondensador) : undefined,
          // Functioning
          carga_gas: formData.cargaGas || undefined,
          fugas_tuberias: formData.fugasTuberias || undefined,
          baleros_motor_condensador: formData.balerosMotorCondensador || undefined,
          indicador_presion: formData.indicadorPresion || undefined,
          valvula_expansion: formData.valvulaExpansion || undefined,
          presostatos: formData.presostatos || undefined,
          termoswitch: formData.termoswitch || undefined,
          instalacion_electrica: formData.instalacionElectrica || undefined,
          nivel_aceite: formData.nivelAceite || undefined,
          valvula_solenoide: formData.valvulaSolenoide || undefined,
          panel_condensador: formData.panelCondensador || undefined,
          indicador_temperatura: formData.indicadorTemperatura || undefined,
          filtros: formData.filtros || undefined,
          valvulas_dren_condensados: formData.valvulasDrenCondensados || undefined,
          // Observations
          observaciones: formData.observaciones || undefined,
        };

        const res = await fetch(`${URL_API}/reporte_secadora/guardar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();

        if (result.success) {
          setLastSaved(new Date());
          setHasUnsavedChanges(false);
          if (showAlert) {
            alert("Borrador guardado exitosamente");
          }
        } else if (showAlert) {
          alert("Error al guardar: " + (result.error || "Error desconocido"));
        }
      } catch (err) {
        console.error("Error saving draft:", err);
        if (showAlert) {
          alert("Error al guardar el borrador");
        }
      } finally {
        setIsSaving(false);
      }
    },
    [formData],
  );

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!formData.folio || !hasUnsavedChanges) return;

    const interval = setInterval(() => {
      handleSaveDraft(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [formData.folio, hasUnsavedChanges, handleSaveDraft]);

  // Warn before leaving
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
  };

  const handleCategorizedPhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    category: string,
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setPhotosByCategory((prev) => ({
        ...prev,
        [category]: [...(prev[category] || []), ...fileArray],
      }));
      setHasUnsavedChanges(true);
    }
  };

  const removeCategorizedPhoto = (category: string, index: number) => {
    setPhotosByCategory((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
    setHasUnsavedChanges(true);
  };

  // Upload all photos
  const uploadAllPhotos = useCallback(async () => {
    if (!formData.folio) return { success: false, error: "No folio" };

    const clientName = formData.clientName || "Unknown";
    let totalUploaded = 0;
    let totalFailed = 0;

    for (const [category, files] of Object.entries(photosByCategory)) {
      if (uploadedPhotosByCategory[category] || files.length === 0) continue;

      const result = await uploadPhotos(formData.folio, clientName, category, files);
      if (result.success) {
        totalUploaded += files.length;
        setUploadedPhotosByCategory((prev) => ({ ...prev, [category]: true }));
        setPhotosByCategory((prev) => ({ ...prev, [category]: [] }));
      } else {
        totalFailed += files.length;
      }
    }

    if (totalFailed > 0) {
      alert(`${totalUploaded} fotos subidas, ${totalFailed} fallaron`);
    } else if (totalUploaded > 0) {
      alert(`${totalUploaded} fotos subidas exitosamente`);
    }

    return { success: totalFailed === 0 };
  }, [formData, photosByCategory, uploadedPhotosByCategory, uploadPhotos]);

  // Submit and send to signature
  const handleSubmitToSignature = async () => {
    if (!formData.folio) return;

    const confirmed = confirm(
      "¿Está seguro de enviar el reporte a firma? Se guardará y se redirigirá a la vista de firma.",
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      // Save draft first
      await handleSaveDraft(false);

      // Upload photos
      const hasPhotos = Object.values(photosByCategory).some((f) => f.length > 0);
      if (hasPhotos) {
        await uploadAllPhotos();
      }

      // Update order status to por_firmar
      const statusRes = await fetch(
        `${URL_API}/ordenes/${formData.folio}/estado?estado=por_firmar`,
        { method: "PATCH" },
      );

      if (statusRes.ok) {
        router.push(
          `/features/compressor-maintenance/reports/view-dryer?folio=${formData.folio}`,
        );
      } else {
        const statusResult = await statusRes.json();
        alert("Error al actualizar el estado: " + (statusResult?.error || "Error desconocido"));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert("Error: " + errorMsg + "\n\nFolio: " + formData.folio);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Auth guard ──────────────────────────────────────────────────────────

  if (isLoading) {
    return <LoadingOverlay isVisible={true} message="Cargando..." />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">No autorizado. Por favor inicia sesión.</p>
      </div>
    );
  }

  // ── Render helpers ────────────────────────────────────────────────────

  const InputField = ({
    label,
    name,
    value,
    type = "text",
    placeholder = "",
    suffix = "",
  }: {
    label: string;
    name: string;
    value: string;
    type?: string;
    placeholder?: string;
    suffix?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {suffix && <span className="text-gray-400 text-xs">({suffix})</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
      />
    </div>
  );

  const SelectField = ({
    label,
    name,
    value,
    options,
  }: {
    label: string;
    name: string;
    value: string;
    options: { value: string; label: string }[];
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={handleInputChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  const SectionHeader = ({
    title,
    color,
    step,
  }: {
    title: string;
    color: string;
    step?: number;
  }) => (
    <div className={`${color} text-white px-4 py-3 rounded-t-lg font-bold flex items-center gap-3`}>
      {step && (
        <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
          {step}
        </span>
      )}
      {title}
    </div>
  );

  // ── Step indicator ────────────────────────────────────────────────────

  const steps = [
    { num: 1, label: "Datos del Equipo" },
    { num: 2, label: "Lecturas y Presiones" },
    { num: 3, label: "Funcionamiento y Observaciones" },
  ];

  // ── Main Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50/30 p-4 md:p-8">
      <div className="no-print">
        <BackButton />
      </div>

      <div className="max-w-5xl mx-auto mt-4">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-700 via-cyan-800 to-blue-900 text-white shadow-xl mb-6">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          </div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                  <Image
                    src="/Ventologix_05.png"
                    alt="Logo"
                    width={40}
                    height={40}
                    style={{ width: "auto", height: "auto" }}
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Reporte de Secadora</h1>
                  <p className="text-cyan-200 text-sm">Mantenimiento Preventivo</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-cyan-300 uppercase tracking-wider">Folio</p>
                <p className="text-2xl font-bold">{formData.folio || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <React.Fragment key={step.num}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.num)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                    currentStep === step.num
                      ? "bg-cyan-100 text-cyan-800"
                      : currentStep > step.num
                        ? "text-emerald-600"
                        : "text-gray-400"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      currentStep === step.num
                        ? "bg-cyan-600 text-white"
                        : currentStep > step.num
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentStep > step.num ? "✓" : step.num}
                  </span>
                  <span className="hidden md:inline">{step.label}</span>
                </button>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      currentStep > step.num ? "bg-emerald-300" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          {lastSaved && (
            <p className="text-xs text-gray-400 mt-2 text-right">
              Guardado: {lastSaved.toLocaleTimeString("es-MX")}
            </p>
          )}
        </div>

        {/* Client & Order Info (always visible, read-only) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <SectionHeader title="INFORMACIÓN GENERAL" color="bg-blue-800" />
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</label>
                <p className="text-gray-900 font-semibold mt-1">{formData.clientName || "N/A"}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Área</label>
                <p className="text-gray-900 font-semibold mt-1">{formData.area || "N/A"}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</label>
                <p className="text-gray-900 font-semibold mt-1">{formData.tecnico || "N/A"}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Visita</label>
                <p className="text-gray-900 font-semibold mt-1">{formData.diagnosticType || "N/A"}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Programada</label>
                <p className="text-gray-900 font-semibold mt-1">{formData.scheduledDate || "N/A"}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Equipo</label>
                <p className="text-gray-900 font-semibold mt-1">{formData.aliasEquipo || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Step 1: Equipment Data ──────────────────────────────────── */}
        {currentStep >= 1 && (
          <div id="step-1" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <SectionHeader title="DATOS DEL EQUIPO" color="bg-cyan-700" step={1} />
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <InputField label="Marca" name="marca" value={formData.marca} placeholder="Ej: Hankison" />
                <InputField label="Modelo" name="modelo" value={formData.modelo} placeholder="Ej: HES2000" />
                <InputField label="Número de Serie" name="numeroSerie" value={formData.numeroSerie} />
                <InputField label="Arrancador" name="arrancador" value={formData.arrancador} />
                <InputField label="Tipo de Compresor" name="tipoCompresor" value={formData.tipoCompresor} />
                <InputField label="HP de Compresor" name="hpCompresor" value={formData.hpCompresor} />
                <InputField label="Tipo de Refrigerante" name="tipoRefrigerante" value={formData.tipoRefrigerante} placeholder="Ej: R-134a" />
                <InputField label="Voltaje" name="voltaje" value={formData.voltaje} type="number" suffix="V" />
                <InputField label="Marca de Motor" name="marcaMotor" value={formData.marcaMotor} />
                <InputField label="HP Motor Condensador" name="hpMotorCondensador" value={formData.hpMotorCondensador} />
              </div>
              <div className="mt-5">
                <PhotoUploadSection
                  category="EQUIPO"
                  label="Fotos del Equipo / Placas"
                  photos={photosByCategory.EQUIPO}
                  onPhotoAdd={handleCategorizedPhotoChange}
                  onPhotoRemove={removeCategorizedPhoto}
                  uploadStatus={uploadStatus.EQUIPO || "idle"}
                  uploadProgress={uploadProgress.EQUIPO || 0}
                  multiple={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: Cycles, Pressures & Readings ────────────────────── */}
        {currentStep >= 2 && (
          <>
            <div id="step-2" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <SectionHeader title="CICLOS Y TIEMPOS" color="bg-violet-600" step={2} />
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <InputField label="Punto de Rocío" name="puntoRocio" value={formData.puntoRocio} />
                  <InputField label="Ciclos" name="ciclos" value={formData.ciclos} type="number" />
                  <InputField label="Tiempo" name="tiempo" value={formData.tiempo} placeholder="Ej: 10 minutos" />
                  <InputField label="Pre Filtro" name="preFiltro" value={formData.preFiltro} />
                  <InputField label="Post Filtro" name="postFiltro" value={formData.postFiltro} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <SectionHeader title="PRESIONES Y LECTURAS" color="bg-amber-600" />
              <div className="p-6 space-y-6">
                {/* Pressures */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Manómetros y Presiones
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <InputField label="Manómetro Torre 1" name="manometroTorre1" value={formData.manometroTorre1} type="number" suffix="psig" />
                    <InputField label="Manómetro Torre 2" name="manometroTorre2" value={formData.manometroTorre2} type="number" suffix="psig" />
                    <InputField label="Presión Descarga" name="presionDescarga" value={formData.presionDescarga} type="number" suffix="psig" />
                    <InputField label="Presión Succión" name="presionSuccion" value={formData.presionSuccion} type="number" suffix="psig" />
                  </div>
                </div>

                {/* Temperatures */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Temperaturas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputField label="Temperatura Aire Entrada" name="tempAireEntrada" value={formData.tempAireEntrada} type="number" suffix="°C" />
                    <InputField label="Temperatura Aire Salida" name="tempAireSalida" value={formData.tempAireSalida} type="number" suffix="°C" />
                  </div>
                </div>

                {/* Electrical */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Lecturas Eléctricas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <InputField label="Amperaje" name="amperaje" value={formData.amperaje} type="number" suffix="A" />
                    <InputField label="Amperaje Condensador" name="amperajeCondensador" value={formData.amperajeCondensador} type="number" suffix="A" />
                    <InputField label="Voltaje Compresor" name="voltajeCompresor" value={formData.voltajeCompresor} type="number" suffix="V" />
                    <InputField label="Voltaje Motor Condensador" name="voltajeMotorCondensador" value={formData.voltajeMotorCondensador} type="number" suffix="V" />
                  </div>
                </div>

                <PhotoUploadSection
                  category="PRESIONES"
                  label="Fotos de Presiones / Indicadores / Manómetros"
                  photos={photosByCategory.PRESIONES}
                  onPhotoAdd={handleCategorizedPhotoChange}
                  onPhotoRemove={removeCategorizedPhoto}
                  uploadStatus={uploadStatus.PRESIONES || "idle"}
                  uploadProgress={uploadProgress.PRESIONES || 0}
                  multiple={true}
                />
              </div>
            </div>
          </>
        )}

        {/* ─── Step 3: Element Functioning & Observations ──────────────── */}
        {currentStep >= 3 && (
          <>
            <div id="step-3" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <SectionHeader title="FUNCIONAMIENTO DE ELEMENTOS" color="bg-emerald-600" step={3} />
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <SelectField label="Carga de Gas" name="cargaGas" value={formData.cargaGas} options={statusOptions} />
                  <SelectField label="Fugas (Tuberías)" name="fugasTuberias" value={formData.fugasTuberias} options={statusOptions} />
                  <SelectField label="Baleros Motor Condensador" name="balerosMotorCondensador" value={formData.balerosMotorCondensador} options={statusOptions} />
                  <SelectField label="Indicador de Presión" name="indicadorPresion" value={formData.indicadorPresion} options={statusOptions} />
                  <SelectField label="Válvula de Expansión" name="valvulaExpansion" value={formData.valvulaExpansion} options={statusOptions} />
                  <SelectField label="Presostatos" name="presostatos" value={formData.presostatos} options={statusOptions} />
                  <SelectField label="Termoswitch" name="termoswitch" value={formData.termoswitch} options={statusOptions} />
                  <SelectField label="Instalación Eléctrica" name="instalacionElectrica" value={formData.instalacionElectrica} options={statusOptions} />
                  <SelectField label="Nivel de Aceite" name="nivelAceite" value={formData.nivelAceite} options={statusOptions} />
                  <SelectField label="Válvula Solenoide" name="valvulaSolenoide" value={formData.valvulaSolenoide} options={statusOptions} />
                  <SelectField label="Panel de Condensador" name="panelCondensador" value={formData.panelCondensador} options={statusOptions} />
                  <SelectField label="Indicador de Temperatura" name="indicadorTemperatura" value={formData.indicadorTemperatura} options={statusOptions} />
                  <SelectField label="Filtros" name="filtros" value={formData.filtros} options={statusOptions} />
                  <SelectField label="Válvulas Dren Condensados" name="valvulasDrenCondensados" value={formData.valvulasDrenCondensados} options={statusOptions} />
                </div>
              </div>
            </div>

            {/* Observations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <SectionHeader title="OBSERVACIONES" color="bg-gray-600" />
              <div className="p-6">
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  rows={5}
                  placeholder="Escriba las observaciones generales del mantenimiento de la secadora..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-y"
                />
              </div>
            </div>

            {/* Photos - Maintenance & Others */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <SectionHeader title="EVIDENCIA FOTOGRÁFICA" color="bg-cyan-600" />
              <div className="p-6 space-y-5">
                <PhotoUploadSection
                  category="MANTENIMIENTO"
                  label="Fotos del Mantenimiento Realizado"
                  photos={photosByCategory.MANTENIMIENTO}
                  onPhotoAdd={handleCategorizedPhotoChange}
                  onPhotoRemove={removeCategorizedPhoto}
                  uploadStatus={uploadStatus.MANTENIMIENTO || "idle"}
                  uploadProgress={uploadProgress.MANTENIMIENTO || 0}
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
          </>
        )}

        {/* ─── Action Buttons ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (confirm("¿Salir sin guardar los cambios?")) {
                    router.back();
                  }
                } else {
                  router.back();
                }
              }}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Cancelar
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSaveDraft(true)}
                disabled={isSaving}
                className="px-5 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors font-medium text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  "Guardar Borrador"
                )}
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={async () => {
                    await handleSaveDraft(false);
                    setCurrentStep(currentStep + 1);
                    setTimeout(() => {
                      const el = document.getElementById(`step-${currentStep + 1}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 100);
                  }}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-cyan-700 text-white rounded-xl hover:bg-cyan-800 transition-colors font-medium text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  Siguiente Sección →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitToSignature}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-cyan-700 text-white rounded-xl hover:bg-cyan-800 transition-colors font-medium text-sm disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isSaving ? "Guardando..." : "Enviar a Firma"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DryerReportPage() {
  return (
    <Suspense fallback={<LoadingOverlay isVisible={true} message="Cargando..." />}>
      <CreateDryerReport />
    </Suspense>
  );
}
