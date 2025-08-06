"use client";
import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";

interface AuthData {
  numero_cliente: number;
  es_admin: number;
  compresores: any[];
}

interface UseAuthCheckResult {
  isAuthorized: boolean;
  isCheckingAuth: boolean;
  authData: AuthData | null;
}

export const useAuthCheck = (): UseAuthCheckResult => {
  const { isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authData, setAuthData] = useState<AuthData | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      if (isLoading) return;

      if (!isAuthenticated) {
        router.push("/");
        return;
      }

      // Verificar si hay datos en sessionStorage
      const userData = sessionStorage.getItem("userData");
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          setAuthData(parsedData);
          setIsAuthorized(true);
          setIsCheckingAuth(false);
          
          console.log("Usuario autenticado desde sessionStorage:", {
            numero_cliente: parsedData.numero_cliente,
            es_admin: parsedData.es_admin,
            compresores_count: parsedData.compresores?.length || 0,
          });
        } catch (error) {
          console.error("Error parsing userData from sessionStorage:", error);
          sessionStorage.removeItem("userData");
          router.push("/home"); // Redirigir a home para re-autenticar
        }
      } else {
        console.log("No hay datos de usuario en sessionStorage, redirigiendo a home");
        router.push("/home"); // Redirigir a home para autenticar
      }
    };

    checkAuth();
  }, [isAuthenticated, isLoading, router]);

  return {
    isAuthorized,
    isCheckingAuth,
    authData,
  };
};
