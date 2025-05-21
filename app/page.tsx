"use client"

import React, { useState } from "react";

const Login = () => {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    const data = {
      correo,
      password,
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/web/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.setItem("id_cliente", result.user.id_cliente);
        localStorage.setItem("nombre_cliente", result.user.nombre_cliente);
        setMensaje(`Bienvenido, ${result.user.nombre_cliente}`);
        window.location.href = "/graphsD";
      } else {
        setMensaje(result.detail);
      }
    } catch (error) {
      setMensaje("Error al conectar con el servidor.");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Iniciar Sesión</h2>
      <form onSubmit={handleLogin}>
        <div className="mb-4">
          <label className="block mb-1">Correo:</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Iniciar sesión
        </button>
      </form>

      {mensaje && <p className="mt-4 text-center">{mensaje}</p>}
    </div>
  );
};

export default Login;