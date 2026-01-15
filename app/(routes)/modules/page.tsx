"use client";

import { useEffect, useState } from "react";
import { URL_API } from "@/lib/global";
import { Modulos, ModulosFormData } from "@/lib/types";

const ModulosSheet = () => {
  const [loading, setLoading] = useState(true);
  const [modulos, setModulos] = useState<Modulos[]>([]);
  const [formData, setFormData] = useState<ModulosFormData>({
    numero_cliente: 0,
    nombre_cliente: "",
    mantenimiento: false,
    reporteDia: false,
    reporteSemana: false,
    presion: false,
    prediccion: false,
    kwh: false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Modulos | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchModulos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${URL_API}/modulos/`);
      if (res.ok) {
        const response = await res.json();
        setModulos(response.data || []);
      } else {
        setError("Failed to fetch modules");
        console.error("Failed to fetch clients", res.status, res.statusText);
      }
    } catch (error) {
      setError("Error fetching modules");
      console.error("Error fetching clients", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModulos();
  }, []);

  const handleOpenCreateModal = () => {
    setFormData({
      numero_cliente: 0,
      nombre_cliente: "",
      mantenimiento: false,
      reporteDia: false,
      reporteSemana: false,
      presion: false,
      prediccion: false,
      kwh: false,
    });
    setIsEditMode(false);
    setSelectedClient(null);
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleOpenEditModal = (client: Modulos) => {
    setFormData({
      numero_cliente: client.numero_cliente,
      nombre_cliente: client.nombre_cliente || "",
      mantenimiento: client.mantenimiento,
      reporteDia: client.reporteDia,
      reporteSemana: client.reporteSemana,
      presion: client.presion,
      prediccion: client.prediccion,
      kwh: client.kwh,
    });
    setSelectedClient(client);
    setIsEditMode(true);
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
    setIsEditMode(false);
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (field: keyof ModulosFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (isEditMode && selectedClient) {
        // Update existing client
        const res = await fetch(
          `${URL_API}/modulos/${selectedClient.numero_cliente}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          }
        );

        const data = await res.json();

        if (res.ok) {
          setSuccess("Modules updated successfully");
          fetchModulos();
          setTimeout(() => {
            handleCloseModal();
          }, 1500);
        } else {
          setError(data.detail || "Failed to update modules");
        }
      } else {
        // Create new client
        const res = await fetch(`${URL_API}/modulos/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (res.ok) {
          setSuccess("Client added successfully");
          fetchModulos();
          setTimeout(() => {
            handleCloseModal();
          }, 1500);
        } else {
          setError(data.detail || "Failed to add client");
        }
      }
    } catch (error) {
      setError("An error occurred");
      console.error("Error submitting form", error);
    }
  };

  const handleDelete = async (numero_cliente: number) => {
    if (!confirm(`Are you sure you want to delete client ${numero_cliente}?`)) {
      return;
    }

    try {
      const res = await fetch(`${URL_API}/modulos/${numero_cliente}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("Client deleted successfully");
        fetchModulos();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.detail || "Failed to delete client");
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      setError("An error occurred while deleting");
      console.error("Error deleting client", error);
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="w-11/12 mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Módulos de Clientes
          </h1>
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            + Agregar Cliente
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre del Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente #
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mantenimiento
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reporte Diario
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reporte Semanal
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Presión
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Predicción
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      kWh
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {modulos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        No se encontraron clientes. Agrega un cliente para
                        comenzar.
                      </td>
                    </tr>
                  ) : (
                    modulos.map((modulo) => (
                      <tr
                        key={modulo.numero_cliente}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {modulo.nombre_cliente || "Sin nombre"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {modulo.numero_cliente}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              modulo.mantenimiento
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {modulo.mantenimiento ? "✓" : "✗"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              modulo.reporteDia
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {modulo.reporteDia ? "✓" : "✗"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              modulo.reporteSemana
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {modulo.reporteSemana ? "✓" : "✗"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              modulo.presion
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {modulo.presion ? "✓" : "✗"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              modulo.prediccion
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {modulo.prediccion ? "✓" : "✗"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              modulo.kwh
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {modulo.kwh ? "✓" : "✗"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => handleOpenEditModal(modulo)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() =>
                              modulo.numero_cliente !== undefined &&
                              handleDelete(modulo.numero_cliente)
                            }
                            className="text-red-600 hover:text-red-900"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {isEditMode
                    ? "Editar modulos del cliente"
                    : "Agregar nuevo cliente"}
                </h2>

                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                    {success}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre del Cliente
                      </label>
                      <input
                        type="text"
                        value={formData.nombre_cliente}
                        onChange={(e) =>
                          handleInputChange("nombre_cliente", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nombre del cliente"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Cliente
                      </label>
                      <input
                        type="number"
                        value={formData.numero_cliente}
                        onChange={(e) =>
                          handleInputChange(
                            "numero_cliente",
                            parseInt(e.target.value) || 0
                          )
                        }
                        disabled={isEditMode}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isEditMode ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                        placeholder="Número de cliente"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Permisos de Módulos
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Mantenimiento */}
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <label
                          htmlFor="mantenimiento"
                          className="text-sm font-medium text-gray-700"
                        >
                          Mantenimiento
                        </label>
                        <input
                          id="mantenimiento"
                          type="checkbox"
                          checked={formData.mantenimiento}
                          onChange={(e) =>
                            handleInputChange("mantenimiento", e.target.checked)
                          }
                          className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </div>

                      {/* ReporteDia */}
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <label
                          htmlFor="reporteDia"
                          className="text-sm font-medium text-gray-700"
                        >
                          Reporte Diario
                        </label>
                        <input
                          id="reporteDia"
                          type="checkbox"
                          checked={formData.reporteDia}
                          onChange={(e) =>
                            handleInputChange("reporteDia", e.target.checked)
                          }
                          className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </div>

                      {/* ReporteSemana */}
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <label
                          htmlFor="reporteSemana"
                          className="text-sm font-medium text-gray-700"
                        >
                          Reporte Semanal
                        </label>
                        <input
                          id="reporteSemana"
                          type="checkbox"
                          checked={formData.reporteSemana}
                          onChange={(e) =>
                            handleInputChange("reporteSemana", e.target.checked)
                          }
                          className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </div>

                      {/* Presion */}
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <label
                          htmlFor="presion"
                          className="text-sm font-medium text-gray-700"
                        >
                          Presión
                        </label>
                        <input
                          id="presion"
                          type="checkbox"
                          checked={formData.presion}
                          onChange={(e) =>
                            handleInputChange("presion", e.target.checked)
                          }
                          className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </div>

                      {/* Prediccion */}
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <label
                          htmlFor="prediccion"
                          className="text-sm font-medium text-gray-700"
                        >
                          Predicción
                        </label>
                        <input
                          id="prediccion"
                          type="checkbox"
                          checked={formData.prediccion}
                          onChange={(e) =>
                            handleInputChange("prediccion", e.target.checked)
                          }
                          className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </div>

                      {/* kWh */}
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <label
                          htmlFor="kwh"
                          className="text-sm font-medium text-gray-700"
                        >
                          Consumo kWh
                        </label>
                        <input
                          id="kwh"
                          type="checkbox"
                          checked={formData.kwh}
                          onChange={(e) =>
                            handleInputChange("kwh", e.target.checked)
                          }
                          className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      {isEditMode ? "Actualizar" : "Crear"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ModulosSheet;
