import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { pool } from '@/lib/db';

const dbConfig = pool;

export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get all emails from usuarios_auth table
    const [users] = await connection.execute(
      'SELECT email, numero_cliente FROM usuarios_auth LIMIT 10'
    ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
    
    await connection.end();
    
    return NextResponse.json({ 
      status: 'success',
      users_count: users.length,
      sample_users: users.map(u => ({ 
        email: u.email, 
        numero_cliente: u.numero_cliente 
      }))
    });
  } catch (error) {
    console.error('❌ Error getting users:', error);
    return NextResponse.json({ 
      error: 'Database error',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
