import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM imp_doc WHERE reference_number = ? OR id = ?', [id, id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    const doc = rows[0];

    const year = new Date(doc.issued_date).getFullYear().toString();
    const orgFolder = doc.organization.toLowerCase();
    const storageFolder = `document-management/${orgFolder}/${year}/${doc.reference_number}`;

    const newPdfVersion = (doc.pdf_version || 1) + 1;
    const newDocxVersion = (doc.docx_version || 1) + 1;
    
    const basePdfName = doc.pdf_filename.replace(/(__\d+)?\.pdf$/i, '');
    const baseDocxName = doc.docx_filename.replace(/(__\d+)?\.docx$/i, '');
    
    const pdfFilename = `${basePdfName}__${newPdfVersion.toString().padStart(3, '0')}.pdf`;
    const docxFilename = `${baseDocxName}__${newDocxVersion.toString().padStart(3, '0')}.docx`;

    const pdfPublicId = `${storageFolder}/${pdfFilename}`.replace(/\/+/g, '/');
    const docxPublicId = `${storageFolder}/${docxFilename}`.replace(/\/+/g, '/');

    const bucketName = 'documents';

    const { data: pdfData, error: pdfError } = await supabase.storage.from(bucketName).createSignedUploadUrl(pdfPublicId);
    if (pdfError) throw pdfError;

    const { data: docxData, error: docxError } = await supabase.storage.from(bucketName).createSignedUploadUrl(docxPublicId);
    if (docxError) throw docxError;

    const { data: pdfUrlData } = supabase.storage.from(bucketName).getPublicUrl(pdfPublicId);
    const { data: docxUrlData } = supabase.storage.from(bucketName).getPublicUrl(docxPublicId);

    return NextResponse.json({
      pdfFilename,
      pdfPublicId,
      pdfUrl: pdfUrlData.publicUrl,
      pdfSignedUrl: pdfData.signedUrl,
      pdfToken: pdfData.token,
      docxFilename,
      docxPublicId,
      docxUrl: docxUrlData.publicUrl,
      docxSignedUrl: docxData.signedUrl,
      docxToken: docxData.token,
    }, { status: 200 });

  } catch (error) {
    console.error('Error in init-upload (edit):', error);
    return NextResponse.json({ error: 'Failed to initialize upload' }, { status: 500 });
  }
}
