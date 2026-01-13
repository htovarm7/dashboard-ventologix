"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Compressor, UserInfo } from "@/lib/types";
import { URL_API } from "@/lib/global";

export default function Page() {
  const { loginWithRedirect, logout, isAuthenticated, user, isLoading, error } =
    useAuth0();
  const router = useRouter();
  const [accessDenied, setAccessDenied] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const verifyUserAuthorization = useCallback(
    async (userInfo: UserInfo) => {
      try {
        setIsCheckingAuth(true);
        let userIdentifier: string;

        if (userInfo.email && userInfo.email.includes("@")) {
          userIdentifier = userInfo.email;
        } else if (userInfo.nickname || userInfo.username) {
          userIdentifier =
            userInfo.nickname || userInfo.username || userInfo.name || "";
        } else if (userInfo.sub && userInfo.sub.startsWith("auth0|")) {
          userIdentifier = userInfo.sub.replace("auth0|", "");
        } else {
          userIdentifier =
            userInfo.email || userInfo.name || userInfo.sub || "";
        }

        if (!userIdentifier) {
          throw new Error("No se pudo identificar el usuario");
        }

        const url = `${URL_API}/web/usuarios/${encodeURIComponent(
          userIdentifier
        )}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            "x-internal-api-key": process.env.NEXT_PUBLIC_API_SECRET || "",
            ...(userInfo.accessToken && {
              Authorization: `Bearer ${userInfo.accessToken}`,
            }),
          },
        });

        if (!response.ok) {
          const errorText = await response.text();

          if (response.status === 404) {
            throw new Error(`Usuario no encontrado: ${userIdentifier}`);
          }
          throw new Error(
            `HTTP error! status: ${response.status} - ${errorText}`
          );
        }

        const data = await response.json();

        if (data && data.id) {
          const userData = {
            numero_cliente: data.numeroCliente,
            rol: data.rol,
            email: data.email,
            name: data.name,
            secciones: data.secciones || [],
            compresores: (data.compresores || []).map((c: Compressor) => {
              return {
                ...c,
              };
            }),
          };
          sessionStorage.setItem("userData", JSON.stringify(userData));

          // Redirect based on user role
          if (data.rol === 2) {
            router.push("/features/compressor-maintenance");
          } else {
            router.push("/home");
          }
        } else {
          setAccessDenied(true);
        }
      } catch (error) {
        console.error("Error completo:", error);
        if (error instanceof Error) {
          console.error("Error message:", error.message);
        } else {
          console.error("Error message:", String(error));
        }
        setAccessDenied(true);
      } finally {
        setIsCheckingAuth(false);
        setHasChecked(true);
      }
    },
    [router]
  );

  useEffect(() => {
    if (isLoading) return;

    // Si el usuario está autenticado y tiene datos válidos, redirigir según rol
    const storedUserData = sessionStorage.getItem("userData");
    if (isAuthenticated && storedUserData) {
      try {
        const userData = JSON.parse(storedUserData);
        if (userData.rol === 2) {
          router.push("/features/compressor-maintenance");
        } else {
          router.push("/home");
        }
      } catch {
        router.push("/home");
      }
      return;
    }

    // Si el usuario está autenticado pero no tiene datos, verificar autorización
    if (
      isAuthenticated &&
      user &&
      !isCheckingAuth &&
      !hasChecked &&
      !sessionStorage.getItem("userData")
    ) {
      setIsCheckingAuth(true);
      verifyUserAuthorization(user);
    }
  }, [
    isAuthenticated,
    user,
    isLoading,
    isCheckingAuth,
    hasChecked,
    verifyUserAuthorization,
    router,
  ]);

  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <Image
          src="/Ventologix_01.png"
          alt="Ventologix Logo"
          width={500}
          height={500}
          className="animate-bounce mb-4"
          priority
        />
        <span className="text-white text-2xl animate-pulse [font-family:monospace]">
          Cargando...
        </span>
      </div>
    );
  }

  if (error || accessDenied) {
    const errorDetails = `Hola Hector,%0D%0A%0D%0AEstoy intentando acceder al Dashboard de Ventologix pero no tengo autorización.%0D%0A%0D%0AMi información de usuario es: ${
      user?.email || user?.username || user?.nickname || "No disponible"
    }%0D%0A%0D%0APor favor, podrías autorizar mi acceso al sistema.%0D%0A%0D%0AGracias,%0D%0A[Tu nombre]`;

    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=hector.tovar@ventologix.com&su=${encodeURIComponent(
      "Solicitud de autorización de acceso"
    )}&body=${errorDetails}`;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-600 text-white p-8">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl font-bold mb-6">Acceso No Autorizado</h1>
          <div className="bg-red-700 p-6 rounded-lg mb-8">
            <p className="text-lg mb-4">
              Lo sentimos, no estás autorizado para acceder a esta aplicación.
            </p>
            <p className="mb-4">
              Para solicitar acceso al Dashboard de Ventologix, por favor
              contacta al administrador.
            </p>
            <p className="text-xl font-bold">
              Recuerde que si se le brindo acceso debe ser mediante el correo
              coroporativo de su empresa y no un correo personal.
            </p>
          </div>

          <div className="space-y-4">
            <a
              href={gmailLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              📧 Contactar al administrador
            </a>

            <div className="block">
              <button
                className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-400 transition-colors"
                onClick={() => {
                  setAccessDenied(false);
                  setIsCheckingAuth(false);
                  setHasChecked(false);
                  sessionStorage.removeItem("userData");
                  logout({
                    logoutParams: { returnTo: window.location.origin },
                  });
                }}
              >
                🔄 Cerrar sesión y reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image */}
      <Image
        src="/Ventologix_05.png"
        alt="Ventologix Logo"
        fill
        className="absolute inset-0 object-cover z-0 opacity-100"
        priority
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-blue-900/50 to-black/60 z-[1]"></div>

      {/* Futuristic grid overlay */}
      <div
        className="absolute inset-0 z-[2] opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      ></div>

      {/* Main container - solid with gradient */}
      <div className="relative z-10 flex flex-col items-center rounded-3xl p-12 shadow-2xl max-w-2xl w-full mx-4 transition-all duration-500 hover:scale-[1.02] overflow-hidden">
        {/* Solid gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d2847] to-[#0a1628] opacity-95"></div>

        {/* Animated glowing border */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 rounded-3xl opacity-75 blur-lg"></div>
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-3xl animate-pulse"></div>

        {/* Inner border glow */}
        <div className="absolute inset-0 rounded-3xl border-2 border-blue-400/30 shadow-[0_0_30px_rgba(59,130,246,0.5)]"></div>

        <div className="relative z-10">
          {/* Title with gradient */}
          <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 mb-3 text-center">
            Ventologix Dashboard
          </h2>

          {/* Animated underline */}
          <div className="flex justify-center mb-6">
            <div className="h-1 w-64 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full shadow-[0_0_10px_rgba(34,211,238,0.7)]"></div>
          </div>

          <p className="text-xl text-cyan-100 mb-10 text-center font-light tracking-wide">
            Plataforma de monitoreo y análisis en tiempo real
          </p>

          {!isAuthenticated ? (
            <div className="flex flex-col items-center space-y-8">
              {/* Security shield icon */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 blur-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-blue-800 to-cyan-900 flex items-center justify-center border-4 border-cyan-400/30 shadow-2xl shadow-cyan-500/50">
                  <svg
                    className="w-16 h-16 text-cyan-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                {/* Pulsing rings */}
                <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping"></div>
              </div>

              {/* Futuristic login button */}
              <button
                className="group relative px-12 py-5 text-white text-xl font-bold rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/60 border-2 border-cyan-400/50"
                onClick={() =>
                  loginWithRedirect({
                    authorizationParams: {
                      prompt: "login",
                    },
                  })
                }
              >
                {/* Button gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 transition-all duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>

                {/* Shine effect */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                    animation: "slideRight 1.5s infinite",
                  }}
                ></div>

                {/* Button text */}
                <span className="relative flex items-center gap-4">
                  <svg
                    className="w-7 h-7 group-hover:rotate-[360deg] transition-transform duration-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  INICIAR SESIÓN
                  <svg
                    className="w-7 h-7 opacity-0 -ml-11 group-hover:opacity-100 group-hover:ml-0 transition-all duration-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </span>
              </button>

              {/* Feature indicators */}
              <div className="flex gap-10 mt-10">
                <div className="flex flex-col items-center gap-3 group cursor-default">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-800 border-2 border-cyan-400/30 group-hover:border-cyan-400/60 transition-all duration-300 shadow-lg shadow-blue-500/30 group-hover:shadow-cyan-500/50">
                    <svg
                      className="w-7 h-7 text-cyan-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-cyan-200">
                    Análisis
                  </span>
                </div>
                <div className="flex flex-col items-center gap-3 group cursor-default">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-800 border-2 border-cyan-400/30 group-hover:border-cyan-400/60 transition-all duration-300 shadow-lg shadow-blue-500/30 group-hover:shadow-cyan-500/50">
                    <svg
                      className="w-7 h-7 text-cyan-300"
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
                  </div>
                  <span className="text-sm font-semibold text-cyan-200">
                    Tiempo Real
                  </span>
                </div>
                <div className="flex flex-col items-center gap-3 group cursor-default">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-800 border-2 border-cyan-400/30 group-hover:border-cyan-400/60 transition-all duration-300 shadow-lg shadow-blue-500/30 group-hover:shadow-cyan-500/50">
                    <svg
                      className="w-7 h-7 text-cyan-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-cyan-200">
                    Seguro
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-white text-center space-y-6">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 blur-2xl opacity-60 animate-pulse"></div>
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-3xl font-bold border-2 border-cyan-400/50 shadow-2xl shadow-cyan-500/50">
                    {(user?.name ||
                      user?.nickname ||
                      user?.username ||
                      user?.email ||
                      "?")[0].toUpperCase()}
                  </div>
                </div>
              </div>
              <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">
                ¡Bienvenido de nuevo!
              </p>
              <p className="text-xl text-cyan-100/80">
                {user?.name || user?.nickname || user?.username || user?.email}
              </p>
              <div className="flex items-center justify-center gap-3 mt-8">
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(34,211,238,1)]"></div>
                <div
                  className="w-3 h-3 bg-blue-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(59,130,246,1)]"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(34,211,238,1)]"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <p className="text-lg text-cyan-200/70 font-semibold">
                Accediendo al dashboard...
              </p>
              <p className="text-lg text-cyan-200/70 font-semibold">
                Accediendo al dashboard...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating particles effect with cyan/blue colors */}
      <div className="absolute inset-0 z-[3] pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${
              i % 3 === 0
                ? "bg-cyan-400/40"
                : i % 3 === 1
                ? "bg-blue-400/40"
                : "bg-white/30"
            } ${i % 4 === 0 ? "w-2 h-2" : "w-1 h-1"}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${
                5 + Math.random() * 10
              }s infinite ease-in-out`,
              animationDelay: `${Math.random() * 5}s`,
              boxShadow:
                i % 3 === 0
                  ? "0 0 10px rgba(34,211,238,0.8)"
                  : i % 3 === 1
                  ? "0 0 10px rgba(59,130,246,0.8)"
                  : "none",
            }}
          />
        ))}
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
            transform: translateY(-120px) translateX(80px) scale(1.5);
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
    </div>
  );
}
