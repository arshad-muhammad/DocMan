import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { deleteFromCloudinary } from '@/lib/cloudinaryDelete';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; // can be ID or reference_number
    
    let query = 'SELECT * FROM imp_doc WHERE reference_number = ? OR id = ?';
    const [rows] = await pool.query<RowDataPacket[]>(query, [id, id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { confirmationName } = body;

    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM imp_doc WHERE reference_number = ? OR id = ?', [id, id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = rows[0];

    if (confirmationName !== doc.reference_number) {
      return NextResponse.json({ error: 'Confirmation string does not match the reference number exactly' }, { status: 400 });
    }

    // Delete all historical versions from Cloudinary
    const [versionRows] = await pool.query<RowDataPacket[]>('SELECT cloudinary_public_id, file_type FROM imp_doc_versions WHERE document_id = ?', [doc.id]);
    for (const v of versionRows) {
      const type = v.file_type === 'pdf' ? 'image' : 'raw';
      try { await deleteFromCloudinary(v.cloudinary_public_id, type); } catch (e) { console.error('Failed to clean up versioned file', e); }
    }

    // Delete current files from Cloudinary
    try { await deleteFromCloudinary(doc.pdf_public_id, 'image'); } catch (e) {}
    try { await deleteFromCloudinary(doc.docx_public_id, 'raw'); } catch (e) {}

    // Delete from DB (imp_doc_versions will cascade)
    await pool.query('DELETE FROM imp_doc WHERE id = ?', [doc.id]);

    return NextResponse.json({ success: true, message: 'Document deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM imp_doc WHERE reference_number = ? OR id = ?', [id, id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    const doc = rows[0];

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const signatory = formData.get('signatory') as string || '';
    const issuedDate = formData.get('issuedDate') as string;
    const tags = formData.get('tags') as string || '';
    
    const pdfFile = formData.get('pdf') as File | null;
    const docxFile = formData.get('docx') as File | null;

    let newPdfUrl = doc.pdf_url;
    let newPdfPublicId = doc.pdf_public_id;
    let newPdfFilename = doc.pdf_filename;
    let newPdfVersion = doc.pdf_version || 1;

    let newDocxUrl = doc.docx_url;
    let newDocxPublicId = doc.docx_public_id;
    let newDocxFilename = doc.docx_filename;
    let newDocxVersion = doc.docx_version || 1;

    const year = new Date(doc.issued_date).getFullYear().toString();
    const orgFolder = doc.organization.toLowerCase();
    const cloudinaryFolder = `document-management/${orgFolder}/${year}/${doc.reference_number}`;

    if (pdfFile || docxFile) {
      if (!pdfFile || !docxFile || typeof pdfFile === 'string' || typeof docxFile === 'string') {
        return NextResponse.json({ error: 'Both PDF and DOCX files must be provided to replace files.' }, { status: 400 });
      }
      
      if (pdfFile.type !== 'application/pdf') return NextResponse.json({ error: 'Only PDF allowed for PDF attachment' }, { status: 400 });
      if (docxFile.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return NextResponse.json({ error: 'Only DOCX allowed for DOCX attachment' }, { status: 400 });

      // Delete the original files from Cloudinary as requested
      try { await deleteFromCloudinary(doc.pdf_public_id, 'image'); } catch (e) { console.error('Failed to delete old PDF', e); }
      try { await deleteFromCloudinary(doc.docx_public_id, 'raw'); } catch (e) { console.error('Failed to delete old DOCX', e); }

      const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
      const docxBuffer = Buffer.from(await docxFile.arrayBuffer());
      
      newPdfVersion = (doc.pdf_version || 1) + 1;
      newDocxVersion = (doc.docx_version || 1) + 1;
      
      const basePdfName = doc.pdf_filename.replace(/(__\d+)?\.pdf$/i, '');
      const baseDocxName = doc.docx_filename.replace(/(__\d+)?\.docx$/i, '');
      
      newPdfFilename = `${basePdfName}__${newPdfVersion.toString().padStart(4, '0')}.pdf`;
      newDocxFilename = `${baseDocxName}__${newDocxVersion.toString().padStart(4, '0')}.docx`;

      const pdfResult = await uploadToCloudinary(pdfBuffer, cloudinaryFolder, newPdfFilename, pdfFile.type);
      newPdfUrl = pdfResult.url;
      newPdfPublicId = pdfResult.public_id;
      
      const docxResult = await uploadToCloudinary(docxBuffer, cloudinaryFolder, newDocxFilename, docxFile.type);
      newDocxUrl = docxResult.url;
      newDocxPublicId = docxResult.public_id;
    }

    const updateQuery = `
      UPDATE imp_doc SET 
        title = ?, description = ?, category = ?, signatory = ?, recipient = ?, 
        issued_date = ?, tags = ?, 
        pdf_url = ?, pdf_public_id = ?, pdf_filename = ?, pdf_version = ?,
        docx_url = ?, docx_public_id = ?, docx_filename = ?, docx_version = ?
      WHERE id = ?
    `;
    const updateParams = [
      title || doc.title, 
      description, 
      doc.category, 
      signatory, 
      doc.recipient, 
      issuedDate || doc.issued_date, 
      tags, 
      newPdfUrl, 
      newPdfPublicId, 
      newPdfFilename,
      newPdfVersion,
      newDocxUrl, 
      newDocxPublicId,
      newDocxFilename,
      newDocxVersion,
      doc.id
    ];

    await pool.query(updateQuery, updateParams);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Failed to update document.' }, { status: 500 });
  }
}
