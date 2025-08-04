import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
  onAuthSuccess?: (clientId: string) => void;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, onAuthSuccess }) => {
  const { user, getIdTokenClaims, isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    const verifyAndLoadUser = async () => {
      if (!isAuthenticated) {
        router.push("/app");
        return;
      }

      if (user?.email) {
        try {
          const response = await fetch("/api/verify-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: user.email }),
          });

          const data = await response.json();

          if (response.ok && data.authorized) {
            setIsAuthorized(true);
            
            // Obtener ID del cliente desde los claims de Auth0
            const claims = await getIdTokenClaims();
            const id_cliente = claims?.["https://vto.com/id_cliente"];
            
            let finalClientId: string;
            if (id_cliente) {
              finalClientId = id_cliente.toString();
            } else if (data.id_cliente) {
              // Fallback: usar el ID del cliente desde la API
              finalClientId = data.id_cliente.toString();
            } else {
              throw new Error("No se pudo obtener el ID del cliente");
            }

            setClientId(finalClientId);
            onAuthSuccess?.(finalClientId);
          } else {
            console.error("Usuario no autorizado:", data.error);
            router.push("/");
          }
        } catch (error) {
          console.error("Error verificando autorización:", error);
          router.push("/");
        }
      }

      setIsCheckingAuth(false);
    };

    if (!isLoading) {
      verifyAndLoadUser();
    }
  }, [isAuthenticated, user, isLoading, router, getIdTokenClaims, onAuthSuccess]);

  // Pantalla de carga
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

  // Usuario no autorizado
  if (!isAuthorized || !clientId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">No autorizado para acceder a esta página</p>
        </div>
      </div>
    );
  }

  // Usuario autorizado - renderizar contenido
  return <>{children}</>;
};

export default AuthGuard;
