/*
  * @file page.tsx
  * @date 23/04/2025
  * @author Hector Tovar
  * 
  * @description
  * This file implements the daily graphs, including a Line Chart and a Gauge Chart using both Chart.js and ECharts.
  *
  * @version 1.0
  */

"use client"

import React, { useEffect, useState } from 'react';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import "react-datepicker/dist/react-datepicker.css";
import { useSearchParams } from "next/navigation";
import annotationPlugin from 'chartjs-plugin-annotation';

// Libraries for charts
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement } from "chart.js";
import { Pie, Chart } from "react-chartjs-2";

// ECharts for the gauge chart
import ReactECharts from 'echarts-for-react';

// Register the necessary components for Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, annotationPlugin, ChartDataLabels);

export default function Main() {

  // Constant Declarations
  const [chartData, setChartData] = useState([0, 0, 0]);
  const [lineChartData, setLineChartData] = useState<number[]>([]);
  const [lineChartLabels, setLineChartLabels] = useState<string[]>([]);
  const [maxData, setMaxData] = useState(0);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchData = async (id: string, linea: string) => {
    try {
      const [pieRes, lineRes, commentsRes, statsRes, clientRes, compressorRes] = await Promise.all([
        (async () => {
          const res = await fetch(`http://127.0.0.1:8000/report/pie-data-proc?id_cliente=${id}&linea=${linea}`);
          return res.json();
        })(),
        (async () => {
          const res = await fetch(`http://127.0.0.1:8000/report/line-data-proc?id_cliente=${id}&linea=${linea}`);
          return res.json();
        })(),
        (async () => {
          const res = await fetch(`http://127.0.0.1:8000/report/comments-data?id_cliente=${id}&linea=${linea}`);
          return res.json();
        })(),
        (async () => {
          const res = await fetch(`http://127.0.0.1:8000/report/stats-data?id_cliente=${id}&linea=${linea}`);
          return res.json();
        })(),
        (async () => {
          const res = await fetch(`http://127.0.0.1:8000/report/client-data?id_cliente=${id}&linea=${linea}`);
          return res.json();
        })(),
        (async () => {
          const res = await fetch(`http://127.0.0.1:8000/report/compressor-data?id_cliente=${id}&linea=${linea}`);
          return res.json();
        })(),
      ]);

      if (clientRes.data.length > 0) setClientData(clientRes.data[0]);
      if (compressorRes.data.length > 0) setCompresorData(compressorRes.data[0]);

      const stats = statsRes.data;
      setKWh(stats.kWh);
      setHoursWorked(stats.hours_worked);
      setUsdCost(stats.usd_cost);
      setHPNominal(stats.hp_nominal);
      setHPEquivalente(stats.hp_equivalente);
      setComentarioHp(stats.comentario_hp_equivalente);

      const comments = commentsRes.data;
      setFirstHour(comments.first_time);
      setLastHour(comments.last_time);
      setTotalCiclos(comments.total_ciclos);
      setPromedioCiclosHora(comments.promedio_ciclos_hora);
      setComentarioCiclos(comments.comentario_ciclos);

      const { LOAD, NOLOAD, OFF } = pieRes.data;
      setChartData([LOAD, NOLOAD, OFF]);

      setLoad(LOAD);
      setNoLoad(NOLOAD);
      setOff(OFF);

      const rawData = lineRes.data.map((item: any) => ({
        time: new Date(item.time),
        corriente: item.corriente,
      }));
      rawData.sort((a, b) => a.time.getTime() - b.time.getTime());

      const times = rawData.map(item =>
        item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      const currents = rawData.map(item => item.corriente);

      if (!times.includes("23:59:59")) {
        times.push("23:59:59");
        currents.push(null as any);
      }

      setLineChartLabels(times);
      setLineChartData(currents);
      setMaxData(Math.max(...currents.filter((c: any) => c !== null)) * 1.3);

    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const limite = compressorData?.limite ?? 0;
  const hp_instalado = hpNominal;
  const hp_equivalente = hpeq;
  const porcentajeUso = hp_instalado ? (hp_equivalente / hp_instalado) * 100 : 0;
  const aguja = Math.max(30, Math.min(120, porcentajeUso)); // Limita entre 30% y 120%

  function getColor(porcentaje: number) {
    if (porcentaje <= 64) return "red";
    if (porcentaje <= 79) return "black";
    if (porcentaje <= 92) return "green";
    if (porcentaje <= 99) return "#418FDE";
    if (porcentaje <= 110) return "black";
    if (porcentaje <= 120) return "red";
    return "black";
  }

  const gaugeOptions = {
    series: [
      {
        type: "gauge",
        animation: false,
        min: 30,
        max: 120,
        axisLine: {
          lineStyle: {
            width: 30,
            color: [
              [0.3, "red"],
              [0.53, "yellow"],
              [0.66, "green"],
              [0.83, "#418FDE"],
              [0.92, "yellow"],
              [1, "red"],
            ],
          },
        },
        pointer: {
          itemStyle: {
            color: "black",
          },
          length: "60%",
        },
        axisTick: {
          distance: -30,
          length: 0,
        },
        splitLine: {
          distance: -30,
          length: 0,
        },
        detail: {
          formatter: () => `${porcentajeUso.toFixed(0)}%`,
          color: getColor(porcentajeUso),
          fontSize: 20,
        },
        title: {
          offsetCenter: [0, "70%"],
          formatter: () => `HP Equiv: ${hp_equivalente}\nHP Inst: ${hp_instalado}`,
          fontSize: 14,
        },
        data: [{ value: aguja }],
      },
    ],
  };

  const dataPie = {
    labels: ["Horas LOAD", "Horas No Load", "Horas OF"],
    datasets: [
      {
        label: "Estados del Compresor",
        data: chartData,
        backgroundColor: [
          "rgb(47,105,173)",
          "rgb(152,217,222)",
          "rgb(81,144,216)",
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
    cutout: '0%',
    plugins: {
      datalabels: {
        color: 'black',
        font: {
          weight: 'bold',
          size: 18,
        },
        formatter: (value: any) => {
          return value + '%';
        },
      },
      legend: {
        display: true,
        position: 'bottom',
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
      setTimeout(() => {
      }, 250000);
    }
  }, [lineChartData, chartData]);

  return (
    <main className="relative">
        <h1>Hello</h1>
    </main>
  );
}
