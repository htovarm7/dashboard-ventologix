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
import { Line, Pie, Chart } from "react-chartjs-2";
import { useRef } from 'react';


// ECharts for the gauge chart
import ReactECharts from 'echarts-for-react';
import { li } from "framer-motion/client";

import Boton from "@/components/refreshButton";
import Image from "next/image";
import { Chart as ChartJSInstance } from 'chart.js';

// Register the necessary components for Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement);



export default function Main() {
  const chartRef = useRef<ChartJSInstance>(null);

  const [chartData, setChartData] = useState([0, 0, 0]); // default values
  const [lineChartData, setLineChartData] = useState<number[]>([]); // default values
  const [lineChartLabels, setLineChartLabels] = useState<string[]>([]); // default labels
  const [maxData, setMaxData] = useState(0); // default max value

// Gauge chart configuration for ECharts
const option = {
  series: [
    {
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      center: ['50%', '75%'],
      radius: '90%',
      min: 0,
      max: 1,
      splitNumber: 8,
      axisLine: {
        lineStyle: {
          width: 6,
          color: [
            [0.25, '#FF6E76'],
            [0.5, '#FDDD60'],
            [0.75, '#58D9F9'],
            [1, '#7CFFB2']
          ]
        }
      },
      pointer: {
        icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
        length: '12%',
        width: 20,
        offsetCenter: [0, '-60%'],
        itemStyle: {
          color: 'auto'
        }
      },
      axisTick: {
        length: 12,
        lineStyle: {
          color: 'auto',
          width: 2
        }
      },
      splitLine: {
        length: 20,
        lineStyle: {
          color: 'auto',
          width: 5
        }
      },
      axisLabel: {
        color: '#464646',
        fontSize: 20,
        distance: -60,
        rotate: 'tangential',
        formatter: function (value: number) {
          if (value === 0.875) {
            return 'Grade A';
          } else if (value === 0.625) {
            return 'Grade B';
          } else if (value === 0.375) {
            return 'Grade C';
          } else if (value === 0.125) {
            return 'Grade D';
          }
          return '';
        }
      },
      title: {
        offsetCenter: [0, '-10%'],
        fontSize: 20
      },
      detail: {
        fontSize: 30,
        offsetCenter: [0, '-35%'],
        valueAnimation: true,
        formatter: function (value: number) {
          return Math.round(value * 100) + '';
        },
        color: 'inherit'
      },
      data: [
        {
          value: 0.7,
          name: 'Grade Rating'
        }
      ]
    }
  ]
};

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
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-bold text-center flex-1">Reporte Diario</h1>
        <img src="/Ventologix_03.png" alt="logo" className="h-7 w-35 px" />
      </div>
      <div className="flex flex-col items-center justify-center min-h-[150vh] bg-gradient-to-b from-white to-gray-100">
        <Boton 
          setChartData={setChartData} 
          setLineChartLabels={setLineChartLabels} 
          setLineChartData={setLineChartData} 
          setMaxCurrent={setMaxData}
        />
        <div className="w-[250px] h-[250px] mb-8">
          <Pie data={dataPie} />
        </div>
        <div className="w-[600px] h-[400px] mb-8">
          <Chart ref={chartRef} type='line' data={dataLine} options={lineChartOptions} />
        </div>
        <div className="w-[250px] h-[250px]">
          <ReactECharts option={option} />
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