// OPCIÓN 1: Usar el sub (ID único) de Auth0
// Frontend modificado
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Page() {
  const { loginWithRedirect, logout, isAuthenticated, user, isLoading, error } =
    useAuth0();
  const router = useRouter();
  const [accessDenied, setAccessDenied] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const verifyUserAuthorization = useCallback(
    async (userInfo: any) => {
      try {

        let requestBody;
        
        // Detectar el tipo de login basado en la estructura del user
        if (userInfo.email && userInfo.email.includes('@')) {
          // Login con Google - tiene email válido
          requestBody = { email: userInfo.email };
        } else if (userInfo.nickname || userInfo.username) {
          // Login con username/password - usar nickname o username
          const username = userInfo.nickname || userInfo.username || userInfo.name;
          requestBody = { user: username };
        } else if (userInfo.sub && userInfo.sub.startsWith('auth0|')) {
          // Usuario de Auth0 database - extraer username del sub
          const username = userInfo.sub.replace('auth0|', '');
          requestBody = { user: username };
        } else {
          // Fallback - usar lo que tengamos
          requestBody = { user: userInfo.email || userInfo.name || userInfo.sub };
        }


        const response = await fetch("/api/verify-user-extern", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (response.ok && data.authorized) {
          sessionStorage.setItem(
            "userData",
            JSON.stringify({
              numero_cliente: data.numero_cliente,
              rol: data.Rol,
              compresores: data.compresores,
              email: userInfo.email || requestBody.user,
            })
          );

          router.push("/home");
        } else {
          console.error('Error de autorización:', data);
          setAccessDenied(true);
          setIsCheckingAuth(false);
          setHasChecked(true);
        }
      } catch (error) {
        console.error("Error verificando autorización:", error);
        setAccessDenied(true);
        setIsCheckingAuth(false);
        setHasChecked(true);
      }
    },
    [router]
  );

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && sessionStorage.getItem("userData")) {
      router.push("/home");
      return;
    }

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

  // ... resto del componente igual
  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <Image
          src="/Ventologix_01.png"
          alt="Ventologix Logo"
          width={720}
          height={720}
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
    <div className="relative min-h-screen flex flex-col items-center justify-center ">
      <Image
        src="/Ventologix_05.png"
        alt="Ventologix Logo"
        fill
        className="absolute inset-0 object-cover z-0 opacity-40"
        priority
      />
      <div className="relative z-10 flex flex-col items-center bg-[rgb(0,32,91)] rounded-3xl p-8 shadow-lg">
        <h2 className="text-4xl text-white mb-4">
          Bienvenido a Ventologix Dashboard
        </h2>
        <h2 className="text-xl text-white mb-8">
          Aquí puedes verificar tus datos, con gráficas diarias y semanales, así
          mismo extraer tus datos en bruto.
        </h2>
        {!isAuthenticated ? (
          <button
            className="bg-blue-500 text-white text-2xl p-2 rounded"
            onClick={() =>
              loginWithRedirect({
                authorizationParams: {
                  prompt: "login",
                },
              })
            }
          >
            Log In
          </button>
        ) : (
          <>
            <p className="text-white mb-2">
              Bienvenido, {user?.name || user?.nickname || user?.username || user?.email}
            </p>
            <button
              className="bg-red-500 text-white p-2 rounded"
              onClick={() => {
                sessionStorage.removeItem("userData");
                logout();
              }}
            >
              Log Out
            </button>
          </>
        )}
      </div>
    </div>
  );
}