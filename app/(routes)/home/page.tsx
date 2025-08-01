"use client";
import React, { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const Home = () => {
  const { user, getIdTokenClaims } = useAuth0();

  useEffect(() => {
    const loadCliente = async () => {
      const claims = await getIdTokenClaims();
      const id_cliente = claims?.["https://vto.com/id_cliente"];
      console.log("ID Cliente:", id_cliente);
    };

    loadCliente();
  }, []);

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
