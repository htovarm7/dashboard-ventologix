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

      // Clean up URL to only show folio
      if (folio) {
        router.replace(`?folio=${folio}`, { scroll: false });
      } else {
        router.replace(window.location.pathname, { scroll: false });
      }
    } else if (isEventual === "true") {
      setFormData((prev) => ({
        ...prev,
        isExistingClient: false,
      }));

      // Clean up URL
      router.replace(window.location.pathname, { scroll: false });
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
      <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
        INFORMACIÓN DEL CLIENTE Y ORDEN
      </h2>

      {formData.isExistingClient ? (
        <div>
          {formData.clientName ? (
            <div className="space-y-6">
              {/* Sección Cliente */}
              <div className="border-2 border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-4 text-lg">
                  INFORMACIÓN DEL CLIENTE
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Nombre
                    </label>
                    <p className="text-gray-800 font-semibold">
                      {formData.clientName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      N° Cliente
                    </label>
                    <p className="text-gray-800 font-semibold">
                      {formData.numeroCliente}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Folio
                    </label>
                    <p className="text-gray-800 font-semibold">
                      {formData.folio || "Sin asignar"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sección Compresor */}
              <div className="border-2 border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-4 text-lg">
                  INFORMACIÓN DEL COMPRESOR
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Serie
                    </label>
                    <p className="text-gray-800 font-semibold">
                      {formData.serialNumber}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Marca
                    </label>
                    <p className="text-gray-800 font-semibold">
                      {formData.brand}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Modelo
                    </label>
                    <p className="text-gray-800 font-semibold">
                      {formData.model}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Año
                    </label>
                    <p className="text-gray-800 font-semibold">
                      {formData.yearManufactured}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      HP
                    </label>
                    <p className="text-gray-800 font-semibold">
                      {formData.equipmentHp}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Alias
                    </label>
                    <p className="text-gray-800 font-semibold">
                      {formData.compressorAlias}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">
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
        <div className="space-y-6">
          {/* Sección Cliente Eventual */}
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-900 mb-4 text-lg">
              INFORMACIÓN DEL CLIENTE
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
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
                <label className="block text-sm font-medium text-blue-700 mb-2">
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

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
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
                <label className="block text-sm font-medium text-blue-700 mb-2">
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
            </div>
          </div>

          {/* Sección Compresor Eventual */}
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-900 mb-4 text-lg">
              INFORMACIÓN DEL COMPRESOR
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Número de Serie *
                </label>
                <input
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Marca *
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Modelo
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Año de Fabricación
                </label>
                <input
                  type="number"
                  name="yearManufactured"
                  value={formData.yearManufactured || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1900"
                  max="2100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  HP
                </label>
                <input
                  type="number"
                  name="equipmentHp"
                  value={formData.equipmentHp || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Alias/Identificador
                </label>
                <input
                  type="text"
                  name="compressorAlias"
                  value={formData.compressorAlias || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <label className="block text-sm font-medium text-blue-700 mb-2">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-2">
            Tipo de Visita *
          </label>
          {formData.isExistingClient && formData.diagnosticType ? (
            <div className="border-2 border-gray-200 rounded-lg p-3">
              <p className="text-gray-800 font-semibold">
                {formData.diagnosticType}
              </p>
            </div>
          ) : (
            <select
              name="diagnosticType"
              value={formData.diagnosticType}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- Seleccionar --</option>
              <option value="1era visita COMERCIAL">
                1era visita COMERCIAL
              </option>
              <option value="Mantenimiento preventivo">
                Mantenimiento preventivo
              </option>
              <option value="Falla mecánica">Falla mecánica</option>
              <option value="Revisión general">Revisión general</option>
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-700 mb-2">
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
              {/* SECCIÓN: INFORMACIÓN DEL DISPLAY Y HORAS */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  INFORMACIÓN DEL DISPLAY Y HORAS DE TRABAJO
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
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
                    <label className="block text-sm font-medium text-blue-700 mb-2">
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Horas Generales de Trabajo
                    </label>
                    <input
                      type="number"
                      name="generalHours"
                      value={formData.generalHours}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Horas de Carga
                    </label>
                    <input
                      type="number"
                      name="loadHours"
                      value={formData.loadHours}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Horas de Descarga
                    </label>
                    <input
                      type="number"
                      name="unloadHours"
                      value={formData.unloadHours}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN: MANTENIMIENTO */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  MANTENIMIENTO
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="maintenance2000"
                        checked={formData.maintenance2000}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-blue-700">
                        Mantenimiento 2000 hrs
                      </span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="maintenance4000"
                        checked={formData.maintenance4000}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-blue-700">
                        Mantenimiento 4000 hrs
                      </span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="maintenance6000"
                        checked={formData.maintenance6000}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-blue-700">
                        Mantenimiento 6000 hrs
                      </span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="otherMechanicalFailure"
                        checked={formData.otherMechanicalFailure}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-blue-700">
                        Otra falla mecánica
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Mantenimiento Requerido
                    </label>
                    <textarea
                      name="maintenanceRequired"
                      value={formData.maintenanceRequired}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Describa el mantenimiento requerido..."
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN: TEMPERATURAS */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  TEMPERATURAS
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Temp. Compresión Display (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="compressionTempDisplay"
                      value={formData.compressionTempDisplay}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Temp. Compresión Laser (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="compressionTempLaser"
                      value={formData.compressionTempLaser}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Temp. Final Compresión (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="finalCompressionTemp"
                      value={formData.finalCompressionTemp}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Temp. Admisión Aire (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="airIntakeTemp"
                      value={formData.airIntakeTemp}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Temp. Interenfriador (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="intercoolerTemp"
                      value={formData.intercoolerTemp}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Temp. Interna Cuarto (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="internalTemp"
                      value={formData.internalTemp}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN: PARÁMETROS ELÉCTRICOS */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  PARÁMETROS ELÉCTRICOS
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Voltaje de Alimentación (V)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="supplyVoltage"
                      value={formData.supplyVoltage}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Amperaje Motor Principal (A)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="mainMotorAmperage"
                      value={formData.mainMotorAmperage}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Amperaje Ventilador (A)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="fanAmperage"
                      value={formData.fanAmperage}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Factor de Potencia en Carga
                    </label>
                    <select
                      name="powerFactorLoadOk"
                      value={formData.powerFactorLoadOk}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="OK">OK</option>
                      <option value="No OK">No OK</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Factor de Potencia en Descarga
                    </label>
                    <select
                      name="powerFactorUnloadOk"
                      value={formData.powerFactorUnloadOk}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="OK">OK</option>
                      <option value="No OK">No OK</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN: DATOS DEL EQUIPO */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  DATOS DEL EQUIPO
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Fugas de Aceite
                    </label>
                    <select
                      name="oilLeaks"
                      value={formData.oilLeaks}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Fugas de Aire
                    </label>
                    <select
                      name="airLeaks"
                      value={formData.airLeaks}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Funcionamiento Válvula Admisión
                    </label>
                    <select
                      name="intakeValveFunctioning"
                      value={formData.intakeValveFunctioning}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="OK">OK</option>
                      <option value="No OK">No OK</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Tipo de Válvula Admisión
                    </label>
                    <input
                      type="text"
                      name="intakeValveType"
                      value={formData.intakeValveType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ingrese tipo de válvula"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Diferencial de Presión
                    </label>
                    <input
                      type="text"
                      name="pressureDifferential"
                      value={formData.pressureDifferential}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ingrese diferencial"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Método de Control de Presión
                    </label>
                    <input
                      type="text"
                      name="pressureControlMethod"
                      value={formData.pressureControlMethod}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ingrese método"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Configuración
                    </label>
                    <select
                      name="isMaster"
                      value={formData.isMaster}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Master">Master</option>
                      <option value="Esclavo">Esclavo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN: PRESIONES */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  PRESIONES
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Presión Operación (PSI)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="operatingPressure"
                      value={formData.operatingPressure}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Set Point Operación (PSI)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="operatingSetPoint"
                      value={formData.operatingSetPoint}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Presión Carga (PSI)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="loadPressure"
                      value={formData.loadPressure}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Presión Descarga (PSI)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="unloadPressure"
                      value={formData.unloadPressure}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN: TANQUES */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  TANQUES
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Tanque Húmedo */}
                  <div className="border-2 border-blue-200 rounded-lg p-4">
                    <h3 className="font-bold text-blue-900 mb-4">
                      Tanque Húmedo
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="wetTankExists"
                          checked={formData.wetTankExists}
                          onChange={handleInputChange}
                          className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-blue-700">
                          ¿Existe tanque húmedo?
                        </span>
                      </label>

                      {formData.wetTankExists && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-blue-700 mb-2">
                              Capacidad (Litros)
                            </label>
                            <input
                              type="number"
                              name="wetTankLiters"
                              value={formData.wetTankLiters}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </div>

                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              name="wetTankSafetyValve"
                              checked={formData.wetTankSafetyValve}
                              onChange={handleInputChange}
                              className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-blue-700">
                              Válvula de Seguridad
                            </span>
                          </label>

                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              name="wetTankDrain"
                              checked={formData.wetTankDrain}
                              onChange={handleInputChange}
                              className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-blue-700">
                              Purga/Drenaje
                            </span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tanque Seco */}
                  <div className="border-2 border-blue-200 rounded-lg p-4">
                    <h3 className="font-bold text-blue-900 mb-4">
                      Tanque Seco
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="dryTankExists"
                          checked={formData.dryTankExists}
                          onChange={handleInputChange}
                          className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-blue-700">
                          ¿Existe tanque seco?
                        </span>
                      </label>

                      {formData.dryTankExists && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-blue-700 mb-2">
                              Capacidad (Litros)
                            </label>
                            <input
                              type="number"
                              name="dryTankLiters"
                              value={formData.dryTankLiters}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </div>

                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              name="dryTankSafetyValve"
                              checked={formData.dryTankSafetyValve}
                              onChange={handleInputChange}
                              className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-blue-700">
                              Válvula de Seguridad
                            </span>
                          </label>

                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              name="dryTankDrain"
                              checked={formData.dryTankDrain}
                              onChange={handleInputChange}
                              className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-blue-700">
                              Purga/Drenaje
                            </span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN: CONDICIONES AMBIENTALES */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  CONDICIONES AMBIENTALES Y UBICACIÓN
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Ubicación del Equipo
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Interior, Exterior, Cuarto de máquinas"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Expulsión Aire Caliente
                    </label>
                    <select
                      name="hotAirExpulsion"
                      value={formData.hotAirExpulsion}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Adecuada">Adecuada</option>
                      <option value="Inadecuada">Inadecuada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Operación con Polvo Alto
                    </label>
                    <select
                      name="highDustOperation"
                      value={formData.highDustOperation}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Condiciones Especiales
                    </label>
                    <input
                      type="text"
                      name="specialConditions"
                      value={formData.specialConditions}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describa condiciones especiales"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN: ESTADO DE COMPONENTES */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  ESTADO DE COMPONENTES
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Condición del Motor
                    </label>
                    <select
                      name="motorCondition"
                      value={formData.motorCondition}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Condición Unidad de Compresión
                    </label>
                    <select
                      name="compressionUnitCondition"
                      value={formData.compressionUnitCondition}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Condición Serpentín de Enfriamiento
                    </label>
                    <select
                      name="coolingCoilCondition"
                      value={formData.coolingCoilCondition}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Condición Válvulas de Admisión
                    </label>
                    <select
                      name="admissionValvesCondition"
                      value={formData.admissionValvesCondition}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Otras Condiciones
                    </label>
                    <textarea
                      name="otherCondition"
                      value={formData.otherCondition}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Describa otras condiciones..."
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN: VERIFICACIONES ADICIONALES */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  VERIFICACIONES ADICIONALES
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="excessDust"
                      checked={formData.excessDust}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-blue-700">
                      Exceso de Polvo
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="hasManual"
                      checked={formData.hasManual}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-blue-700">
                      Cuenta con Manual
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="electricalPanelPowers"
                      checked={formData.electricalPanelPowers}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-blue-700">
                      Panel Eléctrico Enciende
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="correctMotorRotation"
                      checked={formData.correctMotorRotation}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-blue-700">
                      Rotación Correcta del Motor
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="compressionUnitRotates"
                      checked={formData.compressionUnitRotates}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-blue-700">
                      Unidad de Compresión Gira
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="fanMotorWorks"
                      checked={formData.fanMotorWorks}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-blue-700">
                      Motor del Ventilador Funciona
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="electricalFeedConnected"
                      checked={formData.electricalFeedConnected}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-blue-700">
                      Alimentación Eléctrica Conectada
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="adequateBreaker"
                      checked={formData.adequateBreaker}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-blue-700">
                      Breaker Adecuado
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Razones de Paro de Mantenimiento
                    </label>
                    <textarea
                      name="maintenanceStopReasons"
                      value={formData.maintenanceStopReasons}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Describa las razones..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Tubería de Descarga Conectada A
                    </label>
                    <input
                      type="text"
                      name="dischargePipeConnectedTo"
                      value={formData.dischargePipeConnectedTo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Red principal, tanque, etc."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Condiciones del Cuarto de Compresores
                    </label>
                    <textarea
                      name="compressorRoomConditions"
                      value={formData.compressorRoomConditions}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Describa las condiciones..."
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN: FOTOGRAFÍAS */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  FOTOGRAFÍAS ADICIONALES
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Fotografía 2
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo2")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {formData.photo2 && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {formData.photo2.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Fotografía 3
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo3")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {formData.photo3 && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {formData.photo3.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Fotografía 4
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo4")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {formData.photo4 && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {formData.photo4.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Fotografía 5
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo5")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {formData.photo5 && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {formData.photo5.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Fotografía 6
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "photo6")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {formData.photo6 && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {formData.photo6.name}
                      </p>
                    )}
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
