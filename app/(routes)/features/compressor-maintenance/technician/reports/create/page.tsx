"use client";
import React, { useState, Suspense, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import Image from "next/image";
import { ReportFormData } from "@/lib/types";

function FillReport() {
  const { isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState<ReportFormData>({
    isExistingClient: true,
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
    const compressorId = searchParams.get("compressorId");
    const serialNumber = searchParams.get("serialNumber");
    const clientId = searchParams.get("clientId");
    const clientName = searchParams.get("clientName");
    const numeroCliente = searchParams.get("numeroCliente");
    const brand = searchParams.get("brand");
    const model = searchParams.get("model");
    const hp = searchParams.get("hp");
    const year = searchParams.get("year");
    const tipo = searchParams.get("tipo");
    const alias = searchParams.get("alias");
    const tipoVisita = searchParams.get("tipoVisita");
    const isEventual = searchParams.get("isEventual");

    if (compressorId && serialNumber) {
      setFormData((prev) => ({
        ...prev,
        folio: folio || prev.folio,
        compressorId,
        serialNumber,
        clientId: clientId || prev.clientId,
        clientName: clientName || prev.clientName,
        numeroCliente: numeroCliente || prev.numeroCliente,
        brand: brand || prev.brand,
        model: model || prev.model,
        yearManufactured: year || prev.yearManufactured,
        equipmentHp: hp || prev.equipmentHp,
        compressorType: tipo || prev.compressorType,
        compressorAlias: alias || prev.compressorAlias,
        diagnosticType: tipoVisita || prev.diagnosticType,
        isExistingClient: isEventual !== "true",
      }));
    } else if (isEventual === "true") {
      setFormData((prev) => ({
        ...prev,
        isExistingClient: false,
      }));
    }
  }, [searchParams]);

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

  const renderClientSelection = () => (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Información del Cliente
      </h2>

      {formData.isExistingClient ? (
        <div>
          {formData.clientName ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-2">
                  Cliente Seleccionado
                </h3>
                <p className="text-gray-800">
                  <span className="font-medium">Nombre:</span>{" "}
                  {formData.clientName}
                </p>
                <p className="text-gray-700 text-sm">
                  <span className="font-medium">ID Cliente:</span>{" "}
                  {formData.clientId}
                </p>
              </div>
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <h3 className="font-bold text-green-900 mb-2">
                  Compresor Seleccionado
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <p className="text-gray-800">
                    <span className="font-medium">Serie:</span>{" "}
                    {formData.serialNumber}
                  </p>
                  <p className="text-gray-800">
                    <span className="font-medium">Marca:</span> {formData.brand}
                  </p>
                  <p className="text-gray-800">
                    <span className="font-medium">Modelo:</span>{" "}
                    {formData.model}
                  </p>
                  <p className="text-gray-800">
                    <span className="font-medium">Año:</span>{" "}
                    {formData.yearManufactured}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Cliente *
              </label>
              <select
                name="clientId"
                value={formData.clientId || ""}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">
                  -- Seleccionar cliente (fetch pendiente) --
                </option>
                {/* TODO: Fetch clients from backend */}
              </select>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Cliente *
            </label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName || ""}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección
            </label>
            <input
              type="text"
              name="clientAddress"
              value={formData.clientAddress || ""}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contacto
            </label>
            <input
              type="text"
              name="clientContact"
              value={formData.clientContact || ""}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              name="clientPhone"
              value={formData.clientPhone || ""}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fecha del Reporte *
        </label>
        <input
          type="date"
          name="reportDate"
          value={formData.reportDate}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>
    </div>
  );

  const renderInitialInfo = () => (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
        INFORMACIÓN INICIAL
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Diagnóstico *
          </label>
          <select
            name="diagnosticType"
            value={formData.diagnosticType}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">-- Seleccionar --</option>
            <option value="1era visita COMERCIAL">1era visita COMERCIAL</option>
            <option value="Mantenimiento preventivo">
              Mantenimiento preventivo
            </option>
            <option value="Falla mecánica">Falla mecánica</option>
            <option value="Revisión general">Revisión general</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-6">
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
                <h1 className="text-2xl font-bold">VENTOLOGIX</h1>
                <p className="text-sm opacity-90">
                  FORMULARIO DE DIAGNÓSTICO PRE-MANTENIMIENTO
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {renderClientSelection()}
          {renderInitialInfo()}

          {/* Contenido condicional basado en si el equipo enciende */}
          {formData.equipmentPowers === "Sí" && (
            <>
              {/* Aquí van las secciones cuando el equipo ENCIENDE */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  INFORMACIÓN INICIAL
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ¿Display enciende? *
                    </label>
                    <select
                      name="displayPowers"
                      value={formData.displayPowers}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto de Horas Generales de trabajo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo1")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {formData.photo1 && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {formData.photo1.name}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horas generales de trabajo
                      </label>
                      <input
                        type="number"
                        name="generalHours"
                        value={formData.generalHours}
                        onChange={handleInputChange}
                        className="w-1/4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horas de Carga
                      </label>
                      <input
                        type="number"
                        name="loadHours"
                        value={formData.loadHours}
                        onChange={handleInputChange}
                        className="w-1/4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horas de Descarga
                      </label>
                      <input
                        type="number"
                        name="loadHours"
                        value={formData.unloadHours}
                        onChange={handleInputChange}
                        className="w-1/4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {formData.equipmentPowers === "No" && (
            <>
              {/* Aquí van las secciones cuando el equipo NO ENCIENDE */}
              <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-red-800 font-medium">
                  ⚠️ SECCIONES PARA EQUIPO QUE NO ENCIENDE - Programación
                  pendiente
                </p>
                <p className="text-sm text-red-700 mt-1">
                  (Estado del equipo, elementos completos, condiciones
                  generales, instalaciones del equipo, etc.)
                </p>
              </div>
            </>
          )}

          {/* Botones de acción */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium flex items-center gap-2"
              >
                <span>💾</span>
                Guardar Borrador
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <span>✅</span>
                Guardar Diagnóstico
              </button>
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
