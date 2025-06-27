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
      const [pieRes, lineRes, commentsRes, statsRes, clientRes, compressorRes] =
        await Promise.all([
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/pie-data-proc?id_cliente=${id}&linea=${linea}`
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/line-data-proc?id_cliente=${id}&linea=${linea}`
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/comments-data?id_cliente=${id}&linea=${linea}`
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/stats-data?id_cliente=${id}&linea=${linea}`
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8000/report/client-data?id_cliente=${id}&linea=${linea}`
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

      if (clientRes.data.length > 0) setClientData(clientRes.data[0]);
      if (compressorRes.data.length > 0)
        setCompresorData(compressorRes.data[0]);

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

      const times = rawData.map((item) =>
        item.time.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      const currents = rawData.map((item) => item.corriente);

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
  const porcentajeUso = hp_instalado
    ? (hp_equivalente / hp_instalado) * 100
    : 0;
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

  const semanaData = {
    promedioCiclos: 15,
    promedioHorasPorDia: 20,
    hpEquivalente: 120,
  };
  const ciclosOptions = {
    series: [
      {
        type: "gauge",
        min: 0,
        max: 30,
        animation: false,
        axisLine: {
          lineStyle: {
            width: 30,
            color: [
              [0.5, "red"],
              [0.8, "yellow"],
              [1, "green"],
            ],
          },
        },
        pointer: {
          itemStyle: { color: "black" },
        },
        detail: {
          formatter: () => `${semanaData.promedioCiclos.toFixed(1)} ciclos/hr`,
          fontSize: 20,
        },
        title: {
          offsetCenter: [0, "70%"],
          text: "Prom. Ciclos",
          fontSize: 14,
        },
        data: [{ value: semanaData.promedioCiclos }],
      },
    ],
  };

  const horasOptions = {
    series: [
      {
        type: "gauge",
        min: 0,
        max: 24,
        animation: false,
        axisLine: {
          lineStyle: {
            width: 30,
            color: [
              [0.3, "red"],
              [0.7, "yellow"],
              [1, "green"],
            ],
          },
        },
        pointer: {
          itemStyle: { color: "black" },
        },
        detail: {
          formatter: () =>
            `${semanaData.promedioHorasPorDia.toFixed(1)} hrs/día`,
          fontSize: 20,
        },
        title: {
          offsetCenter: [0, "70%"],
          text: "Prom. Horas",
          fontSize: 14,
        },
        data: [{ value: semanaData.promedioHorasPorDia }],
      },
    ],
  };

  const hpOptions = {
    series: [
      {
        type: "gauge",
        min: 0,
        max: 200,
        animation: false,
        axisLine: {
          lineStyle: {
            width: 30,
            color: [
              [0.5, "red"],
              [0.8, "yellow"],
              [1, "green"],
            ],
          },
        },
        pointer: {
          itemStyle: { color: "black" },
        },
        detail: {
          formatter: () => `${semanaData.hpEquivalente.toFixed(1)} HP`,
          fontSize: 20,
        },
        title: {
          offsetCenter: [0, "70%"],
          text: "HP Equiv",
          fontSize: 14,
        },
        data: [{ value: semanaData.hpEquivalente }],
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
          <div className="flex-1 mr-150 p-10 ">
            <h1 className="text-5xl font-light text-center">Reporte Semanal</h1>
            <h2 className="text-6xl font-bold text-center font-semibold font-stretch-extra-expanded tracking-wide">
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

            <div className="flex flex-wrap gap-16 items-start text-white mt-4">
              {/* Client Information */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Información Cliente</h2>
                <div className="flex flex-wrap gap-8 items-center text-left">
                  <div>
                    <p className="text-xl">{clientData?.numero_cliente}</p>
                    <p className="text-sm">Número Cliente</p>
                  </div>
                  <div>
                    <p className="text-xl">{clientData?.nombre_cliente}</p>
                    <p className="text-sm">Nombre</p>
                  </div>
                  <div>
                    <p className="text-xl">{clientData?.RFC}</p>
                    <p className="text-sm">RFC</p>
                  </div>
                </div>
              </div>

              {/* Compresor information */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Información Compresor</h2>
                <div className="flex flex-wrap gap-8 items-center text-left">
                  <div>
                    <p className="text-xl">{compressorData?.numero_serie || "(En blanco)"}</p>
                    <p className="text-sm">Número de serie</p>
                  </div>
                  <div>
                    <p className="text-xl">{compressorData?.marca || "(En blanco)"}</p>
                    <p className="text-sm">Marca</p>
                  </div>
                  <div>
                    <p className="text-xl">{compressorData?.tipo}</p>
                    <p className="text-sm">Tipo</p>
                  </div>
                  <div>
                    <p className="text-xl">{compressorData?.voltaje}</p>
                    <p className="text-sm">Voltaje</p>
                  </div>
                  <div>
                    <p className="text-xl">{compressorData?.hp}</p>
                    <p className="text-sm">HP</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-4 gap-6">
        {/* KPIs */}
        <div className="flex flex-row gap-8 mt-2">
          <div className="bg-white rounded-2xl shadow p-4 text-center w-[250px]">
            <h2 className="text-xl text-black">Gasto USD*</h2>
            <p className="text-3xl font-bold text-black">
              ${usdCost.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 text-center w-[250px]">
            <h2 className="text-xl text-black">kWh Utilizados</h2>
            <p className="text-3xl font-bold text-black">
              {kWh.toFixed(0)} kWh
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 text-center w-[250px]">
            <h2 className="text-xl text-black">Horas Trabajadas</h2>
            <p className="text-3xl font-bold text-black">
              {hoursWorked.toFixed(1)} h
            </p>
          </div>
        </div>

        {Off == 100 ? (
          <p className="text-5xl text-left mt-4 text-blue-700 text-bold">
            {" "}
            El compresor estuvo apagado todo el dia
          </p>
        ) : (
          <div className="gap-10 items-left justify-left text-left">
            <h1 className="text-3xl font-bold">Comentarios</h1>

            <p className="text-xl text-left">
              • El día de ayer{" "}
              <strong>
                (
                {new Date(
                  new Date().setDate(new Date().getDate() - 1)
                ).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
                )
              </strong>{" "}
              se iniciaron labores a las <strong>{firstHour}</strong> y se
              concluyeron a las <strong>{lastHour}</strong>
            </p>

            <p className="text-xl text-left mt-2">
              • Entre las horas de <strong>{firstHour}</strong> y{" "}
              <strong>{lastHour}</strong>, el compresor operó de la siguiente
              manera:
            </p>

            <ul className="list-disc ml-8 text-xl text-left">
              <li>
                <strong>LOAD:</strong> {Load}%
              </li>
              <li>
                <strong>NO LOAD:</strong> {NoLoad}%
              </li>
              <li>
                <strong>OFF:</strong> {Off}%
              </li>
            </ul>

            <p className="text-xl text-left mt-2">
              • Durante el día se completaron un total de{" "}
              <strong>{totalCiclos}</strong> ciclos de trabajo. Un ciclo se
              define como un cambio desde el estado <strong>LOAD</strong> a{" "}
              <strong>NO LOAD</strong> consecutivamente.
            </p>

            <p className="text-xl text-left mt-2">
              • El promedio de ciclos por hora trabajada fue de{" "}
              <strong>{promedioCiclosHora}</strong> ciclos/hora.
            </p>

            <p className="text-xl text-left mt-2">
              • El costo total de operación del compresor fue de{" "}
              <strong>${usdCost.toFixed(2)}</strong>.
            </p>

            <p className="text-xl text-left mt-2">• {comentarioCiclos}</p>

            <p className="text-xl text-left mt-2">
              • No se detectaron consumos con valores fuera de lo común.
            </p>

            <p className="text-xl text-left mt-2">• {comentarioHp}</p>

            <p className="text-xl text-left mt-2">
              • El costo por kilovatio-hora (kWh) utilizado en este análisis es
              de <strong>$0.17 USD/kWh</strong>, que es el estándar actualmente
              aplicado. Sin embargo, si requiere confirmar este valor o necesita
              ajustar la tarifa, puede verificar con su contacto en{" "}
              <strong>VENTOLOGIX</strong>
            </p>

            <h1 className="text-xl text-left mt-7 font-bold">
              IQgineer VENTOLOGIX asignado:
            </h1>
            <p className="text-xl text-left mt-2">
              <strong>Nombre:</strong> Ing. Andrés Mirazo
            </p>
            <p className="text-xl text-left mt-2">
              <strong>Teléfono:</strong> 81 8477 7023
            </p>
            <p className="text-xl text-left mt-2">
              <strong>Correo:</strong>{" "}
              <a
                href="mailto:Andres.Mirazo@ventologix.com"
                className="text-blue-600 hover:scale-120 hover:text-blue-800  duration-300"
              >
                Andres.Mirazo@ventologix.com
              </a>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
