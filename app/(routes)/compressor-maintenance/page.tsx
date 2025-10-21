"use client";

import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";

const Home = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const [rol, setRol] = useState<number | null>(null);

  useEffect(() => {
    const userData = sessionStorage.getItem("userData");

    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        setRol(parsedData.rol);
      } catch (error) {
        console.error("Error parsing userData from sessionStorage:", error);
        sessionStorage.removeItem("userData");
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  const ClientView = () => (
    <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            ¡Hola {user?.name}! 👋
          </h1>
          <p className="text-xl text-gray-600">
            Bienvenido al panel de mantenimiento de compresores
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="group">
            <button
              className="w-full bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-400 rounded-xl p-8 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              onClick={() => router.push("/compressor-maintenance/maintenance")}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">🔧</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Tabla de Mantenimientos
                </h3>
                <p className="text-gray-600 text-sm">
                  Gestiona y monitorea todos tus mantenimientos en tus
                  compresores
                </p>
              </div>
            </button>
          </div>

          <div className="group">
            <button
              className="w-full bg-white hover:bg-green-50 border-2 border-green-200 hover:border-green-400 rounded-xl p-8 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              onClick={() =>
                router.push("/compressor-maintenance/client/prev-maintenance")
              }
            >
              <div className="text-center">
                <div className="text-4xl mb-4">📅</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Mantenimientos previos
                </h3>
                <p className="text-gray-600 text-sm">
                  Ver historial de mantenimientos
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const VentologixView = () => (
    <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            ¡Hola Air Specialist Technician! 👋
          </h1>
          <p className="text-xl text-gray-600">
            Bienvenido al panel de mantenimiento de compresores
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group">
            <button
              className="w-full bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-400 rounded-xl p-8 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              onClick={() => router.push("/compressor-maintenance/maintenance")}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">🔧</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Tabla de Compresores
                </h3>
                <p className="text-gray-600 text-sm">
                  Gestiona y monitorea todos los compresores
                </p>
              </div>
            </button>
          </div>

          <div className="group">
            <button
              className="w-full bg-white hover:bg-green-50 border-2 border-green-200 hover:border-green-400 rounded-xl p-8 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              onClick={() =>
                router.push("/compressor-maintenance/technician/views")
              }
            >
              <div className="text-center">
                <div className="text-4xl mb-4">📅</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Visitas
                </h3>
                <p className="text-gray-600 text-sm">
                  Ver historial de visitas y mantenimientos
                </p>
              </div>
            </button>
          </div>

          <div className="group">
            <button
              className="w-full bg-white hover:bg-purple-50 border-2 border-purple-200 hover:border-purple-400 rounded-xl p-8 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              onClick={() =>
                router.push("/compressor-maintenance/technician/reports")
              }
            >
              <div className="text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Reportes
                </h3>
                <p className="text-gray-600 text-sm">
                  Genera reportes de mantenimiento
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return rol === 3 || rol === 4 ? <ClientView /> : <VentologixView />;
};

export default Home;
