import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { percentageLoad, percentageNoload, percentageOff } from '@/lib/apiUtils';

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
    const linea = searchParams.get('linea');

    if (!id_cliente || !linea) {
      return NextResponse.json({ 
        error: 'Parámetros requeridos: id_cliente y linea' 
      }, { status: 400 });
    }

    console.log('🔍 Obteniendo datos de pie chart semanal para:', { id_cliente, linea });

    const connection = await mysql.createConnection(dbConfig);

    try {
      // Call stored procedure DataFiltradaWeek
      const [results] = await connection.execute(
        'CALL DataFiltradaWeek(?, ?, ?)',
        [id_cliente, id_cliente, linea]
      ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];

      await connection.end();

      if (!results || results.length === 0) {
        return NextResponse.json({ 
          error: 'No data from procedure' 
        }, { status: 404 });
      }

      // Map the results (adjust columns as needed)
      const data = results.map((row: any) => ({
        time: row[1],
        estado: row[3],
        estado_anterior: row[4]
      }));

      // Calculate percentages
      const loadPercentage = Math.round(percentageLoad(data) * 100) / 100;
      const noloadPercentage = Math.round(percentageNoload(data) * 100) / 100;
      const offPercentage = Math.round(percentageOff(data) * 100) / 100;

      return NextResponse.json({
        data: {
          LOAD: loadPercentage,
          NOLOAD: noloadPercentage,
          OFF: offPercentage
        }
      });

    } catch (dbError) {
      await connection.end();
      console.error('❌ Error en query MySQL:', dbError);
      return NextResponse.json({ 
        error: 'Database error',
        debug: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error en week/pie-data-proc:', error);
    return NextResponse.json({ 
      error: 'Server error',
      debug: error instanceof Error ? error.message : 'Unknown server error'
    }, { status: 500 });
  }
}
