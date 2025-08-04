import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const [rows] = await pool.query('SELECT id_cliente FROM usuarios_auth WHERE email = ?', [email]);
    const result = rows as any[];

    if (result && result.length > 0) {
      return NextResponse.json({ 
        authorized: true, 
        id_cliente: result[0].id_cliente,
        status: 'Usuario autorizado' 
      });
    } else {
      return NextResponse.json({ 
        authorized: false,
        error: 'Email no autorizado' 
      }, { status: 403 });
    }
  } catch (error) {
    console.error('Error verificando usuario:', error);
    return NextResponse.json({ error: 'Error de servidor' }, { status: 500 });
  }
}
