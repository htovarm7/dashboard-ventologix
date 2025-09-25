"use client";

import React from "react";
import { Auth0Provider } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;

  if (!domain || !clientId) {
    console.error("❌ Variables de entorno Auth0 faltantes:", {
      domain,
      clientId,
    });
    return <div>Error: Configuración Auth0 incompleta</div>;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri:
          typeof window !== "undefined" ? window.location.origin : "",
        scope: "openid profile email",
      }}
      onRedirectCallback={(appState) => {
        const route = appState?.returnTo || "/home";
        router.push(route);
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}
