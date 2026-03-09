"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { URL_API } from "@/lib/global";

interface MaquinaPorCliente {
  [key: string]: string | number | null;
}

const ALLOWED_ROLES = [0, 1, 2, 9];

const DoobleInfo = () => {
  const router = useRouter();
  const [data, setData] = useState<MaquinaPorCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authorization on mount
  useEffect(() => {
    const userData = sessionStorage.getItem("userData");
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        const userRole = parsedData.rol;

        if (ALLOWED_ROLES.includes(userRole)) {
          setIsAuthorized(true);
        } else {
          console.warn(`Unauthorized access attempt by rol ${userRole}`);
          router.push("/home");
          return;
        }
      } catch (error) {
        console.error("Error parsing userData:", error);
        router.push("/home");
        return;
      }
    } else {
      router.push("/home");
      return;
    }
    setCheckingAuth(false);
  }, [router]);

  // Fetch data only if authorized
  useEffect(() => {
    if (!isAuthorized || checkingAuth) return;

    const fetchData = async () => {
      try {
        const response = await fetch(`${URL_API}/dooble/maquinas-por-cliente`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError("Error al cargar los datos");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthorized, checkingAuth]);

  if (checkingAuth || (isAuthorized && loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  // Get column headers from first row
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="p-6 relative">
      <button
        onClick={() => router.push("/home")}
        className="absolute top-4 left-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        title="Volver al inicio"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      </button>
      <h1 className="text-2xl font-bold mb-6 ml-10">
        Dooble - Máquinas por Cliente
      </h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <span className="text-sm text-gray-600">
            Total: {data.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td
                      key={`${rowIndex}-${column}`}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {row[column] !== null ? String(row[column]) : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DoobleInfo;
