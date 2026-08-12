import pool from './db';
import { RowDataPacket } from 'mysql2';

export async function generateReferenceNumber(
  organizationCode: string, // 'SH' or 'SP'
  year: string              // '2026'
): Promise<string> {
  const prefix = `${organizationCode}-${year}`;
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Try to get the current sequence with a write lock
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT last_sequence FROM reference_counters WHERE prefix = ? FOR UPDATE',
      [prefix]
    );

    let nextSequence = 1;

    if (rows.length === 0) {
      // Create new prefix counter
      await connection.query(
        'INSERT INTO reference_counters (prefix, last_sequence) VALUES (?, ?)',
        [prefix, 1]
      );
    } else {
      nextSequence = rows[0].last_sequence + 1;
      // Update existing prefix counter
      await connection.query(
        'UPDATE reference_counters SET last_sequence = ? WHERE prefix = ?',
        [nextSequence, prefix]
      );
    }

    await connection.commit();

    const sequenceStr = nextSequence.toString().padStart(4, '0');
    return `${prefix}-${sequenceStr}`;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
