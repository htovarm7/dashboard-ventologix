/*
 * @file page.tsx
 * @date 22/04/2025
 * @author Hector Tovar
 * 
 * @description
 * This file implements the daily graphs, such as the pie chart and the gauge chart.
 *
 * @version 1.0
*/

"use client" 

import TransitionPage from "@/components/transition-page";
import { Pie } from "react-chartjs-2";
import {
 Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import ReactECharts from 'echarts-for-react';
import React, { useEffect, useState } from 'react';


ChartJS.register(ArcElement, Tooltip, Legend);

const [chartData, setChartData] = useState([300, 50, 100]); // valores por defecto

  useEffect(() => {
    fetch("http://localhost:8000/api/pie-data") // URL de tu API en FastAPI
      .then(response => response.json())
      .then(data => {
        setChartData(data.data);
      })
      .catch(error => console.error("Error fetching pie data:", error));
  }, []);


// Pie graph
const data = {
  labels: ['Red', 'Blue', 'Yellow'],
  datasets: [{
    label: 'My First Dataset',
    data: chartData,
    backgroundColor: [
      'rgb(255, 99, 132)',
      'rgb(54, 162, 235)',
      'rgb(255, 205, 86)'
    ],
    hoverOffset: 4
  }]
};

// Gauge graph
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



export default function Main() {
  return (
    <main>
      <TransitionPage />
      <div className="flex flex-col items-center justify-center min-h-[100vh] bg-gradient-to-b from-white to-gray-100">
        <h1 className="text-2xl font-bold mb-6">Diario</h1>
        <div className="w-full max-w-md mx-auto">
          <Pie data={data} />
          {/* <ReactECharts option={option} />; */}
        </div>
      </div>
    </main>
  );
}
  