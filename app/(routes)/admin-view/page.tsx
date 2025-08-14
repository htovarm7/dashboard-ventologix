"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { EngineerFormData } from "@/lib/types";

interface Compressor {
  id: string;
  name: string;
}

interface Engineer {
  id: string;
  name: string;
  email: string;
  compressors: string[];
  emailPreferences: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  };
}

const AdminView = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth0();
  const [userRole, setUserRole] = useState<number | null>(null);
  const [adminName, setAdminName] = useState<string>("");
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [compressors, setCompressors] = useState<Compressor[]>([]);
  const [editingEngineer, setEditingEngineer] = useState<Engineer | null>(null);
  const [formData, setFormData] = useState<EngineerFormData>({
    name: "",
    email: "",
    compressors: [],
  });

  const user = useAuth0();

  useEffect(() => {
    if (!isLoading) {
      const userData = sessionStorage.getItem("userData");
      if (userData) {
        const parsedData = JSON.parse(userData);
        setUserRole(parsedData.rol);
        setAdminName(parsedData.name || "Administrador");

        if (parsedData.rol !== 1) {
          router.push("/");
        } else {
          fetchEngineers();
          fetchCompressors();
        }
      } else {
        router.push("/");
      }
    }
  }, [isLoading, router]);

  const fetchEngineers = async () => {
    try {
      const response = await fetch("/api/engineers");
      if (response.ok) {
        const data = await response.json();
        setEngineers(data);
      }
    } catch (error) {
      console.error("Error fetching engineers:", error);
    }
  };

  const fetchCompressors = async () => {
    try {
      const response = await fetch("/api/compressors");
      if (response.ok) {
        const data = await response.json();
        setCompressors(data);
      }
    } catch (error) {
      console.error("Error fetching compressors:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = editingEngineer
        ? `/api/engineers/${editingEngineer.id}`
        : "/api/engineers";

      const method = editingEngineer ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({ name: "", email: "", compressors: [] });
        setEditingEngineer(null);
        fetchEngineers();
      }
    } catch (error) {
      console.error("Error saving engineer:", error);
    }
  };

  const handleEdit = (engineer: Engineer) => {
    setEditingEngineer(engineer);
    setFormData({
      name: engineer.name,
      email: engineer.email,
      compressors: engineer.compressors,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Está seguro de que desea eliminar este ingeniero?")) {
      try {
        const response = await fetch(`/api/engineers/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          fetchEngineers();
        }
      } catch (error) {
        console.error("Error deleting engineer:", error);
      }
    }
  };

  if (isLoading || userRole !== 1) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-blue-600 mt-2">Administrador: {user?.name}</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Volver al Dashboard
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-blue-200">
          <h2 className="text-xl font-semibold mb-4">Gestión de Ingenieros</h2>
          <form
            onSubmit={handleSubmit}
            className="flex flex-wrap items-end gap-4"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-blue-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                placeholder="Nombre del ingeniero"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-blue-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-blue-700 mb-1">
                Compresores
              </label>
              <select
                multiple
                value={formData.compressors}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    compressors: Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    ),
                  })
                }
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {compressors.map((compressor) => (
                  <option key={compressor.id} value={compressor.id}>
                    {compressor.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                {editingEngineer ? (
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
              {editingEngineer ? "Actualizar" : "Agregar"} Ingeniero
            </button>
          </form>
        </div>

        <div className="p-6">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-blue-200">
              <thead className="bg-white">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-l font-medium text-blue-500 uppercase tracking-wider"
                  >
                    Nombre
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-l font-medium text-blue-500 uppercase tracking-wider"
                  >
                    Correo
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-l font-medium text-blue-500 uppercase tracking-wider"
                  >
                    Compresores
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-l font-medium text-blue-500 uppercase tracking-wider"
                  >
                    Envío de Correo
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-l font-medium text-blue-500 uppercase tracking-wider"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-blue-200">
                {engineers.map((engineer) => (
                  <tr key={engineer.id} className="hover:bg-blue-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-900">
                        {engineer.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-blue-500">
                        {engineer.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-blue-500">
                        {engineer.compressors.join(", ")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-4">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 text-blue-600"
                            checked={engineer.emailPreferences?.daily}
                            onChange={() => {
                              /* Implementar cambio */
                            }}
                          />
                          <span className="ml-2 text-sm text-blue-600">
                            Diario
                          </span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 text-blue-600"
                            checked={engineer.emailPreferences?.weekly}
                            onChange={() => {
                              /* Implementar cambio */
                            }}
                          />
                          <span className="ml-2 text-sm text-blue-600">
                            Semanal
                          </span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 text-blue-600"
                            checked={engineer.emailPreferences?.monthly}
                            onChange={() => {
                              /* Implementar cambio */
                            }}
                          />
                          <span className="ml-2 text-sm text-blue-600">
                            Mensual
                          </span>
                        </label>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(engineer)}
                          className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 transition-colors flex items-center gap-1"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(engineer.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors flex items-center gap-1"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminView;
