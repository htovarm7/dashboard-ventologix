"use client";
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import DateReportDropdown from "@/components/DateReportDropdown";
import { Compressor } from "@/lib/types";
import { URL_API } from "@/lib/global";

const Home = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth0();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [compresores, setCompresores] = useState<Compressor[]>([]);
  const [numeroCliente, setNumeroCliente] = useState<number | null>(null);
  const [rol, setRol] = useState<number | null>(null);
  const [secciones, setSecciones] = useState<string[]>([]);
  const [selectedCompresor, setSelectedCompresor] = useState<Compressor | null>(
    null
  );
  const [modulos, setModulos] = useState<{
    mantenimiento: boolean;
    reporteDia: boolean;
    reporteSemana: boolean;
    presion: boolean;
    prediccion: boolean;
    kwh: boolean;
  } | null>(null);

  useEffect(() => {
    const verifyAndLoadUser = async () => {
      if (!isAuthenticated) {
        router.push("/");
        return;
      }

      if (hasCheckedAuth) {
        return;
      }

      const userData = sessionStorage.getItem("userData");
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          setIsAuthorized(true);
          setCompresores(parsedData.compresores || []);
          setNumeroCliente(parsedData.numero_cliente);
          setRol(parsedData.rol);
          setSecciones(parsedData.secciones || []);

          console.log(userData);

          const selectedCompresorData =
            sessionStorage.getItem("selectedCompresor");
          if (selectedCompresorData) {
            try {
              const selected = JSON.parse(selectedCompresorData);
              setSelectedCompresor(selected);
            } catch (error) {
              console.error("Error parsing selectedCompresor:", error);
            }
          }

          // Fetch modulos from API
          if (parsedData.numero_cliente) {
            try {
              const modulosRes = await fetch(
                `${URL_API}/modulos/${parsedData.numero_cliente}`
              );
              if (modulosRes.ok) {
                const modulosData = await modulosRes.json();
                setModulos(modulosData.data);
              } else {
                console.log(
                  "No modules found for client, using default secciones"
                );
                setModulos(null);
              }
            } catch (error) {
              console.error("Error fetching modules:", error);
              setModulos(null);
            }
          }

          setIsCheckingAuth(false);
          setHasCheckedAuth(true);
          return;
        } catch (error) {
          console.error("Error parsing userData from sessionStorage:", error);
          sessionStorage.removeItem("userData");
        }
      }

      if (user?.email && !userData) {
        router.push("/");
        return;
      }

      setIsCheckingAuth(false);
    };

    if (!isLoading && !hasCheckedAuth) {
      verifyAndLoadUser();
    }
  }, [isAuthenticated, user, isLoading, router, hasCheckedAuth]);

  // Helper function to check if a module is enabled
  const isModuleEnabled = (moduleName: string): boolean => {
    // If modulos data is available, use it
    if (modulos) {
      switch (moduleName) {
        case "Mantenimiento":
          return modulos.mantenimiento;
        case "ReporteDia":
          return modulos.reporteDia;
        case "ReporteSemana":
          return modulos.reporteSemana;
        case "Presion":
          return modulos.presion;
        case "Prediccion":
          return modulos.prediccion;
        case "KWH":
          return modulos.kwh;
        default:
          return false;
      }
    }
    // Fallback to secciones array if modulos data is not available
    return secciones.includes(moduleName);
  };

  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autorización...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }
  return (
    <main className="min-h-screen relative overflow-x-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
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
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 bg-cyan-400/30 rounded-full`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${
                8 + Math.random() * 10
              }s infinite ease-in-out`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Header with logout button */}
      <div className="absolute top-4 right-4 z-50 max-w-[calc(100vw-2rem)]">
        <button
          onClick={async () => {
            if (confirm("¿Estás seguro que deseas cerrar sesión?")) {
              try {
                sessionStorage.clear();
                localStorage.clear();
                await logout({
                  logoutParams: { returnTo: window.location.origin + "/" },
                });
              } catch (error) {
                console.error("Error durante logout:", error);
                alert("Cerrando sesión...");
                window.location.href = "/";
              }
            }
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-red-500/50 border border-red-500/30 text-sm sm:text-base font-medium cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="hidden sm:inline">Cerrar Sesión</span>
          <span className="sm:hidden">Salir</span>
        </button>
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 relative z-10">
        {/* Main container with futuristic design */}
        <div className="relative w-full max-w-5xl mx-auto">
          {/* Glowing border effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 rounded-3xl opacity-30 blur-xl"></div>

          {/* Main card */}
          <div className="relative bg-gradient-to-br from-slate-800/95 via-blue-900/95 to-slate-800/95 rounded-3xl p-6 sm:p-8 shadow-2xl border border-cyan-500/30">
            {/* Header section */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300">
                Ventologix Dashboard
              </h1>
              <div className="flex justify-center mb-6">
                <div className="h-1 w-48 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full"></div>
              </div>

              {user && (
                <div className="space-y-2">
                  <p className="text-xl text-cyan-100 font-medium">
                    Bienvenido, Ing. {user.name}
                  </p>
                  <p className="text-lg text-blue-300/80">
                    Cliente N° {numeroCliente}
                  </p>
                </div>
              )}
            </div>

            {/* Solo mostrar selector de compresor para roles que NO sean 2 (VAST) */}
            {compresores.length > 0 && rol !== 2 && (
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-800/40 to-cyan-800/40 border border-cyan-400/30 backdrop-blur-sm">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-cyan-300 mb-4 flex items-center justify-center gap-2">
                    Seleccione el Compresor
                  </h2>
                  <div>
                    <select
                      value={
                        selectedCompresor?.id_cliente +
                          "-" +
                          selectedCompresor?.linea || ""
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          const [id_cliente, linea] = e.target.value.split("-");
                          const compresor = compresores.find(
                            (c) =>
                              c.id_cliente.toString() === id_cliente &&
                              c.linea === linea
                          );
                          if (compresor) {
                            setSelectedCompresor(compresor);
                            sessionStorage.setItem(
                              "selectedCompresor",
                              JSON.stringify(compresor)
                            );
                            window.dispatchEvent(new Event("compresorChanged"));
                          }
                        } else {
                          setSelectedCompresor(null);
                          sessionStorage.removeItem("selectedCompresor");
                          window.dispatchEvent(new Event("compresorChanged"));
                        }
                      }}
                      className="w-full text-center text-sm sm:text-lg max-w-md mx-auto px-4 py-3 bg-slate-800 text-cyan-100 border-2 border-cyan-500/50 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                    >
                      <option value="">-- Seleccione un compresor --</option>
                      {[...compresores]
                        .sort((a, b) => {
                          // Si es administrador (rol 0), ordenar por nombre_cliente
                          if (rol === 0) {
                            const nombreA = a.nombre_cliente || "";
                            const nombreB = b.nombre_cliente || "";
                            return nombreA.localeCompare(nombreB, "es", {
                              sensitivity: "base",
                            });
                          }
                          // Para otros roles, ordenar por alias
                          return a.alias.localeCompare(b.alias, "es", {
                            sensitivity: "base",
                          });
                        })
                        .map((compresor, index) => (
                          <option
                            key={`compresor-${compresor.id || index}-${
                              compresor.linea
                            }-${compresor.alias}`}
                            value={`${compresor.id_cliente}-${compresor.linea}`}
                          >
                            {rol === 0
                              ? `${compresor.nombre_cliente} : ${compresor.alias}`
                              : compresor.alias}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje diferente según el rol */}
            {rol === 2 ? (
              <p className="text-center mt-3 mb-8 text-lg text-cyan-200/80">
                Gestiona el mantenimiento de compresores de todos los clientes.
              </p>
            ) : (
              <p className="text-center mt-3 mb-8 text-lg text-cyan-200/80">
                Accede a tus reportes diarios, por fecha específica y semanales.
              </p>
            )}

            {/* Admin button for rol = 3 */}
            {rol === 3 && (
              <div className="mb-8">
                <button
                  className="group relative w-full max-w-md mx-auto flex items-center justify-center gap-3 px-6 py-4 text-lg font-bold text-white rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-amber-500/50 border-2 border-amber-400/50"
                  onClick={() => router.push("/admin-view")}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {/* Background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-amber-600 to-orange-500 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>

                  {/* Shine effect */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                      animation: "slideRight 1.5s infinite",
                    }}
                  ></div>

                  {/* Icon and text */}
                  <svg
                    className="w-6 h-6 relative z-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <span className="relative z-10">Administrar Usuarios</span>
                </button>
              </div>
            )}

            {/* Para rol 2 (VAST): Mostrar botón directamente sin necesidad de seleccionar compresor */}
            {rol === 2 ? (
              <div className="grid grid-cols-1 sm:grid-cols-1 max-w-md gap-6 mx-auto">
                <button
                  className="group relative w-full flex items-center justify-center gap-3 px-6 py-5 text-lg font-semibold rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 shadow-xl border-2 border-emerald-400/50"
                  onClick={() =>
                    router.push("/features/compressor-maintenance")
                  }
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                  <svg
                    className="w-6 h-6 text-white relative z-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-white relative z-10 font-medium">
                    Sistema de Mantenimiento
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 max-w-4xl gap-5 mx-auto w-full">
                  {isModuleEnabled("Prediccion") && (
                    <button
                      className="group relative flex items-center justify-center gap-3 px-6 py-5 text-lg font-semibold rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 shadow-xl border-2 border-violet-400/50"
                      onClick={() => router.push("/features/prediction")}
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-700 to-purple-700"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-violet-700 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                      <svg
                        className="w-6 h-6 text-white relative z-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                        />
                      </svg>
                      <span className="text-white relative z-10">
                        Predicción de Consumo
                      </span>
                      <span className="text-xs text-violet-300 relative z-10">
                        (BETA)
                      </span>
                    </button>
                  )}
                  {isModuleEnabled("Presion") && (
                    <button
                      className="group relative flex items-center justify-center gap-3 px-6 py-5 text-lg font-semibold rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 shadow-xl border-2 border-pink-400/50"
                      onClick={() => router.push("/features/pressure")}
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-700 to-rose-700"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-rose-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                      <svg
                        className="w-6 h-6 text-white relative z-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                      <span className="text-white relative z-10">Presión</span>
                      <span className="text-xs text-pink-300 relative z-10">
                        (BETA)
                      </span>
                    </button>
                  )}
                  {isModuleEnabled("Mantenimiento") && (
                    <button
                      className="group relative flex items-center justify-center gap-3 px-6 py-5 text-lg font-semibold rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 shadow-xl border-2 border-emerald-400/50"
                      onClick={() =>
                        router.push("/features/compressor-maintenance")
                      }
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-green-700"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-green-700 to-emerald-700 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                      <svg
                        className="w-6 h-6 text-white relative z-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="text-white relative z-10">
                        Mantenimiento de Compresores
                      </span>
                    </button>
                  )}
                  {isModuleEnabled("KWH") && (
                    <button
                      className="group relative flex items-center justify-center gap-3 px-6 py-5 text-lg font-semibold rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 shadow-xl border-2 border-blue-400/50"
                      onClick={() => router.push("/features/consumption-kwh")}
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                      <svg
                        className="w-6 h-6 text-white relative z-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <span className="text-white relative z-10">
                        Monitoreo de Consumo KWH
                      </span>
                    </button>
                  )}
                </div>

                {selectedCompresor && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 max-w-4xl gap-5 mx-auto w-full mt-6">
                    {isModuleEnabled("ReporteDia") && (
                      <div className="group relative flex items-center justify-center rounded-2xl transition-all duration-300 hover:scale-105 shadow-xl border-2 border-purple-400/50 min-h-[80px]">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-fuchsia-700 rounded-2xl pointer-events-none"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-2xl pointer-events-none"></div>
                        <div className="relative z-10 w-full py-6 flex items-center justify-center">
                          <DateReportDropdown
                            title="Reporte por Fecha"
                            compresores={compresores}
                            selectedCompresor={selectedCompresor}
                            colorScheme={{
                              text: "text-white",
                              icon: "text-white",
                              hover: "hover:text-purple-100",
                            }}
                            tipo="DIARIO"
                          />
                        </div>
                      </div>
                    )}
                    {isModuleEnabled("ReporteSemana") && (
                      <div className="group relative flex items-center justify-center rounded-2xl transition-all duration-300 hover:scale-105 shadow-xl border-2 border-cyan-400/50 min-h-[80px]">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-700 to-teal-700 rounded-2xl pointer-events-none"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-700 to-cyan-700 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-2xl pointer-events-none"></div>
                        <div className="relative z-10 w-full py-6 flex items-center justify-center">
                          <DateReportDropdown
                            title="Reporte por Semana"
                            compresores={compresores}
                            selectedCompresor={selectedCompresor}
                            colorScheme={{
                              text: "text-white",
                              icon: "text-white",
                              hover: "hover:text-cyan-100",
                            }}
                            tipo="SEMANAL"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!selectedCompresor && (
                  <div className="text-center py-8 px-4">
                    <div className="inline-block p-4 rounded-2xl bg-blue-800/30 border border-cyan-500/30">
                      <svg
                        className="w-12 h-12 text-cyan-400 mx-auto mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-cyan-200 text-lg">
                        Seleccione un compresor para acceder a los reportes
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {compresores.length === 0 && isAuthorized && (
              <div className="mt-8 text-center p-6 rounded-2xl bg-blue-800/30 border border-cyan-500/30">
                <svg
                  className="w-16 h-16 text-cyan-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-cyan-200 text-lg">
                  No hay compresores disponibles para este usuario
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          50% {
            transform: translateY(-100px) translateX(60px) scale(1.3);
            opacity: 1;
          }
          90% {
            opacity: 0.4;
          }
        }
        @keyframes slideRight {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </main>
  );
};

export default Home;
