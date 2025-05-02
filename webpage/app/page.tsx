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

// Components from anothers files
import TransitionPage from "@/components/transition-page";
import NavBar from "@/components/navBar";

import React, { useEffect, useState } from 'react';

// Libraries for charts
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement} from "chart.js";
import { Pie, Chart } from "react-chartjs-2";
import { useRef } from 'react';


// ECharts for the gauge chart
import ReactECharts from 'echarts-for-react';
// Removed unused import

import Boton from "@/components/refreshButton";
// Removed unused import
import { Chart as ChartJSInstance } from 'chart.js';

// Register the necessary components for Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement);



export default function Main() {
  const chartRef = useRef<ChartJSInstance>(null);

  const [chartData, setChartData] = useState([0, 0, 0]); // default values
  const [lineChartData, setLineChartData] = useState<number[]>([]); // default values
  const [lineChartLabels, setLineChartLabels] = useState<string[]>([]); // default labels
  const [maxData, setMaxData] = useState(0); // default max value
  const [gaugeValue, setGaugeValue] = useState<number>(0);

  const [clientData, setClientData] = useState<{
    numero_cliente: number;
    nombre_cliente: string;
    RFC: string;
    direccion: string;
  } | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/client-data")
      .then(response => response.json())
      .then(data => {
        if (data.data && data.data.length > 0) {
          setClientData(data.data[0]); // toma el primer elemento del array
        }
      })
      .catch(error => console.error("Error fetching client data:", error));
  }, []);

  const [compressorData, setCompresorData] = useState<{
    hp: number;
    tipo: string;
    voltaje: number;
    marca: string;
    numero_serie: number;
  } | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/compressor-data")
      .then(response => response.json())
      .then(data => {
        if (data.data && data.data.length > 0) {
          setCompresorData(data.data[0]); // toma el primer elemento del array
        }
      })
      .catch(error => console.error("Error fetching compressor data:", error));
    }, []);

  // const getGaugeOption = (gaugeValue) => ({
  //   series: [{
  //     type: 'gauge',
  //     startAngle: 155,
  //     endAngle: -75,
  //     min: 30,
  //     max: 120,
  //     splitNumber: 9,
  
  //     axisLine: {
  //       lineStyle: {
  //         width: 30,
  //         color: [
  //           [64/120, '#FF0000'],    // Rojo hasta 64
  //           [79/120, '#FFFF00'],    // Amarillo hasta 79
  //           [92/120, '#00FF00'],    // Verde hasta 92
  //           [99/120, '#418FDE'],    // Azul hasta 99
  //           [110/120, '#FFFF00'],   // Amarillo hasta 110
  //           [1,      '#FF0000']     // Rojo hasta 120
  //         ]
  //       }
  //     },
  
  //     pointer: {
  //       length: '75%',
  //       width: 6,
  //       itemStyle: {
  //         color: 'black'
  //       }
  //     },
  
  //     axisTick: {
  //       length: 10,
  //       lineStyle: {
  //         color: '#333',
  //         width: 2
  //       }
  //     },
  
  //     splitLine: {
  //       length: 20,
  //       lineStyle: {
  //         color: '#333',
  //         width: 4
  //       }
  //     },
  
  //     axisLabel: {
  //       fontSize: 14,
  //       color: '#333',
  //       formatter: function (val) {
  //         // Solo muestra los valores clave
  //         if ([30, 64, 79, 92, 99, 110, 120].includes(val)) {
  //           return val + '%';
  //         }
  //         return '';
  //       }
  //     },
  
  //     title: {
  //       fontSize: 18,
  //       offsetCenter: [0, '70%']
  //     },
  
  //     detail: {
  //       formatter: '{value}%',
  //       fontSize: 24,
  //       color: 'inherit'
  //     },
  
  //     data: [{
  //       value: gaugeValue,
  //       name: 'Uso Equivalente'
  //     }],
  
  //     // Línea negra fija sobre el 100%
  //     markLine: {
  //       silent: true,
  //       lineStyle: {
  //         color: 'black',
  //         width: 5
  //       },
  //       data: [
  //         [
  //           { coord: [100, 0], symbol: 'none' },
  //           { coord: [100, 1], symbol: 'none' }
  //         ]
  //       ]
  //     }
  //   }]
  // });  
    
  
const dataPie = {
  labels: ["LOAD", "NO LOAD", "OFF"], // Etiquetas para las secciones del gráfico
  datasets: [
    {
      label: "Estados del Compresor", // Título del gráfico
      data: chartData, // Los datos que provienen del backend
      backgroundColor: [
        "rgb(0, 191, 255)", // Color para "LOAD"
        "rgb(229, 255, 0)", // Color para "NO LOAD"
        "rgb(126, 126, 126)", // Color para "OFF"
      ],
      hoverOffset: 50, // Efecto al pasar el mouse
    },
  ],
};

useEffect(() => {
  if (chartRef.current) {
    const chart = chartRef.current;
    const ctx = chart.ctx;

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(13, 9, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(13, 9, 255, 0)');

    chart.data.datasets[0].backgroundColor = gradient;
    chart.update();
  }
}, [lineChartData]);

// Line boundaries options
const lineChartOptions = {
  responsive: true,
  scales: {
    y: {
      min: 0, // Lower boundary of the Y-axis
      max: maxData, // Upper boundary of the Y-axis
      ticks: {
        stepSize: 1,
      },
    },
  },
};

const dataLine = {
  labels: lineChartLabels, // Labels for the X-axis of the line chart
  datasets: [
    {
      label: 'Corriente consumida en el dia', // Title of the dataset
      data: lineChartData, // Data points for the line chart
      borderColor: 'rgb(13, 9, 255)', // Line color
      backgroundColor: 'rgba(82, 94, 255, 0.2)', // Area fill color
      fill: 'origin', // Fill from the origin of the Y-axis
      tension: 0.4, // Line smoothing
      pointBackgroundColor: 'rgb(13, 9, 255)', // Color of the data points
      pointRadius: 3, // Radius of the data points
      borderWidth: 2, // Width of the line
    }
  ],
};

  return (

    <main>
      <TransitionPage />
      <NavBar />
      {/* Here its the top section*/}
      <div className="flex flex-col items-center mb-3">
        <h1 className="text-3xl font-bold text-center">Reporte Diario</h1>
        <h2 className="text-2xl font-bold text-center">Compresor 1</h2>
        <h3 className="text-xl font-bold text-center">Fecha: {new Date().toLocaleDateString()}</h3>
        <img src="/Ventologix_03.png" alt="logo" className="h-10 w-45 mt-3 absolute top-0 right-0 m-3" />
      </div> 

      <div className="mt-4 p-4">

        <h2 className="text-xl font-bold mb-2">Información Compresor</h2>
        <div className="flex flex-row gap-60 items-center justify-center text-center">
          <div className="text-center">
            <p className="text-lg">{compressorData?.numero_serie}</p>
            <p className="text-l font-bold">Número de Serie</p>
          </div>
          <div className="text-center">
            <p className="text-lg">{compressorData?.marca}</p>
            <p className="text-l font-bold">Marca</p>
          </div>
          <div className="text-center">
            <p className="text-lg">{compressorData?.tipo}</p>
            <p className="text-l font-bold">Tipo</p>
          </div>
          <div className="text-center">
            <p className="text-lg">{compressorData?.voltaje}</p>
            <p className="text-l font-bold">Voltaje</p>
          </div>
          <div className="text-center">
            <p className="text-lg">{compressorData?.hp}</p>
            <p className="text-l font-bold">HP</p>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-2"> Informacion del Cliente </h2>
        <div className="flex flex-row gap-60 items-center justify-center text-center">
          <div className="text-center">
            <p className="text-lg">{clientData?.nombre_cliente}</p>
            <p className="text-l font-bold">Nombre</p>
          </div>
          <div className="text-center">
            <p className="text-lg">{clientData?.numero_cliente}</p>
            <p className="text-l font-bold">Número de Cliente</p>
          </div>
          <div className="text-center">
            <p className="text-lg">{clientData?.RFC}</p>
            <p className="text-l font-bold">RFC</p>
          </div>
          <div className="text-center">
            <p className="text-lg">{clientData?.direccion}</p>
            <p className="text-l font-bold">Direccion</p>
          </div>
        </div>
      </div>

  
        {/* Here its the graphs */}
      <div className="flex flex-col items-center justify-center min-h-[150vh] bg-gradient-to-b from-white to-gray-100">
        <
        <Boton 
          setChartData={setChartData} 
          setLineChartLabels={setLineChartLabels} 
          setLineChartData={setLineChartData} 
          setMaxCurrent={setMaxData}
          setGaugeValue={setGaugeValue}
        />
        <div className="w-[250px] h-[250px] mb-8">
          <Pie data={dataPie} />
        </div>
        <div className="w-[600px] h-[400px] mb-8">
          <Chart ref={chartRef} type='line' data={dataLine} options={lineChartOptions} />
        </div>
        <div className="w-[250px] h-[250px]">
        {/* <ReactECharts option={getGaugeOption(gaugeValue)} /> */}
        </div>
        <div className="">
          <h1>kWh utilizados</h1>
          <p></p>
        </div>
      </div>
    </main>
  );
}


/*

// const [chartData, setChartData] = useState([0, 0, 0]); // default values

  // useEffect(() => {
  //   fetch("http://127.0.0.1:8000/api/pie-data-proc") // URL of your FastAPI endpoint
  //     .then(response => response.json())
  //     .then(data => {
  //       const { LOAD, NOLOAD, OFF } = data.data;
  //       setChartData([LOAD, NOLOAD, OFF]);
  //     })
  //     .catch(error => console.error("Error fetching pie data:", error));
  // }, []);

  // const [lineChartData, setLineChartData] = useState<number[]>([]); // default values
  // const [lineChartLabels, setLineChartLabels] = useState<string[]>([]); // default labels
  // useEffect(() => { 
  //   fetch("http://127.0.0.1:8000/api/line-data-proc") // URL of your FastAPI endpoint
  //     .then(response => response.json())
  //     .then(data => {
  //       const times = data.data.map((item: { time: string }) =>
  //         new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  //       );        
  //       const currents = data.data.map((item: { corriente: number }) => item.corriente);
  //       setLineChartLabels(times);
  //       setLineChartData(currents);
  //     })
  //     .catch(error => console.error("Error fetching line data:", error));
  // }, []);
/*
const [gaugeChartData, setGaugeChartData] = useState([0, 0, 0]); // default values
useEffect(() => {
  fetch("http://127.0.0.1:8000/api/gauge-data") // URL of your FastAPI endpoint
    .then(response => response.json())
    .then(data => {
      const { LOAD, NOLOAD, OFF } = data.data;
      setChartData([LOAD, NOLOAD, OFF]);
    })
    .catch(error => console.error("Error fetching pie data:", error));
}, []);

*/