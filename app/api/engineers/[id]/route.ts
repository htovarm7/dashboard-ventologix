import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { name, email, compressors } = await request.json();
    const { id } = params;

    await dbQuery(
      'UPDATE ingenieros SET name = ?, email = ? WHERE id = ?',
      [name, email, id]
    );

    await dbQuery(
      'DELETE FROM ingeniero_compresores WHERE ingeniero_id = ?',
      [id]
    );

    if (compressors && compressors.length > 0) {
      const values = compresores.map(compresor => [id, compresor]);
      await dbQuery(
        'INSERT INTO ingeniero_compresores (ingeniero_id, compresor_id) VALUES ?',
        [values]
      );
    }

    return NextResponse.json({ id, name, email, compresores });
  } catch (error) {
    console.error('Error updating engineer:', error);
    return NextResponse.json({ error: 'Error updating engineer' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    await dbQuery(
      'DELETE FROM ingeniero_compresores WHERE ingeniero_id = ?',
      [id]
    );

    await dbQuery(
      'DELETE FROM ingenieros WHERE id = ?',
      [id]
    );

    return NextResponse.json({ message: 'Ingeniero borrado exitosamente' });
  } catch (error) {
    console.error('Error borrando ingeniero:', error);
    return NextResponse.json({ error: 'Error borrando ingeniero' }, { status: 500 });
  }
}
