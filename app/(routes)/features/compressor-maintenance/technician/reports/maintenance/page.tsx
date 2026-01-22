"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import Image from "next/image";

interface MaintenanceItem {
  nombre: string;
  realizado: boolean;
}

interface MaintenanceFormData {
  // Data from previous report
  folio?: string;
  clientName?: string;
  compressorAlias?: string;
  serialNumber?: string;
  brand?: string;
  equipmentHp?: string;
  compressorType?: string;
  yearManufactured?: string;

  // Maintenance data
  mantenimientos: MaintenanceItem[];
  comentarios_generales: string;
  comentario_cliente: string;
  fotos: File[];
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

function MaintenanceFormContent() {
  const { isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();

  const [formData, setFormData] = useState<MaintenanceFormData>({
    mantenimientos: defaultMaintenanceItems,
    comentarios_generales: "",
    comentario_cliente: "",
    fotos: [],
  });

  const [reportData, setReportData] = useState<any>(null);

  // Load report data from sessionStorage
  useEffect(() => {
    const storedReportData = sessionStorage.getItem("reportFormData");
    if (storedReportData) {
      try {
        const data = JSON.parse(storedReportData);
        setReportData(data);
        setFormData((prev) => ({
          ...prev,
          folio: data.folio,
          clientName: data.clientName,
          compressorAlias: data.compressorAlias,
          serialNumber: data.serialNumber,
          brand: data.brand,
          equipmentHp: data.equipmentHp,
          compressorType: data.compressorType,
          yearManufactured: data.yearManufactured,
        }));
      } catch (error) {
        console.error("Error loading report data:", error);
      }
    }

    // Load previously saved maintenance data if exists
    const storedMaintenanceData = sessionStorage.getItem("maintenanceFormData");
    if (storedMaintenanceData) {
      try {
        const data = JSON.parse(storedMaintenanceData);
        setFormData(data);
      } catch (error) {
        console.error("Error loading maintenance data:", error);
      }
    }
  }, []);

  if (isLoading) {
    return <LoadingOverlay isVisible={true} message="Cargando..." />;
  }

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  const handleMaintenanceToggle = (index: number) => {
    const updatedMantenimientos = [...formData.mantenimientos];
    updatedMantenimientos[index].realizado =
      !updatedMantenimientos[index].realizado;
    setFormData({ ...formData, mantenimientos: updatedMantenimientos });
  };

  const handleInputChange = (
    field: keyof MaintenanceFormData,
    value: string,
  ) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setFormData({ ...formData, fotos: [...formData.fotos, ...filesArray] });
    }
  };

  const removePhoto = (index: number) => {
    const updatedFotos = formData.fotos.filter((_, i) => i !== index);
    setFormData({ ...formData, fotos: updatedFotos });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create FormData for file uploads
      const submitData = new FormData();

      // Add report data
      if (reportData) {
        submitData.append("folio", reportData.folio || "");
        submitData.append("clientName", reportData.clientName || "");
        submitData.append("serialNumber", reportData.serialNumber || "");
      }

      // Add maintenance data
      submitData.append(
        "mantenimientos",
        JSON.stringify(formData.mantenimientos),
      );
      submitData.append(
        "comentarios_generales",
        formData.comentarios_generales,
      );
      submitData.append("comentario_cliente", formData.comentario_cliente);

      // Add photos
      formData.fotos.forEach((foto, index) => {
        submitData.append(`foto_${index}`, foto);
      });

      // Send to backend API
      const response = await fetch(`${URL}/maintenance-reports/`, {
        method: "POST",
        body: submitData,
      });

      const result = await response.json();

      if (response.ok) {
        alert("✅ Mantenimiento guardado exitosamente");
        // Clear sessionStorage
        sessionStorage.removeItem("reportFormData");
        // Redirect back to reports list
        router.push("/features/compressor-maintenance/technician/reports");
      } else {
        console.error("Error response:", result);
        alert(
          `❌ Error al guardar el mantenimiento: ${
            result.detail || result.message || "Error desconocido"
          }`,
        );
      }
    } catch (error) {
      console.error("Error submitting maintenance:", error);
      alert(
        "❌ Error al enviar el mantenimiento. Por favor, intente nuevamente.",
      );
    }
  };

  const handleBackToReport = () => {
    // Save current maintenance data
    sessionStorage.setItem("maintenanceFormData", JSON.stringify(formData));
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <BackButton onClick={handleBackToReport} />

      <div className="max-w-7xl mx-auto mt-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-green-800 to-green-900 text-white p-6">
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
                <p className="text-sm opacity-90">Registro de Mantenimiento</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Reporte */}
          {reportData && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-white bg-green-800 px-4 py-2 rounded font-bold mb-4">
                INFORMACIÓN DEL EQUIPO
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-1">
                    Folio
                  </label>
                  <p className="text-gray-800 font-semibold">
                    {reportData.folio || "Sin asignar"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-1">
                    Cliente
                  </label>
                  <p className="text-gray-800 font-semibold">
                    {reportData.clientName || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-1">
                    Alias Compresor
                  </label>
                  <p className="text-gray-800 font-semibold">
                    {reportData.compressorAlias || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-1">
                    Número de Serie
                  </label>
                  <p className="text-gray-800 font-semibold">
                    {reportData.serialNumber || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-1">
                    Marca
                  </label>
                  <p className="text-gray-800 font-semibold">
                    {reportData.brand || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-1">
                    HP
                  </label>
                  <p className="text-gray-800 font-semibold">
                    {reportData.equipmentHp || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mantenimientos Realizados */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-white bg-green-800 px-4 py-2 rounded font-bold mb-4">
              🔧 MANTENIMIENTOS REALIZADOS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formData.mantenimientos.map((item, index) => (
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
              <span className="font-bold text-green-600">✓</span> = Se realizó
              cambio, <span className="font-bold">✗</span> = Se mantuvo igual
            </div>
          </div>

          {/* Comentarios Generales */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-white bg-green-800 px-4 py-2 rounded font-bold mb-4">
              📝 COMENTARIOS GENERALES
            </h2>
            <textarea
              value={formData.comentarios_generales}
              onChange={(e) =>
                handleInputChange("comentarios_generales", e.target.value)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={6}
              placeholder="Describa las observaciones, hallazgos y trabajos realizados durante el mantenimiento..."
            />
          </div>

          {/* Comentarios del Cliente */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-white bg-green-800 px-4 py-2 rounded font-bold mb-4">
              💬 COMENTARIOS DEL CLIENTE
            </h2>
            <textarea
              value={formData.comentario_cliente}
              onChange={(e) =>
                handleInputChange("comentario_cliente", e.target.value)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={4}
              placeholder="Comentarios o solicitudes del cliente..."
            />
          </div>

          {/* Fotos del Mantenimiento */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-white bg-green-800 px-4 py-2 rounded font-bold mb-4">
              📸 FOTOS DEL MANTENIMIENTO
            </h2>
            <div className="mb-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            {formData.fotos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.fotos.map((foto, index) => (
                  <div key={index} className="relative">
                    <div className="border border-gray-300 rounded-lg p-2">
                      <p className="text-sm text-gray-600 truncate">
                        {foto.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
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

          {/* Botones de acción */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex gap-4 justify-between">
              <button
                type="button"
                onClick={handleBackToReport}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center gap-2"
              >
                <span>⬅️</span>
                Volver al Reporte
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
              >
                <span>✅</span>
                Guardar Mantenimiento
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense
      fallback={<LoadingOverlay isVisible={true} message="Cargando..." />}
    >
      <MaintenanceFormContent />
    </Suspense>
  );
}
