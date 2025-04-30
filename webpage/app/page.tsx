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
import { Line, Pie } from "react-chartjs-2";

// ECharts for the gauge chart
import ReactECharts from 'echarts-for-react';
import { li } from "framer-motion/client";

import Boton from "@/components/refreshButton";



// Register the necessary components for Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement);



export default function Main() {
  const [chartData, setChartData] = useState([0, 0, 0]); // default values
  const [lineChartData, setLineChartData] = useState<number[]>([]); // default values
  const [lineChartLabels, setLineChartLabels] = useState<string[]>([]); // default labels

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


// Line boundaries options
const lineChartOptions = {
  responsive: true,
  scales: {
    y: {
      min: 50, // Lower boundary of the Y-axis
      max: 100, // Upper boundary of the Y-axis
      ticks: {
        stepSize: 10,
      },
    },
  },
};

const dataLine = {
  labels: lineChartLabels, // <- Esto toma los tiempos del backend como etiquetas del eje X
  datasets: [
    {
      label: 'Corriente consumida en el día',
      data: lineChartData, // <- Corrientes asociadas a cada tiempo
      borderColor: 'rgb(13, 9, 255)',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      fill: true,
      tension: 0.4, // hace la línea más suave
    }
  ],
};


  return (

    <main>
      <TransitionPage />
      <NavBar />
      <div>
        <h1 className="text-3xl font-bold mb-5 text-center">Reporte Diario</h1>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[150vh] bg-gradient-to-b from-white to-gray-100">
        <Boton 
          setChartData={setChartData} 
          setLineChartLabels={setLineChartLabels} 
          setLineChartData={setLineChartData} 
        />
        <div className="w-[250px] h-[250px] mb-8">
          <Pie data={dataPie} />
        </div>
        <div className="w-[600px] h-[400px] mb-8">
          <Line data={dataLine} options={lineChartOptions} />
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