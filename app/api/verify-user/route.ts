import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    try {
      // Paso 1: Obtener numero_cliente y es_admin
      const [userResults] = await pool.execute<RowDataPacket[]>(
        'SELECT numero_cliente, es_admin FROM usuarios_auth WHERE email = ?',
        [email]
      );

      if (userResults.length === 0) {
        return NextResponse.json({ authorized: false, error: 'Email no autorizado' }, { status: 403 });
      }

      const { numero_cliente, es_admin } = userResults[0];

      let compresorsResults;
      if (es_admin) {
        // Admin: obtener todos los compresores con nombre_cliente
        const [rows] = await pool.execute<RowDataPacket[]>(`
          SELECT c2.id_cliente, c2.linea, c2.alias, c.nombre_cliente
          FROM clientes c
          JOIN compresores c2 ON c.id_cliente = c2.proyecto
        `);
        compresorsResults = rows;
      } else {
        // Usuario normal: solo sus compresores sin nombre_cliente
        const [rows] = await pool.execute<RowDataPacket[]>(`
          SELECT c2.id_cliente, c2.linea, c2.alias
          FROM usuarios_auth ua
          JOIN clientes c ON ua.numero_cliente = c.numero_cliente
          JOIN compresores c2 ON c.id_cliente = c2.proyecto
          WHERE ua.numero_cliente = ?
        `, [numero_cliente]);
        compresorsResults = rows;
      }

      return NextResponse.json({ 
        authorized: true,
        numero_cliente,
        es_admin,
        compresores: compresorsResults,
        status: 'Usuario autorizado'
      });

    } catch (dbError) {
      console.error('Error de base de datos:', {
        error: dbError,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_DATABASE,
        message: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
      
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      return NextResponse.json({ 
        error: 'Error en base de datos', 
        debug: errorMessage,
        code: dbError instanceof Error && 'code' in dbError ? (dbError as any).code : undefined
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error del servidor:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: 'Error de servidor', 
      debug: errorMessage,
      code: error instanceof Error && 'code' in error ? (error as any).code : undefined
    }, { status: 500 });
  }
}