"use client";
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";

const Home = () => {
  const { user, getIdTokenClaims, isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [compresores, setCompresores] = useState<any[]>([]);
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
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-center text-5xl mb-8">
        Bienvenido al Dashboard de Ventologix
      </h1>
      {user && (
        <div className="text-3xl text-center mb-6">
          <p className="text-black">Correo del Usuario: {user.email}</p>
          <p className="text-black">Nombre del Usuario: {user.name}</p>
          <p className="text-black">
            Número Cliente: {numeroCliente || "Cargando..."}
          </p>
        </div>
      )}

      {/* Menús dropdown con hover */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* Reporte Diario */}
        <div className="relative text-center group">
          <h2 className="text-2xl text-blue-600 hover:scale-110 cursor-pointer transition-transform flex items-center justify-center gap-2">
            Reporte Diario
            <svg
              className="w-4 h-4 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </h2>
          {compresores.length > 0 && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-10">
              <div className="py-2">
                <div className="px-3 py-2 text-xs text-gray-500 font-medium uppercase tracking-wide border-b border-gray-100">
                  Seleccionar Compresor
                </div>
                {compresores.map((compresor) => (
                  <button
                    key={`diario-${compresor.id_cliente}-${compresor.linea}`}
                    onClick={() => {
                      // Guardar datos en sessionStorage para ocultar parámetros de URL
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
                    className="block w-full px-4 py-3 text-left text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-gray-50 last:border-b-0"
                  >
                    <div className="font-medium text-center">
                      {compresor.alias}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reporte Semanal */}
        <div className="relative text-center group">
          <h2 className="text-2xl text-green-600 hover:scale-110 cursor-pointer transition-transform flex items-center justify-center gap-2">
            Reporte Semanal
            <svg
              className="w-4 h-4 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </h2>
          {compresores.length > 0 && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-10">
              <div className="py-2">
                <div className="px-3 py-2 text-xs text-gray-500 font-medium uppercase tracking-wide border-b border-gray-100">
                  Seleccionar Compresor
                </div>
                {compresores.map((compresor) => (
                  <button
                    key={`semanal-${compresor.id_cliente}-${compresor.linea}`}
                    onClick={() => {
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
                    className="block w-full px-4 py-3 text-left text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors border-b border-gray-50 last:border-b-0"
                  >
                    <div className="font-medium text-center">
                      {compresor.alias}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
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
  );
};

export default Home;
