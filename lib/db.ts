import mysql from 'mysql2/promise';
import process from 'process';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000, // 60 segundos
  enableKeepAlive: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  debug: process.env.NODE_ENV === 'development',
  maxIdle: 10, // máximo de conexiones inactivas
  idleTimeout: 60000, // tiempo máximo de inactividad
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
