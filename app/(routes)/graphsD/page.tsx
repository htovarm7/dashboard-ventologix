/*
 * @file page.tsx
 * @date 23/04/2025
 * @author Hector Tovar
 *
 * @description
 * This file implements the daily graphs, including a Line Chart and a Gauge Chart using both Chart.js and ECharts.
 *
 * @version 1.0
 * http://localhost:3002/reportesD?id_cliente=10&linea=A
 */

"use client";

import React, { useCallback, useEffect, useState, Suspense } from "react";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "react-datepicker/dist/react-datepicker.css";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import annotationPlugin from "chartjs-plugin-annotation";
import { useAuthCheck } from "@/hooks/useAuthCheck";

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
import { putBlur } from "@/lib/reportsFunctions";

// ECharts for the gauge chart
import ReactECharts from "echarts-for-react";
import Image from "next/image";

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

import type {
  clientData,
  compressorData,
  dayData,
  LineData,
} from "@/lib/types";

function MainContent() {
  const router = useRouter();
  const { isAuthorized, isCheckingAuth } = useAuthCheck();

  const [chartData, setChartData] = useState([0, 0, 0]);
  const [lineChartData, setLineChartData] = useState<(number | null)[]>([]);
  const [lineChartLabels, setLineChartLabels] = useState<string[]>([]);
  const [maxData, setMaxData] = useState(0);
  const [Load, setLoad] = useState<number>(0);
  const [NoLoad, setNoLoad] = useState<number>(0);
  const [Off, setOff] = useState<number>(0);
  const [clientData, setClientData] = useState<clientData | null>(null);
  const [compressorData, setCompresorData] = useState<compressorData | null>(
    null
  );
  const [dayData, setDayData] = useState<dayData | null>(null);
  const [compresorAlias, setCompresorAlias] = useState<string>("");

  const fetchData = useCallback(async (id: string, linea: string) => {
    try {
      const [pieRes, lineRes, dayRes, clientRes, compressorRes] =
        await Promise.all([
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8080/report/pie-data-proc?id_cliente=${id}&linea=${linea}`
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8080/report/line-data-proc?id_cliente=${id}&linea=${linea}`
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8080/report/daily-report-data?id_cliente=${id}&linea=${linea}`
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8080/report/client-data?id_cliente=${id}`
            );
            return res.json();
          })(),
          (async () => {
            const res = await fetch(
              `http://127.0.0.1:8080/report/compressor-data?id_cliente=${id}&linea=${linea}`
            );
            return res.json();
          })(),
        ]);

      if (clientRes.data.length > 0) setClientData(clientRes.data[0]);
      if (compressorRes.data.length > 0)
        setCompresorData(compressorRes.data[0]);

      const { LOAD, NOLOAD, OFF } = pieRes.data;
      setChartData([LOAD, NOLOAD, OFF]);
      setLoad(LOAD);
      setNoLoad(NOLOAD);
      setOff(OFF);

      setDayData(dayRes.data);

      const rawData = (lineRes.data as LineData[]).map((item) => ({
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

      const currents: (number | null)[] = rawData.map((item) => item.corriente);

      if (!times.includes("23:59:59")) {
        times.push("23:59:59");
        currents.push(null);
      }

      console.log("clientRes:", clientRes);

      setLineChartLabels(times);
      setLineChartData(currents);
      setMaxData(
        Math.max(...currents.filter((c): c is number => c !== null)) * 1.3
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (isAuthorized) {
      const savedCompresor = sessionStorage.getItem("selectedCompresor");
      let id_cliente, linea;

      if (savedCompresor) {
        const compresorData = JSON.parse(savedCompresor);
        id_cliente = compresorData.id_cliente.toString();
        linea = compresorData.linea;
        setCompresorAlias(
          compresorData.alias || `Compresor ${id_cliente}-${linea}`
        );
      } else {
        id_cliente = searchParams.get("id_cliente");
        linea = searchParams.get("linea") || "A";
        setCompresorAlias(`Compresor ${id_cliente}-${linea}`);
      }

      if (id_cliente) {
        fetchData(id_cliente, linea);
      } else {
        console.error("No se encontró información del compresor");
        router.push("/home");
      }
    }
  }, [isAuthorized, searchParams, fetchData, router]);
  const limite = compressorData?.limite ?? 0;
  const hp_instalado = dayData?.hp_nominal ?? 0;
  const hp_equivalente = dayData?.hp_equivalente ?? 0;
  const porcentajeUso = hp_instalado
    ? (hp_equivalente / hp_instalado) * 100
    : 0;
  const aguja = Math.max(30, Math.min(120, porcentajeUso)); // Limita entre 30% y 120%

  const HpOptions = {
    series: [
      {
        type: "gauge",
        animation: false,
        min: 30,
        max: 120,
        startAngle: 200,
        endAngle: -20,
        axisLine: {
          lineStyle: {
            width: 28,
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
        axisLabel: {
          show: true,
          color: "black",
          distance: -50,
          formatter: function (value: number) {
            if (value === 30) return "0";
            if (value === 120) return "Max";
            return "";
          },
          fontSize: 16,
          fontWeight: "bold",
        },
        axisTick: { show: false },
        splitLine: { show: false },
        pointer: { itemStyle: { color: "black" }, length: "100%", width: 3 },
        detail: {
          formatter: () => `${porcentajeUso.toFixed(0)}%`,
          color: "black",
          fontSize: 20,
        },
        title: {
          offsetCenter: [0, "70%"],
          formatter: () =>
            `HP Equiv: ${hp_equivalente}\nHP Inst: ${hp_instalado}`,
          fontSize: 14,
        },
        data: [{ value: aguja }],
      },
    ],
  };

  const ciclosOptions = {
    series: [
      {
        type: "gauge",
        animation: false,
        min: 0,
        max: 30,
        startAngle: 200,
        endAngle: -20,
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
          distance: -45,
          formatter: (value: number) => {
            if (value === 0) return "0";
            if (value === 30)
              return (dayData?.promedio_ciclos_hora ?? 0) > 30 ? "Max" : "30+";
            return "";
          },
          fontSize: 14,
          fontWeight: "bold",
        },
        axisTick: { show: false },
        splitLine: { show: false },
        pointer: { itemStyle: { color: "black" }, length: "100%", width: 3 },
        detail: {
          formatter: () => `${dayData?.promedio_ciclos_hora}`,
          fontSize: 20,
        },
        title: {
          offsetCenter: [0, "75%"],
          formatter: () =>
            `Ciclos por hora (C/Hr): ${dayData?.promedio_ciclos_hora}`,
          fontSize: 14,
        },
        data: [
          {
            value:
              (dayData?.promedio_ciclos_hora ?? 0) > 30
                ? 30
                : dayData?.promedio_ciclos_hora ?? 0,
          },
        ],
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
          weight: "bold" as const,
          size: 18,
        },
        formatter: (value: string) => {
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

  // Line boundaries options
  const lineChartOptions = {
    responsive: true,
    animation: {
      duration: 0,
    },
    plugins: {
      datalabels: {
        display: false,
        color: "black",
        anchor: "end" as const,
        align: "top" as const,
        backgroundColor: null,
        borderWidth: 0,
        callout: {
          display: false,
        },
      },
      annotation: {
        annotations: {
          limite: {
            type: "line" as const,
            yMin: limite,
            yMax: limite,
            borderColor: "black",
            borderWidth: 4,
            label: {
              content: `Límite: ${limite} A`,
              enabled: false,
              position: "start" as const,
            },
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: maxData,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const dataLine = {
    labels: lineChartLabels,
    datasets: [
      {
        label: "Corriente consumida en el dia",
        data: lineChartData,
        borderColor: "rgb(13, 9, 255)",
        backgroundColor: "rgba(82, 94, 255, 0.2)",
        tension: 0.4,
        pointBackgroundColor: "rgb(13, 9, 255)",
        pointRadius: 1,
        borderWidth: 1,
        fill: "start",
      },
    ],
  };

  useEffect(() => {
    if (lineChartData.length > 0 && chartData.length > 0) {
      window.status = "pdf-ready";
      setTimeout(() => {}, 250000);
    }
  }, [lineChartData, chartData]);

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autorización...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">
            No autorizado para acceder a esta página
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative">
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => router.push("/home")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg
            className="w-4 h-4"
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
          Volver
        </button>
      </div>

      {/* Here its the top section*/}
      <div className="flex flex-col items-center mb-2">
        <h1 className="text-4xl font-bold text-center">Reporte Diario</h1>
        <h2 className="text-4xl font-bold text-center">
          {compresorAlias || compressorData?.alias}
        </h2>
        <h3 className="text-3xl font-bold text-center">
          Fecha:{" "}
          {new Date(new Date().setDate(new Date().getDate() - 1))
            .toLocaleDateString("es-ES", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
            .replace(/^\w/, (c) => c.toUpperCase())}
        </h3>
        <Image
          src="/Ventologix_04.png"
          alt="logo"
          className="h-28 w-auto mt-3 absolute top-0 left-0 m-3"
          width={300}
          height={100}
        />
      </div>

      <div className="mt-2 p-4">
        <h2 className="text-3xl font-bold p-15">Información Compresor</h2>
        <div className="flex flex-wrap gap-60 items-center justify-center text-center">
          <div className="text-center">
            <p className="text-2xl">{compressorData?.numero_serie}</p>
            <p className="text-xl font-bold">Número de Serie</p>
          </div>
          <div className="text-center">
            <p className="text-2xl">{compressorData?.marca}</p>
            <p className="text-xl font-bold">Marca</p>
          </div>
          <div className="text-center">
            <p className="text-2xl">{compressorData?.tipo}</p>
            <p className="text-xl font-bold">Tipo</p>
          </div>
          <div className="text-center">
            <p className="text-2xl">{compressorData?.voltaje}</p>
            <p className="text-xl font-bold">Voltaje</p>
          </div>
          <div className="text-center">
            <p className="text-2xl">{compressorData?.hp}</p>
            <p className="text-xl font-bold">HP</p>
          </div>
        </div>

        {/* Informaion del clinte */}
        <h2 className="text-3xl font-bold p-15"> Informacion del Cliente </h2>
        <div className="flex flex-wrap gap-60 items-center justify-center text-center">
          <div className="text-center">
            <p className="text-2xl">{clientData?.nombre_cliente}</p>
            <p className="text-xl font-bold">Nombre</p>
          </div>
          <div className="text-center">
            <p className="text-2xl">{clientData?.numero_cliente}</p>
            <p className="text-xl font-bold">Número de Cliente</p>
          </div>
          <div className="text-center">
            <p className="text-2xl">{clientData?.RFC}</p>
            <p className="text-xl font-bold">RFC</p>
          </div>
          {/* <div className="text-center">
            <p className="text-2xl">{clientData?.direccion}</p>
            <p className="text-xl font-bold">Direccion</p>
          </div> */}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-4 gap-6">
        {/* KPIs */}
        <div className="flex flex-row gap-8 mt-2">
          <div className="bg-white rounded-2xl shadow p-4 text-center w-[250px]">
            <h2 className="text-xl text-black">Gasto USD*</h2>
            <p className="text-3xl font-bold text-black">
              ${dayData?.costo_usd}
            </p>
          </div>
          <div
            className={`bg-white rounded-2xl shadow p-4 text-center w-[250px] ${putBlur(
              clientData?.demoDiario ?? false
            )}`}
          >
            <h2 className="text-xl text-black">kWh Utilizados</h2>
            <p className="text-3xl font-bold text-black">{dayData?.kWh} kWh</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 text-center w-[250px]">
            <h2 className="text-xl text-black">Horas Trabajadas</h2>
            <p className="text-3xl font-bold text-black">
              {dayData?.horas_trabajadas} h
            </p>
          </div>
        </div>

        {/* Gráficas */}
        <div
          className={`flex flex-row flex-wrap justify-center gap-4 ${putBlur(
            clientData?.demoDiario ?? false
          )}`}
          id="grafico-listo"
        >
          <div className="bg-white rounded-2xl shadow p-4 w-[280px] items-center justify-center">
            <h2 className="text-xl" style={{ textAlign: "center" }}>
              <strong>Hp Equivalente:</strong> {hp_equivalente} Hp
            </h2>
            <h2 className="text-xl" style={{ textAlign: "center" }}>
              <strong>Hp Instalado:</strong> {hp_instalado} Hp
            </h2>
            <ReactECharts
              option={HpOptions}
              style={{ height: "280px", width: "100%" }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
          </div>
          <div className="bg-white rounded-2xl shadow p-4 w-[280px] items-center justify-center">
            <h2 className="text-xl" style={{ textAlign: "center" }}>
              <strong>Ciclos por hora (C/hr):</strong>{" "}
              {dayData?.promedio_ciclos_hora}
            </h2>
            <br></br>
            <ReactECharts
              option={ciclosOptions}
              style={{ height: "280px", width: "100%" }}
              notMerge={true}
              lazyUpdate={true}
              theme={"light"}
            />
          </div>

          <div className="bg-white rounded-2xl shadow p-4 w-[650px] h-[400px] flex flex-col">
            <h3 className="text-center text-black mb-2 font-bold">
              Corriente consumida en el día
            </h3>
            <Chart type="line" data={dataLine} options={lineChartOptions} />
          </div>

          <div className="bg-white rounded-2xl shadow p-4 w-[280px] h-[400px] flex flex-col items-center justify-center">
            <h3 className="text-center text-black  font-bold text-xl">
              Estados del Compresor
            </h3>
            <Pie data={dataPie} options={pieOptions} />
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
              se iniciaron labores a las{" "}
              <strong>{dayData?.inicio_funcionamiento}</strong> y se concluyeron
              a las <strong>{dayData?.fin_funcionamiento}</strong>
            </p>

            <p className="text-xl text-left mt-2">
              • Entre las horas de{" "}
              <strong>{dayData?.inicio_funcionamiento}</strong> y{" "}
              <strong>{dayData?.fin_funcionamiento}</strong>, el compresor operó
              de la siguiente manera:
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
              <strong>{dayData?.ciclos}</strong> ciclos de trabajo. Un ciclo se
              define como un cambio desde el estado <strong>LOAD</strong> a{" "}
              <strong>NO LOAD</strong> consecutivamente.
            </p>

            <p className="text-xl text-left mt-2">
              • El promedio de ciclos por hora trabajada fue de{" "}
              <strong>{dayData?.promedio_ciclos_hora}</strong> ciclos/hora.
            </p>

            <p className="text-xl text-left mt-2">
              • El costo total de operación del compresor fue de{" "}
              <strong>${dayData?.costo_usd}</strong>.
            </p>

            <p className="text-xl text-left mt-2">
              • {dayData?.comentario_ciclos}
            </p>

            <p className="text-xl text-left mt-2">
              • No se detectaron consumos con valores fuera de lo común.
            </p>

            <p className="text-xl text-left mt-2">
              • {dayData?.comentario_hp_equivalente}
            </p>

            <p className="text-xl text-left mt-2">
              • El costo por kilovatio-hora (kWh) utilizado en este análisis es
              de <strong>${clientData?.costoUSD} USD/kWh</strong>, que es el
              estándar actualmente aplicado. Sin embargo, si requiere confirmar
              este valor o necesita ajustar la tarifa, puede verificar con su
              contacto en <strong>VENTOLOGIX</strong>
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
