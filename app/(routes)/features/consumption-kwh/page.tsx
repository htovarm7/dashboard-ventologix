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
import BackButton from "@/components/BackButton";

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

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const PHASE_COLORS = {
  a: { border: "rgba(6, 71, 176, 1)", bg: "rgba(6, 71, 176, 0.1)" },
  b: { border: "rgba(16, 185, 129, 1)", bg: "rgba(16, 185, 129, 0.1)" },
  c: { border: "rgba(239, 68, 68, 1)", bg: "rgba(239, 68, 68, 0.1)" },
};

const mensualChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: "top" as const,
      labels: { font: { size: 12 }, usePointStyle: true, padding: 15 },
    },
    tooltip: {
      mode: "index" as const,
      intersect: false,
      backgroundColor: "rgba(15, 23, 42, 0.9)",
      padding: 12,
      titleFont: { size: 13, weight: "bold" as const },
      bodyFont: { size: 12 },
      callbacks: {
        label: (ctx: { parsed: { y: number }; dataset: { label?: string } }) =>
          ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} kWh`,
      },
    },
    datalabels: {
      anchor: "end" as const,
      align: "end" as const,
      color: "#374151",
      font: { size: 10 },
      formatter: (value: number) => value.toFixed(1),
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: "rgba(0, 0, 0, 0.04)" },
      ticks: { font: { size: 11 } },
    },
    x: {
      grid: { color: "rgba(0, 0, 0, 0.04)" },
      ticks: { font: { size: 10 } },
    },
  },
};

const buildDiarioOptions = (unit: string) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: { font: { size: 12 }, usePointStyle: true, padding: 15 },
    },
    tooltip: {
      mode: "index" as const,
      intersect: false,
      backgroundColor: "rgba(15, 23, 42, 0.9)",
      padding: 10,
      titleFont: { size: 12 },
      bodyFont: { size: 11 },
      callbacks: {
        label: (ctx: { parsed: { y: number }; dataset: { label?: string } }) =>
          ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} ${unit}`,
      },
    },
    datalabels: { display: false },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: "rgba(0, 0, 0, 0.04)" },
      ticks: { font: { size: 11 } },
    },
    x: {
      grid: { color: "rgba(0, 0, 0, 0.04)" },
      ticks: { font: { size: 10 }, maxTicksLimit: 12 },
    },
  },
});

const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600" />
    <p className="text-sm text-gray-400">Cargando datos...</p>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-2">
    <svg className="w-10 h-10 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
    <p className="text-sm text-red-500">{message}</p>
  </div>
);

const getTodayDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const ConsumptionKwH = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const [rol, setRol] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

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
      } catch {
        sessionStorage.removeItem("userData");
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  useEffect(() => {
    if (!isAuthorized) return;
    const fetchMensualData = async () => {
      setLoadingMensual(true);
      setErrorMensual(null);
      try {
        const res = await fetch(`${URL_API}/report/kwh-mensual-por-dia?año=${selectedYear}&mes=${selectedMonth}`);
        if (!res.ok) throw new Error("Error fetching monthly data");
        const result = await res.json();
        setMensualData(result.data || []);
      } catch {
        setErrorMensual("Error al cargar datos mensuales");
      } finally {
        setLoadingMensual(false);
      }
    };
    fetchMensualData();
  }, [isAuthorized, selectedYear, selectedMonth]);

  useEffect(() => {
    if (!isAuthorized) return;
    const fetchDiarioData = async () => {
      setLoadingDiario(true);
      setErrorDiario(null);
      try {
        const res = await fetch(`${URL_API}/report/kwh-diario-fases?fecha=${selectedDate}`);
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Error fetching daily data");
        setDiarioData(result.data || []);
      } catch (e) {
        setErrorDiario(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        setLoadingDiario(false);
      }
    };
    fetchDiarioData();
  }, [isAuthorized, selectedDate]);

  useEffect(() => {
    if (!isAuthorized) return;
    const fetchAmperageData = async () => {
      setLoadingAmperaje(true);
      setErrorAmperaje(null);
      try {
        const res = await fetch(`${URL_API}/report/amperaje-diario-fases?fecha=${selectedDate}`);
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Error fetching amperage data");
        setAmperageData(result.data || []);
      } catch (e) {
        setErrorAmperaje(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        setLoadingAmperaje(false);
      }
    };
    fetchAmperageData();
  }, [isAuthorized, selectedDate]);

  useEffect(() => {
    if (!isAuthorized) return;
    const fetchVoltageData = async () => {
      setLoadingVoltaje(true);
      setErrorVoltaje(null);
      try {
        const res = await fetch(`${URL_API}/report/voltaje-diario-fases?fecha=${selectedDate}`);
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Error fetching voltage data");
        setVoltageData(result.data || []);
      } catch (e) {
        setErrorVoltaje(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        setLoadingVoltaje(false);
      }
    };
    fetchVoltageData();
  }, [isAuthorized, selectedDate]);

  const totalKwhMensual = mensualData.reduce((sum, item) => sum + item.kwh, 0);
  const maxKwhDia = mensualData.length > 0 ? Math.max(...mensualData.map((d) => d.kwh)) : 0;
  const avgKwhDia = mensualData.length > 0 ? totalKwhMensual / mensualData.length : 0;

  const mensualChartData = {
    labels: mensualData.map((item) => {
      const [, , day] = item.fecha.split("-");
      return day;
    }),
    datasets: [
      {
        label: "kWh",
        data: mensualData.map((item) => item.kwh),
        backgroundColor: "rgba(37, 99, 235, 0.8)",
        borderColor: "rgba(37, 99, 235, 1)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const buildTimeLabels = (data: { time: string }[]) =>
    data.map((item) =>
      new Date(item.time).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
    );

  const diarioChartData = {
    labels: buildTimeLabels(diarioData),
    datasets: [
      { label: "Fase A (kW)", data: diarioData.map((d) => d.kWa), borderColor: PHASE_COLORS.a.border, backgroundColor: PHASE_COLORS.a.bg, borderWidth: 1.5, pointRadius: 0, fill: false },
      { label: "Fase B (kW)", data: diarioData.map((d) => d.kWb), borderColor: PHASE_COLORS.b.border, backgroundColor: PHASE_COLORS.b.bg, borderWidth: 1.5, pointRadius: 0, fill: false },
      { label: "Fase C (kW)", data: diarioData.map((d) => d.kWc), borderColor: PHASE_COLORS.c.border, backgroundColor: PHASE_COLORS.c.bg, borderWidth: 1.5, pointRadius: 0, fill: false },
    ],
  };

  const amperajeChartData = {
    labels: buildTimeLabels(amperageData),
    datasets: [
      { label: "Fase A (A)", data: amperageData.map((d) => d.ia), borderColor: PHASE_COLORS.a.border, backgroundColor: PHASE_COLORS.a.bg, borderWidth: 1.5, pointRadius: 0, fill: false },
      { label: "Fase B (A)", data: amperageData.map((d) => d.ib), borderColor: PHASE_COLORS.b.border, backgroundColor: PHASE_COLORS.b.bg, borderWidth: 1.5, pointRadius: 0, fill: false },
      { label: "Fase C (A)", data: amperageData.map((d) => d.ic), borderColor: PHASE_COLORS.c.border, backgroundColor: PHASE_COLORS.c.bg, borderWidth: 1.5, pointRadius: 0, fill: false },
    ],
  };

  const voltajeChartData = {
    labels: buildTimeLabels(voltageData),
    datasets: [
      { label: "Fase A (V)", data: voltageData.map((d) => d.ua), borderColor: PHASE_COLORS.a.border, backgroundColor: PHASE_COLORS.a.bg, borderWidth: 1.5, pointRadius: 0, fill: false },
      { label: "Fase B (V)", data: voltageData.map((d) => d.ub), borderColor: PHASE_COLORS.b.border, backgroundColor: PHASE_COLORS.b.bg, borderWidth: 1.5, pointRadius: 0, fill: false },
      { label: "Fase C (V)", data: voltageData.map((d) => d.uc), borderColor: PHASE_COLORS.c.border, backgroundColor: PHASE_COLORS.c.bg, borderWidth: 1.5, pointRadius: 0, fill: false },
    ],
  };

  if (rol === null) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600 mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Verificando permisos...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <BackButton variant="ghost" className="text-white border-white/40 hover:bg-white/20 hover:border-white/60" />
              <div>
                <h1 className="text-3xl font-bold text-white">Monitoreo Eléctrico</h1>
                <p className="text-blue-100 text-sm mt-0.5">Consumo de energía por fases</p>
              </div>
            </div>
            <Image src="/Ventologix_04.png" alt="Ventologix Logo" width={220} height={110} priority />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-10">

        {/* ── CONSUMO MENSUAL ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Consumo Mensual</h2>
              <p className="text-sm text-gray-400 mt-0.5">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
              </select>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl p-5 text-white shadow">
              <p className="text-xs font-medium text-blue-100 uppercase tracking-wider mb-1">Total del mes</p>
              <p className="text-3xl font-bold">{totalKwhMensual.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-sm text-blue-200 mt-1">kWh</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow border border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Día pico</p>
              <p className="text-3xl font-bold text-gray-800">{maxKwhDia.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-sm text-gray-400 mt-1">kWh</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow border border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Promedio diario</p>
              <p className="text-3xl font-bold text-gray-800">{avgKwhDia.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-sm text-gray-400 mt-1">kWh / día</p>
            </div>
          </div>

          {/* Monthly Chart */}
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-700 mb-5">
              Consumo por día — {MONTHS[selectedMonth - 1]} {selectedYear}
            </h3>
            {loadingMensual ? <Spinner /> : errorMensual ? <ErrorState message={errorMensual} /> : (
              <Bar data={mensualChartData} options={mensualChartOptions} />
            )}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* ── CONSUMO DIARIO ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Consumo Diario</h2>
              <p className="text-sm text-gray-400 mt-0.5">Potencia, corriente y voltaje por fase</p>
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm text-gray-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Potencia */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-6 rounded-full bg-blue-600" />
                <h3 className="text-base font-semibold text-gray-700">Potencia por Fase (kW)</h3>
              </div>
              {loadingDiario ? <Spinner /> : errorDiario ? <ErrorState message={errorDiario} /> : (
                <div style={{ height: 420 }}>
                  <Line data={diarioChartData} options={buildDiarioOptions("kW")} />
                </div>
              )}
            </div>

            {/* Corriente */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-6 rounded-full bg-emerald-500" />
                <h3 className="text-base font-semibold text-gray-700">Corriente por Fase (A)</h3>
              </div>
              {loadingAmperaje ? <Spinner /> : errorAmperaje ? <ErrorState message={errorAmperaje} /> : (
                <div style={{ height: 420 }}>
                  <Line data={amperajeChartData} options={buildDiarioOptions("A")} />
                </div>
              )}
            </div>

            {/* Voltaje */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-6 rounded-full bg-red-400" />
                <h3 className="text-base font-semibold text-gray-700">Voltaje por Fase (V)</h3>
              </div>
              {loadingVoltaje ? <Spinner /> : errorVoltaje ? <ErrorState message={errorVoltaje} /> : (
                <div style={{ height: 420 }}>
                  <Line data={voltajeChartData} options={buildDiarioOptions("V")} />
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ConsumptionKwH;
