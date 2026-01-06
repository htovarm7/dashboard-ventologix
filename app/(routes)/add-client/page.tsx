"use client";
import { useState } from "react";
import BackButton from "@/components/BackButton";
import { URL_API } from "@/lib/global";

interface ClientFormData {
  id_cliente: string;
  numero_cliente: string;
  nombre_cliente: string;
  RFC: string;
  direccion: string;
  champion: string;
  CostokWh: string;
  demoDiario: boolean;
  demoSemanal: boolean;
}

interface CompressorFormData {
  hp: string;
  tipo: string;
  voltaje: string;
  marca: string;
  numero_serie: string;
  anio: string;
  id_cliente: string;
  Amp_Load: string;
  Amp_No_Load: string;
  proyecto: string;
  linea: string;
  LOAD_NO_LOAD: string;
  Alias: string;
  segundosPorRegistro: string;
}

const AddClient = () => {
  const [step, setStep] = useState<
    "client" | "confirm" | "compressor" | "success"
  >("client");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [clientData, setClientData] = useState<ClientFormData>({
    id_cliente: "",
    numero_cliente: "",
    nombre_cliente: "",
    RFC: "",
    direccion: "",
    champion: "",
    CostokWh: "0.17",
    demoDiario: false,
    demoSemanal: false,
  });

  const [compressorData, setCompressorData] = useState<CompressorFormData>({
    hp: "",
    tipo: "",
    voltaje: "",
    marca: "",
    numero_serie: "",
    anio: "",
    id_cliente: "",
    Amp_Load: "",
    Amp_No_Load: "",
    proyecto: "",
    linea: "",
    LOAD_NO_LOAD: "",
    Alias: "",
    segundosPorRegistro: "30",
  });

  const handleClientChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setClientData({
      ...clientData,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleCompressorChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCompressorData({
      ...compressorData,
      [name]: value,
    });
  };

  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${URL_API}/web/client/add-client`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_cliente: parseInt(clientData.id_cliente),
          numero_cliente: parseInt(clientData.numero_cliente),
          nombre_cliente: clientData.nombre_cliente,
          RFC: clientData.RFC,
          direccion: clientData.direccion || null,
          champion: clientData.champion || null,
          CostokWh: parseFloat(clientData.CostokWh) || 0.17,
          demoDiario: clientData.demoDiario,
          demoSemanal: clientData.demoSemanal,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Error al crear el cliente");
      }

      setSuccess("Cliente creado exitosamente");
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCompressor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${URL_API}/web/compressor/add-compressor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hp: compressorData.hp ? parseInt(compressorData.hp) : null,
          tipo: compressorData.tipo || null,
          voltaje: parseInt(compressorData.voltaje),
          marca: compressorData.marca || null,
          numero_serie: compressorData.numero_serie || null,
          anio: compressorData.anio ? parseInt(compressorData.anio) : null,
          id_cliente: parseInt(clientData.id_cliente),
          Amp_Load: compressorData.Amp_Load
            ? parseInt(compressorData.Amp_Load)
            : null,
          Amp_No_Load: compressorData.Amp_No_Load
            ? parseInt(compressorData.Amp_No_Load)
            : null,
          proyecto: compressorData.proyecto
            ? parseInt(compressorData.proyecto)
            : null,
          linea: compressorData.linea || null,
          LOAD_NO_LOAD: compressorData.LOAD_NO_LOAD
            ? parseFloat(compressorData.LOAD_NO_LOAD)
            : null,
          Alias: compressorData.Alias || null,
          segundosPorRegistro:
            parseInt(compressorData.segundosPorRegistro) || 30,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Error al crear el compresor");
      }

      setSuccess("Compresor agregado exitosamente");
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <BackButton />

      <div className="max-w-2xl mx-auto mt-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Dar de Alta Cliente
        </h1>

        {step === "client" && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleSubmitClient} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Cliente *
                  </label>
                  <input
                    type="number"
                    name="numero_cliente"
                    value={clientData.numero_cliente}
                    onChange={handleClientChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 12345"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    name="nombre_cliente"
                    value={clientData.nombre_cliente}
                    onChange={handleClientChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre de la empresa"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RFC *
                  </label>
                  <input
                    type="text"
                    name="RFC"
                    value={clientData.RFC}
                    onChange={handleClientChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="RFC del cliente"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={clientData.direccion}
                    onChange={handleClientChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dirección del cliente"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsable/Champion
                  </label>
                  <input
                    type="text"
                    name="champion"
                    value={clientData.champion}
                    onChange={handleClientChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre del responsable"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo por kWh
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="CostokWh"
                    value={clientData.CostokWh}
                    onChange={handleClientChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.17"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="demoDiario"
                      checked={clientData.demoDiario}
                      onChange={handleClientChange}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Demo Diario</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="demoSemanal"
                      checked={clientData.demoSemanal}
                      onChange={handleClientChange}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Demo Semanal</span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? "Creando..." : "Crear Cliente"}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: CONFIRMATION */}
        {step === "confirm" && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{success}</h2>
            <p className="text-gray-600 mb-8">
              Cliente: <strong>{clientData.nombre_cliente}</strong>
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              ¿Tiene VTO?
            </h3>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setStep("success")}
                className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
              >
                No
              </button>
              <button
                onClick={() => {
                  setCompressorData({
                    ...compressorData,
                    id_cliente: clientData.id_cliente,
                  });
                  setStep("compressor");
                }}
                className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
              >
                Sí
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: COMPRESSOR FORM */}
        {step === "compressor" && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Agregar Compresor
            </h2>
            <form onSubmit={handleSubmitCompressor} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HP
                  </label>
                  <input
                    type="number"
                    name="hp"
                    value={compressorData.hp}
                    onChange={handleCompressorChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 25"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <select
                    name="tipo"
                    value={compressorData.tipo}
                    onChange={handleCompressorChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccione tipo</option>
                    <option value="Tornillo">Tornillo</option>
                    <option value="Pistón">Pistón</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voltaje *
                  </label>
                  <input
                    type="number"
                    name="voltaje"
                    value={compressorData.voltaje}
                    onChange={handleCompressorChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 440"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marca
                  </label>
                  <input
                    type="text"
                    name="marca"
                    value={compressorData.marca}
                    onChange={handleCompressorChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Atlas Copco"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Serie
                  </label>
                  <input
                    type="text"
                    name="numero_serie"
                    value={compressorData.numero_serie}
                    onChange={handleCompressorChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Número de serie"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año
                  </label>
                  <input
                    type="number"
                    name="anio"
                    value={compressorData.anio}
                    onChange={handleCompressorChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 2022"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amperaje LOAD
                  </label>
                  <input
                    type="number"
                    name="Amp_Load"
                    value={compressorData.Amp_Load}
                    onChange={handleCompressorChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 45"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amperaje NOLOAD
                  </label>
                  <input
                    type="number"
                    name="Amp_No_Load"
                    value={compressorData.Amp_No_Load}
                    onChange={handleCompressorChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proyecto
                  </label>
                  <input
                    type="number"
                    name="proyecto"
                    value={compressorData.proyecto}
                    onChange={handleCompressorChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ID del proyecto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Línea
                  </label>
                  <input
                    type="text"
                    name="linea"
                    value={compressorData.linea}
                    onChange={handleCompressorChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Línea A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LOAD/NO_LOAD
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="LOAD_NO_LOAD"
                    value={compressorData.LOAD_NO_LOAD}
                    onChange={handleCompressorChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 3.75"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alias
                  </label>
                  <input
                    type="text"
                    name="Alias"
                    value={compressorData.Alias}
                    onChange={handleCompressorChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre identificativo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Segundos por Registro
                  </label>
                  <input
                    type="number"
                    name="segundosPorRegistro"
                    value={compressorData.segundosPorRegistro}
                    onChange={handleCompressorChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="30"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep("success")}
                  className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition"
                >
                  Omitir
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {loading ? "Agregando..." : "Agregar Compresor"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === "success" && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              ¡Completado!
            </h2>
            <p className="text-gray-600 mb-8">
              El cliente <strong>{clientData.nombre_cliente}</strong> ha sido
              creado exitosamente.
            </p>

            <button
              onClick={() => {
                setStep("client");
                setClientData({
                  id_cliente: "",
                  numero_cliente: "",
                  nombre_cliente: "",
                  RFC: "",
                  direccion: "",
                  champion: "",
                  CostokWh: "0.17",
                  demoDiario: false,
                  demoSemanal: false,
                });
                setCompressorData({
                  hp: "",
                  tipo: "",
                  voltaje: "",
                  marca: "",
                  numero_serie: "",
                  anio: "",
                  id_cliente: "",
                  Amp_Load: "",
                  Amp_No_Load: "",
                  proyecto: "",
                  linea: "",
                  LOAD_NO_LOAD: "",
                  Alias: "",
                  segundosPorRegistro: "30",
                });
                setError("");
                setSuccess("");
              }}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Crear Nuevo Cliente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddClient;
