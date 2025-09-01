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
import { useSearchParams } from "next/navigation";
import annotationPlugin from "chartjs-plugin-annotation";
import Image from "next/image";
import VentoCom from "@/components/vento_com";
import {
  getColorCiclos,
  getColorClass,
  getColorHp,
  getAnualValue,
} from "@/lib/reportsFunctions";

// Libraries for charts
import {
  Chart as ChartJS,
  ArcElement,
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
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  annotationPlugin,
  ChartDataLabels
);

import {
  chartData,
  consumoData,
  SummaryData,
  clientData,
  compressorData,
} from "@/lib/types";

function MainContent() {
  // Constant Declarations
  const [chartData, setChartData] = useState<chartData>([0, 0, 0]);
  const [consumoData, setConsumoData] = useState<consumoData>({
    turno1: new Array(7).fill(0),
    turno2: new Array(7).fill(0),
    turno3: new Array(7).fill(0),
  });

  const [clientData, setClientData] = useState<clientData | null>(null);

  const [compressorData, setCompresorData] = useState<compressorData | null>(
    null
  );

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const searchParams = useSearchParams();

  const fetchData = useCallback(async (id: string, linea: string) => {
    try {
      const [pieRes, shiftRes, clientRes, compressorRes, summaryRes] =
        await Promise.all([
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/week/pie-data-proc?id_cliente=${id}&linea=${linea}`,
              {
                headers: {
                  accept: "application/json",
                  "x-internal-api-key": process.env.NEXT_PUBLIC_API_SECRET || "",
                },
              }
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/week/shifts?id_cliente=${id}&linea=${linea}`,
              {
                headers: {
                  accept: "application/json",
                  "x-internal-api-key": process.env.NEXT_PUBLIC_API_SECRET || "",
                },
              }
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/client-data?id_cliente=${id}`,
              {
                headers: {
                  accept: "application/json",
                  "x-internal-api-key": process.env.NEXT_PUBLIC_API_SECRET || "",
                },
              }
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/compressor-data?id_cliente=${id}&linea=${linea}`,
              {
                headers: {
                  accept: "application/json",
                  "x-internal-api-key": process.env.NEXT_PUBLIC_API_SECRET || "",
                },
              }
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/week/summary-general?id_cliente=${id}&linea=${linea}`,
              {
                headers: {
                  accept: "application/json",
                  "x-internal-api-key": process.env.NEXT_PUBLIC_API_SECRET || "",
                },
              }
            );
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
          "Error: Datos de gráfica circular inválidos o inexistentes"
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
        }
      );

      setConsumoData({ turno1, turno2, turno3 });

      if (clientRes.data.length > 0) setClientData(clientRes.data[0]);
      if (compressorRes.data.length > 0)
        setCompresorData(compressorRes.data[0]);
      console.log("summaryRes:", summaryRes);
      console.log("summaryRes structure:", JSON.stringify(summaryRes, null, 2));

      if (summaryRes) {
        console.log("semana_actual:", summaryRes.semana_actual);
        console.log("detalle_semana_actual:", summaryRes.detalle_semana_actual);
        console.log("comparacion:", summaryRes.comparacion);
        console.log("comentarios:", summaryRes.comentarios);
        console.log(
          "promedio_semanas_anteriores:",
          summaryRes.promedio_semanas_anteriores
        );
        setSummaryData(summaryRes);
      }

      const { LOAD, NOLOAD, OFF } = pieRes.data;
      setChartData([LOAD, NOLOAD, OFF]);
    } catch (error) {
      console.error("Error fetching data:", error);
      window.status = "data-error";
    }
  }, []);

  useEffect(() => {
    const id = searchParams.get("id_cliente");
    const linea = searchParams.get("linea") || "";
    if (id) {
      fetchData(id, linea);
    }
  }, [searchParams, fetchData]);

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
        (d) => d.promedio_ciclos_por_hora
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
                    1
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
            `${
              summaryData?.semana_actual?.promedio_hp_equivalente !== undefined
                ? summaryData?.semana_actual?.promedio_hp_equivalente
                : 0
            }%`,
          fontSize: 18,
          offsetCenter: [0, "30%"],
          color:
            (summaryData?.semana_actual?.promedio_hp_equivalente ?? 0) > 110
              ? "red"
              : (summaryData?.semana_actual?.promedio_hp_equivalente ?? 0) > 99
              ? "black"
              : (summaryData?.semana_actual?.promedio_hp_equivalente ?? 0) > 92
              ? "#418FDE"
              : (summaryData?.semana_actual?.promedio_hp_equivalente ?? 0) > 79
              ? "green"
              : (summaryData?.semana_actual?.promedio_hp_equivalente ?? 0) > 64
              ? "yellow"
              : "red",
        },
        data: [
          { value: summaryData?.semana_actual?.promedio_hp_equivalente ?? 0 },
        ],
      },
    ],
  };

  const costoUSDOptions = {
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
          formatter: () => `$${clientData?.costoUSD || "0.00"}`,
          fontSize: 18,
          offsetCenter: [0, "30%"],
          color:
            (clientData?.costoUSD ?? 0) <= 0.18
              ? "green"
              : (clientData?.costoUSD ?? 0) <= 0.22
              ? "yellow"
              : "red",
        },
        data: [{ value: clientData?.costoUSD ?? 0 }],
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

  const today = new Date();

  // Obtener el lunes de la semana pasada
  const dayOfWeek = today.getDay(); // Domingo = 0, Lunes = 1, ..., Sábado = 6
  const daysSinceMonday = (dayOfWeek + 6) % 7; // Convierte Domingo=6, Lunes=0, ..., Sábado=5
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - daysSinceMonday - 7); // lunes pasado

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);

  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long" };
  const fechaInicio = lastMonday.toLocaleDateString("es-ES", options);
  const fechaFin = lastSunday.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const getISOWeekNumber = (date: Date): number => {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const semanaNumero = getISOWeekNumber(lastMonday);

  return (
    <main className="relative">
      <div className="w-full min-w-full bg-gradient-to-r from-indigo-950 to-blue-400 text-white p-6">
        {/* Main docker on rows */}
        <div className="flex justify-between items-start">
          {/* Left column: Titles */}
          <div className="flex-1 mr-60 p-6 ">
            <h1 className="text-4xl font-light text-center">Reporte Semanal</h1>
            <h2 className="text-3xl font-bold text-center">
              Compresor: {compressorData?.alias}
            </h2>
            <p className="text-xl text-center">
              <span className="font-bold">Semana {semanaNumero}:</span>{" "}
              {fechaInicio} al {fechaFin}
            </p>
          </div>

          {/* Right Column: Logo and data */}
          <div className="flex flex-col items-end">
            {/* Logo */}
            <Image
              src="/Logo_Ventologix.png"
              alt="logo"
              className="h-15 w-70 mr-20"
              width={720}
              height={1080}
            />

            <div className="flex flex-wrap gap-16 items-start text-white mr-10 mt-5">
              {/* Client Information */}
              <div>
                <h2 className="text-2xl font-bold">Información Cliente</h2>
                <div className="flex flex-wrap gap-8 items-center text-left">
                  <div>
                    <p className="text-xl text-center">
                      {clientData?.numero_cliente}
                    </p>
                    <p className="text-sm">Número Cliente</p>
                  </div>
                  <div>
                    <p className="text-xl text-center">
                      {clientData?.nombre_cliente}
                    </p>
                    <p className="text-sm text-center">Nombre</p>
                  </div>
                  <div>
                    <p className="text-xl text-center">{clientData?.RFC}</p>
                    <p className="text-sm text-center">RFC</p>
                  </div>
                </div>
              </div>

              {/* Compresor information */}
              <div>
                <h2 className="text-2xl font-bold ">Información Compresor</h2>
                <div className="flex flex-wrap gap-8 items-center text-left">
                  <div>
                    <p className="text-xl text-center">
                      {compressorData?.numero_serie}
                    </p>
                    <p className="text-sm text-center">Número de serie</p>
                  </div>
                  <div>
                    <p className="text-xl text-center">
                      {compressorData?.marca}
                    </p>
                    <p className="text-sm text-center">Marca</p>
                  </div>
                  <div>
                    <p className="text-xl text-center">
                      {compressorData?.tipo}
                    </p>
                    <p className="text-sm text-center">Tipo</p>
                  </div>
                  <div>
                    <p className="text-xl text-center">
                      {compressorData?.voltaje}
                    </p>
                    <p className="text-sm text-center">Voltaje</p>
                  </div>
                  <div>
                    <p className="text-xl text-center">{compressorData?.hp}</p>
                    <p className="text-sm">HP</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start ml-40 gap-30">
        <div className="inline-block mt-20">
          {/* Primera fila */}
          <div className="flex">
            <div className="bg-blue-500 text-white text-center px-4 py-2 w-40">
              Óptimo
            </div>
            <div className="bg-green-600 text-white text-center px-4 py-2 w-40">
              Bueno
            </div>
          </div>
          {/* Segunda fila */}
          <div className="flex">
            <div className="bg-yellow-400 text-black text-center px-4 py-2 w-40 font-bold">
              Intermedio
            </div>
            <div className="bg-red-600 text-white text-center px-4 py-2 w-40">
              Malo
            </div>
          </div>
        </div>

        <div className="flex items-center gap-10 ml-50">
          <div className="flex flex-col items-center  mt-4 text-xl font-bold">
            <h1>Ciclos promedio por hora</h1>
            <ReactECharts
              option={ciclosPromOptions}
              style={{ height: "280px", width: "350px" }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
          </div>

          <div className="flex flex-col items-center mt-4 text-xl font-bold">
            <h1>Hp Equivalente vs Instalado</h1>
            <ReactECharts
              option={hpOptions}
              style={{ height: "280px", width: "350px" }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
          </div>

          <div className="flex flex-col items-center  mt-4 text-xl font-bold">
            <h1>Costo $USD por kWh*</h1>
            <ReactECharts
              option={costoUSDOptions}
              style={{ height: "280px", width: "350px" }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
          </div>
        </div>
      </div>

      {/* Line Chart */}
      <div className="flex justify-center">
        <ReactECharts
          option={{
            ...consumoOptions,
            series: [
              { ...consumoOptions.series[0], data: consumoData.turno1 },
              { ...consumoOptions.series[1], data: consumoData.turno2 },
              { ...consumoOptions.series[2], data: consumoData.turno3 },
            ],
          }}
          style={{ height: 300, width: 1600 }}
          notMerge={true}
          lazyUpdate={true}
          theme={"light"}
        />
      </div>

      <div className="flex items-center justify-center mb-5">
        {/* Lado izquierdo */}
        <div className="flex flex-col gap-1 w-124">
          <div className="h-3 bg-blue-500 w-full"></div>
          <div className="h-3 bg-blue-500 w-3/4"></div>
        </div>

        {/* Texto */}
        <h1 className="mx-6 text-blue-900 font-bold text-4xl text-center">
          Semana Pasada <span className="font-normal text-black">vs</span>{" "}
          Promedio 12 Semanas Anteriores
        </h1>

        {/* Lado derecho */}
        <div className="flex flex-col gap-1 w-124">
          <div className="h-3 bg-blue-500 w-full"></div>
          <div className="h-3 bg-blue-500 w-3/4 self-end"></div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex">
          <div className="flex-1 items-center text-center p-4">
            <p className="text-2xl font-bold">
              kWh diarios y Horas de trabajo Por dia de la semana
            </p>
            {/* Contenido columna 1 */}
            <ReactECharts
              option={kwhHorasOption}
              style={{ height: 350, width: 900 }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
            <VentoCom
              html={summaryData?.comentarios?.comentario_A || "Sin datos"}
            />
          </div>
          <div className="flex-1 items-center text-center p-4">
            <div className="bg-white rounded-2xl shadow p-4 text-center w-[400px]">
              <h2 className="text-xl text-black font-bold">Costo $USD</h2>
              <p
                className={`text-3xl font-bold ${getColorClass(
                  summaryData?.semana_actual?.costo_estimado || 0
                )}`}
              >
                ${summaryData?.semana_actual?.costo_estimado || "0.00"} USD /
                Semanal
              </p>
              <p className="text-xl text-black">
                {" "}
                Costo Anual aproximado, $
                {getAnualValue(
                  summaryData?.semana_actual?.costo_estimado || 0
                )}{" "}
                USD
              </p>
              <p className="text-xl">Promedio ultimas 12 semanas:</p>
              <p className="text-xl">
                $
                {summaryData?.promedio_semanas_anteriores?.costo_estimado ||
                  "0.00"}
              </p>
              <p className="text-lg">
                ({summaryData?.comparacion?.porcentaje_costo || "0.00"}
                %)
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow p-4 text-center w-[400px]">
              <h2 className="text-xl text-black font-bold">Consumo kWH</h2>
              <p
                className={`text-3xl font-bold ${getColorClass(
                  summaryData?.comparacion?.porcentaje_costo || 0
                )}`}
              >
                {summaryData?.semana_actual?.total_kWh || "0.00"} kWh / Semanal
              </p>
              <p className="text-xl text-black">
                Gasto Anual aproximado,{" "}
                {getAnualValue(summaryData?.semana_actual?.total_kWh || 0)} kWh
              </p>
              <p className="text-xl">Promedio ultimas 12 semanas:</p>
              <p className="text-xl">
                {summaryData?.promedio_semanas_anteriores
                  ?.total_kWh_anteriores || "0.00"}{" "}
                kWh
              </p>
              <p className="text-lg">
                ({summaryData?.comparacion?.porcentaje_kwh || "0.00"}
                %)
              </p>
            </div>
          </div>
          <div className="flex-1 items-center text-center mr-20 mt-30">
            {/* Contenido columna 3 */}
            <h4 className="font-bold text-left text-xl">
              A) Consumo energético y costo
            </h4>
            <div
              className="text-xl text-justify"
              dangerouslySetInnerHTML={{
                __html: summaryData?.comparacion?.bloque_A || "Sin datos",
              }}
            />
          </div>
        </div>

        <div className="flex mt-2">
          <div className="flex-1 items-center text-center p-4">
            <p className="text-2xl font-bold">
              Ciclos Promedio Por dia de la semana
            </p>
            {/* Contenido columna 1 */}
            <ReactECharts
              option={ciclosPromedioOption}
              style={{ height: 350, width: 900 }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
            <VentoCom
              html={summaryData?.comentarios?.comentario_B || "Sin datos"}
            />
          </div>
          <div className="flex-1 items-center text-center p-4">
            <div className="bg-white rounded-2xl shadow p-4 text-center w-[400px] mt-25">
              <h2 className="text-xl text-black font-bold">
                Ciclos por hora (C/Hr)
              </h2>
              <p
                className={`text-3xl font-bold ${getColorCiclos(
                  summaryData?.comparacion?.porcentaje_ciclos || 0
                )}`}
              >
                {summaryData?.semana_actual?.promedio_ciclos_por_hora || "0.0"}{" "}
                C/Hr
              </p>
              <p className="text-xl">Promedio ultimas 12 semanas:</p>
              <p className="text-xl">
                {summaryData?.promedio_semanas_anteriores
                  ?.promedio_ciclos_por_hora || "0.0"}{" "}
                C/Hr
              </p>
              <p className="text-lg">
                ({summaryData?.comparacion?.porcentaje_ciclos || "0.00"}
                %)
              </p>
            </div>
          </div>

          <div className="flex-1 items-center text-center mr-20 mt-35">
            {/* Contenido columna 3 */}
            <h4 className="font-bold text-left text-xl">
              B) Comparación de ciclos de operación:
            </h4>
            <div
              className="text-xl text-justify"
              dangerouslySetInnerHTML={{
                __html: summaryData?.comparacion?.bloque_B || "Sin datos",
              }}
            />
          </div>
        </div>

        <div className="flex mt-2">
          <div className="flex-1 items-center text-center p-4">
            <p className="text-2xl font-bold">
              HP Equivalente Por dia de la semana
            </p>
            {/* Contenido columna 1 */}
            <ReactECharts
              option={hpEquivalenteOption}
              style={{ height: 350, width: 900 }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
            <VentoCom
              html={summaryData?.comentarios?.comentario_C || "Sin datos"}
            />
          </div>
          <div className="flex-1 items-center text-center p-4">
            <div className="bg-white rounded-2xl shadow p-4 text-center w-[400px] mt-25">
              <h2 className="text-xl text-black font-bold">HP Equivalente**</h2>
              <p
                className={`text-3xl font-bold ${getColorHp(
                  summaryData?.comparacion?.porcentaje_hp || 0
                )}`}
              >
                {summaryData?.semana_actual?.promedio_hp_equivalente || "0.0"}{" "}
                hp
              </p>
              <p className="text-xl">Promedio ultimas 12 semanas:</p>
              <p className="text-xl">
                {summaryData?.promedio_semanas_anteriores
                  ?.promedio_hp_equivalente || "0.0"}{" "}
                hp
              </p>
              <p className="text-lg">
                ({summaryData?.comparacion?.porcentaje_hp || "0.00"}%)
              </p>
            </div>
          </div>
          <div className="flex-1 items-center text-center mr-20 mt-30">
            {/* Contenido columna 3 */}
            <h4 className="font-bold text-left text-xl">
              C) Comparación de HP Equivalente:
            </h4>
            <div
              className="text-xl text-justify"
              dangerouslySetInnerHTML={{
                __html: summaryData?.comparacion?.bloque_C || "Sin datos",
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Col 1: Pie + comentario */}
          <div className="bg-white rounded-2xl p-6 h-full flex flex-col text-center">
            <p className="text-2xl font-bold mb-4 ml-50">
              Estados del Compresor
            </p>

            {/* Pie chart centrado y responsivo */}
            <div className="flex-1 grid place-items-center ml-50">
              <div className="w-[350px] h-[350px]">
                <Pie data={dataPie} options={pieOptions} />
              </div>
            </div>

            <div className="mt-4 text-xl text-justify break-words hyphens-auto">
              <VentoCom
                html={summaryData?.comentarios?.comentario_D || "Sin datos"}
              />
            </div>
          </div>

          {/* Col 2: Uso Activo */}
          <div className="bg-white rounded-2xl shadow p-4 w-[400px] flex flex-col justify-center text-center mb-40 ml-70">
            <h2 className="text-xl text-black font-bold">Uso Activo</h2>
            <p className="text-3xl font-bold text-black">
              {summaryData?.semana_actual?.horas_trabajadas || "0.0"} Hr
            </p>
            <p className="text-xl">Promedio últimas 12 semanas:</p>
            <p className="text-xl">
              {summaryData?.promedio_semanas_anteriores
                ?.horas_trabajadas_anteriores || "0.0"}{" "}
              hr
            </p>
            <p className="text-lg">
              ({summaryData?.comparacion?.porcentaje_horas || "0.00"}%)
            </p>
          </div>

          {/* Col 3: Comentario D */}
          <div className="bg-white rounded-2xl p-6 flex flex-col ml-15 mb-40">
            <h4 className="font-bold  text-left text-xl">
              D) Comparación de horas de Uso Activo:
            </h4>
            <div
              className="text-xl text-justify mr-20"
              dangerouslySetInnerHTML={{
                __html: summaryData?.comparacion?.bloque_D || "Sin datos",
              }}
            />
          </div>
        </div>
        <div className="flex flex-row items-start">
          {/* Columna izquierda: Notas */}
          <div className="flex flex-col flex-1 items-start">
            <h2 className="text-2xl font-bold text-left mt-2 ml-20">Notas:</h2>
            <p className="text-m text-left ml-20">
              *El costo de 0.17 USD por kWh es estándar. Si desea modificarlo,
              por favor, comuníquese con su contacto en VENTOLOGIX.
            </p>
            <p className="text-m text-left ml-20">
              **El HP Equivalente es la métrica utilizada por VENTOLOGIX para
              calcular la cantidad real de HP utilizados, y se les aplica un
              factor de seguridad del 40%, según lo recomendado por el CAGI.
            </p>
          </div>
          {/* Columna derecha: Nota adicional */}
          <div className="flex flex-col flex-1 items-start mt-5">
            <h1 className="text-2xl ml-120 text-blue-500 font-bold">
              {" "}
              Informacion Contacto Ventologix
            </h1>
            <p className="text-xl ml-120">Andrés Mirazo</p>
            <p className="text-xl ml-120">Andres.mirazo@ventologix.com</p>
          </div>
        </div>
      </div>
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
