"use client";


// components/refreshButton.tsx
import React from "react";

type BotonProps = {
    setChartData: React.Dispatch<React.SetStateAction<number[]>>;
    setLineChartLabels: React.Dispatch<React.SetStateAction<string[]>>;
    setLineChartData: React.Dispatch<React.SetStateAction<number[]>>;
    setMaxCurrent: React.Dispatch<React.SetStateAction<number>>;
    setGaugeValue: React.Dispatch<React.SetStateAction<number>>;
};

const Boton: React.FC<BotonProps> = ({ setChartData, setLineChartLabels, setLineChartData, setMaxCurrent, setGaugeValue }) => {
    const handleClick = () => {
        // Pie chart data
        fetch("http://127.0.0.1:8000/api/pie-data-proc")
            .then((response) => response.json())
            .then((data) => {
                const { LOAD, NOLOAD, OFF } = data.data;
                setChartData([LOAD, NOLOAD, OFF]);
            })
            .catch((error) => console.error("Error fetching pie data:", error));

        // Line chart data
        fetch("http://127.0.0.1:8000/api/line-data-proc")
            .then((response) => response.json())
            .then((data) => {
                const rawData = data.data.map((item: { time: string, corriente: number }) => ({
                    time: new Date(item.time),
                    corriente: item.corriente
                }));

                // Ordenar por tiempo
                rawData.sort((a: { time: Date }, b: { time: Date }) => a.time.getTime() - b.time.getTime());

                const times = rawData.map((item: { time: Date }) =>
                    item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                );
                const currents = rawData.map((item: { corriente: number }) => item.corriente);

                // Agregar 23:59:59 si no está al final
                if (!times.includes("23:59:59")) {
                    times.push("23:59:59");
                    currents.push(null); // o puedes poner currents.at(-1), o 0
                }

                setLineChartLabels(times);
                setLineChartData(currents);
                setMaxCurrent(Math.max(...currents) + (Math.max(...currents)*0.30)); // Actualizar el valor máximo
            })
            .catch((error) => console.error("Error fetching line data:", error));
        
            fetch("http://127.0.0.1:8000/api/gauge-data-proc")
                .then(response => response.json())
                .then(data => {
                    setGaugeValue(data.porcentaje_uso);
                })
                .catch(error => console.error("Error fetching gauge data:", error));
    };

    return (
        <button
            onClick={handleClick}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 hover:scale-110 duration-400   transition-transform"
        >
            Refresh Data
        </button>
    );
};

export default Boton;