"use client";
import React, { useEffect, useState } from "react";
import NavBar from "@/components/navBar";

function RawDataPage() {
  const [data, setData] = useState([]);

  // Cargar data al montar
  useEffect(() => {
    fetch("http://localhost:8000/api/raw-data")
      .then((response) => response.json())
      .then((json) => setData(json.data))
      .catch((error) => console.error("Error cargando datos:", error));
  }, []);

  // Descargar archivo Excel
  const handleDownload = async () => {
    const response = await fetch("http://localhost:8000/api/raw-data-excel");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "raw_data.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <main>
        <NavBar/>
        <div>
        <h1 className="text-2xl font-bold mb-4">Raw Data</h1>

        <button
            onClick={handleDownload}
            className="bg-green-600 text-white p-2 rounded mb-4"
        >
            Descargar Excel
        </button>

        <table className="w-full border">
            <thead>
            <tr className="bg-gray-200">
                <th className="border p-2">Time</th>
                <th className="border p-2">Corriente</th>
                <th className="border p-2">Estado</th>
                <th className="border p-2">Estado Anterior</th>
            </tr>
            </thead>
            <tbody>
            {data && data.length > 0 ? (
                data.map((item, idx) => (
                <tr key={idx}>
                    <td className="border p-2">{item.time}</td>
                    <td className="border p-2">{item.corriente}</td>
                    <td className="border p-2">{item.estado}</td>
                    <td className="border p-2">{item.estado_anterior}</td>
                </tr>
                ))
            ) : (
                <tr>
                <td colSpan="4" className="border p-2 text-center">
                    Cargando datos...
                </td>
                </tr>
            )}
            </tbody>
        </table>
        </div>
    );
    </main>
  );
}

export default RawDataPage;
