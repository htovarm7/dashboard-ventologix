"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { EngineerFormData, Engineer, Compressor, UserData } from "@/lib/types";

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
  const [data, setData] = useState<UserData | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const userData = sessionStorage.getItem("userData");
      if (userData) {
        const parsedData = JSON.parse(userData);
        setData(parsedData);
        setUserRole(parsedData.rol);

        if (parsedData.rol !== 2) {
          router.push("/");
        } else {
          console.log("User data:", parsedData);
          console.log(
            "Client number:",
            parsedData.numero_cliente,
            "Type:",
            typeof parsedData.numero_cliente
          );

          const clientNumber =
            typeof parsedData.numero_cliente === "string"
              ? parseInt(parsedData.numero_cliente, 10)
              : parsedData.numero_cliente;

          fetchEngineers(clientNumber);
          fetchCompressors(clientNumber);
        }
      } else {
        router.push("/");
      }
    }
  }, [isLoading, router]);

  const fetchEngineers = async (numero_cliente: number) => {
    try {
      console.log("Fetching engineers for client:", numero_cliente);
      const url = `http://127.0.0.1:8000/web/ingenieros?cliente=${numero_cliente}`;
      console.log("Engineers URL:", url);

      const response = await fetch(url);
      if (response.ok) {
        const engineersData = await response.json();
        setEngineers(engineersData);
      } else {
        console.error(
          "Failed to fetch engineers:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching engineers:", error);
    }
  };

  const fetchCompressors = async (numero_cliente: number) => {
    try {
      console.log("Fetching compressors for client:", numero_cliente);
      const url = `http://127.0.0.1:8000/web/compresores?cliente=${numero_cliente}`;
      console.log("Compressors URL:", url);

      const response = await fetch(url);
      if (response.ok) {
        const compressorsData = await response.json();
        setCompressors(compressorsData);
      } else {
        console.error(
          "Failed to fetch compressors:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching compressors:", error);
    }
  };

  const handleCompressorToggle = (compressorId: string) => {
    setFormData((prev) => ({
      ...prev,
      compressors: prev.compressors.includes(compressorId)
        ? prev.compressors.filter((id) => id !== compressorId)
        : [...prev.compressors, compressorId],
    }));
  };

  const getSelectedCompressorNames = () => {
    return compressors
      .filter((comp) => formData.compressors.includes(comp.id))
      .map((comp) => `${comp.alias} (Línea ${comp.linea})`)
      .join(", ");
  };

  const getCompressorNamesForEngineer = (
    engineerCompressors: string[] | Array<{ id: string; alias: string }>
  ) => {
    if (!engineerCompressors || engineerCompressors.length === 0) {
      return "Sin compresores asignados";
    }

    if (typeof engineerCompressors[0] === "object") {
      return (engineerCompressors as Array<{ id: string; alias: string }>)
        .map((comp) => {
          const fullComp = compressors.find((c) => c.id === comp.id);
          return fullComp ? `${comp.alias}` : comp.alias;
        })
        .join(", ");
    }

    const stringCompressors = engineerCompressors as string[];
    const matchedCompressors = compressors.filter((comp) =>
      stringCompressors.includes(comp.alias)
    );

    if (matchedCompressors.length > 0) {
      return matchedCompressors.map((comp) => `${comp.alias}`).join(", ");
    }

    return stringCompressors.join(", ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!data?.numero_cliente) {
      console.error("No se encontró el número de cliente");
      return;
    }

    try {
      const engineerData = {
        name: formData.name,
        email: formData.email,
        compressors: formData.compressors,
        numeroCliente: data.numero_cliente,
      };

      console.log("Sending engineer data:", engineerData);

      const endpoint = editingEngineer
        ? `http://127.0.0.1:8000/web/ingenieros/${editingEngineer.id}`
        : `http://127.0.0.1:8000/web/ingenieros`;

      const method = editingEngineer ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(engineerData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Engineer created/updated successfully:", result);

        setFormData({ name: "", email: "", compressors: [] });
        setEditingEngineer(null);
        setIsDropdownOpen(false);

        const clientNumber =
          typeof data.numero_cliente === "string"
            ? parseInt(data.numero_cliente, 10)
            : data.numero_cliente;

        fetchEngineers(clientNumber);

        console.log(
          `Ingeniero ${
            editingEngineer ? "actualizado" : "creado"
          } exitosamente con cliente: ${data.numero_cliente}`
        );
      } else {
        const errorData = await response.json();
        console.error("Error del servidor:", errorData);
        alert(`Error: ${errorData.detail || "Error desconocido"}`);
      }
    } catch (error) {
      console.error("Error saving engineer:", error);
      alert("Error al guardar el ingeniero. Por favor intenta de nuevo.");
    }
  };

  const handleEdit = (engineer: Engineer) => {
    setEditingEngineer(engineer);

    let compressorIds: string[] = [];

    if (
      engineer.compressors.length > 0 &&
      typeof engineer.compressors[0] === "object"
    ) {
      compressorIds = (
        engineer.compressors as Array<{ id: string; alias: string }>
      ).map((comp) => comp.id);
    } else {
      const stringCompressors = engineer.compressors as string[];
      stringCompressors.forEach((compressorName) => {
        const compressorByAlias = compressors.find(
          (comp) => comp.alias === compressorName
        );
        if (compressorByAlias) {
          compressorIds.push(compressorByAlias.id);
        }
      });
    }

    setFormData({
      name: engineer.name,
      email: engineer.email,
      compressors: compressorIds,
    });
  };

  const handleDelete = async (
    engineerId: string,
    engineerNumeroCliente: number
  ) => {
    if (confirm("¿Está seguro de que desea eliminar este ingeniero?")) {
      try {
        const clientNumber = data?.numero_cliente || engineerNumeroCliente;

        console.log(
          "Deleting engineer:",
          engineerId,
          "for client:",
          clientNumber
        );

        const response = await fetch(
          `http://127.0.0.1:8000/web/ingenieros/${engineerId}?cliente=${clientNumber}`,
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          console.log("Engineer deleted successfully");
          fetchEngineers(clientNumber);
          alert("Ingeniero eliminado exitosamente");
        } else {
          const errorData = await response.text();
          console.error("Error deleting engineer:", response.status, errorData);
          alert(
            `Error al eliminar ingeniero: ${response.status} - ${errorData}`
          );
        }
      } catch (error) {
        console.error("Error deleting engineer:", error);
        alert("Error al eliminar el ingeniero. Por favor intenta de nuevo.");
      }
    }
  };

  const handleEmailPreferenceChange = async (
    engineerId: string,
    preference: string,
    value: boolean
  ) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/web/ingenieros/${engineerId}/preferences`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            [preference]: value,
          }),
        }
      );

      if (response.ok) {
        setEngineers(
          engineers.map((engineer) =>
            engineer.id === engineerId
              ? {
                  ...engineer,
                  emailPreferences: {
                    ...engineer.emailPreferences,
                    [preference]: value,
                  },
                }
              : engineer
          )
        );
      }
    } catch (error) {
      console.error("Error updating email preferences:", error);
    }
  };

  if (isLoading || userRole !== 2) {
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
          <p className="text-blue-600 mt-2">Administrador: Ing. {data?.name}</p>
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
                required
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
                required
              />
            </div>
            <div className="flex-1 min-w-[250px] relative">
              <label className="block text-sm font-medium text-blue-700 mb-1">
                Compresores
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex justify-between items-center"
                >
                  <span className="truncate">
                    {formData.compressors.length === 0
                      ? "Seleccionar compresores"
                      : `${formData.compressors.length} seleccionado${
                          formData.compressors.length > 1 ? "s" : ""
                        }`}
                  </span>
                  <svg
                    className={`h-5 w-5 transition-transform ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {compressors.length === 0 ? (
                      <div className="px-4 py-2 text-gray-500">
                        No hay compresores disponibles
                      </div>
                    ) : (
                      compressors.map((comp) => (
                        <label
                          key={comp.id}
                          className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.compressors.includes(comp.id)}
                            onChange={() => handleCompressorToggle(comp.id)}
                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-900">
                            {comp.alias} (Línea {comp.linea})
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
              {formData.compressors.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  Seleccionados: {getSelectedCompressorNames()}
                </p>
              )}
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
                    className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase tracking-wider"
                  >
                    Nombre
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase tracking-wider"
                  >
                    Correo
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase tracking-wider"
                  >
                    Compresores
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-blue-500 uppercase tracking-wider"
                  >
                    Envío de Correo
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-blue-500 uppercase tracking-wider"
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
                        {getCompressorNamesForEngineer(engineer.compressors)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-4">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 text-blue-600"
                            checked={engineer.emailPreferences?.daily || false}
                            onChange={(e) =>
                              handleEmailPreferenceChange(
                                engineer.id,
                                "daily",
                                e.target.checked
                              )
                            }
                          />
                          <span className="ml-2 text-sm text-blue-600">
                            Diario
                          </span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 text-blue-600"
                            checked={engineer.emailPreferences?.weekly || false}
                            onChange={(e) =>
                              handleEmailPreferenceChange(
                                engineer.id,
                                "weekly",
                                e.target.checked
                              )
                            }
                          />
                          <span className="ml-2 text-sm text-blue-600">
                            Semanal
                          </span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 text-blue-600"
                            checked={
                              engineer.emailPreferences?.monthly || false
                            }
                            onChange={(e) =>
                              handleEmailPreferenceChange(
                                engineer.id,
                                "monthly",
                                e.target.checked
                              )
                            }
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
                          onClick={() =>
                            handleDelete(engineer.id, engineer.numero_cliente)
                          }
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

      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminView;
