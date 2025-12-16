"use client";

import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
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
import { URL_API } from "@/lib/global";

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
  Filler
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

const chartOptions = {
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
  const [deviceId, setDeviceId] = useState<number | null>(null);

  // Estados para datos
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [mensualData, setMensualData] = useState<KwhMensualData[]>([]);
  const [diarioData, setDiarioData] = useState<KwhDiarioData[]>([]);
  const [loadingMensual, setLoadingMensual] = useState(false);
  const [loadingDiario, setLoadingDiario] = useState(false);
  const [errorMensual, setErrorMensual] = useState<string | null>(null);
  const [errorDiario, setErrorDiario] = useState<string | null>(null);

  useEffect(() => {
    const userData = sessionStorage.getItem("userData");

    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        console.log("userData:", parsedData);
        setRol(parsedData.rol);
        setDeviceId(parsedData.numero_cliente);
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
    if (!isAuthorized || !deviceId) return;

    const fetchDiarioData = async () => {
      setLoadingDiario(true);
      setErrorDiario(null);
      try {
        const response = await fetch(
          `${URL_API}/report/kwh-diario-fases?device_id=${deviceId}&fecha=${selectedDate}`
        );
        if (!response.ok) throw new Error("Error fetching daily data");
        const result = await response.json();
        setDiarioData(result.data || []);
      } catch (error) {
        console.error("Error fetching daily data:", error);
        setErrorDiario("Error al cargar datos diarios");
      } finally {
        setLoadingDiario(false);
      }
    };

    fetchDiarioData();
  }, [isAuthorized, deviceId, selectedDate]);

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
        backgroundColor: "rgba(147, 51, 234, 0.8)",
        borderColor: "rgb(147, 51, 234)",
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
        borderColor: "rgb(239, 68, 68)",
        borderWidth: 0.8,
        pointRadius: 0,
      },
      {
        label: "Fase B (kW)",
        data: diarioData.map((item) => item.kWb),
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 0.8,
        pointRadius: 0,
      },
      {
        label: "Fase C (kW)",
        data: diarioData.map((item) => item.kWc),
        borderColor: "rgb(34, 197, 94)",
        borderWidth: 0.8,
        pointRadius: 0,
      },
    ],
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
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <BackButton />

      <div className="max-w-7xl mx-auto mt-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Monitoreo de Consumo Eléctrico
          </h1>
        </div>

        {/* Tarjeta Consumo Total Mensual */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg p-8 text-white transform transition hover:scale-105 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold">Consumo Total Mensual</h3>
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm opacity-90 mb-2">
              {selectedYear}-{String(selectedMonth).padStart(2, "0")}
            </p>
            <p className="text-5xl font-bold">
              {totalKwhMensual.toFixed(2)} kWh
            </p>
          </div>
        </div>

        {/* Gráfica Mensual */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Consumo Mensual - {selectedYear}-
              {String(selectedMonth).padStart(2, "0")}
            </h2>
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
            <div className="relative w-full h-full">
              <Bar data={mensualChartData} options={chartOptions} />
            </div>
          )}
        </div>

        {/* Gráfica Diaria */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Potencia por Fase - {selectedDate}
            </h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loadingDiario ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">Cargando datos diarios...</p>
            </div>
          ) : errorDiario ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-red-500">{errorDiario}</p>
            </div>
          ) : (
            <div className="relative w-full" style={{ height: "700px" }}>
              <Line data={diarioChartData} options={diarioChartOptions} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default ConsumptionKwH;
