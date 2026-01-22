"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import {
  EngineerFormData,
  Engineer,
  Compressor,
  UserData,
  OrdenServicio,
} from "@/lib/types";
import { URL_API } from "@/lib/global";
import { useDialog } from "@/hooks/useDialog";

const AdminView = () => {
  const router = useRouter();
  const { showSuccess, showError, showConfirmation } = useDialog();
  const { isLoading } = useAuth0();
  const [userRole, setUserRole] = useState<number | null>(null);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [compressors, setCompressors] = useState<Compressor[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([]);
  const [activeTab, setActiveTab] = useState<"engineers" | "ordenes">(
    "engineers"
  );
  const [editingEngineer, setEditingEngineer] = useState<Engineer | null>(null);
  const [editingOrden, setEditingOrden] = useState<OrdenServicio | null>(null);
  const [formData, setFormData] = useState<EngineerFormData>({
    name: "",
    email: "",
    compressors: [],
    rol: 4,
  });
  const [ordenFormData, setOrdenFormData] = useState<Partial<OrdenServicio>>({
    folio: "",
    id_cliente: 0,
    id_cliente_eventual: 0,
    nombre_cliente: "",
    numero_cliente: 0,
    alias_compresor: "",
    numero_serie: "",
    hp: 0,
    tipo: "",
    marca: "",
    anio: new Date().getFullYear(),
    tipo_visita: "",
    prioridad: "media",
    fecha_programada: new Date().toISOString().split("T")[0],
    hora_programada: "09:00:00",
    estado: "no_iniciado",
    fecha_creacion: new Date().toISOString(),
    reporte_url: "",
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

        if (parsedData.rol !== 3) {
          router.push("/");
        } else {
          const clientNumber =
            typeof parsedData.numero_cliente === "string"
              ? parseInt(parsedData.numero_cliente, 10)
              : parsedData.numero_cliente;

          fetchEngineers(clientNumber);
          fetchCompressors(clientNumber);
          fetchOrdenes();
        }
      } else {
        router.push("/");
      }
    }
  }, [isLoading, router]);

  const fetchEngineers = async (numero_cliente: number) => {
    try {
      const url = `${URL_API}/web/ingenieros?cliente=${numero_cliente}`;
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "x-internal-api-key": process.env.NEXT_PUBLIC_API_SECRET || "",
        },
      });
      if (response.ok) {
        const engineersData = await response.json();
        // Process engineers data if needed
        engineersData.forEach((engineer: Engineer) => {
          if (Array.isArray(engineer.compressors)) {
            // Process compressors if needed
          }
        });
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
      const url = `${URL_API}/web/compresores?cliente=${numero_cliente}`;

      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "x-internal-api-key": process.env.NEXT_PUBLIC_API_SECRET || "",
        },
      });
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

  // ============= ORDENES CRUD OPERATIONS =============
  const fetchOrdenes = async () => {
    try {
      const response = await fetch(`${URL_API}/ordenes/`);
      if (response.ok) {
        const data = await response.json();
        setOrdenes(data.data || []);
      } else {
        console.error("Failed to fetch ordenes:", response.status);
      }
    } catch (error) {
      console.error("Error fetching ordenes:", error);
    }
  };

  const handleOrdenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingOrden
        ? `${URL_API}/ordenes/${editingOrden.folio}`
        : `${URL_API}/ordenes/`;

      const method = editingOrden ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ordenFormData),
      });

      if (response.ok) {
        fetchOrdenes();
        resetOrdenForm();
        showSuccess(
          editingOrden ? "Orden actualizada" : "Orden creada",
          editingOrden
            ? "La orden ha sido actualizada exitosamente"
            : "La orden ha sido creada exitosamente"
        );
      } else {
        const errorData = await response.json();
        showError(
          "Error al guardar orden",
          errorData.detail || "Error desconocido"
        );
      }
    } catch (error) {
      console.error("Error saving orden:", error);
      showError("Error al guardar orden", "Error al guardar la orden");
    }
  };

  const handleEditOrden = (orden: OrdenServicio) => {
    setEditingOrden(orden);
    setOrdenFormData(orden);
    setActiveTab("ordenes");
  };

  const handleDeleteOrden = async (folio: string) => {
    const executeDelete = async () => {
      try {
        const response = await fetch(`${URL_API}/ordenes/${folio}`, {
          method: "DELETE",
        });

        if (response.ok) {
          fetchOrdenes();
          showSuccess(
            "Orden eliminada",
            "La orden ha sido eliminada exitosamente"
          );
        } else {
          const errorData = await response.json();
          showError(
            "Error al eliminar orden",
            errorData.detail || "Error desconocido"
          );
        }
      } catch (error) {
        console.error("Error deleting orden:", error);
        showError("Error al eliminar orden", "Error al eliminar la orden");
      }
    };

    showConfirmation(
      "Confirmar eliminación",
      "¿Está seguro de que desea eliminar esta orden? Esta acción no se puede deshacer.",
      executeDelete,
      undefined,
      "Eliminar",
      "Cancelar"
    );
  };

  const resetOrdenForm = () => {
    setEditingOrden(null);
    setOrdenFormData({
      folio: "",
      id_cliente: 0,
      id_cliente_eventual: 0,
      nombre_cliente: "",
      numero_cliente: 0,
      alias_compresor: "",
      numero_serie: "",
      hp: 0,
      tipo: "",
      marca: "",
      anio: new Date().getFullYear(),
      tipo_visita: "",
      prioridad: "media",
      fecha_programada: new Date().toISOString().split("T")[0],
      hora_programada: "09:00:00",
      estado: "no_iniciado",
      fecha_creacion: new Date().toISOString(),
      reporte_url: "",
    });
  };

  const generateFolio = () => {
    const clientId =
      ordenFormData.id_cliente_eventual === 1
        ? "00"
        : String(ordenFormData.id_cliente || 0).padStart(2, "0");
    const last4Digits = (ordenFormData.numero_serie || "0000")
      .slice(-4)
      .padStart(4, "0");
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${clientId}-${last4Digits}-${year}${month}${day}-${hours}${minutes}`;
  };

  const handleGenerateFolio = () => {
    const folio = generateFolio();
    setOrdenFormData({ ...ordenFormData, folio });
  };

  // ============= END ORDENES CRUD OPERATIONS =============

  const handleCompressorToggle = (compressorId: string) => {
    setFormData((prev) => {
      const newCompressors = prev.compressors.includes(compressorId)
        ? prev.compressors.filter((id) => id !== compressorId)
        : [...prev.compressors, compressorId];
      return {
        ...prev,
        compressors: newCompressors,
      };
    });
  };

  const handleCancelEdit = () => {
    setEditingEngineer(null);
    setFormData({ name: "", email: "", compressors: [], rol: 1 });
    setIsDropdownOpen(false);
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
        rol: formData.rol || 1,
      };

      const endpoint = editingEngineer
        ? `${URL_API}/web/ingenieros/${editingEngineer.id}`
        : `${URL_API}/web/ingenieros`;

      const method = editingEngineer ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          "x-internal-api-key": process.env.NEXT_PUBLIC_API_SECRET || "",
        },
        body: JSON.stringify(engineerData),
      });

      if (response.ok) {
        setFormData({ name: "", email: "", compressors: [], rol: 1 });
        setEditingEngineer(null);
        setIsDropdownOpen(false);

        const clientNumber =
          typeof data.numero_cliente === "string"
            ? parseInt(data.numero_cliente, 10)
            : data.numero_cliente;

        fetchEngineers(clientNumber);
      } else {
        const errorData = await response.json();
        console.error("Error del servidor:", errorData);
        showError(
          "Error al guardar ingeniero",
          errorData.detail || "Error desconocido"
        );
      }
    } catch (error) {
      console.error("Error saving engineer:", error);
      showError(
        "Error al guardar ingeniero",
        "Error al guardar el ingeniero. Por favor intenta de nuevo."
      );
    }
  };

  const handleEdit = (engineer: Engineer) => {
    setEditingEngineer(engineer);

    let compressorIds: string[] = [];

    // Verificar si hay compresores asignados
    if (!engineer.compressors || engineer.compressors.length === 0) {
      compressorIds = [];
    } else if (typeof engineer.compressors[0] === "object") {
      // Si los compresores vienen como objetos con id y alias
      compressorIds = (
        engineer.compressors as Array<{ id: string; alias: string }>
      ).map((comp) => comp.id);
    } else {
      // Si los compresores vienen como strings (nombres/alias)
      const stringCompressors = engineer.compressors as string[];
      stringCompressors.forEach((compressorName) => {
        const compressorByAlias = compressors.find(
          (comp) => comp.alias === compressorName || comp.id === compressorName
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
      rol: engineer.rol || 1, // Por defecto "Ingeniero" si no tiene rol
    });
  };

  const handleDelete = async (
    engineerId: string,
    engineerNumeroCliente: number
  ) => {
    const clientNumber = data?.numero_cliente || engineerNumeroCliente;

    const executeDelete = async () => {
      try {
        const response = await fetch(
          `${URL_API}/web/ingenieros/${engineerId}?cliente=${clientNumber}`,
          {
            method: "DELETE",
            headers: {
              accept: "application/json",
              "x-internal-api-key": process.env.NEXT_PUBLIC_API_SECRET || "",
            },
          }
        );

        if (response.ok) {
          fetchEngineers(clientNumber);
          showSuccess(
            "Ingeniero eliminado",
            "El ingeniero ha sido eliminado exitosamente"
          );
        } else {
          const errorData = await response.text();
          console.error("Error deleting engineer:", response.status, errorData);
          showError(
            "Error al eliminar ingeniero",
            `Error: ${response.status} - ${errorData}`
          );
        }
      } catch (error) {
        console.error("Error deleting engineer:", error);
        showError(
          "Error al eliminar ingeniero",
          "Error al eliminar el ingeniero. Por favor intenta de nuevo."
        );
      }
    };

    showConfirmation(
      "Confirmar eliminación",
      "¿Está seguro de que desea eliminar este ingeniero? Esta acción no se puede deshacer.",
      executeDelete,
      undefined,
      "Eliminar",
      "Cancelar"
    );
  };

  const handleEmailPreferenceChange = async (
    engineerId: string,
    preference: string,
    value: boolean
  ) => {
    try {
      const response = await fetch(
        `${URL_API}/web/ingenieros/${engineerId}/preferences`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            "x-internal-api-key": process.env.NEXT_PUBLIC_API_SECRET || "",
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

  if (isLoading || userRole !== 3) {
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
          <p className="text-xl text-blue-800 mt-2">
            Administrador: {data?.name}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("engineers")}
              className={`px-6 py-3 text-lg font-medium border-b-2 transition-colors ${
                activeTab === "engineers"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              👥 Gestión de Usuarios
            </button>
            <button
              onClick={() => setActiveTab("ordenes")}
              className={`px-6 py-3 text-lg font-medium border-b-2 transition-colors ${
                activeTab === "ordenes"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              📋 Órdenes de Servicio
            </button>
          </nav>
        </div>
      </div>

      {/* Engineers Tab */}
      {activeTab === "engineers" && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-blue-200">
            <h2 className="text-2xl font-semibold mb-4">
              {editingEngineer ? (
                <span className="text-orange-600">
                  Editando Ingeniero: {editingEngineer.name}
                </span>
              ) : (
                "Gestión de Usuarios"
              )}
            </h2>
            <form
              onSubmit={handleSubmit}
              className="flex flex-wrap items-end gap-4"
            >
              <div className="flex-1 min-w-[200px]">
                <label className="text-lg block font-medium text-blue-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  placeholder="Nombre del Usuario"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-lg font-medium text-blue-700 mb-1">
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
              <div className="flex-1 min-w-[200px]">
                <label className="block text-lg font-medium text-blue-700 mb-1">
                  Rol
                </label>
                <select
                  value={formData.rol}
                  onChange={(e) =>
                    setFormData({ ...formData, rol: parseInt(e.target.value) })
                  }
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value={1}>Ingeniero</option>
                  <option value={2}>Administrador</option>
                </select>
              </div>
              <div className="flex-1 min-w-[250px] relative">
                <label className="block text-lg font-medium text-blue-700 mb-1">
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
                            <span className="text-lg text-gray-900">
                              {comp.alias} (Línea {comp.linea})
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
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

                {editingEngineer && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="p-6">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="min-w-full divide-y divide-blue-200">
                <thead className="bg-white">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xl font-medium text-blue-500 uppercase tracking-wider"
                    >
                      Nombre
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xl font-medium text-blue-500 uppercase tracking-wider"
                    >
                      Correo
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xl font-medium text-blue-500 uppercase tracking-wider"
                    >
                      Rol
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xl font-medium text-blue-500 uppercase tracking-wider"
                    >
                      Compresores
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xl font-medium text-blue-500 uppercase tracking-wider"
                    >
                      Envío de Correo
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xl font-medium text-blue-500 uppercase tracking-wider"
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-blue-200">
                  {engineers.map((engineer) => (
                    <tr key={engineer.id} className="hover:bg-blue-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-medium text-blue-900">
                          {engineer.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg text-blue-500">
                          {engineer.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg text-blue-700">
                          {engineer.rol === 4
                            ? "Ingeniero"
                            : engineer.rol === 3
                            ? "Administrador"
                            : "No asignado"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg text-blue-500">
                          {getCompressorNamesForEngineer(engineer.compressors)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center space-x-4">
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              className="form-checkbox h-4 w-4 text-blue-600"
                              checked={
                                engineer.emailPreferences?.daily || false
                              }
                              onChange={(e) =>
                                handleEmailPreferenceChange(
                                  engineer.id,
                                  "daily",
                                  e.target.checked
                                )
                              }
                            />
                            <span className="ml-2 text-lg text-blue-600">
                              Diario
                            </span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              className="form-checkbox h-4 w-4 text-blue-600"
                              checked={
                                engineer.emailPreferences?.weekly || false
                              }
                              onChange={(e) =>
                                handleEmailPreferenceChange(
                                  engineer.id,
                                  "weekly",
                                  e.target.checked
                                )
                              }
                            />
                            <span className="ml-2 text-lg text-blue-600">
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
                            <span className="ml-2 text-lg text-blue-600">
                              Mensual
                            </span>
                          </label>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-lg font-medium">
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
      )}

      {/* Ordenes Tab */}
      {activeTab === "ordenes" && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-blue-200">
            <h2 className="text-2xl font-semibold mb-4">
              {editingOrden ? (
                <span className="text-orange-600">
                  Editando Orden: {editingOrden.folio}
                </span>
              ) : (
                "Crear Nueva Orden de Servicio"
              )}
            </h2>
            <form onSubmit={handleOrdenSubmit} className="space-y-6">
              {/* Folio Generation */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Folio
                  </label>
                  <input
                    type="text"
                    value={ordenFormData.folio || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        folio: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Folio de la orden"
                    required
                    readOnly={!!editingOrden}
                  />
                </div>
                {!editingOrden && (
                  <button
                    type="button"
                    onClick={handleGenerateFolio}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Generar Folio
                  </button>
                )}
              </div>

              {/* Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    value={ordenFormData.nombre_cliente || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        nombre_cliente: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    ID Cliente
                  </label>
                  <input
                    type="number"
                    value={ordenFormData.id_cliente || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        id_cliente: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Número de Cliente
                  </label>
                  <input
                    type="number"
                    value={ordenFormData.numero_cliente || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        numero_cliente: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Compressor Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Alias Compresor *
                  </label>
                  <input
                    type="text"
                    value={ordenFormData.alias_compresor || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        alias_compresor: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Número de Serie *
                  </label>
                  <input
                    type="text"
                    value={ordenFormData.numero_serie || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        numero_serie: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    HP
                  </label>
                  <input
                    type="number"
                    value={ordenFormData.hp || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        hp: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={ordenFormData.tipo || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        tipo: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Tornillo">Tornillo</option>
                    <option value="Piston">Pistón</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={ordenFormData.marca || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        marca: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Año
                  </label>
                  <input
                    type="number"
                    value={ordenFormData.anio || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        anio:
                          parseInt(e.target.value) || new Date().getFullYear(),
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Cliente Eventual
                  </label>
                  <select
                    value={ordenFormData.id_cliente_eventual || 0}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        id_cliente_eventual: parseInt(e.target.value),
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>No</option>
                    <option value={1}>Sí</option>
                  </select>
                </div>
              </div>

              {/* Service Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Tipo de Visita *
                  </label>
                  <select
                    value={ordenFormData.tipo_visita || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        tipo_visita: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar</option>
                    <option value="1era Visita comercial">
                      1era Visita comercial
                    </option>
                    <option value="Diagnostico">Diagnóstico</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Prioridad *
                  </label>
                  <select
                    value={ordenFormData.prioridad || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        prioridad: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={ordenFormData.estado || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        estado: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="no_iniciado">No Iniciado</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="completado">Completado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Fecha Programada *
                  </label>
                  <input
                    type="date"
                    value={ordenFormData.fecha_programada || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        fecha_programada: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-blue-700 mb-1">
                    Hora Programada
                  </label>
                  <input
                    type="time"
                    value={ordenFormData.hora_programada || ""}
                    onChange={(e) =>
                      setOrdenFormData({
                        ...ordenFormData,
                        hora_programada: e.target.value + ":00",
                      })
                    }
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingOrden ? "Actualizar Orden" : "Crear Orden"}
                </button>
                {editingOrden && (
                  <button
                    type="button"
                    onClick={resetOrdenForm}
                    className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium"
                  >
                    Cancelar Edición
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Ordenes Table */}
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">
              Órdenes de Servicio ({ordenes.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300">
                <thead className="bg-blue-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold">
                      Folio
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold">
                      Compresor
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold">
                      Tipo Visita
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold">
                      Prioridad
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold">
                      Fecha Programada
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.map((orden) => (
                    <tr
                      key={orden.folio}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm">{orden.folio}</td>
                      <td className="px-4 py-3 text-sm">
                        {orden.nombre_cliente}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {orden.alias_compresor} ({orden.numero_serie})
                      </td>
                      <td className="px-4 py-3 text-sm">{orden.tipo_visita}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            orden.prioridad === "urgente"
                              ? "bg-red-100 text-red-800"
                              : orden.prioridad === "alta"
                              ? "bg-orange-100 text-orange-800"
                              : orden.prioridad === "media"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {orden.prioridad.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            orden.estado === "completado"
                              ? "bg-green-100 text-green-800"
                              : orden.estado === "en_proceso"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {orden.estado.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {orden.fecha_programada} {orden.hora_programada}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEditOrden(orden)}
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
                            onClick={() => handleDeleteOrden(orden.folio)}
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
      )}

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
