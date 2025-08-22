import { NextRequest, NextResponse } from "next/server";
import { URL_API } from "@/lib/global";

const EXTERNAL_API_URL = `${URL_API}/web/verify-email`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Request recibido:', body); // Debug

    const { email, user } = body;

    // Validar que se proporcione al menos uno
    if (!email && !user) {
      console.log('Error: No se proporcionó email ni usuario');
      return NextResponse.json({ error: "Email o usuario requerido" }, { status: 400 });
    }

    // Preparar el body para enviar al backend
    let requestBody;
    if (email && email.includes('@')) {
      // Login con email (Google)
      requestBody = { email };
      console.log('Detectado login con email:', email);
    } else if (user) {
      // Login con usuario
      requestBody = { user };
      console.log('Detectado login con usuario:', user);
    } else if (email) {
      // Podría ser un usuario sin @
      requestBody = { user: email };
      console.log('Detectado usuario sin @:', email);
    }

    console.log('Enviando al backend Python:', requestBody);

    const response = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('Respuesta del backend Python (raw):', responseText);

    let externalData;
    try {
      externalData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parseando respuesta:', parseError);
      return NextResponse.json(
        {
          authorized: false,
          error: "Error en respuesta del servidor",
        },
        { status: 500 }
      );
    }

    console.log('Respuesta del backend Python (parsed):', externalData);

    if (!response.ok) {
      console.log('Respuesta no OK:', response.status, externalData);
      return NextResponse.json(
        {
          authorized: false,
          error: "Usuario no autorizado",
          debug: {
            status: response.status,
            response: externalData
          }
        },
        { status: 403 }
      );
    }

    if (!externalData.authorized) {
      console.log('Usuario no autorizado según backend');
      return NextResponse.json(
        {
          authorized: false,
          error: "Usuario no autorizado",
        },
        { status: 403 }
      );
    }

    const successResponse = {
      authorized: true,
      numero_cliente: externalData.numero_cliente,
      Rol: externalData.rol || false,
      compresores: externalData.compresores || [],
      status: "Usuario autorizado",
      external_response: externalData,
    };

    console.log('Respuesta exitosa:', successResponse);
    return NextResponse.json(successResponse, { status: 200 });

  } catch (error :  any) {
    console.error('Error general:', error);
    return NextResponse.json(
      {
        authorized: false,
        error: "Error de conexión",
        debug: error.message
      },
      { status: 500 }
    );
  }
}