"use client";
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import { ReportData } from "@/lib/types";
import Image from "next/image";

// Mock data para desarrollo
const mockReportData: ReportData = {
  folio: "MTY1641",
  fecha: "23/08/2022",
  compania: "GREEN CORRUGATED S.A. DE C.V.",
  atencion: "Ing. Jorge Ezquerro",
  direccion:
    "VIA FERRCARRIL A MATAMOROS F COL. Sin Nombre C.P 88443 Nueva Lablueo",
  telefono: "8152841751",
  email: "CYNTHIA.PAEZ.RODRIGUEZ@RBRNBM.COM",
  tecnico: "IVAN GUILLERMO REYES URBINA",
  ayudantes: ["JOSÉ JOEL MARTÍNEZ ULLOA"],

  tipo: "COMPRESORES",
  modelo: "SGR 4FPM",
  numeroSerie: "P1M2196290",
  amperaje: "SQUARE D",
  voltaje: "440",
  marca: "Ingersoll Rand",

  inicioServicio: "23/08/2022 3:54 p.m",
  finServicio: "23/08/2022 5:23 p.m",
  tipoServicio: "NORMAL",
  tipoOrden: "DIAGNÓSTICO",

  elementos: [
    { nombre: "Nivel de aceite", estado: "correcto" },
    { nombre: "Válvulas solenoides", estado: "correcto" },
    { nombre: "Válvulas de control de aire", estado: "correcto" },
    { nombre: "Válvula check/válvula de aceite", estado: "correcto" },
    { nombre: "Presión(Descarga)", estado: "correcto" },
    { nombre: "Termostato y elementos de aceite", estado: "correcto" },
    { nombre: "Transmisores", estado: "correcto" },
    { nombre: "Filtro de agua", estado: "incorrecto" },
    { nombre: "Filtro de aire", estado: "incorrecto" },
    { nombre: "Empaques de copetes", estado: "correcto" },
    { nombre: "Válvula de Admisión/instalación eléctrica", estado: "correcto" },
    { nombre: "Sello mecánico", estado: "correcto" },
    { nombre: "Panel de radiador", estado: "correcto" },
    { nombre: "Motor principal", estado: "correcto" },
    { nombre: "Indicador de presión/temperatura", estado: "correcto" },
    { nombre: "Válvulas de seguridad", estado: "correcto" },
    { nombre: "Válvula check y/o Válvula Mínima", estado: "correcto" },
    { nombre: "Baleros 1 Admisión", estado: "correcto" },
    { nombre: "Baleros fecha de vencimiento", estado: "correcto" },
    { nombre: "Baleros 1 descarga", estado: "correcto" },
    { nombre: "Filtro de aceite", estado: "incorrecto" },
    { nombre: "Filtro de aceite(Filtro(Fugas)", estado: "incorrecto" },
    { nombre: "Mangueras", estado: "correcto" },
    { nombre: "Líneas de aire(Fugas)", estado: "correcto" },
    { nombre: "Rotores", estado: "correcto" },
    { nombre: "Piloto automático y/o motor", estado: "correcto" },
    { nombre: "Acoplamiento o bandas", estado: "correcto" },
    { nombre: "Flecha de acoplamiento(Motor)", estado: "correcto" },
  ],

  lecturas: {
    presionSeparador: 4,
    presionAire: 6,
    temperaturaOperacion: 194,
    lcP1: 169,
    lcP2: 169,
    lcV1: 105,
    lcV2: 109,
    lcV3: 108,
    voltL1L2: 460,
    voltL2L3: 464,
  },

  condiciones: {
    oralPortal: "N/A",
    notas:
      "Nota: ambiente en centro. Falta de ventilación de aire fresco al área del equipo.",
  },

  condicionesAmbientales: {
    notaAdicional:
      "Nota: ambiente en centro. Falta de ventilación de aire fresco al área del equipo.",
  },

  refacciones: [
    {
      refaccion:
        "Filtro de Aire, Filtro de aceite, candado y sustituto al panel de enfriamiento del equipo y filtro general del equipo",
      cantidad: 1,
    },
  ],

  tiempoLaborado: [
    { dia: "23/08/2022", entrada: "3:54 p.m", salida: "5:23 p.m" },
  ],

  firmas: {
    cliente: "C+e",
    tecnico: "IVN",
  },

  notasFinales: `Se realiza visita para diagnóstico técnica la sistema GREEN CORRUGATED S.A. DE C.V. para diagnóstico a compresor ingersoll Rand de 125 PSI el cual no esta trabajando el, detalle se encuentro en la válvula de carga la cual no estaba permitiendo el abastecimiento de presión ni filtros general del equipo.
  
Para esto comentamos con Ing. Jorge Ezquerro el estado actual del compresor, sin embargo no hace toma de desciciones sin antes pasar autorizacion de estados unidos el cual es el encargado de toma deciciones y autorizaciones.

Filtro de Aire, Filtro de aceites, candado y sustitución al panel de enfriamiento del equipo y filtros general del equipo.

Para continuar con la reparación del equipo en operación requiere autorización.`,
};

const GenerateReportPage = () => {
  const { isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
      return;
    }

    if (isAuthenticated) {
      fetchReportData();
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Descomentar cuando el endpoint esté listo
      // const response = await fetch("/api/maintenance-report", {
      //   method: "GET",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      // });

      // if (!response.ok) {
      //   throw new Error("Error al obtener los datos del reporte");
      // }

      // const data = await response.json();
      // setReportData(data);

      // Usando mock data por ahora
      setTimeout(() => {
        setReportData(mockReportData);
        setLoading(false);
      }, 1000); // Simula un pequeño delay de blue
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error fetching report data:", err);
      setLoading(false);
    }
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
              onClick={fetchReportData}
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
