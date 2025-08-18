import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { pool } from '@/lib/db';

// Database configuration
const dbConfig = pool;

export async function GET() {
  try {
    console.log('🔍 Obteniendo todos los clientes');

    const connection = await mysql.createConnection(dbConfig);

    try {
      // Get clients with daily sending
      const [diarios] = await connection.execute(`
        SELECT e.id_cliente, e.nombre_cliente, comp.linea, comp.Alias
        FROM envios e
        JOIN compresores comp ON e.id_cliente = comp.id_cliente
      `) as [mysql.RowDataPacket[], mysql.FieldPacket[]];

      // Get clients with weekly sending (same query for now)
      const [semanales] = await connection.execute(`
        SELECT e.id_cliente, e.nombre_cliente, comp.linea, comp.Alias
        FROM envios e
        JOIN compresores comp ON e.id_cliente = comp.id_cliente
      `) as [mysql.RowDataPacket[], mysql.FieldPacket[]];

      await connection.end();

      // Convert to lists of dictionaries
      const data_diarios = diarios.map((row: any) => ({
        id_cliente: row.id_cliente,
        nombre_cliente: row.nombre_cliente,
        linea: row.linea,
        alias: row.Alias
      }));

      const data_semanales = semanales.map((row: any) => ({
        id_cliente: row.id_cliente,
        nombre_cliente: row.nombre_cliente,
        linea: row.linea,
        alias: row.Alias
      }));

      return NextResponse.json({
        diarios: data_diarios,
        semanales: data_semanales
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
    console.error('❌ Error en all-clients:', error);
    return NextResponse.json({ 
      error: 'Server error',
      debug: error instanceof Error ? error.message : 'Unknown server error'
    }, { status: 500 });
  }
}
