"use client";
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import { ReportData, MaintenanceReportResponse } from "@/lib/types";
import Image from "next/image";

// Mapeo de los nombres de mantenimiento de la API a elementos del reporte
const MAINTENANCE_MAPPING: Record<string, string> = {
  "Filtro de Aire": "Filtro de aire",
  "Filtro Aceite": "Filtro de aceite",
  "Separador de Aceite": "Separador de aceite",
  "Aceite Sintético": "Nivel de aceite",
  "Kit Válvula de Admisión": "Válvula de Admisión/instalación eléctrica",
  "Kit Válvula de mínima presión": "Válvula check y/o Válvula Mínima",
  "Kit de Válvula Termostática": "Termostato y elementos de aceite",
  "Cople Flexible": "Acoplamiento o bandas",
  "Válvula Solenoide": "Válvulas solenoides",
  "Sensor de Temperatura": "Indicador de presión/temperatura",
  "Transductor de Presión": "Presión(Descarga)",
  "Contactores Eléctricos": "Válvula de Admisión/instalación eléctrica",
  "Análisis baleros, unidad de compresión y motor eléctrico": "Baleros 1 Admisión",
  "Análisis baleros ventilador enfriamiento": "Baleros 1 descarga",
  "Lubricación Baleros Motor Electrico": "Motor principal",
  "Limpieza interna de Radiador": "Panel de radiador",
  "Limpieza externa de Radiador": "Panel de radiador",
};

const GenerateReportPage = () => {
  const { isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numeroSerie, setNumeroSerie] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
      return;
    }

    if (isAuthenticated) {
      // Obtener número de serie del compresor seleccionado
      const compressorData = sessionStorage.getItem("selectedCompressorForReport");
      console.log("Datos del sessionStorage:", compressorData);
      
      if (compressorData) {
        try {
          const parsed = JSON.parse(compressorData);
          console.log("Datos parseados:", parsed);
          const serie = parsed.numero_serie;
          console.log("Número de serie obtenido:", serie);
          
          if (serie) {
            setNumeroSerie(serie);
            fetchReportData(serie);
          } else {
            console.error("No se encontró numero_serie en los datos");
            setError("No se encontró el número de serie del compresor seleccionado");
            setLoading(false);
          }
        } catch (err) {
          console.error("Error parsing compressor data:", err);
          setError("Error al obtener datos del compresor seleccionado");
          setLoading(false);
        }
      } else {
        console.error("No hay selectedCompressorForReport en sessionStorage");
        setError("No se ha seleccionado un compresor. Por favor regresa y selecciona uno.");
        setLoading(false);
      }
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchReportData = async (serie: string) => {
    try {
      setLoading(true);
      setError(null);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(
        `${API_BASE_URL}/web/maintenance/report-data/${serie}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Error al obtener los datos del reporte"
        );
      }

      const data: MaintenanceReportResponse = await response.json();
      
      // Mapear los datos de la API al formato ReportData
      const mappedData = mapApiDataToReportData(data.reporte);
      setReportData(mappedData);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error fetching report data:", err);
      setLoading(false);
    }
  };

  const mapApiDataToReportData = (apiData: any): ReportData => {
    // Generar folio basado en ID y timestamp
    const fecha = apiData.timestamp ? new Date(apiData.timestamp) : new Date();
    const folio = `MTY${apiData.id || "0000"}`;

    // Mapear mantenimientos realizados a elementos
    const elementos: Array<{ nombre: string; estado: "correcto" | "incorrecto" | "noAplica" }> = [
      { nombre: "Nivel de aceite", estado: "noAplica" },
      { nombre: "Válvulas solenoides", estado: "noAplica" },
      { nombre: "Válvulas de control de aire", estado: "noAplica" },
      { nombre: "Válvula check/válvula de aceite", estado: "noAplica" },
      { nombre: "Presión(Descarga)", estado: "noAplica" },
      { nombre: "Termostato y elementos de aceite", estado: "noAplica" },
      { nombre: "Transmisores", estado: "noAplica" },
      { nombre: "Filtro de agua", estado: "noAplica" },
      { nombre: "Filtro de aire", estado: "noAplica" },
      { nombre: "Empaques de copetes", estado: "noAplica" },
      { nombre: "Válvula de Admisión/instalación eléctrica", estado: "noAplica" },
      { nombre: "Sello mecánico", estado: "noAplica" },
      { nombre: "Panel de radiador", estado: "noAplica" },
      { nombre: "Motor principal", estado: "noAplica" },
      { nombre: "Indicador de presión/temperatura", estado: "noAplica" },
      { nombre: "Válvulas de seguridad", estado: "noAplica" },
      { nombre: "Válvula check y/o Válvula Mínima", estado: "noAplica" },
      { nombre: "Baleros 1 Admisión", estado: "noAplica" },
      { nombre: "Baleros fecha de vencimiento", estado: "noAplica" },
      { nombre: "Baleros 1 descarga", estado: "noAplica" },
      { nombre: "Filtro de aceite", estado: "noAplica" },
      { nombre: "Filtro de aceite(Filtro(Fugas)", estado: "noAplica" },
      { nombre: "Mangueras", estado: "noAplica" },
      { nombre: "Líneas de aire(Fugas)", estado: "noAplica" },
      { nombre: "Rotores", estado: "noAplica" },
      { nombre: "Piloto automático y/o motor", estado: "noAplica" },
      { nombre: "Acoplamiento o bandas", estado: "noAplica" },
      { nombre: "Flecha de acoplamiento(Motor)", estado: "noAplica" },
    ];

    // Actualizar elementos basados en los mantenimientos realizados
    if (apiData.mantenimientos && Array.isArray(apiData.mantenimientos)) {
      apiData.mantenimientos.forEach((mant: any) => {
        if (mant.realizado) {
          const mappedName = MAINTENANCE_MAPPING[mant.nombre];
          if (mappedName) {
            const elemento = elementos.find(e => e.nombre === mappedName);
            if (elemento) {
              elemento.estado = "correcto";
            }
          }
        }
      });
    }

    // Extraer refacciones de los comentarios si existen
    const refacciones: { refaccion: string; cantidad: number }[] = [];
    if (apiData.comentarios_generales) {
      // Intentar extraer refacciones del texto
      // Por ahora dejar vacío, se puede implementar parsing más adelante
    }

    return {
      folio,
      fecha: fecha.toLocaleDateString("es-MX"),
      compania: apiData.cliente || "",
      atencion: "Por definir",
      direccion: "Por definir",
      telefono: "Por definir",
      email: apiData.email || "",
      tecnico: apiData.tecnico || "",
      ayudantes: [],

      tipo: apiData.tipo || "COMPRESORES",
      modelo: apiData.compresor || "",
      numeroSerie: apiData.numero_serie || "",
      amperaje: "Por definir",
      voltaje: "Por definir",
      marca: "Por definir",

      inicioServicio: fecha.toLocaleString("es-MX"),
      finServicio: fecha.toLocaleString("es-MX"),
      tipoServicio: "NORMAL",
      tipoOrden: "MANTENIMIENTO",

      elementos,

      lecturas: {
        presionSeparador: 0,
        presionAire: 0,
        temperaturaOperacion: 0,
        lcP1: 0,
        lcP2: 0,
        lcV1: 0,
        lcV2: 0,
        lcV3: 0,
        voltL1L2: 0,
        voltL2L3: 0,
      },

      condiciones: {
        oralPortal: "N/A",
        notas: apiData.comentarios_generales || "",
      },

      condicionesAmbientales: {
        notaAdicional: apiData.comentario_cliente || "",
      },

      refacciones,

      tiempoLaborado: [
        {
          dia: fecha.toLocaleDateString("es-MX"),
          entrada: fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
          salida: fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
        },
      ],

      firmas: {
        cliente: "",
        tecnico: apiData.tecnico || "",
      },

      notasFinales: apiData.comentarios_generales || "",
    };
  };

  const getEstadoIcon = (estado: "correcto" | "incorrecto" | "noAplica") => {
    switch (estado) {
      case "correcto":
        return "✓";
      case "incorrecto":
        return "✗";
      case "noAplica":
        return "/";
      default:
        return "";
    }
  };

  const getEstadoColor = (estado: "correcto" | "incorrecto" | "noAplica") => {
    switch (estado) {
      case "correcto":
        return "text-green-600";
      case "incorrecto":
        return "text-blue-600";
      case "noAplica":
        return "text-gray-400";
      default:
        return "";
    }
  };

  if (isLoading || loading) {
    return <LoadingOverlay isVisible={true} message="Cargando reporte..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <BackButton />
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-blue-800 text-xl font-bold mb-2">Error</h2>
            <p className="text-blue-600">{error}</p>
            <button
              onClick={() => numeroSerie && fetchReportData(numeroSerie)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <BackButton />
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-800">
              No se encontraron datos del reporte
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <BackButton />

      <div className="max-w-7xl mx-auto mt-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                  <Image
                    src="/Ventologix_05.png"
                    alt="Ventologix Logo"
                    width={64}
                    height={64}
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">VENTOLOGIX</h1>
                  <p className="text-sm opacity-90">REPORTE DE SERVICIO A:</p>
                  <p className="text-sm opacity-90">{reportData.compania}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{reportData.folio}</p>
                <p className="text-sm">Folio</p>
              </div>
            </div>
          </div>

          {/* Datos Generales del Servicio */}
          <div className="p-6 border-b">
            <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
              DATOS GENERALES DEL SERVICIO
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Compañía:</p>
                <p className="font-semibold">{reportData.compania}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha:</p>
                <p className="font-semibold">{reportData.fecha}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Atención:</p>
                <p className="font-semibold">{reportData.atencion}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email:</p>
                <p className="font-semibold">{reportData.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teléfono:</p>
                <p className="font-semibold">{reportData.telefono}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dirección:</p>
                <p className="font-semibold">{reportData.direccion}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Técnico:</p>
                <p className="font-semibold">{reportData.tecnico}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ayudantes:</p>
                <p className="font-semibold">
                  {reportData.ayudantes.join(", ")}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 border-b">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-white bg-blue-800 px-3 py-1 rounded font-bold mb-3 text-sm">
                  DATOS DEL COMPRESOR
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-semibold">{reportData.tipo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Serie:</span>
                    <span className="font-semibold">
                      {reportData.numeroSerie}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Voltaje:</span>
                    <span className="font-semibold">{reportData.voltaje}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Marca:</span>
                    <span className="font-semibold">{reportData.marca}</span>
                  </div>
                </div>
              </div>

              {/* Datos del Reporte */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-white bg-blue-800 px-3 py-1 rounded font-bold mb-3 text-sm">
                  DATOS DEL REPORTE
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Inicio:</span>
                    <span className="font-semibold">
                      {reportData.inicioServicio}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fin:</span>
                    <span className="font-semibold">
                      {reportData.finServicio}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo Servicio:</span>
                    <span className="font-semibold">
                      {reportData.tipoServicio}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo Orden:</span>
                    <span className="font-semibold">
                      {reportData.tipoOrden}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Funcionamiento de los Elementos */}
          <div className="p-6 border-b">
            <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
              FUNCIONAMIENTO DE LOS ELEMENTOS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.elementos.map((elemento, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                >
                  <span className="text-sm">{elemento.nombre}</span>
                  <span
                    className={`text-2xl font-bold ${getEstadoColor(
                      elemento.estado
                    )}`}
                  >
                    {getEstadoIcon(elemento.estado)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-green-600 text-xl font-bold">✓</span>
                <span>Correcto</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 text-xl font-bold">✗</span>
                <span>Incorrecto</span>
              </div>
            </div>
          </div>

          {/* Refacciones */}
          {reportData.refacciones && reportData.refacciones.length > 0 && (
            <div className="p-6 border-b">
              <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                REFACCIONES
              </h2>
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-3 border">REFACCIÓN</th>
                    <th className="text-center p-3 border w-32">CANTIDAD</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.refacciones.map((ref, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-3 border">{ref.refaccion}</td>
                      <td className="p-3 border text-center">{ref.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tiempo Laborado */}
          {reportData.tiempoLaborado &&
            reportData.tiempoLaborado.length > 0 && (
              <div className="p-6 border-b">
                <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                  TIEMPO LABORADO
                </h2>
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-center p-3 border">DÍA</th>
                      <th className="text-center p-3 border">ENTRADA</th>
                      <th className="text-center p-3 border">SALIDA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.tiempoLaborado.map((tiempo, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-3 border text-center">{tiempo.dia}</td>
                        <td className="p-3 border text-center">
                          {tiempo.entrada}
                        </td>
                        <td className="p-3 border text-center">
                          {tiempo.salida}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          {/* Notas Finales */}
          {reportData.notasFinales && (
            <div className="p-6 border-b">
              <h2 className="text-white bg-blue-800 px-4 py-2 rounded font-bold mb-4">
                NOTAS
              </h2>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm whitespace-pre-wrap">
                  {reportData.notasFinales}
                </p>
              </div>
            </div>
          )}

          {/* Firmas */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-center font-bold mb-4 bg-blue-800 text-white py-2 rounded">
                  FIRMA CLIENTE
                </h3>
                <div className="border-2 border-gray-300 rounded h-40 flex items-center justify-center bg-gray-50">
                  <p className="text-gray-400 italic">
                    {reportData.firmas.cliente}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-center font-bold mb-4 bg-blue-800 text-white py-2 rounded">
                  FIRMA TÉCNICO
                </h3>
                <div className="border-2 border-gray-300 rounded h-40 flex items-center justify-center bg-gray-50">
                  <p className="text-gray-400 italic">
                    {reportData.firmas.tecnico}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón de Impresión */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-blue-800 text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors shadow-lg"
          >
            Imprimir Reporte
          </button>
        </div>
      </div>

      {/* Estilos para impresión */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GenerateReportPage;
