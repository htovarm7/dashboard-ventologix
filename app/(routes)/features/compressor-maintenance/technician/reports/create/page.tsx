"use client";
import React, { useState, Suspense, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import Image from "next/image";
import { URL_API } from "@/lib/global";
import { ReportFormData } from "@/lib/types";

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

  const [showMaintenanceSection, setShowMaintenanceSection] = useState(false);
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

  // Load compressor data from URL parameters
  useEffect(() => {
    const folio = searchParams.get("folio");

    if (folio) {
      fetch(`${URL_API}/ordenes/${folio}`)
        .then((response) => response.json())
        .then((result) => {
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

  if (isLoading) {
    return <LoadingOverlay isVisible={true} message="Cargando..." />;
  }

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: string
  ) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, [fieldName]: file }));
  };

  const handleSaveDraft = () => {
    try {
      // Get existing drafts
      const existingDrafts = localStorage.getItem("draftReports");
      const drafts = existingDrafts ? JSON.parse(existingDrafts) : [];

      // Create draft object (excluding File objects)
      const draftData = {
        id: formData.folio || `draft-${Date.now()}`,
        folio: formData.folio || "Sin folio",
        clientName: formData.clientName || "Sin cliente",
        serialNumber: formData.serialNumber || "Sin serie",
        lastModified: new Date().toISOString(),
        reportType: formData.diagnosticType || "Sin tipo",
        formData: {
          ...formData,
          // Convert File objects to null for localStorage
          photo1: null,
          photo2: null,
          photo3: null,
          photo4: null,
          photo5: null,
          photo6: null,
        },
      };

      // Check if draft already exists
      const existingIndex = drafts.findIndex((d: any) => d.id === draftData.id);
      if (existingIndex >= 0) {
        drafts[existingIndex] = draftData;
      } else {
        drafts.push(draftData);
      }

      // Save to localStorage
      localStorage.setItem("draftReports", JSON.stringify(drafts));
      alert("💾 Borrador guardado localmente");
    } catch (error) {
      console.error("Error saving draft:", error);
      alert("❌ Error al guardar el borrador");
    }
  };

  const handleNextSection = () => {
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
    e: React.ChangeEvent<HTMLInputElement>
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
          JSON.stringify(maintenanceData.mantenimientos)
        );
        submitData.append(
          "comentarios_generales",
          maintenanceData.comentarios_generales
        );
        submitData.append(
          "comentario_cliente",
          maintenanceData.comentario_cliente
        );

        // Add maintenance photos
        maintenanceData.fotos.forEach((foto, index) => {
          submitData.append(`foto_mantenimiento_${index}`, foto);
        });
      }

      // Send to backend API
      const response = await fetch("http://localhost:8000/api/reportes/", {
        method: "POST",
        body: submitData,
      });

      const result = await response.json();

      if (response.ok) {
        alert("✅ Reporte guardado exitosamente");
        // Remove draft if it exists
        const existingDrafts = localStorage.getItem("draftReports");
        if (existingDrafts) {
          const drafts = JSON.parse(existingDrafts);
          const filtered = drafts.filter((d: any) => d.id !== formData.folio);
          localStorage.setItem("draftReports", JSON.stringify(filtered));
        }
        // Redirect back to reports list
        router.push("/features/compressor-maintenance/technician/reports");
      } else {
        console.error("Error response:", result);
        alert(
          `❌ Error al guardar el reporte: ${
            result.detail || result.message || "Error desconocido"
          }`
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
      formData.compressionTempDisplay || formData.compressionTempLaser || "0"
    );
    if (tempComp >= 80 && tempComp <= 95) {
      positivos.push("Temperatura de compresión dentro de rango óptimo");
    } else if (tempComp > 95 && tempComp <= 105) {
      positivos.push(
        "Temperatura de compresión aceptable para operación continua"
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
        "Temperatura del separador cercana al límite, pero aceptable"
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
        "Enfriador de aceite operando con buena eficiencia térmica"
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
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Folio
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.folio || "Sin asignar"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
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
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Alias Compresor
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.compressorAlias || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Número de Serie
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.serialNumber || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  HP
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.equipmentHp || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Tipo
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.compressorType || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Marca
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.brand || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
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
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Tipo de Visita
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.diagnosticType || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Tipo de Mantenimiento
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.maintenanceType || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Fecha Programada
                </label>
                <p className="text-gray-800 font-semibold">
                  {formData.scheduledDate || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
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
      <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
        INFORMACIÓN INICIAL
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-blue-800 mb-2">
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

        {/* Header Reporte de Mantenimiento */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-4">
            <h2 className="text-xl font-bold text-center">PRE-MANTENIMIENTO</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {renderClientSelection()}
          {renderInitialInfo()}

          {formData.equipmentPowers === "Sí" && (
            <>
              {/* SECCIÓN 1: Display y Horas de Trabajo */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  DISPLAY Y HORAS DE TRABAJO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto Horas Generales de Trabajo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo1")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {formData.photo1 && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {formData.photo1.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto Alarmas del Sistema
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo2")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {formData.photo2 && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {formData.photo2.name}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  PLACAS DEL EQUIPO
                </h2>
                <div className="space-y-6">
                  {/* Placa del Compresor */}
                  <div className="p-4">
                    <h3 className="font-bold text-blue-900 mb-4 text-lg">
                      Placa del Compresor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Foto Placa del Compresor
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "photo3")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        {formData.photo3 && (
                          <p className="text-sm text-green-600 mt-1">
                            ✓ {formData.photo3.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <h3 className="font-bold text-blue-900 mb-4 text-lg">
                      Placa del Motor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Foto Placa del Motor
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "photo4")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        {formData.photo4 && (
                          <p className="text-sm text-green-600 mt-1">
                            {formData.photo4.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  CONDICIONES AMBIENTALES
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto Condiciones Ambientales
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo5")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {formData.photo5 && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {formData.photo5.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  VOLTAJES Y AMPERAJES
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  ACEITE
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto Separador Aire-Aceite
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo6")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {formData.photo6 && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {formData.photo6.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                </div>
              </div>

              {/* SECCIÓN 6: Temperaturas */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  TEMPERATURAS
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  MEDICIONES DE PRESIÓN
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Presión DESCARGA (PSI o Bar)
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  VÁLVULAS
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  TANQUES DE ALMACENAMIENTO
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
                          <span className="text-sm font-medium text-gray-700">
                            ¿Existe?
                          </span>
                        </label>
                      </div>
                      {formData.wetTankExists && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                              <span className="text-sm font-medium text-gray-700">
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
                              <span className="text-sm font-medium text-gray-700">
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
                          <span className="text-sm font-medium text-gray-700">
                            ¿Existe?
                          </span>
                        </label>
                      </div>
                      {formData.dryTankExists && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                              <span className="text-sm font-medium text-gray-700">
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
                              <span className="text-sm font-medium text-gray-700">
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
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  RESUMEN DE DIAGNÓSTICO AUTOMÁTICO
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
                              }
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
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  ESTADO DEL EQUIPO
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto Elementos Completos
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
                      <span className="text-sm">Motor</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="compressionUnitRotates"
                        checked={formData.compressionUnitRotates}
                        onChange={handleInputChange}
                        className="w-5 h-5"
                      />
                      <span className="text-sm">Unidad Compresión</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="fanMotorWorks"
                        checked={formData.fanMotorWorks}
                        onChange={handleInputChange}
                        className="w-5 h-5"
                      />
                      <span className="text-sm">Serpentín Enfriamiento</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: Condiciones Generales */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  CONDICIONES GENERALES
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto Condiciones Generales
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
                      <span className="text-sm font-medium text-gray-700">
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
                      <span className="text-sm font-medium text-gray-700">
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
                      <span className="text-sm font-medium text-gray-700">
                        Tablero eléctrico enciende
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: Revisión Mecánica */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  REVISIÓN MECÁNICA (Equipo Apagado)
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
                      <span className="text-sm font-medium text-gray-700">
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
                      <span className="text-sm font-medium text-gray-700">
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
                      <span className="text-sm font-medium text-gray-700">
                        Motor ventilador funciona
                      </span>
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  INSTALACIONES DEL EQUIPO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto Instalaciones
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
                      <span className="text-sm font-medium text-gray-700">
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
                      <span className="text-sm font-medium text-gray-700">
                        Pastilla adecuada para amperajes
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  PLACAS DEL EQUIPO
                </h2>
                <div className="space-y-6">
                  {/* Placa Motor */}
                  <div className="p-4">
                    <h3 className="font-bold text-blue-900 mb-4">
                      Placa del Motor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Foto Placa del Motor
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Foto Placa del Compresor
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
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  ACEITE
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto Nivel de Aceite
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo6")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  TANQUES DE ALMACENAMIENTO
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
                          <span className="text-sm font-medium">¿Existe?</span>
                        </label>
                      </div>
                      {formData.wetTankExists && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                              <span className="text-sm">
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
                              <span className="text-sm">Dren funciona</span>
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
                          <span className="text-sm font-medium">¿Existe?</span>
                        </label>
                      </div>
                      {formData.dryTankExists && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                              <span className="text-sm">
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
                              <span className="text-sm">Dren funciona</span>
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

          {/* SECCIÓN DE MANTENIMIENTO - Aparece cuando se hace clic en "Siguiente Sección" */}
          {showMaintenanceSection && (
            <div id="maintenance-section">
              {/* Header Mantenimiento */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-4">
                  <h2 className="text-xl font-bold text-center">
                    MANTENIMIENTO
                  </h2>
                </div>
              </div>

              {/* Mantenimientos Realizados */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  MANTENIMIENTOS REALIZADOS
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {maintenanceData.mantenimientos.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${
                        item.realizado
                          ? "bg-green-50 border-2 border-green-200 hover:bg-green-100"
                          : "bg-gray-50 border-2 border-gray-200 hover:bg-gray-100"
                      }`}
                      onClick={() => handleMaintenanceToggle(index)}
                    >
                      <span className="text-sm font-medium">{item.nombre}</span>
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
                            item.realizado ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {item.realizado ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <span className="font-bold text-green-600">✓</span> = Se
                  realizó cambio, <span className="font-bold">✗</span> = Se
                  mantuvo igual
                </div>
              </div>

              {/* Comentarios Generales */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  COMENTARIOS GENERALES
                </h2>
                <textarea
                  value={maintenanceData.comentarios_generales}
                  onChange={(e) =>
                    handleMaintenanceInputChange(
                      "comentarios_generales",
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={6}
                  placeholder="Describa las observaciones, hallazgos y trabajos realizados durante el mantenimiento..."
                />
              </div>

              {/* Comentarios del Cliente */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  COMENTARIOS DEL CLIENTE
                </h2>
                <textarea
                  value={maintenanceData.comentario_cliente}
                  onChange={(e) =>
                    handleMaintenanceInputChange(
                      "comentario_cliente",
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Comentarios o solicitudes del cliente..."
                />
              </div>

              {/* Fotos del Mantenimiento */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  FOTOS DEL MANTENIMIENTO
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
                          <p className="text-sm text-gray-600 truncate">
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

          {/* Botones de acción */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex gap-4 justify-between">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Cancelar
              </button>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                >
                  Guardar Borrador
                </button>
                {!showMaintenanceSection && (
                  <button
                    type="button"
                    onClick={handleNextSection}
                    className="px-6 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors font-medium flex items-center gap-2"
                  >
                    Siguiente Sección
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
