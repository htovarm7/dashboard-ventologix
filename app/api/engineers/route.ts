import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export async function GET() {
  try {
    const ingenieros = await dbQuery(`
      SELECT e.id, e.name, e.email, GROUP_CONCAT(ec.compresor_id) as compresor
      FROM ingenieros e
      LEFT JOIN ingeniero_compresor ec ON e.id = ec.ingeniero_id
      GROUP BY e.id, e.name, e.email
    `);

    return NextResponse.json(ingenieros.map(ingeniero => ({
      ...ingeniero,
      compresores: ingeniero.compresores ? ingeniero.compresores.split(',') : []
    })));
  } catch (error) {
    console.error('Error fetching ingenieros:', error);
    return NextResponse.json({ error: 'Error fetching ingenieros' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, compresores } = await request.json();

    const result = await dbQuery(
      'INSERT INTO ingenieros (name, email) VALUES (?, ?)',
      [name, email]
    );

    const ingenieroId = result.insertId;

    if (compresores && compresores.length > 0) {
      const values = compresores.map(compresor => [ingenieroId, compresor]);
      await dbQuery(
        'INSERT INTO ingeniero_compresores (ingeniero_id, compresor_id) VALUES ?',
        [values]
      );
    }

    return NextResponse.json({ id: ingenieroId, name, email, compresores });
  } catch (error) {
    console.error('Error creating ingeniero:', error);
    return NextResponse.json({ error: 'Error creating ingeniero' }, { status: 500 });
  }
}
