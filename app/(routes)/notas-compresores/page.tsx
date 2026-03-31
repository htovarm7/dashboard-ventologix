"use client";

import { useState, useEffect } from "react";
import { URL_API } from "@/lib/global";
import { NotaCompresor } from "@/lib/types";

interface CompressorOption {
  numero_serie: string;
  alias: string;
  nombre_cliente: string;
  numero_cliente: number;
}

export default function NotasCompresoresPage() {
  const [notas, setNotas] = useState<NotaCompresor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [compressorResults, setCompressorResults] = useState<
    CompressorOption[]
  >([]);
  const [showCompressorDropdown, setShowCompressorDropdown] = useState(false);
  const [selectedCompresor, setSelectedCompresor] =
    useState<CompressorOption | null>(null);
  const [nuevaNota, setNuevaNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [filterQuery, setFilterQuery] = useState("");

  const fetchNotas = async () => {
    try {
      const res = await fetch(`${URL_API}/notas-compresores/`);
      const data = await res.json();
      if (data.data) {
        setNotas(data.data);
      }
    } catch (error) {
      console.error("Error al obtener notas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotas();
  }, []);

  const searchCompressors = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setCompressorResults([]);
      setShowCompressorDropdown(false);
      return;
    }
    try {
      const res = await fetch(
        `${URL_API}/compresores/compresor-cliente/${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (data.data) {
        setCompressorResults(data.data);
        setShowCompressorDropdown(true);
      }
    } catch (error) {
      console.error("Error buscando compresores:", error);
    }
  };

  const selectCompresor = (comp: CompressorOption) => {
    setSelectedCompresor(comp);
    setSearchQuery(
      `${comp.alias} - ${comp.numero_serie} (${comp.nombre_cliente})`
    );
    setShowCompressorDropdown(false);
  };

  const handleSaveNota = async () => {
    if (!selectedCompresor || !nuevaNota.trim()) return;

    setSaving(true);
    try {
      const userData = sessionStorage.getItem("userData");
      let creado_por = null;
      if (userData) {
        const parsed = JSON.parse(userData);
        creado_por = parsed.name || parsed.email || null;
      }

      const res = await fetch(`${URL_API}/notas-compresores/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero_serie: selectedCompresor.numero_serie,
          nota: nuevaNota.trim(),
          creado_por,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNuevaNota("");
        setSelectedCompresor(null);
        setSearchQuery("");
        fetchNotas();
      }
    } catch (error) {
      console.error("Error al guardar nota:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNota = async (id: number) => {
    if (!editingText.trim()) return;
    try {
      const res = await fetch(`${URL_API}/notas-compresores/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota: editingText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        setEditingText("");
        fetchNotas();
      }
    } catch (error) {
      console.error("Error al actualizar nota:", error);
    }
  };

  const handleDeleteNota = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta nota?")) return;
    try {
      const res = await fetch(`${URL_API}/notas-compresores/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchNotas();
      }
    } catch (error) {
      console.error("Error al eliminar nota:", error);
    }
  };

  const filteredNotas = notas.filter((n) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      n.numero_serie?.toLowerCase().includes(q) ||
      n.alias_compresor?.toLowerCase().includes(q) ||
      n.nombre_cliente?.toLowerCase().includes(q) ||
      n.nota?.toLowerCase().includes(q)
    );
  });

  // Group notes by compressor
  const groupedNotas = filteredNotas.reduce(
    (acc, nota) => {
      const key = nota.numero_serie;
      if (!acc[key]) {
        acc[key] = {
          numero_serie: nota.numero_serie,
          alias_compresor: nota.alias_compresor,
          nombre_cliente: nota.nombre_cliente,
          numero_cliente: nota.numero_cliente,
          notas: [],
        };
      }
      acc[key].notas.push(nota);
      return acc;
    },
    {} as Record<
      string,
      {
        numero_serie: string;
        alias_compresor: string | null;
        nombre_cliente: string | null;
        numero_cliente: number | null;
        notas: NotaCompresor[];
      }
    >
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Notas de Compresores
        </h1>

        {/* Crear nueva nota */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Agregar Nueva Nota
          </h2>

          {/* Buscar compresor */}
          <div className="relative mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Buscar Compresor
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => searchCompressors(e.target.value)}
              onFocus={() =>
                compressorResults.length > 0 &&
                setShowCompressorDropdown(true)
              }
              placeholder="Buscar por serie, alias o cliente..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {showCompressorDropdown && compressorResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {compressorResults.map((comp, idx) => (
                  <div
                    key={`${comp.numero_serie}-${comp.numero_cliente}-${idx}`}
                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => selectCompresor(comp)}
                  >
                    <p className="font-medium text-gray-800">
                      {comp.alias} -{" "}
                      <span className="text-gray-500">
                        Serie: {comp.numero_serie}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">
                      Cliente: {comp.nombre_cliente} (#{comp.numero_cliente})
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCompresor && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Compresor seleccionado:</span>{" "}
                {selectedCompresor.alias} - Serie:{" "}
                {selectedCompresor.numero_serie} | Cliente:{" "}
                {selectedCompresor.nombre_cliente}
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Nota
            </label>
            <textarea
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              placeholder="Escribe una nota sobre este compresor..."
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <button
            onClick={handleSaveNota}
            disabled={!selectedCompresor || !nuevaNota.trim() || saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : "Guardar Nota"}
          </button>
        </div>

        {/* Filtrar notas */}
        <div className="mb-6">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filtrar notas por serie, alias, cliente o contenido..."
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Lista de notas agrupadas por compresor */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando notas...</p>
          </div>
        ) : Object.keys(groupedNotas).length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500 text-lg">
              No hay notas registradas aún.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.values(groupedNotas).map((group) => (
              <div
                key={group.numero_serie}
                className="bg-white rounded-xl shadow-lg overflow-hidden"
              >
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                  <h3 className="text-white font-bold text-lg">
                    {group.alias_compresor || "Sin alias"} — Serie:{" "}
                    {group.numero_serie}
                  </h3>
                  <p className="text-blue-100 text-sm">
                    Cliente: {group.nombre_cliente || "N/A"}{" "}
                    {group.numero_cliente ? `(#${group.numero_cliente})` : ""}
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {group.notas.map((nota) => (
                    <div
                      key={nota.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      {editingId === nota.id ? (
                        <div>
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none mb-2"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateNota(nota.id)}
                              className="px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditingText("");
                              }}
                              className="px-4 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-800 whitespace-pre-wrap">
                            {nota.nota}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-xs text-gray-400">
                              {nota.creado_por && (
                                <span>Por: {nota.creado_por} | </span>
                              )}
                              {nota.fecha_creacion &&
                                new Date(nota.fecha_creacion).toLocaleString(
                                  "es-MX"
                                )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingId(nota.id);
                                  setEditingText(nota.nota);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteNota(nota.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
