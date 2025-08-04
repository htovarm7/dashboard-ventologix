import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    // Llamada al endpoint externo
    const apiUrl = process.env.FASTAPI_URL || 'https://80734d8d9721.ngrok-free.app';
    const response = await fetch(`${apiUrl}/web/verify-email`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AUTH0_API_KEY || ''
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    console.log('Respuesta del FastAPI:', { status: response.status, data });

    if (response.ok) {
      // El endpoint FastAPI ahora devuelve numero_cliente y compresores
      return NextResponse.json({ 
        authorized: true, 
        numero_cliente: data.numero_cliente,
        compresores: data.compresores,
        status: 'Usuario autorizado' 
      });
    } else {
      return NextResponse.json({ 
        authorized: false,
        error: data.detail || data.error || 'Email no autorizado' 
      }, { status: 403 });
    }
  } catch (error) {
    console.error('Error verificando usuario:', error);
    return NextResponse.json({ error: 'Error de servidor' }, { status: 500 });
  }
}
