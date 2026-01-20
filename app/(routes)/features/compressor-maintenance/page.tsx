"use client";

import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import { URL_API } from "@/lib/global";

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
    <div className="flex-1 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8 flex items-center justify-center min-h-screen relative overflow-hidden">
      {/* Animated background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      ></div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-2 h-2 bg-cyan-400 rounded-full animate-pulse"
          style={{ top: "20%", left: "10%", animationDelay: "0s" }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-blue-400 rounded-full animate-pulse"
          style={{ top: "60%", left: "80%", animationDelay: "1s" }}
        ></div>
        <div
          className="absolute w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse"
          style={{ top: "40%", left: "70%", animationDelay: "2s" }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-blue-300 rounded-full animate-pulse"
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
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 mb-4 animate-pulse">
            ¡Hola {user?.name}! 👋
          </h1>
          <p className="text-2xl text-cyan-200/90">
            Bienvenido al panel de mantenimiento de compresores
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mantenimientos */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-50 group-hover:opacity-100 blur-lg transition-all duration-300"></div>
            <button
              className="relative w-full h-full min-h-[280px] bg-gradient-to-br from-slate-800 to-blue-900 hover:from-slate-700 hover:to-blue-800 border-2 border-cyan-500/50 hover:border-cyan-400 rounded-2xl p-10 transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center"
              onClick={() =>
                router.push("/features/compressor-maintenance/maintenance")
              }
            >
              <div className="text-center">
                <div className="text-5xl mb-5 transform group-hover:scale-110 transition-transform duration-300">
                  🔧
                </div>
                <h3 className="text-2xl font-bold text-cyan-300 mb-3">
                  Mantenimientos
                </h3>
                <p className="text-cyan-100/80 text-sm">
                  Visualiza los mantenimientos realizados en tus compresores.
                </p>
              </div>
            </button>
          </div>

          {/* Mis Reportes */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl opacity-50 group-hover:opacity-100 blur-lg transition-all duration-300"></div>
            <button
              className="relative w-full h-full min-h-[280px] bg-gradient-to-br from-slate-800 to-emerald-900 hover:from-slate-700 hover:to-emerald-800 border-2 border-emerald-500/50 hover:border-emerald-400 rounded-2xl p-10 transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center"
              onClick={() =>
                router.push("/features/compressor-maintenance/views")
              }
            >
              <div className="text-center">
                <div className="text-5xl mb-5 transform group-hover:scale-110 transition-transform duration-300">
                  📅
                </div>
                <h3 className="text-2xl font-bold text-emerald-300 mb-3">
                  Mis Reportes
                </h3>
                <p className="text-emerald-100/80 text-sm">
                  Accede a todos tus reportes de mantenimiento
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const VentologixView = () => (
    <div className="flex-1 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8 flex items-center justify-center min-h-screen relative overflow-hidden">
      {/* Animated background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      ></div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-2 h-2 bg-cyan-400 rounded-full animate-pulse"
          style={{ top: "15%", left: "15%", animationDelay: "0s" }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-blue-400 rounded-full animate-pulse"
          style={{ top: "70%", left: "85%", animationDelay: "1s" }}
        ></div>
        <div
          className="absolute w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse"
          style={{ top: "45%", left: "75%", animationDelay: "2s" }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-blue-300 rounded-full animate-pulse"
          style={{ top: "85%", left: "25%", animationDelay: "1.5s" }}
        ></div>
        <div
          className="absolute w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"
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
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 mb-4 animate-pulse">
            Hola {user?.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-2xl text-cyan-200/90">
            Bienvenido al panel de mantenimiento de compresores
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Tabla de Mantenimientos */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-50 group-hover:opacity-100 blur-lg transition-all duration-300"></div>
            <button
              className="relative w-full h-full min-h-[280px] bg-gradient-to-br from-slate-800 to-blue-900 hover:from-slate-700 hover:to-blue-800 border-2 border-cyan-500/50 hover:border-cyan-400 rounded-2xl p-10 transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center"
              onClick={() =>
                router.push("/features/compressor-maintenance/maintenance")
              }
            >
              <div className="text-center">
                <div className="text-5xl mb-5 transform group-hover:scale-110 transition-transform duration-300">
                  🔧
                </div>
                <h3 className="text-2xl font-bold text-cyan-300 mb-3">
                  Tabla de Mantenimientos Activos
                </h3>
                <p className="text-cyan-100/80 text-sm">
                  Visualiza y gestiona todos los mantenimientos activos de los
                  compresores
                </p>
              </div>
            </button>
          </div>

          {/* Reportes */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl opacity-50 group-hover:opacity-100 blur-lg transition-all duration-300"></div>
            <button
              className="relative w-full h-full min-h-[280px] bg-gradient-to-br from-slate-800 to-emerald-900 hover:from-slate-700 hover:to-emerald-800 border-2 border-emerald-500/50 hover:border-emerald-400 rounded-2xl p-10 transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center"
              onClick={() =>
                router.push("/features/compressor-maintenance/reports/")
              }
            >
              <div className="text-center">
                <div className="text-5xl mb-5 transform group-hover:scale-110 transition-transform duration-300">
                  📄
                </div>
                <h3 className="text-2xl font-bold text-emerald-300 mb-3">
                  Reportes
                </h3>
                <p className="text-emerald-100/80 text-sm">
                  Ver historial de reportes generados.
                </p>
              </div>
            </button>
          </div>

          {/* Generar Reportes */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-50 group-hover:opacity-100 blur-lg transition-all duration-300"></div>
            <button
              className="relative w-full h-full min-h-[280px] bg-gradient-to-br from-slate-800 to-purple-900 hover:from-slate-700 hover:to-purple-800 border-2 border-purple-500/50 hover:border-purple-400 rounded-2xl p-10 transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center"
              onClick={() =>
                router.push(
                  "/features/compressor-maintenance/technician/reports"
                )
              }
            >
              <div className="text-center">
                <div className="text-5xl mb-5 transform group-hover:scale-110 transition-transform duration-300">
                  📋
                </div>
                <h3 className="text-2xl font-bold text-purple-300 mb-3">
                  Generar Reportes
                </h3>
                <p className="text-purple-100/80 text-sm">
                  Genera los diferentes tipos de reportes de mantenimiento
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
