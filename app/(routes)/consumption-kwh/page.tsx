"use client";

import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";

// Registrar componentes de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Mock Data - Datos de ejemplo
const mockAmperageData = {
    labels: [
        "00:00", "02:00", "04:00", "06:00", "08:00", "10:00",
        "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"
    ],
    datasets: [
        {
            label: "Fase A (A)",
            data: [45, 42, 38, 52, 68, 75, 82, 78, 71, 65, 58, 48],
            borderColor: "rgb(239, 68, 68)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            tension: 0.4,
            fill: true,
        },
        {
            label: "Fase B (A)",
            data: [43, 40, 36, 50, 66, 73, 80, 76, 69, 63, 56, 46],
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
            fill: true,
        },
        {
            label: "Fase C (A)",
            data: [44, 41, 37, 51, 67, 74, 81, 77, 70, 64, 57, 47],
            borderColor: "rgb(34, 197, 94)",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            tension: 0.4,
            fill: true,
        },
    ],
};

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: "top" as const,
            labels: {
                font: {
                    size: 12,
                },
                usePointStyle: true,
                padding: 15,
            },
        },
        title: {
            display: true,
            text: "Monitoreo de Amperaje - Últimas 24 Horas",
            font: {
                size: 18,
                weight: "bold" as const,
            },
            padding: {
                top: 10,
                bottom: 30,
            },
        },
        tooltip: {
            mode: "index" as const,
            intersect: false,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: {
                size: 14,
            },
            bodyFont: {
                size: 13,
            },
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: {
                color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
                callback: function(value: string | number) {
                    return value + " A";
                },
            },
            title: {
                display: true,
                text: "Amperaje (A)",
                font: {
                    size: 14,
                    weight: "bold" as const,
                },
            },
        },
        x: {
            grid: {
                color: "rgba(0, 0, 0, 0.05)",
            },
            title: {
                display: true,
                text: "Hora del día",
                font: {
                    size: 14,
                    weight: "bold" as const,
                },
            },
        },
    },
    interaction: {
        mode: "nearest" as const,
        axis: "x" as const,
        intersect: false,
    },
};

// Mock Data - Estadísticas resumen
const mockStats = {
    faseA: {
        promedio: 62.5,
        maximo: 82,
        minimo: 38,
        actual: 48,
    },
    faseB: {
        promedio: 60.7,
        maximo: 80,
        minimo: 36,
        actual: 46,
    },
    faseC: {
        promedio: 61.6,
        maximo: 81,
        minimo: 37,
        actual: 47,
    },
    consumoTotal: 1847.5, // kWh
    costoEstimado: 12540.75, // MXN
};

const ConsumptionKwH = () => {
    const { user, isAuthenticated, isLoading } = useAuth0();
    const router = useRouter();
    const [rol, setRol] = useState<number | null>(null);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const userData = sessionStorage.getItem("userData");

        if (userData) {
            try {
                const parsedData = JSON.parse(userData);
                setRol(parsedData.rol);
                
                // Solo roles 0 y 1 pueden acceder
                if (parsedData.rol === 0 || parsedData.rol === 1) {
                    setIsAuthorized(true);
                } else {
                    setIsAuthorized(false);
                }
            } catch (error) {
                console.error("Error parsing userData from sessionStorage:", error);
                sessionStorage.removeItem("userData");
                setIsAuthorized(false);
            }
        }
    }, [isAuthenticated, user, isLoading, router]);

    if (!isAuthorized && rol !== null) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Pagina en desarrollo</h2>
                        <p className="text-gray-600 mb-6">
                            Esta sección está en desarrollo y no está disponible en este momento.
                        </p>
                        <button
                            onClick={() => router.push("/home")}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    if (rol === null) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Verificando permisos...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <BackButton />

            <div className="max-w-7xl mx-auto mt-6">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">
                        Monitoreo de Consumo Eléctrico
                    </h1>
                </div>


                {/* Tarjeta Consumo Total */}
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg p-8 text-white transform transition hover:scale-105 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-semibold">Consumo Total</h3>
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm opacity-90 mb-2">Últimas 24 horas</p>
                            <p className="text-4xl font-bold">{mockStats.consumoTotal.toLocaleString()} kWh</p>
                        </div>
                        <div className="md:pl-6 md:border-l border-white/30">
                            <p className="text-sm opacity-90 mb-2">Costo Estimado</p>
                            <p className="text-4xl font-bold">${mockStats.costoEstimado.toLocaleString()} MXN</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <div className="h-[500px]">
                        <Line data={mockAmperageData} options={chartOptions} />
                    </div>
                </div>
            </div>
        </main>
    );
};

export default ConsumptionKwH;