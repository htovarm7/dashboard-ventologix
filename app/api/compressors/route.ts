import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export async function GET() {
  try {
    const compressors = await dbQuery(`
      SELECT id, alias as name
      FROM Equipos
      WHERE status = 1
    `);

    return NextResponse.json(compressors);
  } catch (error) {
    console.error('Error fetching compressors:', error);
    return NextResponse.json({ error: 'Error fetching compressors' }, { status: 500 });
  }
}
