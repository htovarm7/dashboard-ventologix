import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { groupDataByInterval } from '@/lib/apiUtils';
import { pool } from '@/lib/db';

// Database configuration
const dbConfig = pool;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id_cliente = searchParams.get('id_cliente');
    const linea = searchParams.get('linea');
    const date = searchParams.get('date');

    if (!id_cliente || !linea || !date) {
      return NextResponse.json({ 
        error: 'Parámetros requeridos: id_cliente, linea y date (formato YYYY-MM-DD)' 
      }, { status: 400 });
    }

    console.log('🔍 Obteniendo datos de línea para fecha específica:', { id_cliente, linea, date });

    const connection = await mysql.createConnection(dbConfig);

    try {
      // Call stored procedure DataFiltradaDayFecha with specific date
      const [results] = await connection.execute(
        'CALL DataFiltradaDayFecha(?, ?, ?, ?)',
        [id_cliente, id_cliente, linea, date]
      ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];

      await connection.end();

      if (!results || results.length === 0) {
        return NextResponse.json({ 
          error: 'No data found for the specified date.' 
        }, { status: 404 });
      }

      // Map the results (organize data by time)
      const data = results.map((row: any) => ({
        time: row[1],
        corriente: row[2]
      }));

      // Group data in 30-second intervals and calculate averages
      const groupedData = groupDataByInterval(data, 30);

      return NextResponse.json({ data: groupedData });

    } catch (dbError) {
      await connection.end();
      console.error('❌ Error en query MySQL:', dbError);
      return NextResponse.json({ 
        error: 'Database error',
        debug: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error en line-data-proc-day:', error);
    return NextResponse.json({ 
      error: 'Server error',
      debug: error instanceof Error ? error.message : 'Unknown server error'
    }, { status: 500 });
  }
}
