import mysql from 'mysql2/promise';
import process from 'process';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'usuario',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function dbQuery<T>(
  query: string, 
  values: any[] = []
): Promise<T> {
  try {
    const [rows] = await pool.execute(query, values);
    return rows as T;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
