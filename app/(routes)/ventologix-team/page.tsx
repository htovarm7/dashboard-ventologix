"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/hooks/useDialog";
import { URL_API } from "@/lib/global";
import { ChevronLeft, Plus, Edit2, Trash2, User } from "lucide-react";

interface TeamMember {
  id: number;
  nombre: string;
  puesto: string;
  correo: string;
  telefono: string;
  tecnico: number;
  rol: number;
}

interface FormData {
  nombre: string;
  puesto: string;
  correo: string;
  telefono: string;
  tecnico: number;
  rol: number;
}

const ROLE_LABELS: { [key: number]: string } = {
  0: "SuperADMIN",
  1: "Ingeniero",
  2: "Ventologix Air Technician Specialist",
};

const ROLE_COLORS: { [key: number]: string } = {
  0: "bg-red-100 text-red-800",
  1: "bg-blue-100 text-blue-800",
  2: "bg-purple-100 text-purple-800",
};

const VentologixTeamPage = () => {
  const router = useRouter();
  const { showSuccess, showError } = useDialog();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [rol, setRol] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    puesto: "",
    correo: "",
    telefono: "",
    tecnico: 0,
    rol: 3,
  });

  // Load user role on mount and check authorization
  useEffect(() => {
    const userData = sessionStorage.getItem("userData");
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        const userRole = parsedData.rol;
        setRol(userRole);

        // Only allow ROL 0 (Administrador)
        if (userRole == 0) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Error parsing userData:", error);
        router.push("/home");
      }
    } else {
      router.push("/home");
    }
    setIsLoading(false);
  }, [router]);

  // Fetch team members
  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${URL_API}/ventologix/team`);
      const data = await response.json();

      if (data.data) {
        setMembers(data.data);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      showError("Error", "No se pudieron cargar los miembros del equipo");
    }
  };

  // Load team members on mount
  useEffect(() => {
    if (isAuthorized) {
      fetchTeamMembers();
    }
  }, [isAuthorized]);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value) : value,
    }));
  };

  // Handle checkbox for tecnico
  const handleTecnicoChange = () => {
    setFormData((prev) => ({
      ...prev,
      tecnico: prev.tecnico === 1 ? 0 : 1,
    }));
  };

  // Submit create or update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.nombre.trim() ||
      !formData.correo.trim() ||
      !formData.puesto.trim()
    ) {
      showError("Validación", "Por favor completa los campos requeridos");
      return;
    }

    try {
      if (editingMember) {
        // Update existing member
        const response = await fetch(
          `${URL_API}/ventologix/team/${editingMember.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          },
        );

        const result = await response.json();

        if (response.ok) {
          showSuccess("Éxito", "Miembro actualizado correctamente");
          setShowEditModal(false);
          setEditingMember(null);
          setFormData({
            nombre: "",
            puesto: "",
            correo: "",
            telefono: "",
            tecnico: 0,
            rol: 3,
          });
          fetchTeamMembers();
        } else {
          showError(
            "Error",
            result.detail || result.message || "Error al actualizar",
          );
        }
      } else {
        // Create new member
        const response = await fetch(`${URL_API}/ventologix/team`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
          showSuccess("Éxito", "Miembro creado correctamente");
          setShowForm(false);
          setFormData({
            nombre: "",
            puesto: "",
            correo: "",
            telefono: "",
            tecnico: 0,
            rol: 3,
          });
          fetchTeamMembers();
        } else {
          showError(
            "Error",
            result.detail || result.message || "Error al crear",
          );
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      showError("Error", "No se pudo guardar el miembro");
    }
  };

  // Handle edit
  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      nombre: member.nombre,
      puesto: member.puesto,
      correo: member.correo,
      telefono: member.telefono,
      tecnico: member.tecnico,
      rol: member.rol,
    });
    setShowEditModal(true);
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este miembro?")) {
      return;
    }

    try {
      const response = await fetch(`${URL_API}/ventologix/team/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess("Éxito", "Miembro eliminado correctamente");
        fetchTeamMembers();
      } else {
        showError(
          "Error",
          result.detail || result.message || "Error al eliminar",
        );
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      showError("Error", "No se pudo eliminar el miembro");
    }
  };

  // Filter members based on search
  const filteredMembers = members.filter((member) =>
    member.nombre.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handle go back
  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  return (
    <div className="min-h-screen p-8 bg-white">
      {/* Loading Screen */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      )}

      {/* Unauthorized Screen */}
      {!isLoading && !isAuthorized && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Acceso Denegado
            </h1>
            <p className="text-gray-600 mb-6">
              No tienes permiso para acceder a esta página.
            </p>
            <button
              onClick={() => router.push("/home")}
              className="bg-blue-800 text-white px-6 py-2 rounded hover:bg-blue-900 transition-colors"
            >
              Ir a Inicio
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && isAuthorized && (
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 text-blue-800 hover:text-blue-900 transition-colors mb-6"
            title="Atrás"
          >
            <ChevronLeft size={20} />
            <span>Atrás</span>
          </button>

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
                <User size={32} className="text-blue-800" />
                Equipo Ventologix
              </h1>
              <p className="text-gray-600 mt-2">
                Gestión de miembros del equipo
              </p>
            </div>
            {!showForm && (
              <button
                onClick={() => {
                  setEditingMember(null);
                  setFormData({
                    nombre: "",
                    puesto: "",
                    correo: "",
                    telefono: "",
                    tecnico: 0,
                    rol: 3,
                  });
                  setShowForm(true);
                }}
                className="flex items-center gap-2 bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 transition-colors"
              >
                <Plus size={20} />
                Nuevo Miembro
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-800"
            />
          </div>

          {/* Create Form */}
          {showForm && (
            <div className="bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Crear Nuevo Miembro
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Puesto *
                    </label>
                    <input
                      type="text"
                      name="puesto"
                      value={formData.puesto}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo *
                    </label>
                    <input
                      type="email"
                      name="correo"
                      value={formData.correo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rol *
                    </label>
                    <select
                      name="rol"
                      value={formData.rol}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-800"
                    >
                      <option value={0}>Administrador</option>
                      <option value={1}>Ingeniero</option>
                      <option value={2}>Técnico Supervisor</option>
                      <option value={3}>Técnico</option>
                      <option value={4}>Visualización</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.tecnico === 1}
                        onChange={handleTecnicoChange}
                        className="w-4 h-4 accent-blue-800"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        ¿Es Técnico?
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="bg-blue-800 text-white px-6 py-2 rounded hover:bg-blue-900 transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({
                        nombre: "",
                        puesto: "",
                        correo: "",
                        telefono: "",
                        tecnico: 0,
                        rol: 3,
                      });
                    }}
                    className="bg-gray-300 text-gray-800 px-6 py-2 rounded hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Members Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {filteredMembers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                        Puesto
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                        Correo
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                        Teléfono
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                        Técnico
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member, index) => (
                      <tr
                        key={member.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                          {member.nombre}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {member.puesto}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {member.correo}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {member.telefono || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              ROLE_COLORS[member.rol] || ROLE_COLORS[4]
                            }`}
                          >
                            {ROLE_LABELS[member.rol] || "Desconocido"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {member.tecnico === 1 ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                              Sí
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(member)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-600">
                <p>
                  {searchQuery
                    ? "No se encontraron miembros que coincidan con la búsqueda"
                    : "No hay miembros registrados"}
                </p>
              </div>
            )}
          </div>

          {/* Edit Modal */}
          {showEditModal && editingMember && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Editar Miembro
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Puesto *
                    </label>
                    <input
                      type="text"
                      name="puesto"
                      value={formData.puesto}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo *
                    </label>
                    <input
                      type="email"
                      name="correo"
                      value={formData.correo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rol *
                    </label>
                    <select
                      name="rol"
                      value={formData.rol}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-800"
                    >
                      <option value={0}>Administrador</option>
                      <option value={1}>Ingeniero</option>
                      <option value={2}>Técnico Supervisor</option>
                      <option value={3}>Técnico</option>
                      <option value={4}>Visualización</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.tecnico === 1}
                        onChange={handleTecnicoChange}
                        className="w-4 h-4 accent-blue-800"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        ¿Es Técnico?
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 transition-colors"
                    >
                      Actualizar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingMember(null);
                        setFormData({
                          nombre: "",
                          puesto: "",
                          correo: "",
                          telefono: "",
                          tecnico: 0,
                          rol: 3,
                        });
                      }}
                      className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VentologixTeamPage;
