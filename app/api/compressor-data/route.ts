import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { pool } from '@/lib/db';

// Database configuration
const dbConfig = pool;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id_cliente = searchParams.get('id_cliente');
    const linea = searchParams.get('linea');

    if (!id_cliente || !linea) {
      return NextResponse.json({ 
        error: 'Parámetros requeridos: id_cliente y linea' 
      }, { status: 400 });
    }

    console.log('🔍 Obteniendo datos del compresor para:', { id_cliente, linea });

    const connection = await mysql.createConnection(dbConfig);

    try {
      // Fetch data from the compresores table
      const [results] = await connection.execute(
        'SELECT hp, tipo, voltaje, marca, numero_serie, Alias, LOAD_NO_LOAD FROM compresores WHERE id_cliente = ? AND linea = ?',
        [id_cliente, linea]
      ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];

      await connection.end();

      if (!results || results.length === 0) {
        return NextResponse.json({ 
          error: 'No data found for the specified client and line.' 
        }, { status: 404 });
      }

      // Convert results into a list of dictionaries
      const data = results.map((row: any) => ({
        hp: row.hp,
        tipo: row.tipo,
        voltaje: row.voltaje,
        marca: row.marca,
        numero_serie: row.numero_serie,
        alias: row.Alias,
        limite: row.LOAD_NO_LOAD
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
    console.error('❌ Error en compressor-data:', error);
    return NextResponse.json({ 
      error: 'Server error',
      debug: error instanceof Error ? error.message : 'Unknown server error'
    }, { status: 500 });
  }
}
