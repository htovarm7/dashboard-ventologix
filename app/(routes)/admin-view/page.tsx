"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { Engineer, EngineerFormData } from "@/lib/types";

interface Compressor {
  id: string;
  name: string;
}

const AdminView = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth0();
  const [userRole, setUserRole] = useState<number | null>(null);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [compressors, setCompressors] = useState<Compressor[]>([]);
  const [editingEngineer, setEditingEngineer] = useState<Engineer | null>(null);
  const [formData, setFormData] = useState<EngineerFormData>({
    name: "",
    email: "",
    compressors: [],
  });

  useEffect(() => {
    if (!isLoading) {
      const userData = sessionStorage.getItem("userData");
      if (userData) {
        const parsedData = JSON.parse(userData);
        setUserRole(parsedData.rol);

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
      <h1 className="text-3xl font-bold mb-8">Panel de Administración</h1>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Gestión de Ingenieros</h2>

          {/* Formulario para agregar/editar ingeniero */}
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nombre del ingeniero"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="p-2 border rounded"
              />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="p-2 border rounded"
              />
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
                className="p-2 border rounded"
              >
                {compressors.map((compressor) => (
                  <option key={compressor.id} value={compressor.id}>
                    {compressor.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                {editingEngineer ? "Actualizar" : "Agregar"} Ingeniero
              </button>
            </div>
          </form>

          {/* Lista de ingenieros */}
          <div className="space-y-4">
            {engineers.map((engineer) => (
              <div
                key={engineer.id}
                className="border p-4 rounded flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold">{engineer.name}</h3>
                  <p className="text-sm text-gray-600">{engineer.email}</p>
                  <p className="text-sm text-gray-500">
                    Compresores: {engineer.compressors.join(", ")}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handleEdit(engineer)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(engineer.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => router.push("/")}
        className="mt-8 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Volver al Dashboard
      </button>
    </div>
  );
};

export default AdminView;
