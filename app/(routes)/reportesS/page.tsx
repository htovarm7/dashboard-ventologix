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
 * http://localhost:3002/reportesS?id_cliente=7&linea=A
 */

"use client";

import React, { useEffect, useState } from "react";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "react-datepicker/dist/react-datepicker.css";
import { useSearchParams } from "next/navigation";
import annotationPlugin from "chartjs-plugin-annotation";

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

import { Pie, Chart } from "react-chartjs-2";

// ECharts for the gauge chart
import ReactECharts from "echarts-for-react";

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
  const [lineChartData, setLineChartData] = useState<number[]>([]);
  const [kWh, setKWh] = useState<number>(0);
  const [hoursWorked, setHoursWorked] = useState<number>(0);
  const [usdCost, setUsdCost] = useState<number>(0);
  const [Load, setLoad] = useState<number>(0);
  const [NoLoad, setNoLoad] = useState<number>(0);
  const [Off, setOff] = useState<number>(0);
  const [firstHour, setFirstHour] = useState("");
  const [lastHour, setLastHour] = useState("");
  const [totalCiclos, setTotalCiclos] = useState(0);
  const [promedioCiclosHora, setPromedioCiclosHora] = useState(0);
  const [comentarioCiclos, setComentarioCiclos] = useState("");
  const [hpNominal, setHPNominal] = useState<number>(0);
  const [hpeq, setHPEquivalente] = useState<number>(0);
  const [comentarioHp, setComentarioHp] = useState("");

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

  const searchParams = useSearchParams();
  const [idCliente, setIdCliente] = useState<string | null>(null);
  const [linea, setLinea] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get("id_cliente");
    const linea = searchParams.get("linea") || "";
    if (id) {
      setIdCliente(id);
      setLinea(linea);
      fetchData(id, linea);
    }
  }, [searchParams]);

  const fetchData = async (id: string, linea: string) => {
    try {
      const [pieRes, clientRes, compressorRes] =
        await Promise.all([
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/week/pie-data-proc?id_cliente=${id}&linea=${linea}`
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
        ]);

      if (clientRes.data.length > 0) 
        setClientData(clientRes.data[0]);
      if (compressorRes.data.length > 0)
        setCompresorData(compressorRes.data[0]);

      const { LOAD, NOLOAD, OFF } = pieRes.data;
      setChartData([LOAD, NOLOAD, OFF]);

      setLoad(LOAD);
      setNoLoad(NOLOAD);
      setOff(OFF);
      
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const semanaData = {
    promedioCiclos: 15,
    costoKWH: 0.15,
    hpEquivalente: 120,
  };
  
  const ciclosOptions = {
    tooltip: { show: true },
    series: [
      {
        type: "gauge",
        min: 0,
        max: 20,
        startAngle: 200,
        endAngle: -20,  
        animation: false,
        axisLine: {
          lineStyle: {
            width: 28,
            color: [
              [0.4, "#418FDE"], 
              [0.6, "green"],    
              [0.75, "yellow"],  
              [1, "red"],
            ],
          },
        },
        axisLabel: {
          show: true,
          color: "black",
          distance: -40,
          formatter: function(value: number) {
            if (value === 0) return '0';
            if (value === 30) return 'Max';
            return '';
          },
          fontSize: 16,
          fontWeight: "bold"
        },
        axisTick: { show: false},
        splitLine: { show: false},
        pointer: { itemStyle: { color: "black" }, length: "100%", width: 3},
        detail: {
          formatter: () => `${semanaData.promedioCiclos}`,
          fontSize: 18,
          offsetCenter: [0, "30%"],
          color:
            semanaData.promedioCiclos <= 8
              ? "#418FDE"
              : semanaData.promedioCiclos <= 12
              ? "green"
              : semanaData.promedioCiclos <= 15
              ? "yellow"
              : "red",
        },
        data: [{ value: semanaData.promedioCiclos }],
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
          formatter: function(value: number) {
            if (value === 30) return '30%';
            if (value === 100) return '100%';
            if (value === 120) return '120%';
            return '';
          },
          fontSize: 16,
          fontWeight: "bold"
        },
        axisTick: { show: false},
        splitLine: { show: false},
        pointer: { itemStyle: { color: "black" }, length: "100%", width: 3},
        detail: {
          formatter: () => `${semanaData.hpEquivalente}%`,
          fontSize: 18,
          offsetCenter: [0, "30%"],
          color: semanaData.hpEquivalente > 110
            ? "red"
            : semanaData.hpEquivalente > 99
            ? "black"
            : semanaData.hpEquivalente > 92
            ? "#418FDE"
            : semanaData.hpEquivalente > 79
            ? "green"
            : semanaData.hpEquivalente > 64
            ? "yellow"
            : "red",
        },
        data: [{ value: semanaData.hpEquivalente }],
      },
    ],
  };

  const costoOptions = {
    tooltip: { show: true },
    series: [
      {
        type: "gauge",
        min: 0.10,
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
          formatter: function(value: number) {
            if (value === 0.10) return '$0.10';
            if (value === 0.34) return '$0.34';
            return '';
          },
          fontSize: 16,
          fontWeight: "bold"
        },
        axisTick: { show: false},
        splitLine: { show: false},
        pointer: { itemStyle: { color: "black" }, length: "100%", width: 3},
        detail: {
          formatter: () => `$${semanaData.costoKWH}`,
          fontSize: 18,
          offsetCenter: [0, "30%"],
          color: semanaData.costoKWH <= 0.18 ? "green" :
          semanaData.costoKWH <= 0.22 ? "yellow" :
          "red",
        },
        data: [{ value: semanaData.costoKWH }],
      },
    ],
  };

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
        formatter: (value: any) => {
          return value + "%";
        },
      },
      legend: {
        display: true,
        position: "bottom",
      },
    },
    animation: {
      animate: false,
      duration: 0,
    },
  };

  useEffect(() => {
    if (lineChartData.length > 0 && chartData.length > 0) {
      window.status = "pdf-ready";
      setTimeout(() => {}, 250000);
    }
  }, [lineChartData, chartData]);

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
            <img
              src="/Ventologix_04.png"
              alt="logo"
              className="h-12 w-auto m-4"
            />

            <div className="flex flex-wrap gap-16 items-start text-white mr-10">
              {/* Client Information */}
              <div>
                <h2 className="text-2xl font-bold">Información Cliente</h2>
                <div className="flex flex-wrap gap-8 items-center text-left">
                  <div>
                    <p className="text-xl text-center">{clientData?.numero_cliente}</p>
                    <p className="text-sm">Número Cliente</p>
                  </div>
                  <div>
                    <p className="text-xl text-center">{clientData?.nombre_cliente}</p>
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
                    <p className="text-xl text-center">{compressorData?.numero_serie || "(En blanco)"}</p>
                    <p className="text-sm text-center">Número de serie</p>
                  </div>
                  <div>
                    <p className="text-xl text-center">{compressorData?.marca || "(En blanco)"}</p>
                    <p className="text-sm text-center">Marca</p>
                  </div>
                  <div>
                    <p className="text-xl text-center">{compressorData?.tipo}</p>
                    <p className="text-sm text-center">Tipo</p>
                  </div>
                  <div>
                    <p className="text-xl text-center">{compressorData?.voltaje}</p>
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
            <div className="bg-blue-500 text-white text-center px-4 py-2 w-40">Óptimo</div>
            <div className="bg-green-600 text-white text-center px-4 py-2 w-40">Bueno</div>
          </div>
          {/* Segunda fila */}
          <div className="flex">
            <div className="bg-yellow-400 text-black text-center px-4 py-2 w-40 font-bold">Intermedio</div>
            <div className="bg-red-600 text-white text-center px-4 py-2 w-40">Malo</div>
          </div>
        </div>

        {/* Gauges */}
        <div className="flex items-center gap-10 ml-50">
          <ReactECharts
            option={ciclosOptions}
            style={{ height: "280px", width: "350px" }}
            notMerge={true}
            lazyUpdate={true}
            theme={"light"}
          />
          <ReactECharts
            option={hpOptions}
            style={{ height: "280px", width: "350px" }}
            notMerge={true}
            lazyUpdate={true}
            theme={"light"}
          />
          <ReactECharts
            option={costoOptions}
            style={{ height: "280px", width: "350px" }}
            notMerge={true}
            lazyUpdate={true}
            theme={"light"}
          />
        </div>
      </div>

    </main>
  );
}
