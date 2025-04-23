/*
 * @file page.tsx
 * @date 23/04/2025
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
      <div>
        <h1 className="text-3xl font-bold mb-5 text-center">Diario</h1>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[100vh] bg-gradient-to-b from-white to-gray-100">
        <div className="w-[250px] h-[250px]">
          <Pie data={data} />
          <ReactECharts option={option} />
        </div>
      </div>
    </main>
  );
}
  