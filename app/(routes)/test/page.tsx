"use client"

import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Si usas react-chartjs-2 o similar
  import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement} from "chart.js";
  import { Pie, Chart} from "react-chartjs-2";

  ChartJS.register(ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement);


const LineChartWithDateFilter: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [lineChartLabels, setLineChartLabels] = useState<string[]>([]);
  const [lineChartData, setLineChartData] = useState<number[]>([]);
  const [maxData, setMaxData] = useState<number>(0);

  useEffect(() => {
    const formattedDate = selectedDate.toISOString().split("T")[0];

    fetch(`http://127.0.0.1:8000/api/line-data-proc-date?fecha=${formattedDate}`)
      .then((response) => response.json())
      .then((data) => {
        const rawData = data.data.map((item: { time: string, corriente: number }) => ({
          time: new Date(item.time),
          corriente: item.corriente,
        }));

        rawData.sort((a, b) => a.time.getTime() - b.time.getTime());

        const times = rawData.map((item) =>
          item.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );

        const currents = rawData.map((item) => item.corriente);

        if (!times.includes("23:59:59")) {
          times.push("23:59:59");
          currents.push(null);
        }

        setLineChartLabels(times);
        setLineChartData(currents);
        setMaxData(Math.max(...currents.filter(c => c !== null)) * 1.3);
      })
      .catch((error) => console.error("Error fetching line data:", error));
  }, [selectedDate]);

  const chartData = {
    labels: lineChartLabels,
    datasets: [
      {
        label: "Corriente",
        data: lineChartData,
        fill: false,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        suggestedMax: maxData,
      },
    },
  };

  return (
    <div>
      <h2>Gráfica de Corriente</h2>
      <DatePicker
        selected={selectedDate}
        onChange={(date) => setSelectedDate(date as Date)}
        dateFormat="yyyy-MM-dd"
      />
      <Chart type="line" data={chartData} options={chartOptions} />
    </div>
  );
};

export default LineChartWithDateFilter;
