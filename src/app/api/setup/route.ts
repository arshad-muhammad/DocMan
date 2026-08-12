import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Create reference_counters table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reference_counters (
          prefix VARCHAR(50) PRIMARY KEY,
          last_sequence INT NOT NULL DEFAULT 0
      )
    `);

    // Create imp_doc table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS imp_doc (
          id INT AUTO_INCREMENT PRIMARY KEY,
          reference_number VARCHAR(100) NOT NULL UNIQUE,
          organization VARCHAR(50) NOT NULL,
          category VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          signatory VARCHAR(255),
          recipient VARCHAR(255),
          issued_date DATE NOT NULL,
          tags TEXT,
          pdf_filename VARCHAR(255) NOT NULL,
          pdf_url TEXT NOT NULL,
          pdf_public_id VARCHAR(500) NOT NULL,
          docx_filename VARCHAR(255) NOT NULL,
          docx_url TEXT NOT NULL,
          docx_public_id VARCHAR(500) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_reference (reference_number),
          INDEX idx_organization (organization),
          INDEX idx_category (category),
          INDEX idx_issued_date (issued_date),
          INDEX idx_title (title)
      )
    `);

    return NextResponse.json({ 
      success: true, 
      message: 'Database tables initialized successfully! You can now upload documents.' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize database tables.', 
      details: error.message 
    }, { status: 500 });
  }
}
