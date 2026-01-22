"use client";
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import DateReportDropdown from "@/components/DateReportDropdown";
import { Compressor } from "@/lib/types";
import { URL_API } from "@/lib/global";
import Image from "next/image";

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
    null,
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
                `${URL_API}/modulos/${parsedData.numero_cliente}`,
              );
              if (modulosRes.ok) {
                const modulosData = await modulosRes.json();
                setModulos(modulosData.data);
              } else {
                console.log(
                  "No modules found for client, using default secciones",
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
    <main className="min-h-screen relative overflow-x-hidden bg-white">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src={"/Ventologix_02.jpg"}
          alt="Logo Ventologix"
          fill
          className="object-cover"
        />
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
          className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md border border-red-600 text-sm sm:text-base font-medium cursor-pointer"
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
        {/* Main container - Minimalist design */}
        <div className="relative w-full max-w-5xl mx-auto">
          <div className="relative bg-white rounded-2xl p-6 sm:p-12 shadow-lg border border-gray-100">
            <div className="text-center mb-12">
              <div className="flex justify-center mb-8">
                <div className="h-24 w-24 rounded-xl flex items-center justify-center shadow-md overflow-hidden">
                  <Image
                    src="/Logo vento firma.jpg"
                    alt="Ventologix Logo"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold mb-2 text-gray-900">
                Ventologix
              </h1>
              <div className="flex justify-center mb-6">
                <div className="h-1 w-32 bg-blue-500 rounded-full"></div>
              </div>

              {user && (
                <div className="space-y-2">
                  <p className="text-xl text-gray-700 font-medium">
                    Bienvenido, {user?.name?.split(" ")[0] || "Usuario"}
                  </p>
                  {numeroCliente && (
                    <p className="text-lg text-gray-600">
                      Cliente N° {numeroCliente}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Solo mostrar selector de compresor para roles que NO sean 2 (VAST) */}
            {compresores.length > 0 && rol !== 2 && (
              <div className="mb-8 p-6 rounded-xl bg-gray-50 border border-gray-200">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-center gap-2">
                    🔧 Seleccionar Compresor
                  </h2>
                  <select
                    value={selectedCompresor?.numero_serie || ""}
                    onChange={(e) => {
                      const selected = compresores.find(
                        (c) => c.numero_serie === e.target.value,
                      );
                      if (selected) {
                        setSelectedCompresor(selected);
                        sessionStorage.setItem(
                          "selectedCompresor",
                          JSON.stringify(selected),
                        );
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  >
                    <option value="">-- Seleccionar compresor --</option>
                    {compresores.map((compresor) => (
                      <option
                        key={compresor.numero_serie}
                        value={compresor.numero_serie}
                      >
                        {compresor.alias || compresor.numero_serie}{" "}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Mensaje diferente según el rol */}
            <p className="text-center mt-3 mb-8 text-gray-700">
              {rol === 2
                ? "Gestiona el mantenimiento de compresores de todos los clientes."
                : "Accede a tus reportes diarios, por fecha específica y semanales."}
            </p>

            {/* Admin button for rol = 3 */}
            {rol === 3 && (
              <div className="mb-8">
                <button
                  className="group relative w-full max-w-md mx-auto flex items-center justify-center gap-3 px-6 py-3 text-lg font-semibold text-white rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg border border-amber-600 bg-amber-500 hover:bg-amber-600"
                  onClick={() => router.push("/admin-view")}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                  Configuración de Administrador
                </button>
              </div>
            )}

            {/* Para rol 2 (VAST): Mostrar botón directamente */}
            {rol === 2 ? (
              <div className="grid grid-cols-1 sm:grid-cols-1 max-w-md gap-6 mx-auto">
                <button
                  className="group relative w-full flex items-center justify-center gap-3 px-6 py-4 text-lg font-semibold rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  onClick={() =>
                    router.push("/features/compressor-maintenance")
                  }
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <svg
                    className="w-6 h-6"
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
                  Ir a Mantenimiento
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 max-w-4xl gap-5 mx-auto w-full">
                  {/* Mantenimientos */}
                  <button
                    className="group relative w-full p-6 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg border border-blue-200 bg-blue-50 text-left hover:bg-blue-100"
                    onClick={() =>
                      router.push(
                        "/features/compressor-maintenance/maintenance",
                      )
                    }
                  >
                    <div className="text-3xl mb-3">🔧</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Mantenimientos
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Visualiza los mantenimientos realizados
                    </p>
                  </button>

                  {/* Mis Reportes */}
                  <button
                    className="group relative w-full p-6 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg border border-green-200 bg-green-50 text-left hover:bg-green-100"
                    onClick={() =>
                      router.push("/features/compressor-maintenance/views")
                    }
                  >
                    <div className="text-3xl mb-3">📅</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Mis Reportes
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Accede a todos tus reportes
                    </p>
                  </button>
                </div>

                {selectedCompresor && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 max-w-4xl gap-5 mx-auto w-full mt-6">
                    {isModuleEnabled("ReporteDia") && (
                      <button
                        className="group relative w-full p-6 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg border border-purple-200 bg-purple-50 text-left hover:bg-purple-100"
                        onClick={() => router.push("/graphsDateDay")}
                      >
                        <div className="text-3xl mb-3">📊</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Reporte Diario
                        </h3>
                        <p className="text-gray-700 text-sm">
                          Análisis del día actual
                        </p>
                      </button>
                    )}
                    {isModuleEnabled("ReporteSemana") && (
                      <button
                        className="group relative w-full p-6 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg border border-indigo-200 bg-indigo-50 text-left hover:bg-indigo-100"
                        onClick={() => router.push("/graphsDateWeek")}
                      >
                        <div className="text-3xl mb-3">📈</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Reporte Semanal
                        </h3>
                        <p className="text-gray-700 text-sm">
                          Análisis de la semana
                        </p>
                      </button>
                    )}
                  </div>
                )}

                {!selectedCompresor && (
                  <div className="text-center py-8 px-4">
                    <svg
                      className="w-16 h-16 text-gray-300 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <p className="text-gray-500">
                      Selecciona un compresor para ver más opciones
                    </p>
                  </div>
                )}
              </div>
            )}

            {compresores.length === 0 && isAuthorized && (
              <div className="mt-8 text-center p-6 rounded-lg bg-blue-50 border border-blue-200">
                <svg
                  className="w-16 h-16 text-blue-400 mx-auto mb-4"
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
                <p className="text-gray-700">
                  No hay compresores disponibles para este usuario
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;
