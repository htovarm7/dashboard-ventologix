import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const apiUrl = 'https://916dcb09fbd9.ngrok-free.app/web/verify-email';
    console.log('Intentando conectar a:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AUTH0_API_KEY || ''
      },
      body: JSON.stringify({ email }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Verificar si la respuesta es JSON válido
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.log('Respuesta no es JSON:', textResponse.substring(0, 200));
      return NextResponse.json({ 
        authorized: false,
        error: 'Servidor FastAPI no disponible o respondiendo incorrectamente' 
      }, { status: 503 });
    }

    const data = await response.json();
    console.log('Respuesta del FastAPI:', { status: response.status, data });

    if (response.ok) {
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
