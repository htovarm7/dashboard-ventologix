"use client";

import { useEffect, useState } from "react";
import { URL_API } from "@/lib/global";
import BackButton from "@/components/BackButton";
import { Client, ClientFormData } from "@/lib/types";

const ShowClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    numero_cliente: "",
    nombre_cliente: "",
    RFC: "",
    direccion: "",
    champion: "",
    CostokWh: 0.17,
    demoDiario: 0,
    demoSemanal: 0,
  });

  const fetchClients = async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await fetch(`${URL_API}/clients/`);
      if (res.ok) {
        const response = await res.json();
        setClients(response.data || []);
      } else {
        console.error("Failed to fetch clients", res.status, res.statusText);
      }
    } catch (error) {
      console.error("Error fetching clients", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenCreateModal = () => {
    setIsCreateMode(true);
    setSelectedClient(null);
    setFormData({
      numero_cliente: "",
      nombre_cliente: "",
      RFC: "",
      direccion: "",
      champion: "",
      CostokWh: 0.17,
      demoDiario: 0,
      demoSemanal: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setIsCreateMode(false);
    setSelectedClient(client);
    setFormData({
      numero_cliente: client.numero_cliente,
      nombre_cliente: client.nombre_cliente,
      RFC: client.RFC,
      direccion: client.direccion,
      champion: client.champion,
      CostokWh: client.CostokWh,
      demoDiario: client.demoDiario || 0,
      demoSemanal: client.demoSemanal || 0,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      numero_cliente: Number(formData.numero_cliente),
      nombre_cliente: formData.nombre_cliente,
      RFC: formData.RFC,
      direccion: formData.direccion,
      champion: formData.champion,
      CostokWh: Number(formData.CostokWh),
      demoDiario: Number(formData.demoDiario) || null,
      demoSemanal: Number(formData.demoSemanal) || null,
    };

    try {
      const url = isCreateMode
        ? `${URL_API}/clients/`
        : `${URL_API}/clients/${selectedClient?.numero_cliente}`;
      const method = isCreateMode ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(
          isCreateMode
            ? "Cliente creado exitosamente"
            : "Cliente actualizado exitosamente"
        );
        handleCloseModal();
        fetchClients();
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail || "No se pudo completar la operación"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al procesar la solicitud");
    }
  };

  const handleDelete = async (numero_cliente: number) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar el cliente #${numero_cliente}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${URL_API}/clients/${numero_cliente}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Cliente eliminado exitosamente");
        fetchClients();
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail || "No se pudo eliminar el cliente"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al eliminar el cliente");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mb-4">
        <BackButton />
      </div>

      <div className="w-full">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Gestión de Clientes
              </h1>
              <p className="text-gray-600 mt-1">
                Total de clientes: {clients.length}
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 shadow-md transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Nuevo Cliente
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Cargando clientes...</p>
            </div>
          ) : clients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Núm. Cliente
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Nombre
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      RFC
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Dirección
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Champion
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Costo kWh
                    </th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client, index) => (
                    <tr
                      key={client.id_cliente}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="border border-gray-300 p-3 font-medium text-gray-800">
                        {client.numero_cliente}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-800">
                        {client.nombre_cliente}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-700">
                        {client.RFC}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-700 text-sm">
                        {client.direccion}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-700">
                        {client.champion}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-700">
                        ${client.CostokWh.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 p-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleOpenEditModal(client)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                            title="Editar"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDelete(client.numero_cliente)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                            title="Eliminar"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-lg font-medium">No hay clientes registrados</p>
              <p className="text-sm mt-2">
                Haz clic en "Nuevo Cliente" para agregar uno
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 text-white p-6 rounded-t-lg">
              <h2 className="text-2xl font-bold">
                {isCreateMode ? "Nuevo Cliente" : "Editar Cliente"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Cliente *
                  </label>
                  <input
                    type="number"
                    name="numero_cliente"
                    value={formData.numero_cliente}
                    onChange={handleInputChange}
                    disabled={!isCreateMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    name="nombre_cliente"
                    value={formData.nombre_cliente}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RFC *
                  </label>
                  <input
                    type="text"
                    name="RFC"
                    value={formData.RFC}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Champion *
                  </label>
                  <input
                    type="text"
                    name="champion"
                    value={formData.champion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo kWh *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="CostokWh"
                    value={formData.CostokWh}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Demo Diario
                  </label>
                  <input
                    type="number"
                    name="demoDiario"
                    value={formData.demoDiario}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Demo Semanal
                  </label>
                  <input
                    type="number"
                    name="demoSemanal"
                    value={formData.demoSemanal}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección *
                </label>
                <textarea
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {isCreateMode ? "Crear Cliente" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowClients;
