"use client";
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import ReportDropdown from "../../../components/ReportDropdown";
import DateReportDropdown from "../../../components/DateReportDropdown";
import { Compresor } from "../../../types/common";

const Home = () => {
  const { user, getIdTokenClaims, isAuthenticated, isLoading, logout } =
    useAuth0();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [compresores, setCompresores] = useState<Compresor[]>([]);
  const [numeroCliente, setNumeroCliente] = useState<number | null>(null);

  useEffect(() => {
    const verifyAndLoadUser = async () => {
      if (!isAuthenticated) {
        router.push("/app");
        return;
      }

      if (hasCheckedAuth) {
        return;
      }

      if (user?.email) {
        setHasCheckedAuth(true);
        try {
          const response = await fetch("/api/verify-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: user.email }),
          });

          const data = await response.json();
          console.log("Respuesta completa del API:", data);

          if (response.ok && data.authorized) {
            setIsAuthorized(true);
            setCompresores(data.compresores || []);
            setNumeroCliente(data.numero_cliente);

            console.log("Número Cliente:", data.numero_cliente);
            console.log("Compresores disponibles:", data.compresores);
          } else {
            console.error("Usuario no autorizado:", data.error);
            router.push("/");
          }
        } catch (error) {
          console.error("Error verificando autorización:", error);
          router.push("/");
        }
      } else {
        console.log("No hay email de usuario disponible");
      }

      setIsCheckingAuth(false);
    };

    if (!isLoading && !hasCheckedAuth) {
      console.log("Iniciando verificación de usuario...");
      verifyAndLoadUser();
    }
  }, [
    isAuthenticated,
    user,
    isLoading,
    router,
    getIdTokenClaims,
    hasCheckedAuth,
  ]);

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
          <p className="text-center mb-6 text-xl">
            Aquí podrá revisar sus reportes diarios, por fecha específica y
            semanales
          </p>

          {/* Menús dropdown con hover */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Reporte Diario */}
            <ReportDropdown
              title="Reporte Diario"
              compresores={compresores}
              colorScheme={{
                text: "text-blue-600",
                icon: "text-blue-400",
                hover: "hover:bg-blue-50 hover:text-blue-600",
              }}
              onCompressorSelect={(compresor) => {
                sessionStorage.setItem(
                  "selectedCompresor",
                  JSON.stringify({
                    id_cliente: compresor.id_cliente,
                    linea: compresor.linea,
                    alias: compresor.alias,
                  })
                );
                router.push("/graphsD");
              }}
            />

            {/* Reporte Diario por Fecha */}
            <DateReportDropdown
              title="Reporte por Fecha"
              compresores={compresores}
              colorScheme={{
                text: "text-purple-600",
                icon: "text-purple-400",
                hover: "hover:bg-purple-50 hover:text-purple-600",
              }}
            />

            {/* Reporte Semanal */}
            <ReportDropdown
              title="Reporte Semanal"
              compresores={compresores}
              colorScheme={{
                text: "text-[rgb(0,32,91)]",
                icon: "text-[rgb(4,48,130)]",
                hover: "hover:bg-green-50 hover:text-green-600",
              }}
              onCompressorSelect={(compresor) => {
                sessionStorage.setItem(
                  "selectedCompresor",
                  JSON.stringify({
                    id_cliente: compresor.id_cliente,
                    linea: compresor.linea,
                    alias: compresor.alias,
                  })
                );
                router.push("/graphsW");
              }}
            />
          </div>

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
