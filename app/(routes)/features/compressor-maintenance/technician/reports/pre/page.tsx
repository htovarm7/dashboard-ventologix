"use client";
import React, { useState, Suspense } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import Image from "next/image";

interface ModalState {
  isOpen: boolean;
  imageSrc: string;
}

function DiagnosticReportContent() {
  const { isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();

  const [imageModal, setImageModal] = useState<ModalState>({
    isOpen: false,
    imageSrc: "",
  });

  // Mock diagnostic data - Replace with actual API call
  const diagnosticData = {
    id: "DIAG-001",
    cliente: "Cliente Ejemplo",
    compresor: "Garner Denver ST125-200G2A",
    diagnosticType: "1era visita COMERCIAL",
    equipmentPowers: "Enciende",
    displayPowers: "SI",
    hoursData: {
      generalHours: "5338.9",
      loadHours: "5338.1",
      unloadHours: "0.8",
      photo1:
        "https://drive.google.com/uc?id=1FMkpgkmOdh8y-PnBs15JyHUtTPg9yl2R",
    },
    alarms: {
      maintenance2000: false,
      maintenance4000: false,
      maintenance6000: false,
      otherMechanicalFailure: false,
      photo2: "",
    },
    temperatures: {
      compressionTempDisplay: "86°C",
      compressionTempLaser: "79°C",
      airIntakePressure: "32°C",
      intercoolerTemp: "79°C",
    },
    electricalMeasurements: {
      supplyVoltage: "440",
      mainMotorAmperage: "142",
      fanAmperage: "6.1",
      powerFactorLoadOk: "Ok",
      powerFactorUnloadOk: "Ok",
      photo3:
        "https://drive.google.com/uc?id=1PaEufS88rJqyreXEqZoEfXDQcUiW2lb0",
    },
    compressorData: {
      brand: "Garner Denver",
      serialNumber: "S693393",
      yearManufactured: "2024",
      model: "ST125-200G2A",
      photo4:
        "https://drive.google.com/uc?id=1PaEufS88rJqyreXEqZoEfXDQcUiW2lb0",
    },
    pneumaticSystem: {
      oilLeaks: "Sí",
      airLeaks: "Sí",
      intakeValveFunctioning: "Ok",
      intakeValveType: "Hongo de aluminio",
      pressureDifferential: "4",
      pressureControlMethod: "Válvulas Neumáticas",
      isMaster: true,
      operatingPressure: "125 psig",
      operatingSetPoint: "105",
      loadPressure: "100",
      unloadPressure: "105",
      photo5:
        "https://drive.google.com/uc?id=1CSJR7D_26lIe7zLisrDgfsOc0jU4QAjM",
    },
    wetTank: {
      exists: false,
      liters: "",
      safetyValveFunctions: false,
      drainFunctions: false,
      photo6: "",
    },
    dryTank: {
      exists: false,
      liters: "",
      safetyValveFunctions: false,
      drainFunctions: false,
      photo7: "",
    },
    environmentalConditions: {
      internalTemp: "",
      location: "Cuarto",
      hotAirExpulsion: "Ducto directo al exterior",
      highDustOperation: "No",
      specialConditions:
        "El compresor cuento con bajo nivel de aceite, recomendable utilizar aceite AEON9000 TH",
      photo8: "",
    },
  };

  if (isLoading) {
    return <LoadingOverlay isVisible={true} message="Cargando..." />;
  }

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  const openImageModal = (imageSrc: string) => {
    if (imageSrc) {
      setImageModal({ isOpen: true, imageSrc });
    }
  };

  const closeImageModal = () => {
    setImageModal({ isOpen: false, imageSrc: "" });
  };

  const ImageWithModal = ({
    src,
    alt,
    title,
  }: {
    src: string;
    alt: string;
    title?: string;
  }) => {
    if (!src) return null;
    return (
      <div
        className="cursor-pointer transform hover:scale-105 transition-transform"
        onClick={() => openImageModal(src)}
      >
        <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            className="object-cover hover:shadow-lg"
          />
        </div>
        {title && (
          <p className="text-sm text-gray-600 mt-2 text-center font-medium">
            {title}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="no-print">
        <BackButton />
      </div>

      <div className="max-w-7xl mx-auto mt-4">
        {/* Header */}
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
                  <h1 className="text-2xl font-bold">VENTOLOGIX</h1>
                  <p className="text-sm opacity-90">REPORTE DE DIAGNÓSTICO</p>
                  <p className="text-sm opacity-90">{diagnosticData.cliente}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">#{diagnosticData.id}</p>
                <p className="text-sm">ID Registro</p>
              </div>
            </div>
          </div>

          {/* Información Inicial */}
          <div className="p-6 border-b">
            <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
              INFORMACIÓN INICIAL
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-sm text-gray-600">Tipo de Diagnóstico:</p>
                <p className="font-semibold text-lg">
                  {diagnosticData.diagnosticType}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">¿Equipo enciende?</p>
                <p className="font-semibold text-lg">
                  {diagnosticData.equipmentPowers}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">¿Display enciende?</p>
                <p className="font-semibold text-lg">
                  {diagnosticData.displayPowers}
                </p>
              </div>
            </div>
          </div>

          {/* Horas y Alarmas */}
          <div className="p-6 border-b">
            <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
              HORAS Y ALARMAS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Foto 1 - Horas generales de trabajo
                </p>
                <ImageWithModal
                  src={diagnosticData.hoursData.photo1}
                  alt="Horas generales"
                  title="Horas generales de trabajo"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Horas generales de trabajo:
                  </p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.hoursData.generalHours}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Horas de carga:</p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.hoursData.loadHours}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Horas de descarga:</p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.hoursData.unloadHours}
                  </p>
                </div>
              </div>
            </div>

            {/* Alarmas */}
            <div className="mt-8">
              <p className="text-sm font-bold text-gray-700 mb-3">
                Foto 2 - Alarmas de mantenimiento
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    label: "Mantenimiento 2000",
                    value: diagnosticData.alarms.maintenance2000,
                  },
                  {
                    label: "Mantenimiento 4000",
                    value: diagnosticData.alarms.maintenance4000,
                  },
                  {
                    label: "Mantenimiento 6000",
                    value: diagnosticData.alarms.maintenance6000,
                  },
                  {
                    label: "Otra falla mecánica",
                    value: diagnosticData.alarms.otherMechanicalFailure,
                  },
                ].map((alarm, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded ${
                      alarm.value
                        ? "bg-red-50 border border-red-200"
                        : "bg-green-50 border border-green-200"
                    }`}
                  >
                    <span className="text-sm font-medium">{alarm.label}</span>
                    <span
                      className={`text-lg font-bold ${
                        alarm.value ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {alarm.value ? "⚠️" : "✓"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Temperaturas */}
          <div className="p-6 border-b">
            <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
              TEMPERATURAS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Temperatura final de compresión (por Display):
                  </p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.temperatures.compressionTempDisplay}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Temperatura con termómetro láser:
                  </p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.temperatures.compressionTempLaser}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Temperatura de ingreso de aire:
                  </p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.temperatures.airIntakePressure}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Temperatura de intercooler:
                  </p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.temperatures.intercoolerTemp}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mediciones Eléctricas */}
          <div className="p-6 border-b">
            <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
              MEDICIONES ELÉCTRICAS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Voltaje de alimentación equipo:
                  </p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.electricalMeasurements.supplyVoltage}V
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Amperaje motor principal:
                  </p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.electricalMeasurements.mainMotorAmperage}A
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amperaje ventilador:</p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.electricalMeasurements.fanAmperage}A
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <ImageWithModal
                  src={diagnosticData.electricalMeasurements.photo3}
                  alt="Placa del motor"
                  title="Foto 3 - Placa del motor"
                />
                <div>
                  <p className="text-sm text-gray-600">
                    Factor potencia - Límite amperaje en carga:
                  </p>
                  <p className="font-semibold text-lg text-green-600">
                    {diagnosticData.electricalMeasurements.powerFactorLoadOk}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Factor potencia - Límite amperaje en descarga:
                  </p>
                  <p className="font-semibold text-lg text-green-600">
                    {diagnosticData.electricalMeasurements.powerFactorUnloadOk}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Datos del Compresor */}
          <div className="p-6 border-b">
            <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
              DATOS DEL COMPRESOR
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Marca:</p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.compressorData.brand}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Número de Serie:</p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.compressorData.serialNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Año Fabricación:</p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.compressorData.yearManufactured}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Modelo:</p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.compressorData.model}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Foto 4 - Placa del Compresor
                </p>
                <ImageWithModal
                  src={diagnosticData.compressorData.photo4}
                  alt="Placa del compresor"
                />
              </div>
            </div>
          </div>

          {/* Sistema Neumático */}
          <div className="p-6 border-b">
            <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
              SISTEMA NEUMÁTICO
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Foto 5 - Revisar nivel de aceite
                </p>
                <ImageWithModal
                  src={diagnosticData.pneumaticSystem.photo5}
                  alt="Nivel de aceite"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Revisar fugas de aceite visibles:
                  </p>
                  <p
                    className={`font-semibold text-lg ${
                      diagnosticData.pneumaticSystem.oilLeaks === "Sí"
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {diagnosticData.pneumaticSystem.oilLeaks}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Revisar fugas de aire visibles:
                  </p>
                  <p
                    className={`font-semibold text-lg ${
                      diagnosticData.pneumaticSystem.airLeaks === "Sí"
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {diagnosticData.pneumaticSystem.airLeaks}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Revisar funcionamiento válvula admisión:
                  </p>
                  <p className="font-semibold text-lg text-green-600">
                    {diagnosticData.pneumaticSystem.intakeValveFunctioning}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Tipo de válvula de admisión:
                  </p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.pneumaticSystem.intakeValveType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Diferencial de presión:
                  </p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.pneumaticSystem.pressureDifferential}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Método de control de presión:
                  </p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.pneumaticSystem.pressureControlMethod}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Compresor es:</p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.pneumaticSystem.isMaster
                      ? "Master"
                      : "Esclavo"}
                  </p>
                </div>
              </div>
            </div>

            {/* Presiones */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Presión de Operación",
                  value: diagnosticData.pneumaticSystem.operatingPressure,
                },
                {
                  label: "Set Point Operación",
                  value: diagnosticData.pneumaticSystem.operatingSetPoint,
                },
                {
                  label: "Presión de Carga",
                  value: diagnosticData.pneumaticSystem.loadPressure,
                },
                {
                  label: "Presión de Descarga",
                  value: diagnosticData.pneumaticSystem.unloadPressure,
                },
              ].map((pressure, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-4 rounded border border-gray-200"
                >
                  <p className="text-xs text-gray-600 font-bold">
                    {pressure.label}
                  </p>
                  <p className="text-lg font-semibold text-blue-700">
                    {pressure.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Wet Tank */}
          <div className="p-6 border-b">
            <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
              WET TANK
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Foto 6 - Wet Tank
                </p>
                <ImageWithModal
                  src={diagnosticData.wetTank.photo6}
                  alt="Wet Tank"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">¿Existe?</p>
                  <p
                    className={`font-semibold text-lg ${
                      diagnosticData.wetTank.exists
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    {diagnosticData.wetTank.exists ? "Sí" : "No"}
                  </p>
                </div>
                {diagnosticData.wetTank.exists && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Litros:</p>
                      <p className="font-semibold text-lg">
                        {diagnosticData.wetTank.liters}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        Funciona válvula seguridad:
                      </p>
                      <p
                        className={`font-semibold text-lg ${
                          diagnosticData.wetTank.safetyValveFunctions
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {diagnosticData.wetTank.safetyValveFunctions
                          ? "Sí"
                          : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Funciona dren:</p>
                      <p
                        className={`font-semibold text-lg ${
                          diagnosticData.wetTank.drainFunctions
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {diagnosticData.wetTank.drainFunctions ? "Sí" : "No"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Dry Tank */}
          <div className="p-6 border-b">
            <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
              DRY TANK
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Foto 7 - Dry Tank
                </p>
                <ImageWithModal
                  src={diagnosticData.dryTank.photo7}
                  alt="Dry Tank"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">¿Existe?</p>
                  <p
                    className={`font-semibold text-lg ${
                      diagnosticData.dryTank.exists
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    {diagnosticData.dryTank.exists ? "Sí" : "No"}
                  </p>
                </div>
                {diagnosticData.dryTank.exists && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Litros:</p>
                      <p className="font-semibold text-lg">
                        {diagnosticData.dryTank.liters}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        Funciona válvula seguridad:
                      </p>
                      <p
                        className={`font-semibold text-lg ${
                          diagnosticData.dryTank.safetyValveFunctions
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {diagnosticData.dryTank.safetyValveFunctions
                          ? "Sí"
                          : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Funciona dren:</p>
                      <p
                        className={`font-semibold text-lg ${
                          diagnosticData.dryTank.drainFunctions
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {diagnosticData.dryTank.drainFunctions ? "Sí" : "No"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Condiciones Ambientales */}
          <div className="p-6 border-b">
            <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
              CONDICIONES AMBIENTALES
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Foto 8 - Revisar condiciones ambientales
                </p>
                <ImageWithModal
                  src={diagnosticData.environmentalConditions.photo8}
                  alt="Condiciones ambientales"
                />
              </div>
              <div className="space-y-4">
                {diagnosticData.environmentalConditions.internalTemp && (
                  <div>
                    <p className="text-sm text-gray-600">
                      Temperatura ambiental interna:
                    </p>
                    <p className="font-semibold text-lg">
                      {diagnosticData.environmentalConditions.internalTemp}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">¿Cuarto o Intemperie?</p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.environmentalConditions.location}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Método expulsión aire caliente:
                  </p>
                  <p className="font-semibold text-lg">
                    {diagnosticData.environmentalConditions.hotAirExpulsion}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    ¿Operación con muchos polvos?
                  </p>
                  <p
                    className={`font-semibold text-lg ${
                      diagnosticData.environmentalConditions
                        .highDustOperation === "Sí"
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {diagnosticData.environmentalConditions.highDustOperation}
                  </p>
                </div>
              </div>
            </div>

            {diagnosticData.environmentalConditions.specialConditions && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 font-bold mb-2">
                  Otra condición especial de operación:
                </p>
                <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                  <p className="text-sm">
                    {diagnosticData.environmentalConditions.specialConditions}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="p-6 bg-gray-100 flex gap-4 no-print">
            <button
              onClick={() => window.print()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <span>🖨️</span>
              Imprimir Reporte
            </button>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {imageModal.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 no-print"
          onClick={closeImageModal}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={imageModal.imageSrc}
              alt="Imagen ampliada"
              width={2000}
              height={2000}
              unoptimized
              className="w-full h-auto object-contain rounded-lg"
            />
            <button
              onClick={closeImageModal}
              className="absolute top-2 right-2 bg-white rounded-full w-10 h-10 flex items-center justify-center text-black font-bold text-xl hover:bg-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiagnosticReportPage() {
  return (
    <Suspense
      fallback={<LoadingOverlay isVisible={true} message="Cargando..." />}
    >
      <DiagnosticReportContent />
    </Suspense>
  );
}
