"use client";

import { useEffect, useState } from "react";
import { URL_API } from "@/lib/global";
import BackButton from "@/components/BackButton";
import { Client, RTUDevice, RTUFormData } from "@/lib/types";

const AddRTU = () => {
  const [rtus, setRTUs] = useState<RTUDevice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(true);
  const [selectedRTU, setSelectedRTU] = useState<RTUDevice | null>(null);
  const [formData, setFormData] = useState<RTUFormData>({
    numero_serie_topico: "",
    RTU_id: "",
    numero_cliente: "",
    alias: "",
    // Sensor C1
    C1_Vmin: "",
    C1_Vmax: "",
    C1_Lmin: "",
    C1_Lmax: "",
    // Sensor C2
    C2_Vmin: "",
    C2_Vmax: "",
    C2_Lmin: "",
    C2_Lmax: "",
    // Sensor C3
    C3_Vmin: "",
    C3_Vmax: "",
    C3_Lmin: "",
    C3_Lmax: "",
    // Puertos ESP
    P1: "",
    P2: "",
    P3: "",
  });

  const fetchRTUs = async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await fetch(`${URL_API}/pressure/rtu-devices`);
      if (res.ok) {
        const response = await res.json();
        setRTUs(response.data || []);
      } else {
        console.error("Failed to fetch RTUs", res.status, res.statusText);
      }
    } catch (error) {
      console.error("Error fetching RTUs", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async (): Promise<void> => {
    try {
      const res = await fetch(`${URL_API}/clients/`);
      if (res.ok) {
        const response = await res.json();
        setClients(response.data || []);
      } else {
        console.error("Failed to fetch clients", res.status, res.statusText);
      }
    } catch (error) {
      console.error("Error fetching clients", error);
    }
  };

  useEffect(() => {
    fetchRTUs();
    fetchClients();
  }, []);

  const handleOpenCreateModal = () => {
    setIsCreateMode(true);
    setSelectedRTU(null);
    setFormData({
      numero_serie_topico: "",
      RTU_id: "",
      numero_cliente: "",
      alias: "",
      C1_Vmin: "",
      C1_Vmax: "",
      C1_Lmin: "",
      C1_Lmax: "",
      C2_Vmin: "",
      C2_Vmax: "",
      C2_Lmin: "",
      C2_Lmax: "",
      C3_Vmin: "",
      C3_Vmax: "",
      C3_Lmin: "",
      C3_Lmax: "",
      P1: "",
      P2: "",
      P3: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (rtu: RTUDevice) => {
    setIsCreateMode(false);
    setSelectedRTU(rtu);

    // Fetch sensor and port data for the selected RTU
    try {
      const [sensorsRes, portsRes] = await Promise.all([
        fetch(`${URL_API}/pressure/rtu-sensors/${rtu.RTU_id}`),
        fetch(`${URL_API}/pressure/rtu-ports/${rtu.RTU_id}`),
      ]);

      let sensorData: any = {
        C1: {},
        C2: {},
        C3: {},
      };
      let portData: any = {};

      if (sensorsRes.ok) {
        const sensorsResponse = await sensorsRes.json();
        const sensors = sensorsResponse.data || [];
        sensors.forEach((sensor: any) => {
          if (sensor.C === 1) sensorData.C1 = sensor;
          if (sensor.C === 2) sensorData.C2 = sensor;
          if (sensor.C === 3) sensorData.C3 = sensor;
        });
      }

      if (portsRes.ok) {
        const portsResponse = await portsRes.json();
        portData = portsResponse.data || {};
      }

      setFormData({
        numero_serie_topico: rtu.numero_serie_topico,
        RTU_id: rtu.RTU_id,
        numero_cliente: rtu.numero_cliente,
        alias: rtu.alias || "",
        C1_Vmin: sensorData.C1?.Vmin ?? "",
        C1_Vmax: sensorData.C1?.Vmax ?? "",
        C1_Lmin: sensorData.C1?.Lmin ?? "",
        C1_Lmax: sensorData.C1?.Lmax ?? "",
        C2_Vmin: sensorData.C2?.Vmin ?? "",
        C2_Vmax: sensorData.C2?.Vmax ?? "",
        C2_Lmin: sensorData.C2?.Lmin ?? "",
        C2_Lmax: sensorData.C2?.Lmax ?? "",
        C3_Vmin: sensorData.C3?.Vmin ?? "",
        C3_Vmax: sensorData.C3?.Vmax ?? "",
        C3_Lmin: sensorData.C3?.Lmin ?? "",
        C3_Lmax: sensorData.C3?.Lmax ?? "",
        P1: portData.P1 ?? "",
        P2: portData.P2 ?? "",
        P3: portData.P3 ?? "",
      });
    } catch (error) {
      console.error("Error fetching RTU details", error);
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRTU(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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
      device: {
        numero_serie_topico: formData.numero_serie_topico,
        RTU_id: Number(formData.RTU_id),
        numero_cliente: Number(formData.numero_cliente),
        alias: formData.alias || null,
      },
      sensors: [
        {
          C: 1,
          Vmin: formData.C1_Vmin ? Number(formData.C1_Vmin) : null,
          Vmax: formData.C1_Vmax ? Number(formData.C1_Vmax) : null,
          Lmin: formData.C1_Lmin ? Number(formData.C1_Lmin) : null,
          Lmax: formData.C1_Lmax ? Number(formData.C1_Lmax) : null,
        },
        {
          C: 2,
          Vmin: formData.C2_Vmin ? Number(formData.C2_Vmin) : null,
          Vmax: formData.C2_Vmax ? Number(formData.C2_Vmax) : null,
          Lmin: formData.C2_Lmin ? Number(formData.C2_Lmin) : null,
          Lmax: formData.C2_Lmax ? Number(formData.C2_Lmax) : null,
        },
        {
          C: 3,
          Vmin: formData.C3_Vmin ? Number(formData.C3_Vmin) : null,
          Vmax: formData.C3_Vmax ? Number(formData.C3_Vmax) : null,
          Lmin: formData.C3_Lmin ? Number(formData.C3_Lmin) : null,
          Lmax: formData.C3_Lmax ? Number(formData.C3_Lmax) : null,
        },
      ],
      ports: {
        P1: formData.P1 ? Number(formData.P1) : null,
        P2: formData.P2 ? Number(formData.P2) : null,
        P3: formData.P3 ? Number(formData.P3) : null,
      },
    };

    try {
      const url = isCreateMode
        ? `${URL_API}/pressure/rtu-devices`
        : `${URL_API}/pressure/rtu-devices/${selectedRTU?.RTU_id}`;
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
            ? "RTU creado exitosamente"
            : "RTU actualizado exitosamente",
        );
        handleCloseModal();
        fetchRTUs();
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail || "No se pudo completar la operación"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al procesar la solicitud");
    }
  };

  const handleDelete = async (rtuId: number) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar el RTU #${rtuId}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${URL_API}/pressure/rtu-devices/${rtuId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("RTU eliminado exitosamente");
        fetchRTUs();
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail || "No se pudo eliminar el RTU"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al eliminar el RTU");
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
                Gestión de Dispositivos RTU
              </h1>
              <p className="text-gray-600 mt-1">
                Total de dispositivos: {rtus.length}
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
              Nuevo RTU
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Cargando dispositivos RTU...</p>
            </div>
          ) : rtus.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      RTU ID
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Número Serie/Tópico
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Alias
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Cliente
                    </th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rtus.map((rtu) => (
                    <tr
                      key={rtu.id}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="border border-gray-300 p-3 font-medium text-gray-800">
                        {rtu.RTU_id}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-800">
                        {rtu.numero_serie_topico}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-700">
                        {rtu.alias || "-"}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-700">
                        {rtu.nombre_cliente || `ID: ${rtu.numero_cliente}`}
                      </td>
                      <td className="border border-gray-300 p-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleOpenEditModal(rtu)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                            title="Editar"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(rtu.RTU_id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                            title="Eliminar"
                          >
                            Eliminar
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
              <div className="text-6xl mb-4">📡</div>
              <p className="text-lg font-medium">
                No hay dispositivos RTU registrados
              </p>
              <p className="text-sm mt-2">
                Haz clic en &quot;Nuevo RTU&quot; para agregar uno
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 text-white p-6 rounded-t-lg sticky top-0 z-10">
              <h2 className="text-2xl font-bold">
                {isCreateMode ? "Nuevo Dispositivo RTU" : "Editar RTU"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Información General del Dispositivo */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Información General
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RTU ID *
                    </label>
                    <input
                      type="number"
                      name="RTU_id"
                      value={formData.RTU_id}
                      onChange={handleInputChange}
                      disabled={!isCreateMode}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Serie / Tópico *
                    </label>
                    <input
                      type="text"
                      name="numero_serie_topico"
                      value={formData.numero_serie_topico}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="Ej: RTU-001 o topico/mqtt"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cliente *
                    </label>
                    <select
                      name="numero_cliente"
                      value={formData.numero_cliente}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Seleccione un cliente</option>
                      {clients.map((client) => (
                        <option
                          key={client.id_cliente}
                          value={client.numero_cliente}
                        >
                          {client.nombre_cliente} (#{client.numero_cliente})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alias
                    </label>
                    <input
                      type="text"
                      name="alias"
                      value={formData.alias}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nombre descriptivo del RTU"
                    />
                  </div>
                </div>
              </div>

              {/* Configuración de Sensores */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Configuración de Sensores
                </h3>

                {/* Sensor C1 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3 bg-blue-100 p-2 rounded">
                    Sensor C1
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voltaje Mínimo (Vmin)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="C1_Vmin"
                        value={formData.C1_Vmin}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voltaje Máximo (Vmax)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="C1_Vmax"
                        value={formData.C1_Vmax}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Límite Mínimo (Lmin)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="C1_Lmin"
                        value={formData.C1_Lmin}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Límite Máximo (Lmax)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="C1_Lmax"
                        value={formData.C1_Lmax}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Sensor C2 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3 bg-blue-100 p-2 rounded">
                    Sensor C2
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voltaje Mínimo (Vmin)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="C2_Vmin"
                        value={formData.C2_Vmin}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voltaje Máximo (Vmax)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="C2_Vmax"
                        value={formData.C2_Vmax}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Límite Mínimo (Lmin)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="C2_Lmin"
                        value={formData.C2_Lmin}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Límite Máximo (Lmax)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="C2_Lmax"
                        value={formData.C2_Lmax}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Sensor C3 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3 bg-blue-100 p-2 rounded">
                    Sensor C3
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voltaje Mínimo (Vmin)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="C3_Vmin"
                        value={formData.C3_Vmin}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voltaje Máximo (Vmax)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="C3_Vmax"
                        value={formData.C3_Vmax}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Límite Mínimo (Lmin)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="C3_Lmin"
                        value={formData.C3_Lmin}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Límite Máximo (Lmax)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="C3_Lmax"
                        value={formData.C3_Lmax}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuración de Puertos ESP */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Configuración de Puertos ESP
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Puerto P1
                    </label>
                    <input
                      type="number"
                      name="P1"
                      value={formData.P1}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Pin GPIO"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Puerto P2
                    </label>
                    <input
                      type="number"
                      name="P2"
                      value={formData.P2}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Pin GPIO"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Puerto P3
                    </label>
                    <input
                      type="number"
                      name="P3"
                      value={formData.P3}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Pin GPIO"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white pb-4">
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
                  {isCreateMode ? "Crear RTU" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddRTU;
