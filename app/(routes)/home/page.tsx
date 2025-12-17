"use client";
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import DateReportDropdown from "@/components/DateReportDropdown";
import { Compressor } from "@/lib/types";

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
    <main className="bg-[rgb(65,143,222)] min-h-screen relative overflow-x-hidden">
      <div className="absolute top-4 right-4 z-10 max-w-[calc(100vw-2rem)]">
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
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md hover:shadow-lg text-sm sm:text-base"
        >
          <svg
            className="w-4 h-4"
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

      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-md w-full max-w-4xl mx-auto">
          <h1 className="text-center text-2xl sm:text-3xl mb-6 sm:mb-8 font-bold">
            Bienvenido al Dashboard de Ventologix
          </h1>
          {user && (
            <div className="text-xl text-center mb-6">
              <p className="text-black">Bienvenido Ing. {user.name}</p>
              <p className="text-black">Número Cliente: {numeroCliente}</p>
            </div>
          )}

          {/* Solo mostrar selector de compresor para roles que NO sean 2 (VAST) */}
          {compresores.length > 0 && rol !== 2 && (
            <div className="p-4 mb-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-blue-700 mb-4">
                  Seleccione el Compresor a mostrar
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
                    className="w-full text-center text-sm sm:text-lg max-w-md mx-auto px-3 sm:px-4 py-2 border border-black rounded-md"
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
            <p className="text-center mt-3 mb-6 text-xl">
              Gestiona el mantenimiento de compresores de todos los clientes.
            </p>
          ) : (
            <p className="text-center mt-3 mb-6 text-xl">
              Aquí podrá revisar sus reportes diarios, por fecha específica y
              semanales.
            </p>
          )}

          {/* Para rol 2 (VAST): Mostrar botón directamente sin necesidad de seleccionar compresor */}
          {rol === 2 ? (
            <div className="grid grid-cols-1 sm:grid-cols-1 max-w-md gap-6 md:gap-8 mx-auto px-4">
              <button
                className="w-full text-lg text-green-600 hover:scale-105 cursor-pointer transition-transform flex items-center justify-center gap-3 bg-white border-2 border-green-200 p-4 rounded-xl hover:bg-green-50 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 active:scale-100 shadow-sm"
                onClick={() => router.push("/compressor-maintenance")}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <span className="font-medium">Sistema de Mantenimiento</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 max-w-3xl gap-6 md:gap-8 mx-auto px-4 w-full">
                {secciones.includes("Prediccion") && (
                  <button
                    className="w-full text-lg text-violet-600 hover:scale-105 cursor-pointer transition-transform flex items-center justify-center gap-3 bg-white border-2 border-violet-200 p-4 rounded-xl hover:bg-violet-50 hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-opacity-50 active:scale-100 shadow-sm"
                    onClick={() => router.push("/prediction")}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <span className="font-medium">
                      Predicción de Consumo (BETA)
                    </span>
                  </button>
                )}
                {secciones.includes("Presion") && (
                  <button
                    className="w-full text-lg text-pink-600 hover:scale-105 cursor-pointer transition-transform flex items-center justify-center gap-3 bg-white border-2 border-pink-200 p-4 rounded-xl hover:bg-pink-50 hover:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-opacity-50 active:scale-100 shadow-sm"
                    onClick={() => router.push("/pressure")}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <span className="font-medium">Presión (BETA)</span>
                  </button>
                )}
                {secciones.includes("Mantenimiento") && (
                  <button
                    className="w-full text-lg text-green-600 hover:scale-105 cursor-pointer transition-transform flex items-center justify-center gap-3 bg-white border-2 border-green-200 p-4 rounded-xl hover:bg-green-50 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 active:scale-100 shadow-sm"
                    onClick={() => router.push("/compressor-maintenance")}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <span className="font-medium">
                      Mantenimiento de Compresores
                    </span>
                  </button>
                )}
                {secciones.includes("KWH") && (
                  <button
                    className="w-full text-xl text-blue-900 hover:scale-105 cursor-pointer transition-transform flex items-center justify-center gap-3 bg-white border-2 border-blue-200 p-4 rounded-xl hover:bg-blue-50 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 active:scale-100 shadow-sm"
                    onClick={() => router.push("/consumption-kwh")}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <span className="font-medium">
                      Monitoreo de Consumo KWH
                    </span>
                  </button>
                )}
              </div>

              {/* Botones que aparecen solo cuando se selecciona un compresor */}
              {selectedCompresor && (
                <div className="grid grid-cols-1 sm:grid-cols-2 max-w-3xl gap-6 md:gap-8 mx-auto px-4 w-full">
                  {secciones.includes("ReporteDia") && (
                    <div className="w-full text-lg text-purple-600 hover:scale-105 cursor-pointer transition-transform flex items-center justify-center gap-3 bg-white border-2 border-purple-200 p-4 rounded-xl hover:bg-purple-50 hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50 active:scale-100 shadow-sm">
                      <DateReportDropdown
                        title="Reporte por Fecha"
                        compresores={compresores}
                        selectedCompresor={selectedCompresor}
                        colorScheme={{
                          text: "text-purple-600",
                          icon: "text-purple-500",
                          hover: "hover:text-purple-700",
                        }}
                        tipo="DIARIO"
                      />
                    </div>
                  )}
                  {secciones.includes("ReporteSemana") && (
                    <div className="w-full text-lg text-cyan-600 hover:scale-105 cursor-pointer transition-transform flex items-center justify-center gap-3 bg-white border-2 border-cyan-200 p-4 rounded-xl hover:bg-cyan-50 hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50 active:scale-100 shadow-sm">
                      <DateReportDropdown
                        title="Reporte por Semana"
                        compresores={compresores}
                        selectedCompresor={selectedCompresor}
                        colorScheme={{
                          text: "text-cyan-600",
                          icon: "text-cyan-500",
                          hover: "hover:text-cyan-700",
                        }}
                        tipo="SEMANAL"
                      />
                    </div>
                  )}
                </div>
              )}

              {!selectedCompresor && (
                <div className="text-center py-8">
                  <p className="text-gray-600 text-lg">
                    Seleccione un compresor para acceder a los reportes por
                    fecha y semana
                  </p>
                </div>
              )}
            </div>
          )}

          {compresores.length === 0 && isAuthorized && (
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                No hay compresores disponibles para este usuario
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Home;
