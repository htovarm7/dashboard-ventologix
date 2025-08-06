import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'ventologix'
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id_cliente = searchParams.get('id_cliente');

    if (!id_cliente) {
      return NextResponse.json({ 
        error: 'Parámetro requerido: id_cliente' 
      }, { status: 400 });
    }

    console.log('🔍 Obteniendo datos del cliente:', { id_cliente });

    const connection = await mysql.createConnection(dbConfig);

    try {
      // Fetch data from the clientes table
      const [results] = await connection.execute(
        'SELECT numero_cliente, nombre_cliente, RFC, direccion, CostokWh, demoDiario, demoSemanal FROM clientes WHERE id_cliente = ?',
        [id_cliente]
      ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];

      await connection.end();

      if (!results || results.length === 0) {
        return NextResponse.json({ 
          error: 'No data found for the specified client.' 
        }, { status: 404 });
      }

      // Convert results into a list of dictionaries
      const data = results.map((row: any) => ({
        numero_cliente: row.numero_cliente,
        nombre_cliente: row.nombre_cliente,
        RFC: row.RFC,
        direccion: row.direccion,
        costoUSD: row.CostokWh,
        demoDiario: row.demoDiario,
        demoSemanal: row.demoSemanal
      }));

      return NextResponse.json({ data });

    } catch (dbError) {
      await connection.end();
      console.error('❌ Error en query MySQL:', dbError);
      return NextResponse.json({ 
        error: 'Database error',
        debug: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error en client-data:', error);
    return NextResponse.json({ 
      error: 'Server error',
      debug: error instanceof Error ? error.message : 'Unknown server error'
    }, { status: 500 });
  }
}
