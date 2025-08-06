import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'ventologix'
};
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const connection = await mysql.createConnection(dbConfig);

    try {
      // Paso 1: Obtener numero_cliente y es_admin
      const [userResults] = await connection.execute(
        'SELECT numero_cliente, es_admin FROM usuarios_auth WHERE email = ?',
        [email]
      ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];

      if (userResults.length === 0) {
        await connection.end();
        return NextResponse.json({ authorized: false, error: 'Email no autorizado' }, { status: 403 });
      }

      const { numero_cliente, es_admin } = userResults[0];

      let compresorsResults;
      if (es_admin) {
        // Admin: obtener todos los compresores con nombre_cliente
        const [rows] = await connection.execute(`
          SELECT c2.id_cliente, c2.linea, c2.alias, c.nombre_cliente
          FROM clientes c
          JOIN compresores c2 ON c.id_cliente = c2.proyecto
        `) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
        compresorsResults = rows;
      } else {
        // Usuario normal: solo sus compresores sin nombre_cliente
        const [rows] = await connection.execute(`
          SELECT c2.id_cliente, c2.linea, c2.alias
          FROM usuarios_auth ua
          JOIN clientes c ON ua.numero_cliente = c.numero_cliente
          JOIN compresores c2 ON c.id_cliente = c2.proyecto
          WHERE ua.numero_cliente = ?
        `, [numero_cliente]) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
        compresorsResults = rows;
      }

      await connection.end();

      return NextResponse.json({ 
        authorized: true,
        numero_cliente,
        es_admin,
        compresores: compresorsResults,
        status: 'Usuario autorizado'
      });

    } catch (dbError) {
      await connection.end();
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      return NextResponse.json({ error: 'Error en base de datos', debug: errorMessage }, { status: 500 });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error de servidor', debug: errorMessage }, { status: 500 });
  }
}