"use client";
import React, { useState, Suspense, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import Image from "next/image";
import { URL_API } from "@/lib/global";
import { ReportFormData } from "@/lib/types";
import { usePreMantenimiento } from "@/hooks/usePreMantenimiento";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { PhotoUploadSection } from "@/components/PhotoUploadSection";

interface MaintenanceItem {
  nombre: string;
  realizado: boolean;
}

const defaultMaintenanceItems: MaintenanceItem[] = [
  { nombre: "Cambio de aceite", realizado: false },
  { nombre: "Cambio de filtro de aceite", realizado: false },
  { nombre: "Cambio de filtro de aire", realizado: false },
  { nombre: "Cambio de separador de aceite", realizado: false },
  { nombre: "Revisión de válvula de admisión", realizado: false },
  { nombre: "Revisión de válvula de descarga", realizado: false },
  { nombre: "Limpieza de radiador", realizado: false },
  { nombre: "Revisión de bandas/correas", realizado: false },
  { nombre: "Revisión de fugas de aire", realizado: false },
  { nombre: "Revisión de fugas de aceite", realizado: false },
  { nombre: "Revisión de conexiones eléctricas", realizado: false },
  { nombre: "Revisión de presostato", realizado: false },
  { nombre: "Revisión de manómetros", realizado: false },
  { nombre: "Lubricación general", realizado: false },
  { nombre: "Limpieza general del equipo", realizado: false },
];

function FillReport() {
  const { isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { savePreMantenimiento, loading: savingPreMaintenance } =
    usePreMantenimiento();
  const { uploadPhotos, uploadStatus, uploadProgress } = usePhotoUpload();

  const [showMaintenanceSection, setShowMaintenanceSection] = useState(false);
  const [showPostMaintenanceSection, setShowPostMaintenanceSection] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [photosByCategory, setPhotosByCategory] = useState<{
    [category: string]: File[];
  }>({
    ACEITE: [],
    CONDICIONES_AMBIENTALES: [],
    DISPLAY_HORAS: [],
    PLACAS_EQUIPO: [],
    TEMPERATURAS: [],
    PRESIONES: [],
    TANQUES: [],
    MANTENIMIENTO: [],
    OTROS: [],
  });

  const [maintenanceData, setMaintenanceData] = useState({
    mantenimientos: defaultMaintenanceItems,
    comentarios_generales: "",
    comentario_cliente: "",
    fotos: [] as File[],
  });

  const [formData, setFormData] = useState<ReportFormData>({
    reportDate: new Date().toISOString().split("T")[0],
    diagnosticType: "",
    equipmentPowers: "",
    displayPowers: "",
    generalHours: "",
    loadHours: "",
    unloadHours: "",
    maintenance2000: false,
    maintenance4000: false,
    maintenance6000: false,
    maintenanceRequired: "",
    otherMechanicalFailure: false,
    compressionTempDisplay: "",
    compressionTempLaser: "",
    finalCompressionTemp: "",
    airIntakeTemp: "",
    intercoolerTemp: "",
    supplyVoltage: "",
    mainMotorAmperage: "",
    fanAmperage: "",
    powerFactorLoadOk: "",
    powerFactorUnloadOk: "",
    brand: "",
    serialNumber: "",
    yearManufactured: "",
    model: "",
    oilLeaks: "",
    airLeaks: "",
    intakeValveFunctioning: "",
    intakeValveType: "",
    pressureDifferential: "",
    pressureControlMethod: "",
    isMaster: "Master",
    operatingPressure: "",
    operatingSetPoint: "",
    loadPressure: "",
    unloadPressure: "",
    wetTankExists: false,
    wetTankLiters: "",
    wetTankSafetyValve: false,
    wetTankDrain: false,
    dryTankExists: false,
    dryTankLiters: "",
    dryTankSafetyValve: false,
    dryTankDrain: false,
    internalTemp: "",
    location: "",
    hotAirExpulsion: "",
    highDustOperation: "",
    specialConditions: "",
    motorCondition: "",
    deltaTAceite: "",
    deltaPSeparador: "",
    tempMotor: "",
    aceiteOscuro: "",
    compressionUnitCondition: "",
    coolingCoilCondition: "",
    admissionValvesCondition: "",
    otherCondition: "",
    excessDust: false,
    hasManual: false,
    electricalPanelPowers: false,
    correctMotorRotation: false,
    compressionUnitRotates: false,
    fanMotorWorks: false,
    maintenanceStopReasons: "",
    electricalFeedConnected: false,
    adequateBreaker: false,
    dischargePipeConnectedTo: "",
    compressorRoomConditions: "",
  });

  const loadPreMaintenanceData = async (folio: string) => {
    try {
      const response = await fetch(`${URL_API}/reporte_mtto/pre-mtto/${folio}`);
      const result = await response.json();

      if (result.data) {
        const savedData = result.data;
        console.log("✅ Loaded pre-maintenance data:", savedData);

        // Map database fields back to form fields
        setFormData((prev) => ({
          ...prev,
          equipmentPowers: savedData.equipo_enciende || "",
          displayPowers: savedData.display_enciende || "",
          generalHours: savedData.horas_totales?.toString() || "",
          loadHours: savedData.horas_carga?.toString() || "",
          unloadHours: savedData.horas_descarga?.toString() || "",
          maintenanceRequired: savedData.mantenimiento_proximo || "",
          isMaster: savedData.compresor_es_master || "Master",
          mainMotorAmperage: savedData.amperaje_maximo_motor?.toString() || "",
          location: savedData.ubicacion_compresor || "",
          hotAirExpulsion: savedData.expulsion_aire_caliente || "",
          highDustOperation: savedData.operacion_muchos_polvos || "",
          compressorRoomConditions: savedData.compresor_bien_instalado || "",
          specialConditions: savedData.condiciones_especiales || "",
          supplyVoltage: savedData.voltaje_alimentacion?.toString() || "",
          fanAmperage: savedData.amperaje_ventilador?.toString() || "",
          oilLeaks: savedData.fugas_aceite_visibles || "",
          airLeaks: savedData.fugas_aire_audibles || "",
          aceiteOscuro: savedData.aceite_oscuro_degradado || "",
          compressionTempDisplay:
            savedData.temp_compresion_display?.toString() || "",
          compressionTempLaser:
            savedData.temp_compresion_laser?.toString() || "",
          finalCompressionTemp:
            savedData.temp_separador_aceite?.toString() || "",
          internalTemp: savedData.temp_interna_cuarto?.toString() || "",
          deltaTAceite: savedData.delta_t_enfriador_aceite?.toString() || "",
          tempMotor: savedData.temp_motor_electrico?.toString() || "",
          pressureControlMethod: savedData.metodo_control_presion || "",
          loadPressure: savedData.presion_carga?.toString() || "",
          unloadPressure: savedData.presion_descarga?.toString() || "",
          pressureDifferential: savedData.diferencial_presion || "",
          deltaPSeparador: savedData.delta_p_separador?.toString() || "",
          intakeValveType: savedData.tipo_valvula_admision || "",
          intakeValveFunctioning:
            savedData.funcionamiento_valvula_admision || "",
          wetTankExists: savedData.wet_tank_existe || false,
          wetTankLiters: savedData.wet_tank_litros?.toString() || "",
          wetTankSafetyValve: savedData.wet_tank_valvula_seguridad || false,
          wetTankDrain: savedData.wet_tank_dren || false,
          dryTankExists: savedData.dry_tank_existe || false,
          dryTankLiters: savedData.dry_tank_litros?.toString() || "",
          dryTankSafetyValve: savedData.dry_tank_valvula_seguridad || false,
          dryTankDrain: savedData.dry_tank_dren || false,
          excessDust: savedData.exceso_polvo_suciedad || false,
          hasManual: savedData.hay_manual || false,
          electricalPanelPowers: savedData.tablero_electrico_enciende || false,
          correctMotorRotation: savedData.giro_correcto_motor || false,
          compressionUnitRotates: savedData.unidad_compresion_gira || false,
          fanMotorWorks: savedData.motor_ventilador_funciona || false,
          maintenanceStopReasons: savedData.razon_paro_mantenimiento || "",
          electricalFeedConnected:
            savedData.alimentacion_electrica_conectada || false,
          adequateBreaker: savedData.pastilla_adecuada_amperajes || false,
          dischargePipeConnectedTo:
            savedData.tuberia_descarga_conectada_a || "",
        }));
      }
    } catch (error) {
      console.error("Error loading pre-maintenance data:", error);
    }
  };

  const loadMaintenanceData = async (folio: string) => {
    try {
      const response = await fetch(`${URL_API}/reporte_mantenimiento/${folio}`);
      const result = await response.json();

      if (result.data) {
        const savedData = result.data;
        console.log("✅ Loaded maintenance data:", savedData);

        // Map database fields back to maintenance items
        const updatedMantenimientos = defaultMaintenanceItems.map((item) => {
          const itemFieldMap: { [key: string]: string } = {
            "Cambio de aceite": "cambio_aceite",
            "Cambio de filtro de aceite": "cambio_filtro_aceite",
            "Cambio de filtro de aire": "cambio_filtro_aire",
            "Cambio de separador de aceite": "cambio_separador_aceite",
            "Revisión de válvula de admisión": "revision_valvula_admision",
            "Revisión de válvula de descarga": "revision_valvula_descarga",
            "Limpieza de radiador": "limpieza_radiador",
            "Revisión de bandas/correas": "revision_bandas_correas",
            "Revisión de fugas de aire": "revision_fugas_aire",
            "Revisión de fugas de aceite": "revision_fugas_aceite",
            "Revisión de conexiones eléctricas":
              "revision_conexiones_electricas",
            "Revisión de presostato": "revision_presostato",
            "Revisión de manómetros": "revision_manometros",
            "Lubricación general": "lubricacion_general",
            "Limpieza general del equipo": "limpieza_general",
          };

          const dbFieldName = itemFieldMap[item.nombre];
          const dbValue = savedData[dbFieldName];

          return {
            nombre: item.nombre,
            realizado: dbValue === "Sí",
          };
        });

        setMaintenanceData({
          mantenimientos: updatedMantenimientos,
          comentarios_generales: savedData.comentarios_generales || "",
          comentario_cliente: savedData.comentario_cliente || "",
          fotos: [],
        });

        // Show maintenance section if data exists
        setShowMaintenanceSection(true);
      }
    } catch (error) {
      console.error("Error loading maintenance data:", error);
    }
  };

  const loadPostMaintenanceData = async (folio: string) => {
    
  };

  // Load compressor data from URL parameters
  useEffect(() => {
    const folio = searchParams.get("folio");

    if (folio) {
      fetch(`${URL_API}/ordenes/${folio}`)
        .then((response) => response.json())
        .then(async (result) => {
          if (result.data && result.data.length > 0) {
            const orden = result.data[0];
            setFormData((prev) => ({
              ...prev,
              folio: orden.folio,
              clientId: orden.id_cliente?.toString() || "",
              eventualClientId: orden.id_cliente_eventual?.toString() || "",
              clientName: orden.nombre_cliente || "",
              compressorAlias: orden.alias_compresor || "",
              serialNumber: orden.numero_serie || "",
              equipmentHp: orden.hp?.toString() || "",
              compressorType: orden.tipo || "",
              brand: orden.marca || "",
              yearManufactured: orden.anio?.toString() || "",
              diagnosticType: orden.tipo_visita || "",
              maintenanceType: orden.tipo_mantenimiento || "",
              scheduledDate: orden.fecha_programada || "",
              scheduledTime: orden.hora_programada || "",
              orderStatus: orden.estado || "",
              creationDate: orden.fecha_creacion || "",
              reportUrl: orden.reporte_url || "",
            }));

            // Load previously saved pre-maintenance data
            await loadPreMaintenanceData(orden.folio);

            // Load previously saved maintenance data
            await loadMaintenanceData(orden.folio);

            // Clean up URL to only show folio
            router.replace(`?folio=${folio}`, { scroll: false });
          }
        })
        .catch((error) => {
          console.error("Error fetching orden de servicio:", error);
          alert("❌ Error al cargar la información de la orden de servicio");
        });
    }

    // Restore form data if coming back from maintenance section
    const storedFormData = sessionStorage.getItem("reportFormData");
    if (storedFormData && !folio) {
      try {
        const data = JSON.parse(storedFormData);
        setFormData(data);
      } catch (error) {
        console.error("Error restoring form data:", error);
      }
    }
  }, [searchParams, router]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!formData.folio || !hasUnsavedChanges) return;

    const autoSaveInterval = setInterval(() => {
      console.log("🔄 Auto-guardando borrador...");
      handleSaveDraft(false); // false = no mostrar alerta
    }, 30000); // 30 segundos

    return () => clearInterval(autoSaveInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.folio, hasUnsavedChanges]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setHasUnsavedChanges(true);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: string,
  ) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, [fieldName]: file }));
    setHasUnsavedChanges(true);

    // Also add to photosByCategory for Google Drive upload
    if (file) {
      // Map photo fields to categories
      const fieldToCategoryMap: { [key: string]: string } = {
        photo1: "PLACAS_EQUIPO",
        photo2: "DISPLAY_HORAS", // Alarmas del sistema
        photo3: "TEMPERATURAS",
        photo4: "PRESIONES",
        photo5: "CONDICIONES_AMBIENTALES",
        photo6: "OTROS",
      };

      const category = fieldToCategoryMap[fieldName];
      if (category) {
        console.log(
          `📸 Adding photo to category ${category}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
        );
        setPhotosByCategory((prev: { [key: string]: File[] }) => ({
          ...prev,
          [category]: [...prev[category].filter((f: File) => f.name !== file.name), file],
        }));
      }
    }
  };

  // Handle categorized photo uploads
  const handleCategorizedPhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    category: string,
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      console.log(
        `📸 Adding ${fileArray.length} photo(s) to category: ${category}`,
      );
      fileArray.forEach((file, idx) => {
        console.log(
          `   Photo ${idx + 1}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
        );
      });

      setPhotosByCategory((prev) => ({
        ...prev,
        [category]: [...prev[category], ...fileArray],
      }));
      setHasUnsavedChanges(true);
    } else {
      console.warn(`⚠️ No files selected for category: ${category}`);
    }
  };

  // Remove photo from category
  const removeCategorizedPhoto = (category: string, index: number) => {
    console.log(
      `🗑️ Removing photo at index ${index} from category: ${category}`,
    );
    setPhotosByCategory((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
    setHasUnsavedChanges(true);
  };

  // Save pre-maintenance data to backend
  const savePreMaintenanceData = useCallback(async () => {
    if (!formData.folio) {
      console.warn("No folio available for saving pre-maintenance data");
      return { success: false, error: "No folio available" };
    }

    try {
      // Helper function to convert form data to pre-maintenance format
      const buildPreMantenimientoData = () => {
        return {
          folio: formData.folio || "",
          equipo_enciende: formData.equipmentPowers || undefined,
          display_enciende: formData.displayPowers || undefined,
          horas_totales: formData.generalHours
            ? parseFloat(formData.generalHours)
            : undefined,
          horas_carga: formData.loadHours
            ? parseFloat(formData.loadHours)
            : undefined,
          horas_descarga: formData.unloadHours
            ? parseFloat(formData.unloadHours)
            : undefined,
          mantenimiento_proximo: formData.maintenanceRequired || undefined,
          compresor_es_master: formData.isMaster || undefined,
          amperaje_maximo_motor: formData.mainMotorAmperage
            ? parseFloat(formData.mainMotorAmperage)
            : undefined,
          ubicacion_compresor: formData.location || undefined,
          expulsion_aire_caliente: formData.hotAirExpulsion || undefined,
          operacion_muchos_polvos: formData.highDustOperation || undefined,
          compresor_bien_instalado:
            formData.compressorRoomConditions || undefined,
          condiciones_especiales: formData.specialConditions || undefined,
          voltaje_alimentacion: formData.supplyVoltage
            ? parseFloat(formData.supplyVoltage)
            : undefined,
          amperaje_motor_carga: formData.mainMotorAmperage
            ? parseFloat(formData.mainMotorAmperage)
            : undefined,
          amperaje_ventilador: formData.fanAmperage
            ? parseFloat(formData.fanAmperage)
            : undefined,
          fugas_aceite_visibles: formData.oilLeaks || undefined,
          fugas_aire_audibles: formData.airLeaks || undefined,
          aceite_oscuro_degradado: formData.aceiteOscuro || undefined,
          temp_compresion_display: formData.compressionTempDisplay
            ? parseFloat(formData.compressionTempDisplay)
            : undefined,
          temp_compresion_laser: formData.compressionTempLaser
            ? parseFloat(formData.compressionTempLaser)
            : undefined,
          temp_separador_aceite: formData.finalCompressionTemp
            ? parseFloat(formData.finalCompressionTemp)
            : undefined,
          temp_interna_cuarto: formData.internalTemp
            ? parseFloat(formData.internalTemp)
            : undefined,
          delta_t_enfriador_aceite: formData.deltaTAceite
            ? parseFloat(formData.deltaTAceite)
            : undefined,
          temp_motor_electrico: formData.tempMotor
            ? parseFloat(formData.tempMotor)
            : undefined,
          metodo_control_presion: formData.pressureControlMethod || undefined,
          presion_carga: formData.loadPressure
            ? parseFloat(formData.loadPressure)
            : undefined,
          presion_descarga: formData.unloadPressure
            ? parseFloat(formData.unloadPressure)
            : undefined,
          diferencial_presion: formData.pressureDifferential || undefined,
          delta_p_separador: formData.deltaPSeparador
            ? parseFloat(formData.deltaPSeparador)
            : undefined,
          tipo_valvula_admision: formData.intakeValveType || undefined,
          funcionamiento_valvula_admision:
            formData.intakeValveFunctioning || undefined,
          wet_tank_existe: formData.wetTankExists || undefined,
          wet_tank_litros: formData.wetTankLiters
            ? parseInt(formData.wetTankLiters)
            : undefined,
          wet_tank_valvula_seguridad: formData.wetTankSafetyValve || undefined,
          wet_tank_dren: formData.wetTankDrain || undefined,
          dry_tank_existe: formData.dryTankExists || undefined,
          dry_tank_litros: formData.dryTankLiters
            ? parseInt(formData.dryTankLiters)
            : undefined,
          dry_tank_valvula_seguridad: formData.dryTankSafetyValve || undefined,
          dry_tank_dren: formData.dryTankDrain || undefined,
          exceso_polvo_suciedad: formData.excessDust || undefined,
          hay_manual: formData.hasManual || undefined,
          tablero_electrico_enciende:
            formData.electricalPanelPowers || undefined,
          giro_correcto_motor: formData.correctMotorRotation || undefined,
          unidad_compresion_gira: formData.compressionUnitRotates || undefined,
          motor_ventilador_funciona: formData.fanMotorWorks || undefined,
          razon_paro_mantenimiento:
            formData.maintenanceStopReasons || undefined,
          alimentacion_electrica_conectada:
            formData.electricalFeedConnected || undefined,
          pastilla_adecuada_amperajes: formData.adequateBreaker || undefined,
          tuberia_descarga_conectada_a:
            formData.dischargePipeConnectedTo || undefined,
        };
      };

      const preMaintenanceData = buildPreMantenimientoData();
      console.log("📤 Sending data:", preMaintenanceData);

      const result = await savePreMantenimiento(preMaintenanceData);
      console.log("📥 API Response:", result);

      if (result?.success) {
        console.log("✅ Pre-maintenance data saved:", result);
        return result;
      } else {
        const errorMsg = result?.error || result?.message || "Unknown error";
        console.error("❌ Error saving pre-maintenance data:", errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Exception saving pre-maintenance data:", errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [formData, savePreMantenimiento]);

  // Upload all photos to Google Drive
  const uploadAllPhotos = useCallback(async () => {
    // Get fresh data from formData state
    if (!formData.folio) {
      console.warn("⚠️ Missing folio for photo upload");
      return { success: false, error: "Missing folio" };
    }

    // Use clientName from formData, fallback to "Unknown"
    const clientName = formData.clientName || "Unknown";

    try {
      // Log all photo categories for debugging
      console.log("📋 Photo categories status:");
      Object.entries(photosByCategory).forEach(([category, files]) => {
        console.log(`  ${category}: ${files.length} photo(s)`);
      });

      const results: Record<string, unknown> = {};
      let totalUploaded = 0;
      let totalFailed = 0;
      let hasPhotos = false;

      for (const [category, files] of Object.entries(photosByCategory)) {
        if (files.length > 0) {
          hasPhotos = true;
          console.log(`📤 Uploading ${files.length} photo(s) to ${category}`);
          console.log(
            `   Using folio: ${formData.folio}, client: ${clientName}`,
          );

          const result = await uploadPhotos(
            formData.folio,
            clientName,
            category,
            files,
          );

          if (result.success) {
            totalUploaded += files.length;
            results[category] = result as unknown as Record<string, unknown>;
            console.log(`✅ ${category} upload successful`);
          } else {
            totalFailed += files.length;
            console.error(`❌ Failed to upload ${category}:`, result.error);
          }
        }
      }

      if (!hasPhotos) {
        console.log("ℹ️ No photos to upload (all categories empty)");
        return { success: true, results: {} };
      }

      if (totalFailed > 0) {
        const failureMsg = `⚠️ ${totalUploaded} fotos subidas, ${totalFailed} fallaron`;
        console.warn(failureMsg);
        alert(failureMsg);
      } else if (totalUploaded > 0) {
        const successMsg = `✅ ${totalUploaded} fotos subidas exitosamente`;
        console.log(successMsg);
        alert(successMsg);
      }

      return { success: totalFailed === 0, results };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Error uploading photos:", errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [formData, photosByCategory, uploadPhotos]);

  const handleSaveDraft = useCallback(
    async (showAlert: boolean = true) => {
      try {
        setIsSaving(true);

        // First, save pre-maintenance data to database
        console.log("💾 Saving pre-maintenance data...");
        const result = await savePreMaintenanceData();

        if (result?.success) {
          // Save maintenance data if section is shown
          if (showMaintenanceSection && formData.folio) {
            console.log("💾 Saving maintenance data to database...");

            // Convert maintenance items to database format (Sí/No)
            const mantenimientoDbData: Record<string, string> = {
              folio: formData.folio,
              comentarios_generales: maintenanceData.comentarios_generales,
              comentario_cliente: maintenanceData.comentario_cliente,
            };

            // Map maintenance items to database fields
            const itemFieldMap: { [key: string]: string } = {
              "Cambio de aceite": "cambio_aceite",
              "Cambio de filtro de aceite": "cambio_filtro_aceite",
              "Cambio de filtro de aire": "cambio_filtro_aire",
              "Cambio de separador de aceite": "cambio_separador_aceite",
              "Revisión de válvula de admisión": "revision_valvula_admision",
              "Revisión de válvula de descarga": "revision_valvula_descarga",
              "Limpieza de radiador": "limpieza_radiador",
              "Revisión de bandas/correas": "revision_bandas_correas",
              "Revisión de fugas de aire": "revision_fugas_aire",
              "Revisión de fugas de aceite": "revision_fugas_aceite",
              "Revisión de conexiones eléctricas":
                "revision_conexiones_electricas",
              "Revisión de presostato": "revision_presostato",
              "Revisión de manómetros": "revision_manometros",
              "Lubricación general": "lubricacion_general",
              "Limpieza general del equipo": "limpieza_general",
            };

            // Add maintenance items to the data object
            maintenanceData.mantenimientos.forEach((item) => {
              const dbField = itemFieldMap[item.nombre];
              if (dbField) {
                mantenimientoDbData[dbField] = item.realizado ? "Sí" : "No";
              }
            });

            try {
              const maintenanceResponse = await fetch(
                `${URL_API}/reporte_mantenimiento/`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(mantenimientoDbData),
                },
              );

              const maintenanceResult = await maintenanceResponse.json();
              if (maintenanceResponse.ok) {
                console.log("✅ Maintenance data saved:", maintenanceResult);
              } else {
                console.error(
                  "⚠️ Error saving maintenance data:",
                  maintenanceResult,
                );
              }
            } catch (mttoError) {
              console.error("❌ Error saving maintenance data:", mttoError);
            }
          }

          // Then, upload categorized photos to Google Drive
          const hasPhotosToUpload = Object.values(photosByCategory).some(
            (photos) => photos.length > 0,
          );

          if (hasPhotosToUpload) {
            console.log("📸 Uploading photos to Google Drive...");
            const photoUploadResult = await uploadAllPhotos();

            if (!photoUploadResult.success) {
              console.warn(
                "⚠️ Some photos failed to upload, but draft was saved",
              );
            } else {
              console.log("✅ Photos uploaded successfully");
            }
          }

          setLastSaved(new Date());
          setHasUnsavedChanges(false);
          if (showAlert) {
            alert("💾 Borrador guardado exitosamente");
          }
        } else {
          if (showAlert) {
            alert(
              `❌ Error al guardar: ${result?.error || "Error desconocido"}`,
            );
          }
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Error desconocido";
        console.error("Error saving draft:", error);
        if (showAlert) {
          alert(`❌ Error al guardar el borrador: ${errorMsg}`);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [
      showMaintenanceSection,
      maintenanceData,
      photosByCategory,
      uploadAllPhotos,
      savePreMaintenanceData,
      formData.folio,
    ],
  );

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!formData.folio || !hasUnsavedChanges) return;

    const autoSaveInterval = setInterval(() => {
      console.log("🔄 Auto-guardando borrador...");
      handleSaveDraft(false); // false = no mostrar alerta
    }, 30000); // 30 segundos

    return () => clearInterval(autoSaveInterval);
  }, [formData.folio, hasUnsavedChanges, handleSaveDraft]);

  const handleNextSection = async () => {
    // Save pre-maintenance data to backend before proceeding
    await savePreMaintenanceData();

    setShowMaintenanceSection(true);
    // Scroll to maintenance section after a brief delay
    setTimeout(() => {
      const maintenanceSection = document.getElementById("maintenance-section");
      if (maintenanceSection) {
        maintenanceSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  const handleMaintenanceToggle = (index: number) => {
    const updatedMantenimientos = [...maintenanceData.mantenimientos];
    updatedMantenimientos[index].realizado =
      !updatedMantenimientos[index].realizado;
    setMaintenanceData({
      ...maintenanceData,
      mantenimientos: updatedMantenimientos,
    });
  };

  const handleMaintenanceInputChange = (field: string, value: string) => {
    setMaintenanceData({ ...maintenanceData, [field]: value });
  };

  const handleMaintenanceFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setMaintenanceData({
        ...maintenanceData,
        fotos: [...maintenanceData.fotos, ...filesArray],
      });
    }
  };

  const removeMaintenancePhoto = (index: number) => {
    const updatedFotos = maintenanceData.fotos.filter((_, i) => i !== index);
    setMaintenanceData({ ...maintenanceData, fotos: updatedFotos });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // First, upload categorized photos to Google Drive
      const hasPhotosToUpload = Object.values(photosByCategory).some(
        (photos) => photos.length > 0,
      );

      if (hasPhotosToUpload) {
        console.log("📸 Starting photo upload to Google Drive...");
        const photoUploadResult = await uploadAllPhotos();

        if (!photoUploadResult.success) {
          console.warn(
            "⚠️ Photo upload had failures, but continuing with form submission",
          );
          // Don't block the form submission if photos fail
        }
      }

      // Create FormData for file uploads
      const submitData = new FormData();

      // Add all text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (
          value !== null &&
          value !== undefined &&
          typeof value !== "object"
        ) {
          submitData.append(key, value.toString());
        }
      });

      // Add file uploads if they exist
      if (formData.photo1) {
        submitData.append("photo1", formData.photo1);
      }
      if (formData.photo2) {
        submitData.append("photo2", formData.photo2);
      }
      if (formData.photo3) {
        submitData.append("photo3", formData.photo3);
      }
      if (formData.photo4) {
        submitData.append("photo4", formData.photo4);
      }
      if (formData.photo5) {
        submitData.append("photo5", formData.photo5);
      }
      if (formData.photo6) {
        submitData.append("photo6", formData.photo6);
      }

      // Add maintenance data if section is shown
      if (showMaintenanceSection) {
        submitData.append(
          "mantenimientos",
          JSON.stringify(maintenanceData.mantenimientos),
        );
        submitData.append(
          "comentarios_generales",
          maintenanceData.comentarios_generales,
        );
        submitData.append(
          "comentario_cliente",
          maintenanceData.comentario_cliente,
        );

        // Add maintenance photos
        maintenanceData.fotos.forEach((foto, index) => {
          submitData.append(`foto_mantenimiento_${index}`, foto);
        });
      }

      // Send to backend API
      console.log("📤 Submitting main report data...");
      const response = await fetch(`${URL_API}/reporte_mtto/`, {
        method: "POST",
        body: submitData,
      });

      const result = await response.json();

      if (response.ok) {
        // Save maintenance data to database if section was completed
        if (showMaintenanceSection && formData.folio) {
          console.log("💾 Saving maintenance data to database...");

          // Convert maintenance items to database format (Sí/No)
          const mantenimientoDbData: Record<string, string> = {
            folio: formData.folio,
            comentarios_generales: maintenanceData.comentarios_generales,
            comentario_cliente: maintenanceData.comentario_cliente,
          };

          // Map maintenance items to database fields
          const itemFieldMap: { [key: string]: string } = {
            "Cambio de aceite": "cambio_aceite",
            "Cambio de filtro de aceite": "cambio_filtro_aceite",
            "Cambio de filtro de aire": "cambio_filtro_aire",
            "Cambio de separador de aceite": "cambio_separador_aceite",
            "Revisión de válvula de admisión": "revision_valvula_admision",
            "Revisión de válvula de descarga": "revision_valvula_descarga",
            "Limpieza de radiador": "limpieza_radiador",
            "Revisión de bandas/correas": "revision_bandas_correas",
            "Revisión de fugas de aire": "revision_fugas_aire",
            "Revisión de fugas de aceite": "revision_fugas_aceite",
            "Revisión de conexiones eléctricas":
              "revision_conexiones_electricas",
            "Revisión de presostato": "revision_presostato",
            "Revisión de manómetros": "revision_manometros",
            "Lubricación general": "lubricacion_general",
            "Limpieza general del equipo": "limpieza_general",
          };

          // Add maintenance items to the data object
          maintenanceData.mantenimientos.forEach((item) => {
            const dbField = itemFieldMap[item.nombre];
            if (dbField) {
              mantenimientoDbData[dbField] = item.realizado ? "Sí" : "No";
            }
          });

          try {
            const maintenanceResponse = await fetch(
              `${URL_API}/reporte_mantenimiento/`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(mantenimientoDbData),
              },
            );

            const maintenanceResult = await maintenanceResponse.json();
            if (maintenanceResponse.ok) {
              console.log("✅ Maintenance data saved:", maintenanceResult);
            } else {
              console.error(
                "⚠️ Error saving maintenance data:",
                maintenanceResult,
              );
              // Don't block the main flow if maintenance data fails
            }
          } catch (mttoError) {
            console.error("❌ Error submitting maintenance data:", mttoError);
            // Don't block the main flow
          }
        }

        alert("✅ Reporte guardado exitosamente");
        // Remove draft if it exists
        const existingDrafts = localStorage.getItem("draftReports");
        if (existingDrafts) {
          const drafts = JSON.parse(existingDrafts);
          const filtered = drafts.filter(
            (d: { id: string }) => d.id !== formData.folio,
          );
          localStorage.setItem("draftReports", JSON.stringify(filtered));
        }
        // Redirect back to reports list
        router.push("/features/compressor-maintenance/technician/reports");
      } else {
        console.error("Error response:", result);
        alert(
          `❌ Error al guardar el reporte: ${
            result.detail || result.message || "Error desconocido"
          }`,
        );
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("❌ Error al enviar el reporte. Por favor, intente nuevamente.");
    }
  };

  // Función para generar diagnóstico automático
  const generateDiagnostico = () => {
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
      formData.compressionTempDisplay || formData.compressionTempLaser || "0",
    );
    if (tempComp >= 80 && tempComp <= 95) {
      positivos.push("Temperatura de compresión dentro de rango óptimo");
    } else if (tempComp > 95 && tempComp <= 105) {
      positivos.push(
        "Temperatura de compresión aceptable para operación continua",
      );
    } else if (tempComp > 0) {
      causas.push("Temperatura de compresión fuera de rango");
      agregar_consecuencia("Riesgo de paro por alta temperatura", 3);
      agregar_consecuencia("Degradación acelerada del aceite", 2);
      acciones.push("Revisar enfriadores, ventilación y aceite");
    }

    // Temperatura del separador
    const tempSep = parseFloat(formData.finalCompressionTemp || "0");
    if (tempSep > 0 && tempSep <= 90) {
      positivos.push("Temperatura del separador aire-aceite adecuada");
    } else if (tempSep <= 95) {
      positivos.push(
        "Temperatura del separador cercana al límite, pero aceptable",
      );
    } else if (tempSep > 95) {
      causas.push("Separador aire-aceite sobrecalentado");
      agregar_consecuencia("Arrastre de aceite a la red", 3);
      acciones.push("Revisar estado del separador y retorno de aceite");
    }

    // Delta T enfriador de aceite
    const deltaT = parseFloat(formData.deltaTAceite || "0");
    if (deltaT >= 15) {
      positivos.push(
        "Enfriador de aceite operando con buena eficiencia térmica",
      );
    } else if (deltaT >= 10 && deltaT < 15) {
      positivos.push("Enfriador de aceite con eficiencia térmica aceptable");
    } else if (deltaT > 0) {
      causas.push("Baja eficiencia del enfriador de aceite");
      agregar_consecuencia("Alta temperatura interna del compresor", 2);
      acciones.push("Limpiar enfriador y revisar ventilador");
    }

    // Diferencial de presión del separador
    const deltaP = parseFloat(formData.deltaPSeparador || "0");
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
    const tempMotor = parseFloat(formData.tempMotor || "0");
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
    const polvo = formData.highDustOperation === "Sí";
    const ventDeficiente = formData.hotAirExpulsion === "Interno al cuarto";
    if (!polvo && !ventDeficiente) {
      positivos.push("Condiciones ambientales y ventilación adecuadas");
    } else {
      causas.push("Condiciones ambientales desfavorables");
      agregar_consecuencia("Ensuciamiento acelerado de enfriadores", 1);
      acciones.push("Mejorar limpieza y ventilación del cuarto");
    }

    // Condición del aceite
    if (formData.aceiteOscuro === "No") {
      positivos.push("Aceite en buen estado visual");
    } else if (formData.aceiteOscuro === "Sí") {
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

  const renderClientSelection = () => (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
        INFORMACIÓN DEL CLIENTE Y ORDEN
      </h2>
      <div>
        <div className="space-y-6">
          <div className="p-4">
            <h3 className="font-bold text-blue-900 mb-4 text-lg">
              INFORMACIÓN DEL CLIENTE
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-m font-medium text-blue-800 mb-1">
                  Folio
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.folio || "Sin asignar"}
                </p>
              </div>
              <div>
                <label className="block text-m font-medium text-blue-800 mb-1">
                  Nombre Cliente
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.clientName || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Sección Compresor */}
          <div className="p-4">
            <h3 className="font-bold text-blue-900 mb-4 text-lg">
              INFORMACIÓN DEL COMPRESOR
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-m font-medium text-blue-800 mb-1">
                  Alias Compresor
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.compressorAlias || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-m font-medium text-blue-800 mb-1">
                  Número de Serie
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.serialNumber || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-m font-medium text-blue-800 mb-1">
                  HP
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.equipmentHp || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-m font-medium text-blue-800 mb-1">
                  Tipo
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.compressorType || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-m font-medium text-blue-800 mb-1">
                  Marca
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.brand || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-m font-medium text-blue-800 mb-1">
                  Año
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.yearManufactured || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Sección Orden de Servicio */}
          <div className="p-4">
            <h3 className="font-bold text-blue-900 mb-4 text-lg">
              INFORMACIÓN DE LA ORDEN DE SERVICIO
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-m font-medium text-blue-800 mb-1">
                  Tipo de Visita
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.diagnosticType || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-m font-medium text-blue-800 mb-1">
                  Tipo de Mantenimiento
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.maintenanceType || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-m font-medium text-blue-800 mb-1">
                  Fecha Programada
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.scheduledDate || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-m font-medium text-blue-800 mb-1">
                  Hora Programada
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.scheduledTime || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInitialInfo = () => (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
        INFORMACIÓN INICIAL - PRE-MANTENIMIENTO
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-m font-medium text-purple-800 mb-2">
            ¿Equipo enciende? *
          </label>
          <select
            name="equipmentPowers"
            value={formData.equipmentPowers}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">-- Seleccionar --</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
          </select>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
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
          {renderClientSelection()}
          {/* Header Reporte de Mantenimiento */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-purple-800 to-purple-900 text-white p-4">
              <h2 className="text-xl font-bold text-center">
                PRE-MANTENIMIENTO
              </h2>
            </div>
          </div>

          {renderInitialInfo()}

          {formData.equipmentPowers === "Sí" && (
            <>
              {/* SECCIÓN 1: Display y Horas de Trabajo */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  DISPLAY Y HORAS DE TRABAJO - PRE-MANTENIMIENTO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      ¿Display enciende? *
                    </label>
                    <select
                      name="displayPowers"
                      value={formData.displayPowers}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <PhotoUploadSection
                    category="DISPLAY_HORAS"
                    label="Fotos Horas Generales de Trabajo"
                    photos={photosByCategory.DISPLAY_HORAS}
                    onPhotoAdd={handleCategorizedPhotoChange}
                    onPhotoRemove={removeCategorizedPhoto}
                    uploadStatus={uploadStatus.DISPLAY_HORAS || "idle"}
                    uploadProgress={uploadProgress.DISPLAY_HORAS || 0}
                  />
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Horas Totales
                    </label>
                    <input
                      type="number"
                      name="generalHours"
                      value={formData.generalHours}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Horas en Carga
                    </label>
                    <input
                      type="number"
                      name="loadHours"
                      value={formData.loadHours}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Horas en Descarga
                    </label>
                    <input
                      type="number"
                      name="unloadHours"
                      value={formData.unloadHours}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      📷 Foto Alarmas del Sistema
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo2")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {formData.photo2 && (
                      <p className="text-m text-green-600 mt-1">
                        ✓ {formData.photo2.name}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Condición de Próximo Mantenimiento
                    </label>
                    <select
                      name="maintenanceRequired"
                      value={formData.maintenanceRequired}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- Seleccionar --</option>
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
                      <option value="Otro">Otro (especificar)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: Placas del Equipo */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  PLACAS DEL EQUIPO - PRE-MANTENIMIENTO
                </h2>
                <div className="space-y-6">
                  {/* Placa del Compresor */}
                  <div className="p-4">
                    <h3 className="font-bold text-purple-900 mb-4 text-lg">
                      Placa del Compresor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-m font-medium text-gray-700 mb-2">
                          📷 Foto Placa del Compresor
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "photo3")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        {formData.photo3 && (
                          <p className="text-m text-green-600 mt-1">
                            ✓ {formData.photo3.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-m font-medium text-gray-700 mb-2">
                          Compresor es Master / Slave
                        </label>
                        <select
                          name="isMaster"
                          value={formData.isMaster}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="Master">Master</option>
                          <option value="Slave">Slave</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Placa del Motor */}
                  <div className="p-4">
                    <h3 className="font-bold text-purple-900 text-lg">
                      Placa del Motor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-m font-medium text-gray-700 mb-2">
                          📷 Foto Placa del Motor
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "photo4")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        {formData.photo4 && (
                          <p className="text-m text-green-600 mt-1">
                            {formData.photo4.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-m font-medium text-gray-700 mb-2">
                          AMP Máximo
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          name="mainMotorAmperage"
                          value={formData.mainMotorAmperage}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="0.0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: Condiciones Ambientales */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  CONDICIONES AMBIENTALES - PRE-MANTENIMIENTO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      📷 Foto Condiciones Ambientales
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo5")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {formData.photo5 && (
                      <p className="text-m text-green-600 mt-1">
                        ✓ {formData.photo5.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Ubicación del Compresor
                    </label>
                    <select
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Intemperie">Intemperie</option>
                      <option value="Dentro de cuarto">Dentro de cuarto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Método Expulsión Aire Caliente
                    </label>
                    <select
                      name="hotAirExpulsion"
                      value={formData.hotAirExpulsion}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Ducto directo al exterior">
                        Ducto directo al exterior
                      </option>
                      <option value="Interno al cuarto">
                        Interno al cuarto
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Operación con muchos polvos?
                    </label>
                    <select
                      name="highDustOperation"
                      value={formData.highDustOperation}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Compresor bien instalado?
                    </label>
                    <select
                      name="compressorRoomConditions"
                      value={formData.compressorRoomConditions}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Otra condición especial de operación
                    </label>
                    <textarea
                      name="specialConditions"
                      value={formData.specialConditions}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                      placeholder="Describa..."
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: Voltajes y Amperajes */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  VOLTAJES Y AMPERAJES - PRE-MANTENIMIENTO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      VOLTAJE de Alimentación Equipo (V)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="supplyVoltage"
                      value={formData.supplyVoltage}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      AMPERAJE Motor en CARGA (A)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="mainMotorAmperage"
                      value={formData.mainMotorAmperage}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      AMPERAJE de Ventilador (A)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="fanAmperage"
                      value={formData.fanAmperage}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 5: Aceite */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  ACEITE - PRE-MANTENIMIENTO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      📷 Foto Separador Aire-Aceite
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo6")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {formData.photo6 && (
                      <p className="text-m text-green-600 mt-1">
                        ✓ {formData.photo6.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      ¿Existen fugas de aceite visibles?
                    </label>
                    <select
                      name="oilLeaks"
                      value={formData.oilLeaks}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      ¿Existen fugas de aire audibles?
                    </label>
                    <select
                      name="airLeaks"
                      value={formData.airLeaks}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      ¿Aceite está oscuro o degradado?
                    </label>
                    <select
                      name="aceiteOscuro"
                      value={formData.aceiteOscuro}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Describa situación del aceite
                    </label>
                    <textarea
                      name="aceiteOscuro"
                      value={formData.aceiteOscuro}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="Describa el estado del aceite (color, nivel, degradación, etc.)"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 6: Temperaturas */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  TEMPERATURAS - PRE-MANTENIMIENTO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Temp. Ambiente (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="airIntakeTemp"
                      value={formData.airIntakeTemp}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Temp. Final Compresión Display (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="compressionTempDisplay"
                      value={formData.compressionTempDisplay}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Temp. Final Compresión Laser (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="compressionTempLaser"
                      value={formData.compressionTempLaser}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Temp. Separador Aire-Aceite (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="finalCompressionTemp"
                      value={formData.finalCompressionTemp}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Temp. Interna Cuarto (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="internalTemp"
                      value={formData.internalTemp}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Delta T Enfriador Aceite (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="deltaTAceite"
                      value={formData.deltaTAceite}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Temp. Motor Eléctrico (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="tempMotor"
                      value={formData.tempMotor}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 7: Mediciones de Presión */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  MEDICIONES DE PRESIÓN - PRE-MANTENIMIENTO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Método de Control de Presión
                    </label>
                    <input
                      type="text"
                      name="pressureControlMethod"
                      value={formData.pressureControlMethod}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Ej: Abierto, VSD, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Presión CARGA (PSI o Bar)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="loadPressure"
                      value={formData.loadPressure}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Presión DESCARGA (PSI)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="unloadPressure"
                      value={formData.unloadPressure}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Diferencial de Presión
                    </label>
                    <input
                      type="text"
                      name="pressureDifferential"
                      value={formData.pressureDifferential}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Ingrese diferencial"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Delta P Separador (Bar)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="deltaPSeparador"
                      value={formData.deltaPSeparador}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 8: Válvulas */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  VÁLVULAS - PRE-MANTENIMIENTO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Tipo de Válvula de Admisión
                    </label>
                    <input
                      type="text"
                      name="intakeValveType"
                      value={formData.intakeValveType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Tipo de válvula"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Funcionamiento Válvula Admisión
                    </label>
                    <select
                      name="intakeValveFunctioning"
                      value={formData.intakeValveFunctioning}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="OK">OK</option>
                      <option value="No OK">No OK</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 9: Tanques de Almacenamiento */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  TANQUES DE ALMACENAMIENTO - PRE-MANTENIMIENTO
                </h2>
                <div className="space-y-6">
                  {/* Wet Tank */}
                  <div className="p-4">
                    <h3 className="font-bold text-blue-900 mb-4">
                      Wet Tank (Tanque Húmedo)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            name="wetTankExists"
                            checked={formData.wetTankExists}
                            onChange={handleInputChange}
                            className="w-5 h-5"
                          />
                          <span className="text-m font-medium text-gray-700">
                            ¿Existe?
                          </span>
                        </label>
                      </div>
                      {formData.wetTankExists && (
                        <>
                          <div>
                            <label className="block text-m font-medium text-gray-700 mb-2">
                              Capacidad (Litros)
                            </label>
                            <input
                              type="number"
                              name="wetTankLiters"
                              value={formData.wetTankLiters}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                name="wetTankSafetyValve"
                                checked={formData.wetTankSafetyValve}
                                onChange={handleInputChange}
                                className="w-5 h-5"
                              />
                              <span className="text-m font-medium text-gray-700">
                                Válvula de Seguridad Funciona
                              </span>
                            </label>
                          </div>
                          <div>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                name="wetTankDrain"
                                checked={formData.wetTankDrain}
                                onChange={handleInputChange}
                                className="w-5 h-5"
                              />
                              <span className="text-m font-medium text-gray-700">
                                Dren Funciona
                              </span>
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dry Tank */}
                  <div className="p-4">
                    <h3 className="font-bold text-blue-900 mb-4">
                      Dry Tank (Tanque Seco)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            name="dryTankExists"
                            checked={formData.dryTankExists}
                            onChange={handleInputChange}
                            className="w-5 h-5"
                          />
                          <span className="text-m font-medium text-gray-700">
                            ¿Existe?
                          </span>
                        </label>
                      </div>
                      {formData.dryTankExists && (
                        <>
                          <div>
                            <label className="block text-m font-medium text-gray-700 mb-2">
                              Capacidad (Litros)
                            </label>
                            <input
                              type="number"
                              name="dryTankLiters"
                              value={formData.dryTankLiters}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                name="dryTankSafetyValve"
                                checked={formData.dryTankSafetyValve}
                                onChange={handleInputChange}
                                className="w-5 h-5"
                              />
                              <span className="text-m font-medium text-gray-700">
                                Válvula de Seguridad Funciona
                              </span>
                            </label>
                          </div>
                          <div>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                name="dryTankDrain"
                                checked={formData.dryTankDrain}
                                onChange={handleInputChange}
                                className="w-5 h-5"
                              />
                              <span className="text-m font-medium text-gray-700">
                                Dren Funciona
                              </span>
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 10: Resumen de Diagnóstico Automático */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  RESUMEN DE DIAGNÓSTICO AUTOMÁTICO - PRE-MANTENIMIENTO
                </h2>
                {(() => {
                  const diagnostico = generateDiagnostico();
                  return (
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
                  );
                })()}
              </div>
            </>
          )}

          {formData.equipmentPowers === "No" && (
            <>
              {/* SECCIÓN 1: Estado del Equipo */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  ESTADO DEL EQUIPO - PRE-MANTENIMIENTO
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      📷 Foto Elementos Completos
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo1")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="correctMotorRotation"
                        checked={formData.correctMotorRotation}
                        onChange={handleInputChange}
                        className="w-5 h-5"
                      />
                      <span className="text-m">Motor</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="compressionUnitRotates"
                        checked={formData.compressionUnitRotates}
                        onChange={handleInputChange}
                        className="w-5 h-5"
                      />
                      <span className="text-m">Unidad Compresión</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="fanMotorWorks"
                        checked={formData.fanMotorWorks}
                        onChange={handleInputChange}
                        className="w-5 h-5"
                      />
                      <span className="text-m">Serpentín Enfriamiento</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: Condiciones Generales */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  CONDICIONES GENERALES - PRE-MANTENIMIENTO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      📷 Foto Condiciones Generales
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo2")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="excessDust"
                        checked={formData.excessDust}
                        onChange={handleInputChange}
                        className="w-5 h-5"
                      />
                      <span className="text-m font-medium text-gray-700">
                        Exceso de polvo y suciedad
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="hasManual"
                        checked={formData.hasManual}
                        onChange={handleInputChange}
                        className="w-5 h-5"
                      />
                      <span className="text-m font-medium text-gray-700">
                        ¿Hay manual?
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="electricalPanelPowers"
                        checked={formData.electricalPanelPowers}
                        onChange={handleInputChange}
                        className="w-5 h-5"
                      />
                      <span className="text-m font-medium text-gray-700">
                        Tablero eléctrico enciende
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: Revisión Mecánica */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  REVISIÓN MECÁNICA (Equipo Apagado) - PRE-MANTENIMIENTO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="correctMotorRotation"
                        checked={formData.correctMotorRotation}
                        onChange={handleInputChange}
                        className="w-5 h-5"
                      />
                      <span className="text-m font-medium text-gray-700">
                        Giro correcto del motor
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="compressionUnitRotates"
                        checked={formData.compressionUnitRotates}
                        onChange={handleInputChange}
                        className="w-5 h-5"
                      />
                      <span className="text-m font-medium text-gray-700">
                        Unidad de compresión gira
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="fanMotorWorks"
                        checked={formData.fanMotorWorks}
                        onChange={handleInputChange}
                        className="w-5 h-5"
                      />
                      <span className="text-m font-medium text-gray-700">
                        Motor ventilador funciona
                      </span>
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Razones de paro según equipo de mantenimiento
                    </label>
                    <textarea
                      name="maintenanceStopReasons"
                      value={formData.maintenanceStopReasons}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="Describa las razones..."
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: Instalaciones */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  INSTALACIONES DEL EQUIPO - PRE-MANTENIMIENTO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      📷 Foto Instalaciones
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo3")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="electricalFeedConnected"
                        checked={formData.electricalFeedConnected}
                        onChange={handleInputChange}
                        className="w-5 h-5"
                      />
                      <span className="text-m font-medium text-gray-700">
                        Alimentación eléctrica conectada
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="adequateBreaker"
                        checked={formData.adequateBreaker}
                        onChange={handleInputChange}
                        className="w-5 h-5"
                      />
                      <span className="text-m font-medium text-gray-700">
                        Pastilla adecuada para amperajes
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Tubería de descarga conectada a
                    </label>
                    <select
                      name="dischargePipeConnectedTo"
                      value={formData.dischargePipeConnectedTo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Red de la planta">Red de la planta</option>
                      <option value="Aire libre">Aire libre</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Ventilación cuarto compresores
                    </label>
                    <select
                      name="compressorRoomConditions"
                      value={formData.compressorRoomConditions}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Correcta">Correcta</option>
                      <option value="Incorrecta">Incorrecta</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 5: Placas del Equipo */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  PLACAS DEL EQUIPO - PRE-MANTENIMIENTO
                </h2>
                <div className="space-y-6">
                  {/* Placa Motor */}
                  <div className="p-4">
                    <h3 className="font-bold text-blue-900 mb-4">
                      Placa del Motor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-m font-medium text-gray-700 mb-2">
                          📷 Foto Placa del Motor
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "photo4")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Placa Compresor */}
                  <div className="p-4">
                    <h3 className="font-bold text-blue-900 mb-4">
                      Placa del Compresor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-m font-medium text-gray-700 mb-2">
                          📷 Foto Placa del Compresor
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "photo5")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 6: Aceite */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  ACEITE - PRE-MANTENIMIENTO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      📷 Foto Nivel de Aceite
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo6")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Fugas de aceite visibles
                    </label>
                    <select
                      name="oilLeaks"
                      value={formData.oilLeaks}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-m font-medium text-gray-700 mb-2">
                      Fugas de aire visibles
                    </label>
                    <select
                      name="airLeaks"
                      value={formData.airLeaks}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 7: Tanques */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-purple-800 px-4 py-2 rounded font-bold mb-4">
                  TANQUES DE ALMACENAMIENTO - PRE-MANTENIMIENTO
                </h2>
                <div className="space-y-6">
                  {/* Wet Tank */}
                  <div className="p-4">
                    <h3 className="font-bold text-blue-900 mb-4">Wet Tank</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            name="wetTankExists"
                            checked={formData.wetTankExists}
                            onChange={handleInputChange}
                            className="w-5 h-5"
                          />
                          <span className="text-m font-medium">¿Existe?</span>
                        </label>
                      </div>
                      {formData.wetTankExists && (
                        <>
                          <div>
                            <label className="block text-m font-medium text-gray-700 mb-2">
                              Litros
                            </label>
                            <input
                              type="number"
                              name="wetTankLiters"
                              value={formData.wetTankLiters}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                name="wetTankSafetyValve"
                                checked={formData.wetTankSafetyValve}
                                onChange={handleInputChange}
                                className="w-5 h-5"
                              />
                              <span className="text-m">
                                Válvula seguridad funciona
                              </span>
                            </label>
                          </div>
                          <div>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                name="wetTankDrain"
                                checked={formData.wetTankDrain}
                                onChange={handleInputChange}
                                className="w-5 h-5"
                              />
                              <span className="text-m">Dren funciona</span>
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dry Tank */}
                  <div className="p-4">
                    <h3 className="font-bold text-blue-900 mb-4">Dry Tank</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            name="dryTankExists"
                            checked={formData.dryTankExists}
                            onChange={handleInputChange}
                            className="w-5 h-5"
                          />
                          <span className="text-m font-medium">¿Existe?</span>
                        </label>
                      </div>
                      {formData.dryTankExists && (
                        <>
                          <div>
                            <label className="block text-m font-medium text-gray-700 mb-2">
                              Litros
                            </label>
                            <input
                              type="number"
                              name="dryTankLiters"
                              value={formData.dryTankLiters}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                name="dryTankSafetyValve"
                                checked={formData.dryTankSafetyValve}
                                onChange={handleInputChange}
                                className="w-5 h-5"
                              />
                              <span className="text-m">
                                Válvula seguridad funciona
                              </span>
                            </label>
                          </div>
                          <div>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                name="dryTankDrain"
                                checked={formData.dryTankDrain}
                                onChange={handleInputChange}
                                className="w-5 h-5"
                              />
                              <span className="text-m">Dren funciona</span>
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {showMaintenanceSection && (
            <div id="maintenance-section">
              {/* Header Mantenimiento */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-teal-600 to-green-800 text-white p-4">
                  <h2 className="text-xl font-bold text-center">
                    MANTENIMIENTO
                  </h2>
                </div>
              </div>

              {/* Mantenimientos Realizados */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-teal-800 px-4 py-2 rounded font-bold mb-4">
                  MANTENIMIENTOS REALIZADOS - MANTENIMIENTO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {maintenanceData.mantenimientos.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${
                        item.realizado
                          ? "bg-blue-800 text-white border-2 border-blue-900 hover:bg-blue-900"
                          : "bg-gray-50 border-2 border-gray-200 hover:bg-gray-100"
                      }`}
                      onClick={() => handleMaintenanceToggle(index)}
                    >
                      <span className="text-m font-medium">{item.nombre}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.realizado}
                          onChange={() => handleMaintenanceToggle(index)}
                          className="w-5 h-5 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span
                          className={`text-lg font-bold ${
                            item.realizado ? "text-white" : "text-gray-400"
                          }`}
                        >
                          {item.realizado ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-m text-gray-600">
                  <span className="font-bold text-green-600">✓</span> = Se
                  realizó cambio, <span className="font-bold">✗</span> = Se
                  mantuvo igual
                </div>
              </div>

              {/* Comentarios Generales */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-teal-800 px-4 py-2 rounded font-bold mb-4">
                  COMENTARIOS GENERALES - MANTENIMIENTO
                </h2>
                <textarea
                  value={maintenanceData.comentarios_generales}
                  onChange={(e) =>
                    handleMaintenanceInputChange(
                      "comentarios_generales",
                      e.target.value,
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={6}
                  placeholder="Describa las observaciones, hallazgos y trabajos realizados durante el mantenimiento..."
                />
              </div>

              {/* Comentarios del Cliente */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-teal-800 px-4 py-2 rounded font-bold mb-4">
                  COMENTARIOS DEL CLIENTE - MANTENIMIENTO
                </h2>
                <textarea
                  value={maintenanceData.comentario_cliente}
                  onChange={(e) =>
                    handleMaintenanceInputChange(
                      "comentario_cliente",
                      e.target.value,
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={4}
                  placeholder="Comentarios o solicitudes del cliente..."
                />
              </div>

              {/* Fotos del Mantenimiento */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-teal-800 px-4 py-2 rounded font-bold mb-4">
                  FOTOS DEL MANTENIMIENTO - MANTENIMIENTO
                </h2>
                <div className="mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleMaintenanceFileChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                {maintenanceData.fotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {maintenanceData.fotos.map((foto, index) => (
                      <div key={index} className="relative">
                        <div className="border border-gray-300 rounded-lg p-2">
                          <p className="text-m text-gray-600 truncate">
                            {foto.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeMaintenancePhoto(index)}
                            className="mt-2 w-full px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {showPostMaintenance && (

          ) }


          {/* Botones de acción */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Indicador de estado de guardado */}
            <div className="mb-4 flex items-center justify-end gap-2 text-sm">
              {isSaving ? (
                <span className="text-blue-600 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Guardando...
                </span>
              ) : hasUnsavedChanges ? (
                <span className="text-orange-600 flex items-center gap-2">
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Cambios sin guardar
                </span>
              ) : lastSaved ? (
                <span className="text-green-600 flex items-center gap-2">
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Guardado {lastSaved.toLocaleTimeString()}
                </span>
              ) : null}
            </div>

            <div className="flex gap-4 justify-between">
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
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Cancelar
              </button>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleSaveDraft(true)}
                  disabled={isSaving}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>💾 Guardar Borrador</>
                  )}
                </button>
                {!showMaintenanceSection && (
                  <button
                    type="button"
                    onClick={handleNextSection}
                    disabled={savingPreMaintenance || isSaving}
                    className="px-6 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingPreMaintenance
                      ? "Guardando..."
                      : "Siguiente Sección →"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GenerateReport() {
  return (
    <Suspense
      fallback={<LoadingOverlay isVisible={true} message="Cargando..." />}
    >
      <FillReport />
    </Suspense>
  );
}
