"use client";

import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { URL_API } from "@/lib/global";
import Image from "next/image";

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

interface KwhMensualData {
  fecha: string;
  kwh: number;
}

interface KwhDiarioData {
  time: string;
  kWa: number;
  kWb: number;
  kWc: number;
}

interface AmperajeDiarioData {
  time: string;
  ia: number;
  ib: number;
  ic: number;
}

interface VoltajeDiarioData {
  time: string;
  ua: number;
  ub: number;
  uc: number;
}

const mensualChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        font: {
          size: 12,
        },
        usePointStyle: true,
        padding: 15,
      },
    },
    tooltip: {
      mode: "index" as const,
      intersect: false,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      padding: 12,
      titleFont: {
        size: 14,
      },
      bodyFont: {
        size: 13,
      },
    },
    datalabels: {
      anchor: "end" as const,
      align: "end" as const,
      color: "#000",
      font: {
        size: 12,
      },
      formatter: (value: number) => value.toFixed(2),
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
      },
    },
    x: {
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
      },
    },
  },
};


const diarioChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        font: {
          size: 12,
        },
        usePointStyle: false,
        padding: 15,
      },
    },
    tooltip: {
      enabled: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
      },
    },
    x: {
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
      },
    },
  },
};

const ConsumptionKwH = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const [rol, setRol] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Función para obtener fecha de hoy en formato YYYY-MM-DD considerando zona horaria local
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Estados para datos
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const [mensualData, setMensualData] = useState<KwhMensualData[]>([]);
  const [diarioData, setDiarioData] = useState<KwhDiarioData[]>([]);
  const [amperageData, setAmperageData] = useState<AmperajeDiarioData[]>([]);
  const [voltageData, setVoltageData] = useState<VoltajeDiarioData[]>([]);
  const [loadingMensual, setLoadingMensual] = useState(false);
  const [loadingDiario, setLoadingDiario] = useState(false);
  const [loadingAmperaje, setLoadingAmperaje] = useState(false);
  const [loadingVoltaje, setLoadingVoltaje] = useState(false);
  const [errorMensual, setErrorMensual] = useState<string | null>(null);
  const [errorDiario, setErrorDiario] = useState<string | null>(null);
  const [errorAmperaje, setErrorAmperaje] = useState<string | null>(null);
  const [errorVoltaje, setErrorVoltaje] = useState<string | null>(null);

  useEffect(() => {
    const userData = sessionStorage.getItem("userData");

    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        setRol(parsedData.rol);
        setIsAuthorized(true);
      } catch (error) {
        console.error("Error parsing userData from sessionStorage:", error);
        sessionStorage.removeItem("userData");
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  // Fetch datos mensuales
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchMensualData = async () => {
      setLoadingMensual(true);
      setErrorMensual(null);
      try {
        const response = await fetch(
          `${URL_API}/report/kwh-mensual-por-dia?año=${selectedYear}&mes=${selectedMonth}`
        );
        if (!response.ok) throw new Error("Error fetching monthly data");
        const result = await response.json();
        setMensualData(result.data || []);
      } catch (error) {
        console.error("Error fetching monthly data:", error);
        setErrorMensual("Error al cargar datos mensuales");
      } finally {
        setLoadingMensual(false);
      }
    };

    fetchMensualData();
  }, [isAuthorized, selectedYear, selectedMonth]);

  // Fetch datos diarios
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchDiarioData = async () => {
      setLoadingDiario(true);
      setErrorDiario(null);
      try {
        const response = await fetch(
          `${URL_API}/report/kwh-diario-fases?fecha=${selectedDate}`
        );
        const result = await response.json();

        if (!response.ok)
          throw new Error(result.error || "Error fetching daily data");
        setDiarioData(result.data || []);
      } catch (error) {
        console.error("Error fetching daily data:", error);
        setErrorDiario(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      } finally {
        setLoadingDiario(false);
      }
    };

    fetchDiarioData();
  }, [isAuthorized, selectedDate]);

  // Fetch datos de amperaje
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchAmperageData = async () => {
      setLoadingAmperaje(true);
      setErrorAmperaje(null);
      try {
        const response = await fetch(
          `${URL_API}/report/amperaje-diario-fases?fecha=${selectedDate}`
        );
        const result = await response.json();

        if (!response.ok)
          throw new Error(result.error || "Error fetching amperage data");
        setAmperageData(result.data || []);
      } catch (error) {
        console.error("Error fetching amperage data:", error);
        setErrorAmperaje(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      } finally {
        setLoadingAmperaje(false);
      }
    };

    fetchAmperageData();
  }, [isAuthorized, selectedDate]);

  // Fetch datos de voltaje
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchVoltageData = async () => {
      setLoadingVoltaje(true);
      setErrorVoltaje(null);
      try {
        const response = await fetch(
          `${URL_API}/report/voltaje-diario-fases?fecha=${selectedDate}`
        );
        const result = await response.json();

        if (!response.ok)
          throw new Error(result.error || "Error fetching voltage data");
        setVoltageData(result.data || []);
      } catch (error) {
        console.error("Error fetching voltage data:", error);
        setErrorVoltaje(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      } finally {
        setLoadingVoltaje(false);
      }
    };

    fetchVoltageData();
  }, [isAuthorized, selectedDate]);

  // Calcular total KWH mensual
  const totalKwhMensual = mensualData.reduce((sum, item) => sum + item.kwh, 0);

  // Preparar datos para gráfica mensual
  const mensualChartData = {
    labels: mensualData.map((item) => {
      const [year, month, day] = item.fecha.split("-");
      return `${day}/${month}/${year}`;
    }),
    datasets: [
      {
        label: "kWh",
        data: mensualData.map((item) => item.kwh),
        backgroundColor: "rgba(0, 72, 255, 0.8)",
        borderColor: "rgba(0, 72, 255, 0.8)",
        borderWidth: 1,
      },
    ],
  };

  const diarioChartData = {
    labels: diarioData.map((item) => {
      const time = new Date(item.time);
      return time.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }),
    datasets: [
      {
        label: "Fase A (kW)",
        data: diarioData.map((item) => item.kWa),
        borderColor: "rgba(6, 71, 176, 1)",
        backgroundColor: "rgba(6, 71, 176, 1)",
        borderWidth: 0.8,
        pointRadius: 0,
      },
      {
        label: "Fase B (kW)",
        data: diarioData.map((item) => item.kWb),
        borderColor: "rgba(0, 255, 94, 1)",
        backgroundColor: "rgba(0, 255, 94, 1)",
        borderWidth: 0.8,
        pointRadius: 0,
      },
      {
        label: "Fase C (kW)",
        data: diarioData.map((item) => item.kWc),
        borderColor: "rgba(255, 0, 123, 1)",
        backgroundColor: "rgba(255, 0, 123, 1)",
        borderWidth: 0.8,
        pointRadius: 0,
      },
    ],
  };

  // Función para ir atrás
  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  // Obtener nombre del mes en español
  const getMonthName = (month: number) => {
    const months = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    return months[month - 1];
  };

  if (rol === null) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permisos...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full p-0">
      {/* Header Section - Título y Logo */}
      <div className="bg-gradient-to-br from-blue-700 to-white-900 p-8 relative">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={handleGoBack}
            className="absolute left-8 top-8 flex items-center gap-2 text-white hover:text-white-900 transition-colors duration-200 hover:bg-white/10 px-4 py-3 rounded-lg"
            title="Atrás"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-lg font-medium">Atrás</span>
          </button>

          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-800">
                Monitoreo de Consumo Eléctrico
              </h1>
            </div>
            <div className="flex-1 flex justify-end">
              <Image
                src="/Ventologix_04.png"
                alt="Ventologix Logo"
                width={300}
                height={150}
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* SECCIÓN CONSUMO MENSUAL */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              Consumo Mensual
            </h2>

            {/* Tarjeta Consumo Total Mensual */}
            <div className="bg-gradient-to-br from-blue-700 to-blue-600 rounded-xl shadow-lg p-8 text-white mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-5xl font-bold">
                    {totalKwhMensual.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} kWh
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg opacity-90">
                    Consumo {getMonthName(selectedMonth)}
                  </p>
                </div>
              </div>
            </div>

            {/* Gráfica Mensual */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-gray-800">
                  Consumo Mensual - {getMonthName(selectedMonth)}
                </h3>
                <div className="flex gap-4">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[2024, 2025, 2026].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                      <option key={month} value={month}>
                        {String(month).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loadingMensual ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-gray-500">Cargando datos mensuales...</p>
                </div>
              ) : errorMensual ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-red-500">{errorMensual}</p>
                </div>
              ) : (
                <div className="relative w-full">
                  <Bar data={mensualChartData} options={mensualChartOptions} />
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800">
                Consumo Diario
              </h2>
              <div className="bg-white rounded-lg p-4 shadow">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Grid de 3 Gráficas Diarias */}
            <div className="grid grid-cols-1 gap-8">
              {/* Gráfica de Potencia (kWh) */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                  Potencia por Fase (kW) - Diario
                </h3>

                {loadingDiario ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500">Cargando datos...</p>
                  </div>
                ) : errorDiario ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-red-500">{errorDiario}</p>
                  </div>
                ) : (
                  <div className="relative w-full" style={{ height: "500px" }}>
                    <Line data={diarioChartData} options={diarioChartOptions} />
                  </div>
                )}
              </div>

              {/* Gráfica de Corriente (Amperaje) */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                  Corriente por Fase (A) - Diario
                </h3>

                {loadingAmperaje ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500">Cargando datos...</p>
                  </div>
                ) : errorAmperaje ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-red-500">{errorAmperaje}</p>
                  </div>
                ) : (
                  <div className="relative w-full" style={{ height: "500px" }}>
                    <Line
                      data={{
                        labels: amperageData.map((item) => {
                          const time = new Date(item.time);
                          return time.toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        }),
                        datasets: [
                          {
                            label: "Fase A (A)",
                            data: amperageData.map((item) => item.ia),
                            borderColor: "rgba(6, 71, 176, 1)",
                            backgroundColor: "rgba(6, 71, 176, 1)",
                            borderWidth: 0.8,
                            pointRadius: 0,
                          },
                          {
                            label: "Fase B (A)",
                            data: amperageData.map((item) => item.ib),
                            borderColor: "rgba(0, 255, 94, 1)",
                            backgroundColor: "rgba(0, 255, 94, 1)",
                            borderWidth: 0.8,
                            pointRadius: 0,
                          },
                          {
                            label: "Fase C (A)",
                            data: amperageData.map((item) => item.ic),
                            borderColor: "rgba(255, 0, 123, 1)",
                            backgroundColor: "rgba(255, 0, 123, 1)",
                            borderWidth: 0.8,
                            pointRadius: 0,
                          },
                        ],
                      }}
                      options={diarioChartOptions}
                    />
                  </div>
                )}
              </div>

              {/* Gráfica de Voltaje */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                  Voltaje por Fase (V) - Diario
                </h3>

                {loadingVoltaje ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500">Cargando datos...</p>
                  </div>
                ) : errorVoltaje ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-red-500">{errorVoltaje}</p>
                  </div>
                ) : (
                  <div className="relative w-full" style={{ height: "500px" }}>
                    <Line
                      data={{
                        labels: voltageData.map((item) => {
                          const time = new Date(item.time);
                          return time.toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        }),
                        datasets: [
                          {
                            label: "Fase A (V)",
                            data: voltageData.map((item) => item.ua),
                            borderColor: "rgba(6, 71, 176, 1)",
                            backgroundColor: "rgba(6, 71, 176, 1)",
                            borderWidth: 0.8,
                            pointRadius: 0,
                          },
                          {
                            label: "Fase B (V)",
                            data: voltageData.map((item) => item.ub),
                            borderColor: "rgba(0, 255, 94, 1)",
                            backgroundColor: "rgba(0, 255, 94, 1)",
                            borderWidth: 0.8,
                            pointRadius: 0,
                          },
                          {
                            label: "Fase C (V)",
                            data: voltageData.map((item) => item.uc),
                            borderColor: "rgba(255, 0, 123, 1)",
                            backgroundColor: "rgba(255, 0, 123, 1)",
                            borderWidth: 0.8,
                            pointRadius: 0,
                          },
                        ],
                      }}
                      options={diarioChartOptions}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ConsumptionKwH;
