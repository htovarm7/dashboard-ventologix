import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'ventologix'
};

// GET endpoint for testing database connection
export async function GET() {
  try {
    console.log('🔗 Probando conexión a base de datos...');
    const connection = await mysql.createConnection(dbConfig);
    
    // Test basic connection
    const [result] = await connection.execute('SELECT 1 as test') as [mysql.RowDataPacket[], mysql.FieldPacket[]];
    
    // Test usuarios_auth table
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM usuarios_auth') as [mysql.RowDataPacket[], mysql.FieldPacket[]];
    
    await connection.end();
    
    return NextResponse.json({ 
      status: 'Database connection successful',
      test: result[0],
      usuarios_auth_count: userCount[0].count,
      config: {
        host: dbConfig.host,
        database: dbConfig.database,
        user: dbConfig.user
      }
    });
  } catch (error) {
    console.error('❌ Error en test de conexión:', error);
    return NextResponse.json({ 
      error: 'Database connection failed',
      debug: error instanceof Error ? error.message : 'Unknown error',
      config: {
        host: dbConfig.host,
        database: dbConfig.database,
        user: dbConfig.user
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    console.log('🔍 Verificando email:', email);
    console.log('🔗 Conectando a base de datos:', {
      host: dbConfig.host,
      database: dbConfig.database,
      user: dbConfig.user
    });

    const connection = await mysql.createConnection(dbConfig);

    try {
      console.log('✅ Conexión a base de datos establecida');
      
      // Paso 1: Obtener numero_cliente
      console.log('📊 Ejecutando query para usuario:', email);
      const [userResults] = await connection.execute(
        'SELECT numero_cliente FROM usuarios_auth WHERE email = ?',
        [email]
      ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];

      console.log('📊 Resultados de usuarios_auth:', userResults);

      if (userResults.length === 0) {
        await connection.end();
        console.log('❌ Email no encontrado en usuarios_auth');
        return NextResponse.json({ 
          authorized: false,
          error: 'Email not authorized',
          debug: `Email ${email} no encontrado en la base de datos`
        }, { status: 403 });
      }

      const numero_cliente = userResults[0].numero_cliente;
      console.log('✅ Usuario encontrado, numero_cliente:', numero_cliente);

      // Paso 2: Obtener id_cliente y linea usando el JOIN
      const query = `
        SELECT c2.id_cliente, c2.linea, c2.alias
        FROM usuarios_auth ua
        JOIN clientes c ON ua.numero_cliente = c.numero_cliente
        JOIN compresores c2 ON c.id_cliente = c2.proyecto
        WHERE ua.numero_cliente = ?
      `;

      console.log('📊 Ejecutando query para compresores, numero_cliente:', numero_cliente);
      const [compresorsResults] = await connection.execute(query, [numero_cliente]) as [mysql.RowDataPacket[], mysql.FieldPacket[]];

      console.log('📊 Resultados de compresores:', compresorsResults);

      await connection.end();

      return NextResponse.json({ 
        authorized: true, 
        numero_cliente: numero_cliente,
        compresores: compresorsResults,
        status: 'Usuario autorizado' 
      });

    } catch (dbError) {
      await connection.end();
      console.error('❌ Error en conexión MySQL:', dbError);
      return NextResponse.json({ 
        authorized: false,
        error: 'Database error',
        debug: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error verificando usuario:', error);
    return NextResponse.json({ 
      error: 'Error de servidor',
      debug: error instanceof Error ? error.message : 'Unknown server error'
    }, { status: 500 });
  }
}
