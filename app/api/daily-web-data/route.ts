import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { costoEnergiaUsd } from '@/lib/apiUtils';

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

    console.log('🔍 Obteniendo datos diarios para:', { id_cliente, linea });

    const connection = await mysql.createConnection(dbConfig);

    try {
      // Call stored procedure DFDFTest
      const [results] = await connection.execute(
        'CALL DFDFTest(?, ?, ?, DATE_SUB(CURDATE(), INTERVAL 1 DAY))',
        [id_cliente, id_cliente, linea]
      ) as [mysql.RowDataPacket[][], mysql.FieldPacket[]];

      // The procedure returns multiple result sets
      // First result set: TempConEstadoAnterior (we need to consume it)
      // Second result set: the summary data we need

      if (!results || results.length < 2 || !results[1] || results[1].length === 0) {
        await connection.end();
        return NextResponse.json({ 
          data: null, 
          message: "Sin datos para ese día" 
        });
      }

      const summaryData = results[1][0];
      
      const {
        fecha,
        inicio,
        fin,
        horas_trab,
        kWh,
        horas_load,
        horas_noload,
        hp_equivalente,
        ciclos,
        prom_ciclos_hora
      } = summaryData;

      // Get HP nominal and voltage for this client and line
      const [compressorData] = await connection.execute(
        'SELECT hp, voltaje FROM compresores WHERE id_cliente = ? AND linea = ? LIMIT 1',
        [id_cliente, linea]
      ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];

      // Get cost per kWh for this client
      const [clientData] = await connection.execute(
        'SELECT CostokWh FROM clientes WHERE id_cliente = ?',
        [id_cliente]
      ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];

      await connection.end();

      const hp_nominal = compressorData.length > 0 ? compressorData[0].hp : 0;
      const usd_por_kwh = clientData.length > 0 ? clientData[0].CostokWh : 0.17;
      const costo_usd = costoEnergiaUsd(parseFloat(kWh), usd_por_kwh);

      // Comments for cycles
      let comentario_ciclos: string;
      if (prom_ciclos_hora >= 6 && prom_ciclos_hora <= 15) {
        comentario_ciclos = "El promedio de ciclos por hora trabajada está dentro del rango recomendado de 6 a 15 ciclos/hora.";
      } else {
        comentario_ciclos = "El promedio de ciclos por hora trabajada está fuera del rango recomendado. Se recomienda revisar el compresor.";
      }

      // Comments for HP
      let comentario_hp: string;
      if (hp_nominal === 0) {
        comentario_hp = "Sin información de HP nominal.";
      } else if (hp_equivalente <= hp_nominal) {
        comentario_hp = "El HP equivalente está dentro del rango nominal.";
      } else {
        comentario_hp = "El HP equivalente supera al nominal, se recomienda revisión.";
      }

      return NextResponse.json({
        data: {
          fecha: new Date(fecha).toISOString().split('T')[0],
          inicio_funcionamiento: inicio,
          fin_funcionamiento: fin,
          horas_trabajadas: parseFloat(horas_trab),
          kWh: parseFloat(kWh),
          horas_load: parseFloat(horas_load),
          horas_noload: parseFloat(horas_noload),
          hp_nominal: parseInt(hp_nominal),
          hp_equivalente: parseInt(hp_equivalente),
          ciclos: parseInt(ciclos),
          promedio_ciclos_hora: parseFloat(prom_ciclos_hora),
          costo_usd: costo_usd,
          comentario_ciclos: comentario_ciclos,
          comentario_hp_equivalente: comentario_hp
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
    console.error('❌ Error en daily-web-data:', error);
    return NextResponse.json({ 
      error: 'Server error',
      debug: error instanceof Error ? error.message : 'Unknown server error'
    }, { status: 500 });
  }
}
