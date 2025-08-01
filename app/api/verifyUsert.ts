import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, name } = req.body;

  if (!email) return res.status(400).json({ error: 'Email requerido' });

  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);

    res.status(200).json({ status: 'Usuario existente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error de servidor' });
  }
}