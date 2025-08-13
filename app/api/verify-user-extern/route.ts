import { NextRequest, NextResponse } from "next/server";
import { URL_API } from "@/lib/global";

const EXTERNAL_API_URL = `${URL_API}/web/verify-email`;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    console.log("🔍 Verificando email con API externa:", email);

    const response = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.AUTH0_API_KEY || "",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "❌ Error en API externa:",
        response.status,
        response.statusText,
        errorText
      );
      return NextResponse.json(
        {
          authorized: false,
          error: "Error en verificación externa",
          debug: `API externa respondió con status ${response.status}: ${errorText}`,
        },
        { status: response.status }
      );
    }

    const externalData = await response.json();

    // Verificar si la respuesta externa indica autorización
    if (!externalData.authorized) {
      return NextResponse.json(
        {
          authorized: false,
          error: "Email no autorizado por API externa",
          debug: externalData.error || "Usuario no encontrado",
        },
        { status: 403 }
      );
    }

    // Retornar la información del usuario desde la API externa
    return NextResponse.json(
      {
        authorized: true,
        numero_cliente: externalData.numero_cliente,
        es_admin: externalData.es_admin || false,
        compresores: externalData.compresores || [],
        status: "Usuario autorizado por API externa",
        external_response: externalData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error conectando con API externa:", error);
    return NextResponse.json(
      {
        authorized: false,
        error: "Error de conexión con API externa",
        debug: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
