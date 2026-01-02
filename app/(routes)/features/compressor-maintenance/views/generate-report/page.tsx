"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import { MaintenanceReportResponse, MaintenanceReportData } from "@/lib/types";
import Image from "next/image";

interface ModalState {
  isOpen: boolean;
  imageSrc: string;
}

function ViewMaintenanceReportContent() {
  const { isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [reportData, setReportData] = useState<MaintenanceReportData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [imageModal, setImageModal] = useState<ModalState>({
    isOpen: false,
    imageSrc: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<MaintenanceReportData | null>(
    null
  );

  // Cargar datos de la visita seleccionada si existen
  useEffect(() => {
    // Primero revisar si hay parámetro de query ?id=xxx (para Playwright)
    const queryId = searchParams.get("id");
    if (queryId) {
      console.log("Loading report from query parameter:", queryId);
      fetchReportDataById(queryId);
      return;
    }

    // Si no hay query param, revisar sessionStorage (para navegación web normal)
    const selectedVisitData = sessionStorage.getItem("selectedVisitData");
    if (selectedVisitData) {
      try {
        const visitData = JSON.parse(selectedVisitData);
        if (visitData.id) {
          // Guardar el PDF link si existe
          if (visitData.pdf_link) {
            sessionStorage.setItem("pdf_link", visitData.pdf_link);
          }
          // Auto-cargar el reporte usando el ID de la visita específica
          setTimeout(() => {
            fetchReportDataById(visitData.id);
          }, 100);
        }
        // Limpiar los datos de sessionStorage después de usarlos
        sessionStorage.removeItem("selectedVisitData");
      } catch (error) {
        console.error("Error parsing visit data:", error);
      }
    }
  }, [searchParams]);

  const fetchReportDataById = async (visitId: string) => {
    try {
      setLoading(true);

      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(
        `${API_BASE_URL}/web/maintenance/report-data-by-id/${visitId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Error al obtener los datos del reporte"
        );
      }

      const data: MaintenanceReportResponse = await response.json();
      setReportData({
        ...data.reporte,
        fotos_drive: data.reporte.fotos_drive || [],
      });
      sessionStorage.setItem("currentReportData", JSON.stringify(data.reporte));
    } catch (err) {
      console.error("Error fetching maintenance report data:", err);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingOverlay isVisible={true} message="Cargando..." />;
  }

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openImageModal = (imageSrc: string) => {
    setImageModal({ isOpen: true, imageSrc });
  };

  const closeImageModal = () => {
    setImageModal({ isOpen: false, imageSrc: "" });
  };

  const handleViewPdf = () => {
    const pdfLink = sessionStorage.getItem("pdf_link");
    if (pdfLink) {
      window.open(pdfLink, "_blank");
    }
  };

  const handleEdit = () => {
    setEditedData(JSON.parse(JSON.stringify(reportData))); // Deep copy
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedData(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editedData) return;

    try {
      setLoading(true);
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      
      const response = await fetch(
        `${API_BASE_URL}/web/maintenance/update-report/${editedData.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editedData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al actualizar el reporte");
      }

      setReportData(editedData);
      setIsEditing(false);
      setEditedData(null);
      alert("Reporte actualizado exitosamente");
    } catch (err) {
      console.error("Error updating report:", err);
      alert("Error al actualizar el reporte");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    if (!editedData) return;
    setEditedData({ ...editedData, [field]: value });
  };

  const handleMaintenanceChange = (index: number, realizado: boolean) => {
    if (!editedData) return;
    const updatedMantenimientos = [...editedData.mantenimientos];
    updatedMantenimientos[index] = {
      ...updatedMantenimientos[index],
      realizado,
    };
    setEditedData({ ...editedData, mantenimientos: updatedMantenimientos });
  };

  const currentData = isEditing ? editedData : reportData;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="no-print">
        <BackButton />
      </div>

      <div className="max-w-7xl mx-auto mt-4">
        {/* Overlay de carga */}
        {loading && (
          <LoadingOverlay isVisible={true} message="Cargando reporte..." />
        )}

        {/* Reporte */}
        {currentData && !loading && (
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
                    <p className="text-sm opacity-90">
                      REPORTE DE MANTENIMIENTO
                    </p>
                    <p className="text-sm opacity-90">{currentData.cliente}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">#{currentData.id}</p>
                  <p className="text-sm">ID Registro</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                DATOS DEL COMPRESOR
              </h2>
              <div className="grid grid-cols-4 gap-8">
                {/* Fila 1 */}
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Cliente:</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.cliente}
                        onChange={(e) =>
                          handleFieldChange("cliente", e.target.value)
                        }
                        className="font-semibold w-full border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <p className="font-semibold">{currentData.cliente}</p>
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Tipo:</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.tipo}
                        onChange={(e) =>
                          handleFieldChange("tipo", e.target.value)
                        }
                        className="font-semibold w-full border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <p className="font-semibold">{currentData.tipo}</p>
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Alias:</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.Alias || ""}
                        onChange={(e) =>
                          handleFieldChange("Alias", e.target.value)
                        }
                        className="font-semibold w-full border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <p className="font-semibold">{currentData.Alias || "N/A"}</p>
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">HP:</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.hp || ""}
                        onChange={(e) =>
                          handleFieldChange("hp", e.target.value)
                        }
                        className="font-semibold w-full border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <p className="font-semibold">{currentData.hp || "N/A"}</p>
                    )}
                  </div>
                </div>
                {/* Fila 2 */}
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Voltaje:</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.voltaje || ""}
                        onChange={(e) =>
                          handleFieldChange("voltaje", e.target.value)
                        }
                        className="font-semibold w-full border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <p className="font-semibold">
                        {currentData.voltaje || "N/A"}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Marca:</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.compresor}
                        onChange={(e) =>
                          handleFieldChange("compresor", e.target.value)
                        }
                        className="font-semibold w-full border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <p className="font-semibold">{currentData.compresor}</p>
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Año:</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.anio || ""}
                        onChange={(e) =>
                          handleFieldChange("anio", e.target.value)
                        }
                        className="font-semibold w-full border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <p className="font-semibold">{currentData.anio || "N/A"}</p>
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Número de Serie:</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.numero_serie}
                        onChange={(e) =>
                          handleFieldChange("numero_serie", e.target.value)
                        }
                        className="font-semibold w-full border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <p className="font-semibold">{currentData.numero_serie}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Datos del Técnico */}
            <div className="p-6">
              <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                DATOS DEL TÉCNICO
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Columna 1 */}
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Nombre del técnico:</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.tecnico}
                        onChange={(e) =>
                          handleFieldChange("tecnico", e.target.value)
                        }
                        className="font-semibold w-full border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <p className="font-semibold">{currentData.tecnico}</p>
                    )}
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Email del técnico:</p>
                    {isEditing ? (
                      <input
                        type="email"
                        value={currentData.email}
                        onChange={(e) =>
                          handleFieldChange("email", e.target.value)
                        }
                        className="font-semibold w-full border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <p className="font-semibold">{currentData.email}</p>
                    )}
                  </div>
                </div>
                {/* Columna 2 */}
                <div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Número de teléfono:</p>
                    <p className="font-semibold">+52 8184777023</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Fecha de la visita:</p>
                    <p className="font-semibold">
                      {formatDate(currentData.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-b">
              <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                MANTENIMIENTOS REALIZADOS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentData.mantenimientos.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded ${
                      item.realizado
                        ? "bg-green-50 border border-green-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <span className="text-sm font-medium">{item.nombre}</span>
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={item.realizado}
                        onChange={(e) =>
                          handleMaintenanceChange(index, e.target.checked)
                        }
                        className="w-5 h-5 cursor-pointer"
                      />
                    ) : (
                      <span
                        className={`text-lg font-bold ${
                          item.realizado ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {item.realizado ? "✓" : "✗"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-lg items-center">
                <span className="font-bold text-green-600">✓</span> = Se realizó
                cambio,&nbsp;
                <span className="font-bold">✗</span> = Se mantuvo igual
              </div>
            </div>

            {/* Comentarios */}
            {currentData.comentarios_generales && (
              <div className="p-6 border-b">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  COMENTARIOS GENERALES
                </h2>
                <div className="bg-gray-50 p-4 rounded">
                  {isEditing ? (
                    <textarea
                      value={currentData.comentarios_generales}
                      onChange={(e) =>
                        handleFieldChange("comentarios_generales", e.target.value)
                      }
                      className="w-full text-lg border border-gray-300 rounded px-3 py-2 min-h-[100px]"
                    />
                  ) : (
                    <p className="text-lg whitespace-pre-wrap">
                      {currentData.comentarios_generales}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Comentario del Cliente */}
            {currentData.comentario_cliente && (
              <div className="p-6 border-b">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  COMENTARIO DEL CLIENTE
                </h2>
                <div className="bg-blue-50 p-4 rounded">
                  {isEditing ? (
                    <textarea
                      value={currentData.comentario_cliente}
                      onChange={(e) =>
                        handleFieldChange("comentario_cliente", e.target.value)
                      }
                      className="w-full text-lg border border-gray-300 rounded px-3 py-2 min-h-[100px]"
                    />
                  ) : (
                    <p className="text-lg whitespace-pre-wrap">
                      {currentData.comentario_cliente}
                    </p>
                  )}
                </div>
              </div>
            )}

            {reportData?.fotos_drive && reportData.fotos_drive.length > 0 && (
              <div className="p-6 border-b">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  FOTOS DEL MANTENIMIENTO
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {reportData.fotos_drive.map((fotoUrl, index) => (
                    <div
                      key={index}
                      className="cursor-pointer transform hover:scale-105 transition-transform"
                      onClick={() => openImageModal(fotoUrl)}
                    >
                      <Image
                        src={fotoUrl}
                        width={400}
                        height={400}
                        className="w-full h-full object-cover rounded-lg shadow hover:shadow-lg"
                        alt={`Foto ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* Botones de acción */}
            <div className="p-6 bg-gray-100 flex gap-4 no-print">
              {!isEditing ? (
                <>
                  <button
                    onClick={handleEdit}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <span>✏️</span>
                    Editar Reporte
                  </button>
                  <button
                    onClick={handleViewPdf}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <span>📄</span>
                    Ver PDF Generado
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <span>💾</span>
                    Guardar Cambios
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <span>✕</span>
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* {reportData && (
          <div className="flex justify-center mb-8 no-print">
            <PrintPageButton reportType="reporte-visita" />
          </div>
        )} */}
      </div>
    </div>
  );
}

export default function ViewMaintenanceReportPage() {
  return (
    <Suspense
      fallback={<LoadingOverlay isVisible={true} message="Cargando..." />}
    >
      <ViewMaintenanceReportContent />
    </Suspense>
  );
}
