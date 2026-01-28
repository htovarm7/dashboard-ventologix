/*
 * @file page.tsx
 * @date 23/04/2025
 * @author Hector Tovar
 *
 * @description
 * This file implements the daily graphs, including a Line Chart and a Gauge Chart using both Chart.js and ECharts.
 *
 * @version 1.0
 *
 * http://localhost:3002/reportesS?id_cliente=13&linea=A
 */

"use client";

import React, { useCallback, useEffect, useState, Suspense } from "react";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "react-datepicker/dist/react-datepicker.css";
import { useSearchParams, useRouter } from "next/navigation";
import annotationPlugin from "chartjs-plugin-annotation";
import Image from "next/image";
import VentoCom from "@/components/vento_com";
import {
  getColorCiclos,
  getColorClass,
  getColorHp,
  getAnualValue,
} from "@/lib/reportsFunctions";

import LoadingOverlay from "@/components/LoadingOverlay";
import BackButton from "@/components/BackButton";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Libraries for charts
import {
  Chart as ChartJS,
  ArcElement,
  LineController,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from "chart.js";

// ECharts for the gauge chart
import ReactECharts from "echarts-for-react";

import { Pie } from "react-chartjs-2";

// Register the necessary components for Chart.js
ChartJS.register(
  ArcElement,
  LineController,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  annotationPlugin,
  ChartDataLabels,
);

import {
  chartData,
  consumoData,
  SummaryData,
  Client,
  compressorData,
} from "@/lib/types";
import { URL_API } from "@/lib/global";
import { useAuthCheck } from "@/hooks/useAuthCheck";

import PrintPageButton from "@/components/printPageButton";

function MainContent() {
  // Constant Declarations

  const router = useRouter();
  const { isAuthorized } = useAuthCheck();
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(
    null,
  );
  const [chartData, setChartData] = useState<chartData>([0, 0, 0]);
  const [consumoData, setConsumoData] = useState<consumoData>({
    turno1: new Array(7).fill(0),
    turno2: new Array(7).fill(0),
    turno3: new Array(7).fill(0),
  });

  const [clientData, setClientData] = useState<Client | null>(null);
  const [userClientNumber, setUserClientNumber] = useState<number | null>(null);

  const [compressorData, setCompresorData] = useState<compressorData | null>(
    null,
  );

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Obtener número de cliente del usuario logueado
  useEffect(() => {
    const userData = sessionStorage.getItem("userData");
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        setUserClientNumber(parsedData.numero_cliente);
      } catch (error) {
        console.error("Error parsing userData:", error);
      }
    }
  }, []);

  const hpEquivalente =
    ((summaryData?.semana_actual?.promedio_hp_equivalente ?? 0) /
      (compressorData?.hp ?? 1)) *
      100 || 0;

  const searchParams = useSearchParams();

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const compresorData = sessionStorage.getItem("selectedCompresor");
    if (compresorData) {
      const data = JSON.parse(compresorData);
      data.date = newDate;
      sessionStorage.setItem("selectedCompresor", JSON.stringify(data));
    }
    // Refresh la página después de cambiar la fecha
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const handleWeekChange = (weekNumber: number) => {
    setSelectedWeekNumber(weekNumber);
    const compresorData = sessionStorage.getItem("selectedCompresor");
    if (compresorData) {
      const data = JSON.parse(compresorData);
      data.weekNumber = weekNumber;
      sessionStorage.setItem("selectedCompresor", JSON.stringify(data));
    }

    // Calculate the date for the given week number
    const currentYear = new Date().getFullYear();
    const jan4 = new Date(currentYear, 0, 4);
    const daysToMonday = (jan4.getDay() + 6) % 7;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - daysToMonday);
    const mondayOfWeek = new Date(firstMonday);
    mondayOfWeek.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

    const newDate = mondayOfWeek.toISOString().split("T")[0];
    setSelectedDate(newDate);

    // Refresh la página después de cambiar la semana
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const fetchData = useCallback(
    async (id: string, linea: string, date: string) => {
      setIsLoading(true);
      try {
        const formattedDate = new Date(date).toISOString().split("T")[0];

        const [pieRes, shiftRes, clientRes, compressorRes, summaryRes] =
          await Promise.all([
            (async () => {
              const res = await fetch(
                `${URL_API}/report/dateWeek/pie-data-proc?id_cliente=${id}&linea=${linea}&fecha=${formattedDate}`,
                {
                  headers: {
                    accept: "application/json",
                    "x-internal-api-key":
                      process.env.NEXT_PUBLIC_API_SECRET || "",
                  },
                },
              );
              if (!res.ok) {
                console.error(
                  `Error en pie-data-proc: ${res.status} ${res.statusText}`,
                );
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            })(),
            (async () => {
              const res = await fetch(
                `${URL_API}/report/dateWeek/shifts?id_cliente=${id}&linea=${linea}&fecha=${formattedDate}`,
                {
                  headers: {
                    accept: "application/json",
                    "x-internal-api-key":
                      process.env.NEXT_PUBLIC_API_SECRET || "",
                  },
                },
              );
              if (!res.ok) {
                console.error(
                  `Error en shifts: ${res.status} ${res.statusText}`,
                );
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            })(),
            (async () => {
              const res = await fetch(
                `${URL_API}/report/client-data?id_cliente=${id}`,
                {
                  headers: {
                    accept: "application/json",
                    "x-internal-api-key":
                      process.env.NEXT_PUBLIC_API_SECRET || "",
                  },
                },
              );
              if (!res.ok) {
                console.error(
                  `Error en client-data: ${res.status} ${res.statusText}`,
                );
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            })(),
            (async () => {
              const res = await fetch(
                `${URL_API}/report/compressor-data?id_cliente=${id}&linea=${linea}`,
                {
                  headers: {
                    accept: "application/json",
                    "x-internal-api-key":
                      process.env.NEXT_PUBLIC_API_SECRET || "",
                  },
                },
              );
              if (!res.ok) {
                console.error(
                  `Error en compressor-data: ${res.status} ${res.statusText}`,
                );
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            })(),
            (async () => {
              const res = await fetch(
                `${URL_API}/report/dateWeek/summary-general?id_cliente=${id}&linea=${linea}&fecha=${formattedDate}`,
                {
                  headers: {
                    accept: "application/json",
                    "x-internal-api-key":
                      process.env.NEXT_PUBLIC_API_SECRET || "",
                  },
                },
              );
              if (!res.ok) {
                console.error(
                  `Error en summary-general: ${res.status} ${res.statusText}`,
                );
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            })(),
          ]);

        if (!clientRes || !clientRes.data || !Array.isArray(clientRes.data)) {
          console.error("Error: Datos de cliente inválidos o inexistentes");
          window.status = "data-error";
          return;
        }

        if (
          !compressorRes ||
          !compressorRes.data ||
          !Array.isArray(compressorRes.data)
        ) {
          console.error("Error: Datos de compresor inválidos o inexistentes");
          window.status = "data-error";
          return;
        }

        if (!pieRes || !pieRes.data) {
          console.error(
            "Error: Datos de gráfica circular inválidos o inexistentes",
          );
          window.status = "data-error";
          return;
        }

        if (!shiftRes || !shiftRes.data || !Array.isArray(shiftRes.data)) {
          console.error("Error: Datos de turnos inválidos o inexistentes");
          window.status = "data-error";
          return;
        }

        if (!summaryRes) {
          console.error("Error: Datos de resumen inválidos o inexistentes");
          window.status = "data-error";
          return;
        }

        const turno1 = new Array(7).fill(0);
        const turno2 = new Array(7).fill(0);
        const turno3 = new Array(7).fill(0);

        shiftRes.data.forEach(
          (item: { fecha: string; Turno: number; kwhTurno: number }) => {
            const fecha = new Date(item.fecha);
            const dia = fecha.getDay();
            const diaSemana = 6 - dia;

            switch (item.Turno) {
              case 1:
                turno1[diaSemana] += item.kwhTurno;
                break;
              case 2:
                turno2[diaSemana] += item.kwhTurno;
                break;
              case 3:
                turno3[diaSemana] += item.kwhTurno;
                break;
            }
          },
        );

        setConsumoData({ turno1, turno2, turno3 });

        if (clientRes.data.length > 0) setClientData(clientRes.data[0]);
        if (compressorRes.data.length > 0)
          setCompresorData(compressorRes.data[0]);

        if (summaryRes) {
          setSummaryData(summaryRes);
        }

        const { LOAD, NOLOAD, OFF } = pieRes.data;

        setChartData([LOAD, NOLOAD, OFF]);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        window.status = "data-error";
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (isAuthorized) {
      const savedCompresor = sessionStorage.getItem("selectedCompresor");
      let id_cliente, linea, date, weekNumber;

      if (savedCompresor) {
        const compresorData = JSON.parse(savedCompresor);
        id_cliente = compresorData.id_cliente.toString();
        linea = compresorData.linea;
        date = compresorData.date;
        weekNumber = compresorData.weekNumber;
        setSelectedDate(date || "");

        if (weekNumber) {
          setSelectedWeekNumber(weekNumber);
        }
      } else {
        id_cliente = searchParams.get("id_cliente");
        linea = searchParams.get("linea") || "A";
        date =
          searchParams.get("date") || new Date().toISOString().split("T")[0];
        weekNumber = searchParams.get("weekNumber");
        setSelectedDate(date);
        if (weekNumber) {
          setSelectedWeekNumber(parseInt(weekNumber));
        }
      }

      if (id_cliente && date) {
        fetchData(id_cliente, linea, date);
      } else {
        console.error("No se encontró información del compresor o fecha");
        router.push("/home");
      }
    }
  }, [isAuthorized, searchParams, fetchData, router]);

  const diasSemana = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];

  const kwhHorasPorDia = {
    categorias: diasSemana,
    kwhData: summaryData?.detalle_semana_actual?.map((d) => d.kWh) ?? [],
    horasData:
      summaryData?.detalle_semana_actual?.map((d) => d.horas_trabajadas) ?? [],
  };

  const ciclosPorDia = {
    categorias: diasSemana,
    kwhData:
      summaryData?.detalle_semana_actual?.map(
        (d) => d.promedio_ciclos_por_hora,
      ) ?? [],
  };

  const hpEquivalentePorDia = {
    categorias: diasSemana,
    kwhData:
      summaryData?.detalle_semana_actual?.map((d) => d.hp_equivalente) ?? [],
  };

  // Gauge Charts Options
  const ciclosPromOptions = {
    tooltip: { show: true },
    series: [
      {
        type: "gauge",
        min: 0,
        max: 30,
        startAngle: 200,
        endAngle: -20,
        animation: false,
        axisLine: {
          lineStyle: {
            width: 28,
            color: [
              [8 / 30, "#418FDE"],
              [12 / 30, "green"],
              [15 / 30, "yellow"],
              [1, "red"],
            ],
          },
        },
        axisLabel: {
          show: true,
          color: "black",
          distance: -40,
          formatter: function (value: number) {
            if (value === 0) return "0";
            if (value === 30) return "30+";
            return "";
          },
          fontSize: 16,
          fontWeight: "bold",
        },
        axisTick: { show: false },
        splitLine: { show: false },
        pointer: { itemStyle: { color: "black" }, length: "100%", width: 3 },
        detail: {
          formatter: () =>
            `${
              summaryData?.semana_actual?.promedio_ciclos_por_hora !== undefined
                ? summaryData?.semana_actual?.promedio_ciclos_por_hora.toFixed(
                    1,
                  )
                : "0.0"
            }`,
          fontSize: 18,
          offsetCenter: [0, "30%"],
          color:
            (summaryData?.semana_actual?.promedio_ciclos_por_hora ?? 0) <= 8
              ? "#418FDE"
              : (summaryData?.semana_actual?.promedio_ciclos_por_hora ?? 0) <=
                  12
                ? "green"
                : (summaryData?.semana_actual?.promedio_ciclos_por_hora ?? 0) <=
                    15
                  ? "yellow"
                  : "red",
        },
        data: [
          {
            value:
              summaryData?.semana_actual?.promedio_ciclos_por_hora !== undefined
                ? summaryData?.semana_actual?.promedio_ciclos_por_hora
                : 0,
          },
        ],
      },
    ],
  };

  const hpOptions = {
    tooltip: { show: true },
    series: [
      {
        type: "gauge",
        min: 30,
        max: 120,
        startAngle: 200,
        endAngle: -20,
        animation: false,
        axisLine: {
          lineStyle: {
            width: 30,
            color: [
              [0.377, "red"],
              [0.544, "yellow"],
              [0.689, "green"],
              [0.766, "#418FDE"],
              [0.77, "yellow"],
              [0.785, "black"],
              [0.8, "yellow"],
              [0.889, "yellow"],
              [1, "red"],
            ],
          },
        },
        axisLabel: {
          show: true,
          color: "black",
          distance: -40,
          formatter: function (value: number) {
            const rounded = Math.round(value);
            if (rounded === 30) return "30%";
            if (rounded === 100) return "100%";
            if (rounded === 120) return "120%";
            return "";
          },
          fontSize: 16,
          fontWeight: "bold",
        },
        axisTick: { show: false },
        splitLine: { show: false },
        pointer: { itemStyle: { color: "black" }, length: "100%", width: 3 },
        detail: {
          formatter: () =>
            `${hpEquivalente !== undefined ? hpEquivalente.toFixed(0) : 0}%`,
          fontSize: 18,
          offsetCenter: [0, "30%"],
          color:
            (hpEquivalente ?? 0) > 110
              ? "red"
              : (hpEquivalente ?? 0) > 99
                ? "black"
                : (hpEquivalente ?? 0) > 92
                  ? "#418FDE"
                  : (hpEquivalente ?? 0) > 79
                    ? "green"
                    : (hpEquivalente ?? 0) > 64
                      ? "yellow"
                      : "red",
        },
        data: [{ value: hpEquivalente.toFixed(0) ?? 0 }],
      },
    ],
  };

  const costokWhOptions = {
    tooltip: { show: true },
    series: [
      {
        type: "gauge",
        min: 0.1,
        max: 0.34,
        startAngle: 200,
        endAngle: -20,
        animation: false,
        axisLine: {
          lineStyle: {
            width: 30,
            color: [
              [0.333, "green"],
              [0.5, "yellow"],
              [1, "red"],
            ],
          },
        },
        axisLabel: {
          show: true,
          color: "black",
          distance: -40,
          formatter: function (value: number) {
            if (value === 0.1) return "$0.01";
            if (value === 0.34) return "$0.34";
            return "";
          },
          fontSize: 16,
          fontWeight: "bold",
        },
        axisTick: { show: false },
        splitLine: { show: false },
        pointer: { itemStyle: { color: "black" }, length: "100%", width: 3 },
        detail: {
          formatter: () => `$${clientData?.CostokWh || "0.00"}`,
          fontSize: 18,
          offsetCenter: [0, "30%"],
          color:
            (clientData?.CostokWh ?? 0) <= 0.18
              ? "green"
              : (clientData?.CostokWh ?? 0) <= 0.22
                ? "yellow"
                : "red",
        },
        data: [{ value: clientData?.CostokWh ?? 0 }],
      },
    ],
  };

  // Line Chart for the daily consumption
  const consumoOptions = {
    title: {
      text: "kWh usados por día durante la semana",
      left: "center",
      top: 0,
      textStyle: {
        fontSize: 18,
        fontWeight: "bold",
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },
    legend: {
      top: 30,
      data: ["Turno 1", "Turno 2", "Turno 3"],
    },
    grid: {
      left: "10%",
      right: "5%",
      bottom: 60,
      containLabel: true,
    },
    xAxis: {
      type: "value",
      name: "kWh Utilizada",
      nameLocation: "middle",
      nameGap: 40,
      nameTextStyle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
      },
      splitLine: {
        show: true,
      },
    },
    yAxis: {
      type: "category",
      data: [
        "Domingo",
        "Sabado",
        "Viernes",
        "Jueves",
        "Miercoles",
        "Martes",
        "Lunes",
      ],
      axisTick: {
        alignWithLabel: true,
      },
      axisLabel: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
      },
    },
    series: [
      {
        name: "Turno 1",
        type: "bar",
        stack: "total",
        emphasis: {
          focus: "series",
        },
        itemStyle: {
          color: "#4db6ac",
        },
        data: consumoData.turno1,
      },
      {
        name: "Turno 2",
        type: "bar",
        stack: "total",
        emphasis: {
          focus: "series",
        },
        itemStyle: {
          color: "#0074cc",
        },
        data: consumoData.turno2,
      },
      {
        name: "Turno 3",
        type: "bar",
        stack: "total",
        emphasis: {
          focus: "series",
        },
        itemStyle: {
          color: "#001f54",
        },
        data: consumoData.turno3,
      },
    ],
  };

  // Bar Chart Options for kWh diarios, ciclos promedio, and hp equivalente

  const kwhHorasOption = {
    xAxis: {
      type: "category",
      data: kwhHorasPorDia.categorias,
    },
    yAxis: [
      {
        type: "value",
        name: "kWh",
        nameLocation: "middle",
        nameGap: 40,
        nameTextStyle: {
          fontSize: 16,
          fontWeight: "bold",
          color: "#333",
        },
      },
      {
        type: "value",
        name: "Horas",
        nameLocation: "middle",
        nameGap: 40,
        nameTextStyle: {
          fontSize: 16,
          fontWeight: "bold",
          color: "#333",
        },
      },
    ],
    legend: {
      show: true,
      data: ["kWh", "Horas Trabajadas"],
      top: 10,
      textStyle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
      },
    },
    series: [
      {
        name: "kWh",
        type: "bar",
        data: kwhHorasPorDia.kwhData,
        barGap: 0,
        itemStyle: {
          color: "#00205b",
        },
        label: {
          show: true,
          position: "top",
          formatter: "{c}",
        },
      },
      {
        name: "Horas Trabajadas",
        type: "line",
        yAxisIndex: 1,
        data: kwhHorasPorDia.horasData,
        itemStyle: {
          color: "#59a14f",
        },
        label: {
          show: false,
          gap: 10,
          position: "top",
          formatter: "{c}",
        },
      },
    ],
  };

  const ciclosPromedioOption = {
    xAxis: {
      type: "category",
      data: ciclosPorDia.categorias,
    },
    yAxis: {
      type: "value",
      name: "Ciclos por Día",
      nameLocation: "middle",
      nameGap: 40,
      nameTextStyle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
      },
    },
    legend: {
      show: true,
      data: ["Ciclos promedio por día"],
      top: 30,
      textStyle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
      },
    },
    series: [
      {
        name: "Ciclos promedio por día",
        data: ciclosPorDia.kwhData,
        type: "bar",
        itemStyle: {
          color: "#1e67b2",
        },
        label: {
          show: true,
          position: "top",
          formatter: "{c}",
        },
        markLine: {
          symbol: "none",
          lineStyle: {
            type: "solid",
            width: 2,
          },
          data: [
            {
              yAxis: 8,
              lineStyle: { color: "#418FDE", width: 2, type: "solid" },
              name: "Bajo",
            },
            {
              yAxis: 12,
              lineStyle: { color: "green", width: 2, type: "solid" },
              name: "Óptimo",
            },
            {
              yAxis: 15,
              lineStyle: { color: "yellow", width: 2, type: "solid" },
              name: "Alto",
            },
          ],
        },
      },
    ],
  };

  const hpEquivalenteOption = {
    xAxis: {
      type: "category",
      data: hpEquivalentePorDia.categorias,
    },
    yAxis: {
      type: "value",
      name: "HP Equivalente",
      nameLocation: "middle",
      nameGap: 40,
      nameTextStyle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
      },
      max: (compressorData?.hp ?? 0) * 1.2,
    },
    legend: {
      show: true,
      data: ["HP Equivalente"],
      top: 10,
      textStyle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
      },
    },
    series: [
      {
        data: hpEquivalentePorDia.kwhData,
        type: "bar",
        itemStyle: {
          color: "#59aeb2",
        },
        label: {
          show: true,
          position: "top",
          formatter: "{c}",
        },
        ...(compressorData?.hp
          ? {
              markLine: {
                symbol: "none",
                data: [
                  {
                    yAxis: (compressorData?.hp ?? 0) * 0.64,
                    label: {
                      formatter: "Malo",
                      color: "red",
                      fontWeight: "bold",
                    },
                    lineStyle: {
                      color: "red",
                      type: "solid",
                      width: 2,
                    },
                  },
                  {
                    yAxis: (compressorData?.hp ?? 0) * 0.79,
                    label: {
                      formatter: "Regular",
                      color: "yellow",
                      fontWeight: "bold",
                    },
                    lineStyle: {
                      color: "yellow",
                      type: "solid",
                      width: 2,
                    },
                  },
                  {
                    yAxis: (compressorData?.hp ?? 0) * 0.92,
                    label: {
                      formatter: "Óptimo",
                      color: "green",
                      fontWeight: "bold",
                    },
                    lineStyle: {
                      color: "green",
                      type: "solid",
                      width: 2,
                    },
                  },
                  {
                    yAxis: compressorData?.hp,
                    label: {
                      formatter: "HP Instalado",
                      color: "black",
                      fontWeight: "bold",
                    },
                    lineStyle: {
                      color: "black",
                      type: "solid",
                      width: 2,
                    },
                  },
                ],
              },
            }
          : {}),
      },
    ],
  };

  // Pie Chart
  const dataPie = {
    labels: ["LOAD", "NO LOAD", "OFF"],
    datasets: [
      {
        label: "Estados del Compresor",
        data: chartData,
        backgroundColor: [
          "rgb(30,103,178)",
          "rgb(65,143,222)",
          "rgb(136,219,223)",
        ],
      },
    ],
  };

  const pieOptions = {
    layout: {
      padding: 0,
    },
    responsive: true,
    maintainAspectRatio: false,
    cutout: "0%",
    plugins: {
      datalabels: {
        color: "black",
        font: {
          weight: "bold" as const,
          size: 20,
        },
        formatter: (value: number) => {
          return value + "%";
        },
      },
      legend: {
        display: true,
        position: "bottom" as const,
      },
    },
    animation: {
      duration: 0,
    },
  };

  useEffect(() => {
    if (
      summaryData &&
      summaryData?.promedio_semanas_anteriores?.total_kWh_anteriores > 0
    ) {
      // Espera unos segundos por seguridad (opcional)
      setTimeout(() => {
        window.status = "pdf-ready";
      }, 2000); // 2 segundos
    }
  }, [summaryData]);

  const getISOWeekNumber = (date: Date): number => {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  // Función para obtener las fechas de una semana específica por número de semana
  const getWeekDates = (weekNumber: number, year: number) => {
    // Crear fecha del 4 de enero del año (siempre está en la primera semana ISO)
    const jan4 = new Date(year, 0, 4);

    // Encontrar el lunes de la primera semana ISO
    const daysToMonday = (jan4.getDay() + 6) % 7;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - daysToMonday);

    // Calcular el lunes de la semana deseada
    const mondayOfWeek = new Date(firstMonday);
    mondayOfWeek.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

    // Calcular el domingo de la semana
    const sundayOfWeek = new Date(mondayOfWeek);
    sundayOfWeek.setDate(mondayOfWeek.getDate() + 6);

    return { monday: mondayOfWeek, sunday: sundayOfWeek };
  };

  let lastMonday: Date, lastSunday: Date, semanaNumero: number;

  if (selectedWeekNumber) {
    const currentYear = new Date().getFullYear();
    const weekDates = getWeekDates(selectedWeekNumber, currentYear);
    lastMonday = weekDates.monday;
    lastSunday = weekDates.sunday;
    semanaNumero = selectedWeekNumber;
  } else {
    const currentDate = new Date(selectedDate || new Date());
    const dayOfWeek = currentDate.getDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    lastMonday = new Date(currentDate);
    lastMonday.setDate(currentDate.getDate() - daysSinceMonday);
    lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    semanaNumero = getISOWeekNumber(lastMonday);
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
  };
  const fechaInicio = lastMonday.toLocaleDateString("es-ES", dateOptions);
  const fechaFin = lastSunday.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="relative">
      <PrintPageButton reportType="reporte" />
      <div className="w-full min-w-full bg-gradient-to-r from-indigo-950 to-blue-400 text-white p-3 md:p-6">
        {/* Main docker on rows */}
        <BackButton />
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
          {/* Left column: Titles */}
          <div className="flex-1 p-3 md:p-6 w-full lg:mr-12">
            <h1 className="text-2xl md:text-4xl font-light text-center">
              Reporte Semanal
            </h1>
            <h2 className="text-xl md:text-3xl font-bold text-center">
              Compresor: {compressorData?.alias}
            </h2>
            <div className="flex items-center justify-center gap-2 md:gap-4">
              <button
                onClick={() => handleWeekChange(semanaNumero - 1)}
                className="p-1 md:p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                title="Semana anterior"
              >
                <ChevronLeft size={20} className="text-white" />
              </button>
              <p className="text-base md:text-xl text-center">
                <span className="font-bold">Semana {semanaNumero}:</span>{" "}
                {fechaInicio} al {fechaFin}
              </p>
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const nextWeekDate = new Date(lastMonday);
                nextWeekDate.setDate(lastMonday.getDate() + 7);
                const canGoNext = nextWeekDate <= today;
                return canGoNext ? (
                  <button
                    onClick={() => handleWeekChange(semanaNumero + 1)}
                    className="p-1 md:p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    title="Semana siguiente"
                  >
                    <ChevronRight size={20} className="text-white" />
                  </button>
                ) : (
                  <div className="w-7 md:w-9" /> // Espaciador para mantener centrado
                );
              })()}
            </div>
          </div>

          {/* Right Column: Logo and data */}
          <div className="flex flex-col items-center lg:items-end w-full lg:w-auto">
            {/* Logo */}
            <Image
              src="/Logo_Ventologix.png"
              alt="logo"
              className="h-12 md:h-15 w-auto mb-4"
              width={720}
              height={1080}
            />

            <div className="flex flex-col md:flex-row flex-wrap gap-4 md:gap-8 lg:gap-16 items-start text-white w-full">
              {/* Client Information - Solo mostrar si el usuario NO es 101010 */}
              {userClientNumber !== 101010 && (
                <div className="w-full md:w-auto">
                  <h2 className="text-lg md:text-2xl font-bold">
                    Información Cliente
                  </h2>
                  <div className="flex flex-wrap gap-4 md:gap-8 items-center text-left">
                    <div>
                      <p className="text-base md:text-xl text-center">
                        {clientData?.numero_cliente}
                      </p>
                      <p className="text-xs md:text-sm">Número Cliente</p>
                    </div>
                    <div>
                      <p className="text-base md:text-xl text-center">
                        {clientData?.nombre_cliente}
                      </p>
                      <p className="text-xs md:text-sm text-center">Nombre</p>
                    </div>
                    <div>
                      <p className="text-base md:text-xl text-center">
                        {clientData?.RFC}
                      </p>
                      <p className="text-xs md:text-sm text-center">RFC</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Compresor information */}
              <div className="w-full md:w-auto">
                <h2 className="text-lg md:text-2xl font-bold">
                  Información Compresor
                </h2>
                <div className="flex flex-wrap gap-4 md:gap-8 items-center text-left">
                  <div>
                    <p className="text-base md:text-xl text-center">
                      {compressorData?.numero_serie}
                    </p>
                    <p className="text-xs md:text-sm text-center">
                      Número de serie
                    </p>
                  </div>
                  <div>
                    <p className="text-base md:text-xl text-center">
                      {compressorData?.marca}
                    </p>
                    <p className="text-xs md:text-sm text-center">Marca</p>
                  </div>
                  <div>
                    <p className="text-base md:text-xl text-center">
                      {compressorData?.tipo}
                    </p>
                    <p className="text-xs md:text-sm text-center">Tipo</p>
                  </div>
                  <div>
                    <p className="text-base md:text-xl text-center">
                      {compressorData?.voltaje}
                    </p>
                    <p className="text-xs md:text-sm text-center">Voltaje</p>
                  </div>
                  <div>
                    <p className="text-base md:text-xl text-center">
                      {compressorData?.hp}
                    </p>
                    <p className="text-xs md:text-sm">HP</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center px-4 md:px-8 lg:ml-20 gap-4 md:gap-8">
        <div className="inline-block mt-4 md:mt-8 lg:mt-20">
          {/* Primera fila */}
          <div className="flex">
            <div className="bg-blue-500 text-white text-center px-2 md:px-4 py-2 w-28 md:w-40 text-sm md:text-base">
              Óptimo
            </div>
            <div className="bg-green-600 text-white text-center px-2 md:px-4 py-2 w-28 md:w-40 text-sm md:text-base">
              Bueno
            </div>
          </div>
          {/* Segunda fila */}
          <div className="flex">
            <div className="bg-yellow-400 text-black text-center px-2 md:px-4 py-2 w-28 md:w-40 font-bold text-sm md:text-base">
              Intermedio
            </div>
            <div className="bg-red-600 text-white text-center px-2 md:px-4 py-2 w-28 md:w-40 text-sm md:text-base">
              Malo
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 lg:gap-10 w-full lg:w-auto overflow-x-auto">
          <div className="flex flex-col items-center mt-4 text-base md:text-xl font-bold min-w-[280px]">
            <h1 className="text-center">Ciclos promedio por hora</h1>
            <ReactECharts
              option={ciclosPromOptions}
              style={{ height: "250px", width: "280px" }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
          </div>

          <div className="flex flex-col items-center mt-4 text-base md:text-xl font-bold min-w-[280px]">
            <h1 className="text-center">Hp Equivalente vs Instalado</h1>
            <ReactECharts
              option={hpOptions}
              style={{ height: "250px", width: "280px" }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
          </div>

          <div className="flex flex-col items-center mt-4 text-base md:text-xl font-bold min-w-[280px]">
            <h1 className="text-center">Costo $USD por kWh*</h1>
            <ReactECharts
              option={costokWhOptions}
              style={{ height: "250px", width: "280px" }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
          </div>
        </div>
      </div>

      {/* Line Chart */}
      <div className="flex justify-center px-2 md:px-4 overflow-x-auto">
        <ReactECharts
          option={{
            ...consumoOptions,
            series: [
              { ...consumoOptions.series[0], data: consumoData.turno1 },
              { ...consumoOptions.series[1], data: consumoData.turno2 },
              { ...consumoOptions.series[2], data: consumoData.turno3 },
            ],
          }}
          style={{
            height: 300,
            width: "100%",
            minWidth: "320px",
            maxWidth: "1600px",
          }}
          notMerge={true}
          lazyUpdate={true}
          theme={"light"}
        />
      </div>

      <div className="flex items-center justify-center mb-5 px-4">
        {/* Lado izquierdo */}
        <div className="hidden md:flex flex-col gap-1 w-20 md:w-32 lg:w-124">
          <div className="h-3 bg-blue-500 w-full"></div>
          <div className="h-3 bg-blue-500 w-3/4"></div>
        </div>

        {/* Texto */}
        <h1 className="mx-2 md:mx-6 text-blue-900 font-bold text-xl md:text-3xl lg:text-4xl text-center">
          Semana Pasada <span className="font-normal text-black">vs</span>{" "}
          Promedio 12 Semanas Anteriores
        </h1>

        {/* Lado derecho */}
        <div className="hidden md:flex flex-col gap-1 w-20 md:w-32 lg:w-124">
          <div className="h-3 bg-blue-500 w-full"></div>
          <div className="h-3 bg-blue-500 w-3/4 self-end"></div>
        </div>
      </div>

      <div className="flex flex-col px-2 md:px-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-2">
          <div className="flex-1 items-center text-center p-2 md:p-4">
            <p className="text-lg md:text-2xl font-bold mb-2">
              kWh diarios y Horas de trabajo Por dia de la semana
            </p>
            {/* Contenido columna 1 */}
            <div className="overflow-x-auto">
              <ReactECharts
                option={kwhHorasOption}
                style={{ height: 350, width: "100%", minWidth: "320px" }}
                notMerge={true}
                lazyUpdate={true}
                theme={"light"}
              />
            </div>
            <VentoCom
              html={summaryData?.comentarios?.comentario_A || "Sin datos"}
            />
          </div>
          <div className="flex-1 items-center text-center p-2 md:p-4 flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow p-3 md:p-4 text-center w-full max-w-[400px] mx-auto">
              <h2 className="text-lg md:text-xl text-black font-bold">
                Costo $USD
              </h2>
              <p
                className={`text-2xl md:text-3xl font-bold ${getColorClass(
                  summaryData?.semana_actual?.costo_estimado || 0,
                )}`}
              >
                ${summaryData?.semana_actual?.costo_estimado || "0.00"} USD /
                Semanal
              </p>
              <p className="text-base md:text-xl text-black">
                {" "}
                Costo Anual aproximado, $
                {getAnualValue(
                  summaryData?.semana_actual?.costo_estimado || 0,
                )}{" "}
                USD
              </p>
              <p className="text-base md:text-xl">
                Promedio ultimas 12 semanas:
              </p>
              <p className="text-base md:text-xl">
                $
                {summaryData?.promedio_semanas_anteriores?.costo_estimado ||
                  "0.00"}
              </p>
              <p className="text-sm md:text-lg">
                ({summaryData?.comparacion?.porcentaje_costo || "0.00"}
                %)
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow p-3 md:p-4 text-center w-full max-w-[400px] mx-auto">
              <h2 className="text-lg md:text-xl text-black font-bold">
                Consumo kWH
              </h2>
              <p
                className={`text-2xl md:text-3xl font-bold ${getColorClass(
                  summaryData?.comparacion?.porcentaje_costo || 0,
                )}`}
              >
                {summaryData?.semana_actual?.total_kWh || "0.00"} kWh / Semanal
              </p>
              <p className="text-base md:text-xl text-black">
                Gasto Anual aproximado,{" "}
                {getAnualValue(summaryData?.semana_actual?.total_kWh || 0)} kWh
              </p>
              <p className="text-base md:text-xl">
                Promedio ultimas 12 semanas:
              </p>
              <p className="text-base md:text-xl">
                {summaryData?.promedio_semanas_anteriores
                  ?.total_kWh_anteriores || "0.00"}{" "}
                kWh
              </p>
              <p className="text-sm md:text-lg">
                ({summaryData?.comparacion?.porcentaje_kwh || "0.00"}
                %)
              </p>
            </div>
          </div>
          <div className="flex-1 items-center text-center p-2 md:p-4 lg:mr-8 lg:mt-8">
            {/* Contenido columna 3 */}
            <h4 className="font-bold text-left text-lg md:text-xl mb-2">
              A) Consumo energético y costo
            </h4>
            <div
              className="text-base md:text-xl text-justify"
              dangerouslySetInnerHTML={{
                __html: summaryData?.comparacion?.bloque_A || "Sin datos",
              }}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row mt-2 gap-4 lg:gap-2">
          <div className="flex-1 items-center text-center p-2 md:p-4">
            <p className="text-lg md:text-2xl font-bold mb-2">
              Ciclos Promedio Por dia de la semana
            </p>
            {/* Contenido columna 1 */}
            <div className="overflow-x-auto">
              <ReactECharts
                option={ciclosPromedioOption}
                style={{ height: 350, width: "100%", minWidth: "320px" }}
                notMerge={true}
                lazyUpdate={true}
                theme={"light"}
              />
            </div>
            <VentoCom
              html={summaryData?.comentarios?.comentario_B || "Sin datos"}
            />
          </div>
          <div className="flex-1 items-center text-center p-2 md:p-4 flex flex-col justify-center">
            <div className="bg-white rounded-2xl shadow p-3 md:p-4 text-center w-full max-w-[400px] mx-auto">
              <h2 className="text-lg md:text-xl text-black font-bold">
                Ciclos por hora (C/Hr)
              </h2>
              <p
                className={`text-2xl md:text-3xl font-bold ${getColorCiclos(
                  summaryData?.comparacion?.porcentaje_ciclos || 0,
                )}`}
              >
                {summaryData?.semana_actual?.promedio_ciclos_por_hora || "0.0"}{" "}
                C/Hr
              </p>
              <p className="text-base md:text-xl">
                Promedio ultimas 12 semanas:
              </p>
              <p className="text-base md:text-xl">
                {summaryData?.promedio_semanas_anteriores
                  ?.promedio_ciclos_por_hora || "0.0"}{" "}
                C/Hr
              </p>
              <p className="text-sm md:text-lg">
                ({summaryData?.comparacion?.porcentaje_ciclos || "0.00"}
                %)
              </p>
            </div>
          </div>

          <div className="flex-1 items-center text-center p-2 md:p-4 lg:mr-8 lg:mt-8">
            {/* Contenido columna 3 */}
            <h4 className="font-bold text-left text-lg md:text-xl mb-2">
              B) Comparación de ciclos de operación:
            </h4>
            <div
              className="text-base md:text-xl text-justify"
              dangerouslySetInnerHTML={{
                __html: summaryData?.comparacion?.bloque_B || "Sin datos",
              }}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row mt-2 gap-4 lg:gap-2">
          <div className="flex-1 items-center text-center p-2 md:p-4">
            <p className="text-lg md:text-2xl font-bold mb-2">
              HP Equivalente Por dia de la semana
            </p>
            {/* Contenido columna 1 */}
            <div className="overflow-x-auto">
              <ReactECharts
                option={hpEquivalenteOption}
                style={{ height: 350, width: "100%", minWidth: "320px" }}
                notMerge={true}
                lazyUpdate={true}
                theme={"light"}
              />
            </div>
            <VentoCom
              html={summaryData?.comentarios?.comentario_C || "Sin datos"}
            />
          </div>
          <div className="flex-1 items-center text-center p-2 md:p-4 flex flex-col justify-center">
            <div className="bg-white rounded-2xl shadow p-3 md:p-4 text-center w-full max-w-[400px] mx-auto">
              <h2 className="text-lg md:text-xl text-black font-bold">
                HP Equivalente**
              </h2>
              <p
                className={`text-2xl md:text-3xl font-bold ${getColorHp(
                  summaryData?.comparacion?.porcentaje_hp || 0,
                )}`}
              >
                {summaryData?.semana_actual?.promedio_hp_equivalente || "0.0"}{" "}
                hp
              </p>
              <p className="text-base md:text-xl">
                Promedio ultimas 12 semanas:
              </p>
              <p className="text-base md:text-xl">
                {summaryData?.promedio_semanas_anteriores
                  ?.promedio_hp_equivalente || "0.0"}{" "}
                hp
              </p>
              <p className="text-sm md:text-lg">
                ({summaryData?.comparacion?.porcentaje_hp || "0.00"}%)
              </p>
            </div>
          </div>
          <div className="flex-1 items-center text-center p-2 md:p-4 lg:mr-8 lg:mt-8">
            {/* Contenido columna 3 */}
            <h4 className="font-bold text-left text-lg md:text-xl mb-2">
              C) Comparación de HP Equivalente:
            </h4>
            <div
              className="text-base md:text-xl text-justify"
              dangerouslySetInnerHTML={{
                __html: summaryData?.comparacion?.bloque_C || "Sin datos",
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-start px-2 md:px-4">
          {/* Col 1: Pie + comentario */}
          <div className="bg-white rounded-2xl p-4 md:p-6 h-full flex flex-col text-center">
            <p className="text-lg md:text-2xl font-bold mb-4">
              Estados del Compresor
            </p>

            {/* Pie chart centrado y responsivo */}
            <div className="flex-1 grid place-items-center">
              <div className="w-[280px] h-[280px] md:w-[350px] md:h-[350px]">
                <Pie data={dataPie} options={pieOptions} />
              </div>
            </div>

            <div className="mt-4 text-base md:text-xl text-justify break-words hyphens-auto">
              <VentoCom
                html={summaryData?.comentarios?.comentario_D || "Sin datos"}
              />
            </div>
          </div>

          {/* Col 2: Uso Activo */}
          <div className="bg-white rounded-2xl shadow p-3 md:p-4 w-full max-w-[400px] mx-auto flex flex-col justify-center text-center">
            <h2 className="text-lg md:text-xl text-black font-bold">
              Uso Activo
            </h2>
            <p className="text-2xl md:text-3xl font-bold text-black">
              {summaryData?.semana_actual?.horas_trabajadas || "0.0"} Hr
            </p>
            <p className="text-base md:text-xl">Promedio últimas 12 semanas:</p>
            <p className="text-base md:text-xl">
              {summaryData?.promedio_semanas_anteriores
                ?.horas_trabajadas_anteriores || "0.0"}{" "}
              hr
            </p>
            <p className="text-sm md:text-lg">
              ({summaryData?.comparacion?.porcentaje_horas || "0.00"}%)
            </p>
          </div>

          {/* Col 3: Comentario D */}
          <div className="bg-white rounded-2xl p-4 md:p-6 flex flex-col">
            <h4 className="font-bold text-left text-lg md:text-xl mb-2">
              D) Comparación de horas de Uso Activo:
            </h4>
            <div
              className="text-base md:text-xl text-justify"
              dangerouslySetInnerHTML={{
                __html: summaryData?.comparacion?.bloque_D || "Sin datos",
              }}
            />
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-start gap-4 px-4 mt-4">
          {/* Columna izquierda: Notas */}
          <div className="flex flex-col flex-1 items-start">
            <h2 className="text-xl md:text-2xl font-bold text-left mt-2">
              Notas:
            </h2>
            <p className="text-sm md:text-base text-left">
              *El costo de 0.17 USD por kWh es estándar. Si desea modificarlo,
              por favor, comuníquese con su contacto en VENTOLOGIX.
            </p>
            <p className="text-sm md:text-base text-left">
              **El HP Equivalente es la métrica utilizada por VENTOLOGIX para
              calcular la cantidad real de HP utilizados, y se les aplica un
              factor de seguridad del 40%, según lo recomendado por el CAGI.
            </p>
          </div>
          {/* Columna derecha: Nota adicional */}
          <div className="flex flex-col flex-1 items-start mt-2 md:mt-5">
            <h1 className="text-xl md:text-2xl text-blue-500 font-bold">
              {" "}
              Informacion Contacto Ventologix
            </h1>
            <p className="text-base md:text-xl">Andrés Mirazo</p>
            <p className="text-base md:text-xl">Andres.mirazo@ventologix.com</p>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={isLoading}
        message="Cargando datos del reporte semanal..."
        spinnerSize="lg"
        blurIntensity="medium"
      />
    </main>
  );
}

export default function Main() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      }
    >
      <MainContent />
    </Suspense>
  );
}
