"use client";
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";

const Home = () => {
  const { user, getIdTokenClaims, isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const verifyAndLoadUser = async () => {
      if (!isAuthenticated) {
        router.push("/");
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

            const claims = await getIdTokenClaims();
            const id_cliente = claims?.["https://vto.com/id_cliente"];
            console.log("ID Cliente:", id_cliente);
          } else {
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
  }, [isAuthenticated, user, isLoading, router, getIdTokenClaims]);

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
    <div>
      <h1>Welcome to the Home Page</h1>
      {user && (
        <div>
          <p className="text-black">User Email: {user.email}</p>
          <p className="text-black">User Name: {user.name}</p>
        </div>
      )}
    </div>
  );
};

export default Home;
