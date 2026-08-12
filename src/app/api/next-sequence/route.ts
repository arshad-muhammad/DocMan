import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(req: NextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const prefix = searchParams.get('prefix');

    if (!prefix) {
      return NextResponse.json({ error: 'Missing prefix' }, { status: 400 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT last_sequence FROM reference_counters WHERE prefix = ?',
      [prefix]
    );

    const lastSequence = rows.length > 0 ? rows[0].last_sequence : 0;
    const nextSequence = lastSequence + 1;
    
    // Format as 4 digits
    const formattedSequence = nextSequence.toString().padStart(4, '0');

    return NextResponse.json({ nextSequence: formattedSequence }, { status: 200 });
  } catch (error) {
    console.error('Error fetching next sequence:', error);
    return NextResponse.json({ error: 'Failed to fetch sequence' }, { status: 500 });
  }
}
