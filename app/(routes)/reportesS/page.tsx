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
 * http://localhost:3002/reportesS?id_cliente=10&linea=A
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "react-datepicker/dist/react-datepicker.css";
import { useSearchParams } from "next/navigation";
import annotationPlugin from "chartjs-plugin-annotation";
import Image from "next/image";

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

export default function Main() {
  // Constant Declarations
  const [chartData, setChartData] = useState([0, 0, 0]);
  const [consumoData, setConsumoData] = useState({
    turno1: new Array(7).fill(0),
    turno2: new Array(7).fill(0),
    turno3: new Array(7).fill(0),
  });

  const [clientData, setClientData] = useState<{
    numero_cliente: number;
    nombre_cliente: string;
    RFC: string;
    direccion: string;
  } | null>(null);

  const [compressorData, setCompresorData] = useState<{
    hp: number;
    tipo: string;
    voltaje: number;
    marca: string;
    numero_serie: number;
    alias: string;
    limite: number;
  } | null>(null);

  const [summaryData, setSummaryData] = useState<{
    semana_actual: {
      total_kWh: number;
      costo_estimado: number;
      promedio_ciclos_por_hora: number;
      promedio_hp_equivalente: number;
    };
    promedio_semanas_anteriores: {
      total_kWh_anteriores: number;
      costo_estimado: number;
      promedio_ciclos_por_hora: number;
      promedio_hp_equivalente: number;
    };
  } | null>(null);

  const searchParams = useSearchParams();

  const fetchData = useCallback(async (id: string, linea: string) => {
    try {
      const [pieRes, shiftRes, clientRes, compressorRes, summaryRes] =
        await Promise.all([
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/week/pie-data-proc?id_cliente=${id}&linea=${linea}`
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/week/shifts?id_cliente=${id}&linea=${linea}`
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/client-data?id_cliente=${id}`
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/compressor-data?id_cliente=${id}&linea=${linea}`
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/week/summary-general?id_cliente=${id}&linea=${linea}`
            );
            return res.json();
          })(),
        ]);

      const turno1 = new Array(7).fill(0);
      const turno2 = new Array(7).fill(0);
      const turno3 = new Array(7).fill(0);

      shiftRes.data.forEach((item: any) => {
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
      });

      setConsumoData({ turno1, turno2, turno3 });

      if (clientRes.data.length > 0) setClientData(clientRes.data[0]);
      if (compressorRes.data.length > 0)
        setCompresorData(compressorRes.data[0]);
      if (summaryRes.data) setSummaryData(summaryRes.data);

      const { LOAD, NOLOAD, OFF } = pieRes.data;
      setChartData([LOAD, NOLOAD, OFF]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  useEffect(() => {
    const id = searchParams.get("id_cliente");
    const linea = searchParams.get("linea") || "";
    if (id) {
      fetchData(id, linea);
    }
  }, [searchParams, fetchData]);

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
              [8 / 20, "#418FDE"],
              [12 / 20, "green"],
              [15 / 20, "yellow"],
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
                ? summaryData.semana_actual.promedio_ciclos_por_hora.toFixed(1)
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
                ? summaryData.semana_actual.promedio_ciclos_por_hora
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
            if (value === 30) return "30%";
            if (value === 100) return "100%";
            if (value === 120) return "120%";
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
              summaryData?.semana_actual.promedio_hp_equivalente !== undefined
                ? summaryData.semana_actual.promedio_hp_equivalente
                : 0
            }%`,
          fontSize: 18,
          offsetCenter: [0, "30%"],
          color:
            (summaryData?.semana_actual.promedio_hp_equivalente ?? 0) > 110
              ? "red"
              : (summaryData?.semana_actual.promedio_hp_equivalente ?? 0) > 99
              ? "black"
              : (summaryData?.semana_actual.promedio_hp_equivalente ?? 0) > 92
              ? "#418FDE"
              : (summaryData?.semana_actual.promedio_hp_equivalente ?? 0) > 79
              ? "green"
              : (summaryData?.semana_actual.promedio_hp_equivalente ?? 0) > 64
              ? "yellow"
              : "red",
        },
        data: [
          { value: summaryData?.semana_actual.promedio_hp_equivalente ?? 0 },
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
            if (value === 0.1) return "$0.10";
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
          formatter: () => `$${0.17}`,
          fontSize: 18,
          offsetCenter: [0, "30%"],
          color: 0.17 <= 0.18 ? "green" : 0.17 <= 0.22 ? "yellow" : "red",
        },
        data: [{ value: 0.17 }],
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
        "domingo",
        "sabado",
        "viernes",
        "jueves",
        "miercoles",
        "martes",
        "lunes",
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
          color: "#001f54",
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
          color: "#4db6ac",
        },
        data: consumoData.turno3,
      },
    ],
  };

  // Bar Chart Options for kWh diarios, ciclos promedio, and hp equivalente
  const kwhDiariosOption = {
    xAxis: {
      type: "category",
      data: [
        "Lunes",
        "Martes",
        "Miercoles",
        "Jueves",
        "Viernes",
        "Sabado",
        "Domingo",
      ],
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        data: [120, 200, 150, 80, 70, 110, 130],
        type: "bar",
      },
    ],
  };

  const ciclosPromedioOption = {
    xAxis: {
      type: "category",
      data: [
        "Lunes",
        "Martes",
        "Miercoles",
        "Jueves",
        "Viernes",
        "Sabado",
        "Domingo",
      ],
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        data: [120, 200, 150, 80, 70, 110, 130],
        type: "bar",
      },
    ],
  };

  const hpEquivalenteOption = {
    xAxis: {
      type: "category",
      data: [
        "Lunes",
        "Martes",
        "Miercoles",
        "Jueves",
        "Viernes",
        "Sabado",
        "Domingo",
      ],
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        data: [120, 200, 150, 80, 70, 110, 130],
        type: "bar",
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
          "rgb(0, 191, 255)",
          "rgb(229, 255, 0)",
          "rgb(126, 126, 126)",
        ],
        hoverOffset: 30,
      },
    ],
  };

  const pieOptions = {
    layout: {
      padding: 20,
    },
    responsive: true,
    maintainAspectRatio: false,
    cutout: "0%",
    plugins: {
      datalabels: {
        color: "black",
        font: {
          weight: "bold",
          size: 18,
        },
        formatter: (value: number) => {
          return value + "%";
        },
      },
      legend: {
        display: true,
        position: "bottom",
      },
    },
    animation: {
      duration: 0,
    },
  };

  // useEffect(() => {
  //   if (chartData.length > 0) {
  //     window.status = "pdf-ready";
  //     setTimeout(() => {}, 250000);
  //   }
  // }, [chartData]);

  const today = new Date();
  const end = new Date(today.setDate(today.getDate() - 1));
  const start = new Date(end);
  start.setDate(end.getDate() - 6);

  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long" };
  const fechaInicio = start.toLocaleDateString("es-ES", options);
  const fechaFin = end.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const semanaNumero = Math.ceil(
    ((+end - +new Date(end.getFullYear(), 0, 1)) / 86400000 +
      Number(new Date(end.getFullYear(), 0, 1).getDay()) +
      1) /
      7
  );

  return (
    <main className="relative">
      <div className="bg-gradient-to-r from-indigo-950 to-blue-400 text-white p-6">
        {/* Main docker on rows */}
        <div className="flex justify-between items-start">
          {/* Left column: Titles */}
          <div className="flex-1 mr-150 p-6 ">
            <h1 className="text-4xl font-light text-center">Reporte Semanal</h1>
            <h2 className="text-3xl font-bold text-center font-semibold">
              Compresor: {compressorData?.alias}
            </h2>
            <p className="text-xl mt-2 text-center">
              <span className="font-bold">Semana {semanaNumero}:</span>{" "}
              {fechaInicio} al {fechaFin}
            </p>
          </div>

          {/* Right Column: Logo and data */}
          <div className="flex flex-col items-end">
            {/* Logo */}
            <Image
              src="/Ventologix_04.png"
              alt="logo"
              className="h-12 w-auto m-4"
              width={112}
              height={112}
            />

            <div className="flex flex-wrap gap-16 items-start text-white mr-10">
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
                      {compressorData?.numero_serie || "(En blanco)"}
                    </p>
                    <p className="text-sm text-center">Número de serie</p>
                  </div>
                  <div>
                    <p className="text-xl text-center">
                      {compressorData?.marca || "(En blanco)"}
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

      <div className="flex items-start ml-20 gap-30">
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
      <div className="flex justify-center ">
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

      <div className="flex items-center justify-center mt-10 mb-10">
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

      <div className="flex flex-col mb-10">
        <div className="flex">
          <div className="flex-1 items-center text-center p-4">
            {/* Contenido columna 1 */}
            <ReactECharts
              option={kwhDiariosOption}
              style={{ height: 350, width: 900 }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
          </div>
          <div className="flex-1 items-center text-center p-4">
            <div className="bg-white rounded-2xl shadow p-4 text-center w-[250px]">
              <h2 className="text-xl text-black font-bold">Costo $USD</h2>
              <p className="text-3xl font-bold text-black">
                {summaryData?.semana_actual.costo_estimado.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow p-4 text-center w-[250px]">
              <h2 className="text-xl text-black font-bold">Consumo kWH</h2>
              <p className="text-3xl font-bold text-black">
                {summaryData?.semana_actual.total_kWh || "0.00"}
              </p>
            </div>
          </div>
          <div className="flex-1 items-center text-center mr-20">
            {/* Contenido columna 3 */}
            <h4 className="font-bold text-left text-xl">
              A) Consumo energético y costo
            </h4>
            {/* <p className="text-lg text-justify">
              En la última semana, el consumo de energía del compresor fue {commentConsumoEnergia} que el
              promedio de las últimas 12 semanas. El promedio de consumo de energía fue de
              {kwhPromedio12Semanas}, mientras que en la semana pasada se consumieron {kwhSemanaPasada}. Este
              consumo impactó directamente en el costo de energía, que reflejó un cambio del
              {commentConsumoEnergia} en comparación con el promedio de las últimas 12 semanas.
              Considerando el costo de 0.17 USD por kWh, el total de gasto en energía en la última
              semana fue de {costoSemanaPasada}, lo que refleja una diferencia significativa respecto al
              promedio de {costoPromedio12Semanas}.
            </p> */}
          </div>
        </div>

        <div className="flex">
          <div className="flex-1 items-center text-center p-4">
            {/* Contenido columna 1 */}
            <ReactECharts
              option={kwhDiariosOption}
              style={{ height: 350, width: 900 }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
          </div>
          <div className="flex-1 items-center text-center p-4">
            <div className="bg-white rounded-2xl shadow p-4 text-center w-[250px]">
              <h2 className="text-xl text-black font-bold">
                Ciclos por hora (C/Hr)
              </h2>
              <p className="text-3xl font-bold text-black">
                {summaryData?.semana_actual.promedio_ciclos_por_hora.toFixed(
                  1
                ) || "0.0"}
              </p>
            </div>
          </div>

          <div className="flex-1 items-center text-center mr-20">
            {/* Contenido columna 3 */}
            <h4 className="font-bold text-left text-xl">
              B) Comparación de ciclos de operación:
            </h4>
            {/* <p className="text-lg text-justify">
              El número de ciclos realizados por el compresor en la última semana fue -21.3%
              menor que en semanas anteriores. En términos absolutos, se realizaron 29.0
              ciclos, mientras que el promedio de las últimas semanas fue de 36.9 ciclos. Este
              indicador refleja la frecuencia con la que el compresor inicia y detiene su ciclo
              de trabajo, lo que impacta tanto en la eficiencia como en el desgaste del equipo.
            </p> */}
          </div>
        </div>

        <div className="flex">
          <div className="flex-1 items-center text-center p-4">
            {/* Contenido columna 1 */}
            <ReactECharts
              option={hpEquivalenteOption}
              style={{ height: 350, width: 900 }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
          </div>
          <div className="flex-1 items-center text-center p-4">
            <div className="bg-white rounded-2xl shadow p-4 text-center w-[250px]">
              <h2 className="text-xl text-black font-bold">HP Equivalente**</h2>
              <p className="text-3xl font-bold text-black">
                {summaryData?.semana_actual.promedio_hp_equivalente.toFixed(
                  1
                ) || "0.0"}
              </p>
            </div>
          </div>
          <div className="flex-1 items-center text-center mr-20">
            {/* Contenido columna 3 */}
            <h4 className="font-bold text-left text-xl">
              C) Comparación de HP Equivalente:
            </h4>
            {/* <p className="text-lg text-justify">
              El HP Equivalente en la última semana fue -16.3% menor que el promedio de las
              últimas 12 semanas. Este valor es crucial ya que refleja el rendimiento y la carga
              de trabajo del compresor en relación con la potencia necesaria. En la última
              semana, el compresor operó con un HP Equivalente de 48.4, mientras que el
              promedio de las últimas semanas fue de 57.9 HP. Esta variación puede ser un
              indicativo de cambios en la carga o en la eficiencia operativa del compresor.
            </p> */}
          </div>
        </div>

        <div className="flex">
          <div className="flex-1 items-center text-center p-4">
            {/* Contenido columna 1 */}
            <Pie data={dataPie} options={pieOptions} />
          </div>
          <div className="flex-1 items-center text-center p-4">
            <div className="bg-white rounded-2xl shadow p-4 text-center w-[250px]">
              <h2 className="text-xl text-black font-bold">Uso Activo</h2>
              <p className="text-3xl font-bold text-black">
                {/* {usoActivo.toFixed(1)} */}
              </p>
            </div>
          </div>
          <div className="flex-1 items-center text-center mr-20">
            {/* Contenido columna 3 */}
            <h4 className="font-bold text-left text-xl">
              D) Comparación de horas de Uso Activo:
            </h4>
            {/* <p className="text-lg text-justify">
              El compresor operó un 18.3% más tiempo en la última semana en comparación
              con el promedio de las últimas 12 semanas. En la semana pasada, el compresor
              estuvo en operación durante 130.6 horas, mientras que el promedio de las
              últimas semanas fue de 110.4 horas por día. Esta variación puede indicar un
              aumento o disminución en la demanda o en el ciclo de trabajo del compresor,
              afectando su tiempo de operación.
            </p> */}
          </div>
        </div>
      </div>
    </main>
  );
}
