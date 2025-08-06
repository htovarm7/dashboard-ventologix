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
    const linea = searchParams.get('linea');

    if (!id_cliente || !linea) {
      return NextResponse.json({ 
        error: 'Parámetros requeridos: id_cliente y linea' 
      }, { status: 400 });
    }

    console.log('🔍 Obteniendo datos de turnos semanales para:', { id_cliente, linea });

    const connection = await mysql.createConnection(dbConfig);

    try {
      // Call stored procedure semanaTurnosFP
      const [results] = await connection.execute(
        'CALL semanaTurnosFP(?, ?, ?)',
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
        fecha: row[1],
        Turno: row[2],
        kwhTurno: row[3],
        TimestampInicio: row[4],
        TimestampFin: row[5]
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
    console.error('❌ Error en week/shifts:', error);
    return NextResponse.json({ 
      error: 'Server error',
      debug: error instanceof Error ? error.message : 'Unknown server error'
    }, { status: 500 });
  }
}
