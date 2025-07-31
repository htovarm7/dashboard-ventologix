"use client";

import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import Image from "next/image";

export default function Page() {
  const { loginWithRedirect, logout, isAuthenticated, user, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-blue-600">
        <Image
          src="/Ventologix_01.png"
          alt="Ventologix Logo"
          width={1080}
          height={1080}
          className="animate-bounce mb-4"
          priority
        />
        <span className="text-white text-2xl animate-pulse [font-family:monospace]">
          {Array.from("Cargando...").map((char, i) => (
            <span
              key={i}
              style={{
          opacity: 1,
          animation: `typewriter 1s steps(${i + 1}) forwards`,
          animationDelay: `${i * 0.1}s`,
              }}
              className="inline-block"
            >
              {char}
            </span>
          ))}
          <style jsx>{`
            @keyframes typewriter {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
        </span>
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
      <div className="relative z-10 flex flex-col items-center bg-cyan-600 rounded-3xl p-8 shadow-lg">
      <h2 className="text-4xl text-white mb-4">Bienvenido a Ventologix Dashboard</h2>
      <h2 className="text-xl text-white mb-8">
        Aqui puedes verificar tus datos, con graficas diarias y semanales, asi mismo extraer tus datos en bruto
      </h2>
      {!isAuthenticated ? (
        <button className="bg-blue-500 text-white p-2 rounded" onClick={() => loginWithRedirect()}>
        Log In
        </button>
      ) : (
        <>
        <p className="text-white mb-2">Bienvenido, {user?.name}</p>
        <button className="bg-red-500 text-white p-2 rounded" onClick={() => logout()}>
          Log Out
        </button>
        </>
      )}
      </div>
    </div>
  );
}
