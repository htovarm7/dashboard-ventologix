import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    // Llamada al endpoint externo
    const response = await fetch('https://80734d8d9721.ngrok-free.app/web/verify-email', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AUTH0_API_KEY || ''
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ 
        authorized: true, 
        id_cliente: data.id_cliente,
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
