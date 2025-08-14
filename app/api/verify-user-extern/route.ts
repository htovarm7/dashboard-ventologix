import { NextRequest, NextResponse } from "next/server";
import { URL_API } from "@/lib/global";

const EXTERNAL_API_URL = `${URL_API}/web/verify-email`;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const response = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          authorized: false,
          error: "Email no autorizado",
        },
        { status: 403 }
      );
    }

    const externalData = await response.json();

    if (!externalData.authorized) {
      return NextResponse.json(
        {
          authorized: false,
          error: "Email no autorizado",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        authorized: true,
        numero_cliente: externalData.numero_cliente,
        Rol: externalData.rol || false,
        compresores: externalData.compresores || [],
        status: "Usuario autorizado",
        external_response: externalData,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        authorized: false,
        error: "Error de conexión",
      },
      { status: 500 }
    );
  }
}
