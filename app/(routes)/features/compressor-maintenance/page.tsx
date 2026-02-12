"use client";

import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

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
    <div className="flex-1 bg-white p-8 flex items-center justify-center min-h-screen relative overflow-hidden">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      ></div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-2 h-2 bg-blue-300 rounded-full animate-pulse"
          style={{ top: "20%", left: "10%", animationDelay: "0s" }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-blue-200 rounded-full animate-pulse"
          style={{ top: "60%", left: "80%", animationDelay: "1s" }}
        ></div>
        <div
          className="absolute w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"
          style={{ top: "40%", left: "70%", animationDelay: "2s" }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-blue-200 rounded-full animate-pulse"
          style={{ top: "80%", left: "20%", animationDelay: "1.5s" }}
        ></div>
      </div>

      {rol !== 2 && (
        <div className="absolute top-8 left-8 z-20">
          <BackButton />
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-blue-600 mb-4">
            ¡Hola {user?.name}! 👋
          </h1>
          <p className="text-2xl text-gray-700">
            Bienvenido al panel de mantenimiento de compresores
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tabla de Mantenimientos */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-200 to-blue-300 rounded-2xl opacity-30 group-hover:opacity-40 blur-lg transition-all duration-300"></div>
            <button
              className="relative w-full h-full min-h-[280px] bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-300 rounded-2xl p-10 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center"
              onClick={() =>
                router.push("/features/compressor-maintenance/maintenance")
              }
            >
              <div className="text-center">
                <div className="text-5xl mb-5 transform group-hover:scale-110 transition-transform duration-300">
                  🔧
                </div>
                <h3 className="text-2xl font-bold text-blue-600 mb-3">
                  Tabla de Mantenimientos Activos
                </h3>
                <p className="text-gray-700 text-sm">
                  Visualiza y gestiona todos los mantenimientos activos de los
                  compresores
                </p>
              </div>
            </button>
          </div>

          {/* Reportes */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-green-200 to-green-300 rounded-2xl opacity-30 group-hover:opacity-40 blur-lg transition-all duration-300"></div>
            <button
              className="relative w-full h-full min-h-[280px] bg-white hover:bg-green-50 border-2 border-green-200 hover:border-green-300 rounded-2xl p-10 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center"
              onClick={() =>
                router.push("/features/compressor-maintenance/reports/")
              }
            >
              <div className="text-center">
                <div className="text-5xl mb-5 transform group-hover:scale-110 transition-transform duration-300">
                  📄
                </div>
                <h3 className="text-2xl font-bold text-green-600 mb-3">
                  Reportes
                </h3>
                <p className="text-gray-700 text-sm">
                  Ver historial de reportes generados.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const VentologixView = () => (
    <div className="flex-1 bg-white p-8 flex items-center justify-center min-h-screen relative overflow-hidden">
      {/* Animated background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      ></div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-2 h-2 bg-blue-300 rounded-full animate-pulse"
          style={{ top: "15%", left: "15%", animationDelay: "0s" }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-blue-200 rounded-full animate-pulse"
          style={{ top: "70%", left: "85%", animationDelay: "1s" }}
        ></div>
        <div
          className="absolute w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"
          style={{ top: "45%", left: "75%", animationDelay: "2s" }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-blue-200 rounded-full animate-pulse"
          style={{ top: "85%", left: "25%", animationDelay: "1.5s" }}
        ></div>
        <div
          className="absolute w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"
          style={{ top: "30%", left: "90%", animationDelay: "0.5s" }}
        ></div>
      </div>

      {rol !== 2 && (
        <div className="absolute top-8 left-8 z-20">
          <BackButton />
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-blue-600 mb-4">
            Hola {user?.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-2xl text-gray-700">
            Bienvenido al panel de mantenimiento de compresores
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Tabla de Mantenimientos */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-200 to-blue-300 rounded-2xl opacity-30 group-hover:opacity-40 blur-lg transition-all duration-300"></div>
            <button
              className="relative w-full h-full min-h-[280px] bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-300 rounded-2xl p-10 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center"
              onClick={() =>
                router.push("/features/compressor-maintenance/maintenance")
              }
            >
              <div className="text-center">
                <div className="text-5xl mb-5 transform group-hover:scale-110 transition-transform duration-300">
                  🔧
                </div>
                <h3 className="text-2xl font-bold text-blue-600 mb-3">
                  Tabla de Mantenimientos Activos
                </h3>
                <p className="text-gray-700 text-sm">
                  Visualiza y gestiona todos los mantenimientos activos de los
                  compresores
                </p>
              </div>
            </button>
          </div>

          {/* Reportes */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-green-200 to-green-300 rounded-2xl opacity-30 group-hover:opacity-40 blur-lg transition-all duration-300"></div>
            <button
              className="relative w-full h-full min-h-[280px] bg-white hover:bg-green-50 border-2 border-green-200 hover:border-green-300 rounded-2xl p-10 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center"
              onClick={() =>
                router.push("/features/compressor-maintenance/reports/")
              }
            >
              <div className="text-center">
                <div className="text-5xl mb-5 transform group-hover:scale-110 transition-transform duration-300">
                  📄
                </div>
                <h3 className="text-2xl font-bold text-green-600 mb-3">
                  Reportes
                </h3>
                <p className="text-gray-700 text-sm">
                  Ver historial de reportes generados.
                </p>
              </div>
            </button>
          </div>

          {/* Generar Reportes */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-200 to-purple-300 rounded-2xl opacity-30 group-hover:opacity-40 blur-lg transition-all duration-300"></div>
            <button
              className="relative w-full h-full min-h-[280px] bg-white hover:bg-purple-50 border-2 border-purple-200 hover:border-purple-300 rounded-2xl p-10 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center"
              onClick={() =>
                router.push(
                  "/features/compressor-maintenance/technician/reports",
                )
              }
            >
              <div className="text-center">
                <div className="text-5xl mb-5 transform group-hover:scale-110 transition-transform duration-300">
                  📋
                </div>
                <h3 className="text-2xl font-bold text-purple-600 mb-3">
                  Órdenes de Servicio
                </h3>
                <p className="text-gray-700 text-sm">
                  Crea y gestiona órdenes de servicio para mantenimiento
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
