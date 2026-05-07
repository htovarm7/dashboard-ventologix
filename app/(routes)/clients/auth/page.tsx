"use client";

import { useEffect, useState } from "react";
import { URL_API } from "@/lib/global";
import BackButton from "@/components/BackButton";

const ROL_LABELS: Record<number, string> = {
  1: "Gerente",
  2: "Ingeniero",
};

interface UsuarioAuth {
  id: number;
  email: string;
  numeroCliente: number;
  rol: number;
  name: string;
  envio_diario: boolean;
  envio_semanal: boolean;
  created_at: string;
  nombre_cliente: string | null;
}

interface ClienteOption {
  numero_cliente: number;
  nombre_cliente: string;
}

interface FormData {
  email: string;
  numeroCliente: string;
  rol: string;
  name: string;
  envio_diario: boolean;
  envio_semanal: boolean;
}

const emptyForm: FormData = {
  email: "",
  numeroCliente: "",
  rol: "1",
  name: "",
  envio_diario: false,
  envio_semanal: false,
};

export default function UsuariosAuthPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAuth[]>([]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [search, setSearch] = useState("");

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${URL_API}/web/usuarios-auth/`);
      if (res.ok) {
        const json = await res.json();
        setUsuarios(json.data ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const res = await fetch(`${URL_API}/clients/`);
      if (res.ok) {
        const json = await res.json();
        setClientes(json.data ?? []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchClientes();
  }, []);

  const openCreate = () => {
    setIsCreateMode(true);
    setSelectedId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (u: UsuarioAuth) => {
    setIsCreateMode(false);
    setSelectedId(u.id);
    setFormData({
      email: u.email,
      numeroCliente: String(u.numeroCliente),
      rol: String(u.rol),
      name: u.name,
      envio_diario: u.envio_diario,
      envio_semanal: u.envio_semanal,
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;
    setFormData((prev) => ({ ...prev, [target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      email: formData.email,
      numeroCliente: Number(formData.numeroCliente),
      rol: Number(formData.rol),
      name: formData.name,
      envio_diario: formData.envio_diario,
      envio_semanal: formData.envio_semanal,
    };

    const url = isCreateMode
      ? `${URL_API}/web/usuarios-auth/`
      : `${URL_API}/web/usuarios-auth/${selectedId}`;
    const method = isCreateMode ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchUsuarios();
      } else {
        const err = await res.json();
        const detail = err.detail;
        alert(
          `Error: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`,
        );
      }
    } catch (e) {
      console.error(e);
      alert("Error al procesar la solicitud");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar al usuario "${name}"? Esta acción no se puede deshacer.`))
      return;
    try {
      const res = await fetch(`${URL_API}/web/usuarios-auth/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchUsuarios();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail ?? "No se pudo eliminar"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error al eliminar el usuario");
    }
  };

  const filtered = usuarios.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.nombre_cliente ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mb-4">
        <BackButton />
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Usuarios Autorizados
            </h1>
            <p className="text-gray-500 mt-1">
              Total: {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Usuario
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre, email o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="text-gray-500 mt-4">Cargando usuarios...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="border border-gray-300 p-3 text-left">Nombre</th>
                  <th className="border border-gray-300 p-3 text-left">Email</th>
                  <th className="border border-gray-300 p-3 text-left">Cliente</th>
                  <th className="border border-gray-300 p-3 text-center">Rol</th>
                  <th className="border border-gray-300 p-3 text-center">Envío diario</th>
                  <th className="border border-gray-300 p-3 text-center">Envío semanal</th>
                  <th className="border border-gray-300 p-3 text-center">Alta</th>
                  <th className="border border-gray-300 p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-blue-50 transition-colors">
                    <td className="border border-gray-300 p-3 font-medium text-gray-800">
                      {u.name}
                    </td>
                    <td className="border border-gray-300 p-3 text-gray-700">
                      {u.email}
                    </td>
                    <td className="border border-gray-300 p-3 text-gray-700">
                      <span className="font-medium">{u.nombre_cliente ?? "—"}</span>
                      <span className="text-gray-400 text-xs ml-1">#{u.numeroCliente}</span>
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          u.rol === 1
                            ? "bg-purple-100 text-purple-700"
                            : "bg-teal-100 text-teal-700"
                        }`}
                      >
                        {ROL_LABELS[u.rol] ?? `Rol ${u.rol}`}
                      </span>
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      {u.envio_diario ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      {u.envio_semanal ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="border border-gray-300 p-3 text-center text-gray-500 text-xs">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString("es-MX")
                        : "—"}
                    </td>
                    <td className="border border-gray-300 p-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => openEdit(u)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
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
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 text-white p-5 rounded-t-lg">
              <h2 className="text-xl font-bold">
                {isCreateMode ? "Nuevo Usuario" : "Editar Usuario"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente *
                </label>
                <select
                  name="numeroCliente"
                  value={formData.numeroCliente}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecciona un cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.numero_cliente} value={c.numero_cliente}>
                      {c.nombre_cliente} (#{c.numero_cliente})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  name="rol"
                  value={formData.rol}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1">Gerente</option>
                  <option value="2">Ingeniero</option>
                </select>
              </div>

              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="envio_diario"
                    checked={formData.envio_diario}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Envío diario</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="envio_semanal"
                    checked={formData.envio_semanal}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Envío semanal</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {isCreateMode ? "Crear Usuario" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
