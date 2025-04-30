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
import { usePathname } from "next/navigation";

import React, { useEffect, useState } from 'react';

// Libraries for charts
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement} from "chart.js";
import { Line, Pie } from "react-chartjs-2";

// ECharts for the gauge chart
import ReactECharts from 'echarts-for-react';


// Register the necessary components for Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement);

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

// Line chart data with boundaries
const lineChartData = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June'],
  datasets: [
    {
      label: 'Corriente consumida en el día',
      data: [65, 59, 80, 81, 56, 55],
      borderColor: 'rgb(13, 9, 255)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      fill: true,
    }
  ],
};

// Line bOundaries options
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

export default function Main() {
  const [chartData, setChartData] = useState([300, 50, 100]); // default values

  useEffect(() => {
    fetch("http://localhost:8000/api/pie-data") // URL of your FastAPI endpoint
      .then(response => response.json())
      .then(data => {
        setChartData(data.data);
      })
      .catch(error => console.error("Error fetching pie data:", error));
  }, []);

  const dataPie = {
    labels: ['LOAD', 'NO LOAD', 'OFF'],
    datasets: [{
      label: 'Estados del Compresor',
      data: chartData,
      backgroundColor: [
        'rgb(0, 191, 255)',
        'rgb(229, 255, 0)',
        'rgb(126, 126, 126)'
      ],
      hoverOffset: 50
    }]
  };

  return (
    <main>
      <TransitionPage />
      <NavBar />
      <div>
        <h1 className="text-3xl font-bold mb-5 text-center">Reporte Diario</h1>
        <img src="public/Ventologix_03.png" alt="logo"/>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[150vh] bg-gradient-to-b from-white to-gray-100">
        <div className="w-[250px] h-[250px] mb-8">
          <Pie data={dataPie} />
        </div>
        <div className="w-[600px] h-[400px] mb-8">
          <Line data={lineChartData} options={lineChartOptions} />
        </div>
        <div className="w-[250px] h-[250px]">
          <ReactECharts option={option} />
        </div>
      </div>
    </main>
  );
}
