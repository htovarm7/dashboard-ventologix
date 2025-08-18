"use client";
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import ReportDropdown from "@/components/ReportDropdown";
import DateReportDropdown from "@/components/DateReportDropdown";
import { Compresor, ClientData } from "@/types/common";
import AdminSettings from "@/components/AdminSettings";
import { Router } from "next/router";

const Home = () => {
  const { user, getIdTokenClaims, isAuthenticated, isLoading, logout } =
    useAuth0();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [compresores, setCompresores] = useState<Compresor[]>([]);
  const [clientData, setClientData] = useState<ClientData>({});
  const [numeroCliente, setNumeroCliente] = useState<number | null>(null);
  const [rol, setRol] = useState<number | null>(null);
  const [selectedCompresor, setSelectedCompresor] = useState<Compresor | null>(
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
          setIsCheckingAuth(false);
          setHasCheckedAuth(true);
          return;
        } catch (error) {
          console.error("Error parsing userData from sessionStorage:", error);
          sessionStorage.removeItem("userData");
        }
      }

      if (user?.email && !userData) {
        console.log(
          "No hay datos en sessionStorage, redirigiendo para autenticación"
        );
        router.push("/");
        return;
      }

      setIsCheckingAuth(false);
    };

    if (!isLoading && !hasCheckedAuth) {
      console.log("Iniciando verificación de usuario...");
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
    <main className="bg-[rgb(65,143,222)] min-h-screen relative">
      <div className="absolute top-4 right-4 z-10">
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
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
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
          Cerrar Sesión
        </button>
      </div>

      <AdminSettings isVisible={rol === 1} />
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-white rounded-3xl p-5 shadow-md w-full max-w-4xl">
          <h1 className="text-center text-5xl mb-8">
            Bienvenido al Dashboard de Ventologix
          </h1>
          {user && (
            <div className="text-3xl text-center mb-6">
              <p className="text-black">Bienvenido Ing. {user.name}</p>
              <p className="text-black">
                Número Cliente: {numeroCliente || "Cargando..."}
              </p>
            </div>
          )}

          {/* Selector de compresor */}
          {compresores.length > 0 && (
            <div className="p-4 mb-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-blue-700 mb-4">
                  Seleccione el Compresor a mostrar
                </h2>

                {/* Dropdown para seleccionar compresor */}
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
                        }
                      } else {
                        setSelectedCompresor(null);
                      }
                    }}
                    className="w-full text-center text-xl max-w-md px-4 py-2 border border-black"
                  >
                    <option value="">-- Seleccione un compresor --</option>
                    {compresores.map((compresor) => (
                      <option
                        key={`${compresor.id_cliente}-${compresor.linea}`}
                        value={`${compresor.id_cliente}-${compresor.linea}`}
                      >
                        {compresor.alias}{" "}
                        {compresor.nombre_cliente || clientData.nombre_cliente}{" "}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <p className="text-center mt-3 mb-6 text-xl">
            Aquí podrá revisar sus reportes diarios, por fecha específica y
            semanales
          </p>

          {/* Menús dropdown con hover - Solo Reporte por Fecha y Semanal */}
          {selectedCompresor ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
              {/* Reporte Diario por Fecha */}
              <DateReportDropdown
                title="Reporte por Fecha"
                compresores={compresores}
                Rol={rol!}
                tipo="DIARIO"
                selectedCompresor={selectedCompresor}
                colorScheme={{
                  text: "text-purple-600",
                  icon: "text-purple-400",
                  hover: "hover:bg-purple-50 hover:text-purple-600",
                }}
              />
              {/* Reporte Semanal 
              <ReportDropdown
                title="Reporte Semanal"
                compresores={compresores}
                Rol={rol !== null ? rol : undefined}
                selectedCompresor={selectedCompresor}
                staticMode={true}
                colorScheme={{
                  text: "text-[rgb(0,32,91)]",
                  icon: "text-[rgb(4,48,130)]",
                  hover: "hover:bg-green-50 hover:text-green-600",
                }}
                onCompressorSelect={(compresor) => {
                  sessionStorage.setItem(
                    "selectedCompresor",
                    JSON.stringify({
                      id_cliente:
                        selectedCompresor?.id_cliente || compresor.id_cliente,
                      linea: selectedCompresor?.linea || compresor.linea,
                      alias: selectedCompresor?.alias || compresor.alias,
                    })
                  );
                  router.push("/graphsW");
                }}
              />
              */}
              <DateReportDropdown
                title="Reporte por Semana"
                compresores={compresores}
                tipo="SEMANAL"
                Rol={rol!}
                selectedCompresor={selectedCompresor}
                colorScheme={{
                  text: "text-cyan-600",
                  icon: "text-cyan-400",
                  hover: "hover:bg-cyan-50 hover:text-cyan-600",
                }}
              />
              <div className="px-4 py-3 border-b border-gray-100 flex flex-col items-center">
                <button
                  onClick={() => router.push("/prediction")}
                  className={`w-full px-4 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors font-medium text-m`}
                >
                  Ver Predicción (BETA)
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 text-lg">
                Por favor, seleccione un compresor para acceder a los reportes
              </p>
            </div>
          )}

          {/* Mensaje si no hay compresores */}
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
