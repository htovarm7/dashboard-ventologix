"use client";

import { useEffect, useState } from "react";
import { URL_API } from "@/lib/global";
import BackButton from "@/components/BackButton";

interface Compresor {
  id: number;
  hp: number;
  tipo: string;
  voltaje: number;
  marca: number;
  numero_serie: string;
  anio: number;
  id_cliente: number;
  Amp_Load: number | null;
  Amp_No_Load: number | null;
  proyecto: number;
  linea: string;
  LOAD_NO_LOAD: number | null;
  Alias: string;
  fecha_utlimo_mtto: string | null;
  nombre_cliente: string | null;
}

interface CompresorFormData {
  hp: number | string;
  tipo: string;
  voltaje: number | string;
  marca: number | string;
  numero_serie: string;
  anio: number | string;
  id_cliente: number | string;
  Amp_Load: number | string;
  Amp_No_Load: number | string;
  proyecto: number | string;
  linea: string;
  LOAD_NO_LOAD: number | string;
  Alias: string;
  fecha_ultimo_mtto: string;
}

const Compresors = () => {
  const [compresores, setCompresores] = useState<Compresor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(true);
  const [selectedCompresor, setSelectedCompresor] = useState<Compresor | null>(
    null
  );
  const [formData, setFormData] = useState<CompresorFormData>({
    hp: "",
    tipo: "tornillo",
    voltaje: "",
    marca: "",
    numero_serie: "",
    anio: new Date().getFullYear(),
    id_cliente: "",
    Amp_Load: "",
    Amp_No_Load: "",
    proyecto: "",
    linea: "",
    LOAD_NO_LOAD: "",
    Alias: "",
    fecha_ultimo_mtto: "",
  });

  const fetchCompresores = async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await fetch(`${URL_API}/compresores/`);
      if (res.ok) {
        const response = await res.json();
        console.log("API Response:", response);
        console.log("First compresor:", response.data?.[0]);
        setCompresores(response.data || []);
      } else {
        console.error(
          "Failed to fetch compresores",
          res.status,
          res.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching compresores", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompresores();
  }, []);

  const handleOpenCreateModal = () => {
    setIsCreateMode(true);
    setSelectedCompresor(null);
    setFormData({
      hp: "",
      tipo: "tornillo",
      voltaje: "",
      marca: "",
      numero_serie: "",
      anio: new Date().getFullYear(),
      id_cliente: "",
      Amp_Load: "",
      Amp_No_Load: "",
      proyecto: "",
      linea: "",
      LOAD_NO_LOAD: "",
      Alias: "",
      fecha_ultimo_mtto: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (compresor: Compresor) => {
    setIsCreateMode(false);
    setSelectedCompresor(compresor);
    setFormData({
      hp: compresor.hp,
      tipo: compresor.tipo,
      voltaje: compresor.voltaje,
      marca: compresor.marca,
      numero_serie: compresor.numero_serie,
      anio: compresor.anio,
      id_cliente: compresor.id_cliente,
      Amp_Load: compresor.Amp_Load || "",
      Amp_No_Load: compresor.Amp_No_Load || "",
      proyecto: compresor.proyecto,
      linea: compresor.linea,
      LOAD_NO_LOAD: compresor.LOAD_NO_LOAD || "",
      Alias: compresor.Alias,
      fecha_ultimo_mtto: compresor.fecha_utlimo_mtto || "",
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompresor(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
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
      id: selectedCompresor?.id || 0,
      hp: Number(formData.hp),
      tipo: formData.tipo,
      voltaje: Number(formData.voltaje),
      marca: Number(formData.marca),
      numero_serie: formData.numero_serie,
      anio: Number(formData.anio),
      id_cliente: Number(formData.id_cliente),
      Amp_Load: formData.Amp_Load ? Number(formData.Amp_Load) : null,
      Amp_No_Load: formData.Amp_No_Load ? Number(formData.Amp_No_Load) : null,
      proyecto: Number(formData.proyecto),
      linea: formData.linea,
      LOAD_NO_LOAD: formData.LOAD_NO_LOAD
        ? Number(formData.LOAD_NO_LOAD)
        : null,
      Alias: formData.Alias,
      fecha_ultimo_mtto: formData.fecha_ultimo_mtto || null,
    };

    try {
      const url = isCreateMode
        ? `${URL_API}/compresores/`
        : `${URL_API}/compresores/${selectedCompresor?.id}`;
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
            ? "Compresor creado exitosamente"
            : "Compresor actualizado exitosamente"
        );
        handleCloseModal();
        fetchCompresores();
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail || "No se pudo completar la operación"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al procesar la solicitud");
    }
  };

  const handleDelete = async (compresorId: number) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar el compresor #${compresorId}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${URL_API}/compresores/${compresorId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Compresor eliminado exitosamente");
        fetchCompresores();
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail || "No se pudo eliminar el compresor"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al eliminar el compresor");
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
                Gestión de Compresores
              </h1>
              <p className="text-gray-600 mt-1">
                Total de compresores: {compresores.length}
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
              Nuevo Compresor
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Cargando compresores...</p>
            </div>
          ) : compresores.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Nombre Cliente
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Alias
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Número Serie
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Tipo
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      HP
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Marca
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Año
                    </th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Voltaje
                    </th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {compresores.map((compresor) => (
                    <tr
                      key={compresor.id}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="border border-gray-300 p-3 text-gray-700">
                        {compresor.nombre_cliente &&
                        !compresor.nombre_cliente.match(/^\d{4}-\d{2}-\d{2}/)
                          ? compresor.nombre_cliente
                          : `ID: ${compresor.id_cliente}`}
                      </td>
                      <td className="border border-gray-300 p-3 font-medium text-gray-800">
                        {compresor.Alias}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-700">
                        {compresor.numero_serie}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-700">
                        {compresor.tipo}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-700">
                        {compresor.hp}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-700">
                        {compresor.marca}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-700">
                        {compresor.anio}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-700">
                        {compresor.voltaje}V
                      </td>
                      <td className="border border-gray-300 p-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleOpenEditModal(compresor)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                            title="Editar"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDelete(compresor.id)}
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
              <div className="text-6xl mb-4">⚙️</div>
              <p className="text-lg font-medium">
                No hay compresores registrados
              </p>
              <p className="text-sm mt-2">
                Haz clic en "Nuevo Compresor" para agregar uno
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 text-white p-6 rounded-t-lg">
              <h2 className="text-2xl font-bold">
                {isCreateMode ? "Nuevo Compresor" : "Editar Compresor"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alias *
                  </label>
                  <input
                    type="text"
                    name="Alias"
                    value={formData.Alias}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Serie *
                  </label>
                  <input
                    type="text"
                    name="numero_serie"
                    value={formData.numero_serie}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="tornillo">Tornillo</option>
                    <option value="piston">Pistón</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HP *
                  </label>
                  <input
                    type="number"
                    name="hp"
                    value={formData.hp}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voltaje *
                  </label>
                  <input
                    type="number"
                    name="voltaje"
                    value={formData.voltaje}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marca *
                  </label>
                  <input
                    type="number"
                    name="marca"
                    value={formData.marca}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año *
                  </label>
                  <input
                    type="number"
                    name="anio"
                    value={formData.anio}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID Cliente *
                  </label>
                  <input
                    type="number"
                    name="id_cliente"
                    value={formData.id_cliente}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proyecto *
                  </label>
                  <input
                    type="number"
                    name="proyecto"
                    value={formData.proyecto}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Línea *
                  </label>
                  <input
                    type="text"
                    name="linea"
                    value={formData.linea}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amp Load
                  </label>
                  <input
                    type="number"
                    name="Amp_Load"
                    value={formData.Amp_Load}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amp No Load
                  </label>
                  <input
                    type="number"
                    name="Amp_No_Load"
                    value={formData.Amp_No_Load}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LOAD/NO LOAD
                  </label>
                  <input
                    type="number"
                    name="LOAD_NO_LOAD"
                    value={formData.LOAD_NO_LOAD}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Último Mantenimiento
                  </label>
                  <input
                    type="date"
                    name="fecha_ultimo_mtto"
                    value={formData.fecha_ultimo_mtto}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
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
                  {isCreateMode ? "Crear Compresor" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compresors;
