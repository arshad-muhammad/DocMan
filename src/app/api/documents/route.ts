import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateReferenceNumber } from '@/lib/reference';
import { uploadToSupabase } from '@/lib/supabaseUpload';
import { deleteFromSupabase } from '@/lib/supabaseDelete';

export async function GET(req: NextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const search = searchParams.get('search');
    const organization = searchParams.get('organization');
    const year = searchParams.get('year');

    let query = 'SELECT * FROM imp_doc WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ` AND (
        reference_number LIKE ? OR 
        title LIKE ? OR 
        description LIKE ? OR 
        signatory LIKE ? OR 
        recipient LIKE ? OR 
        tags LIKE ?
      )`;
      const searchWildcard = `%${search}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    }

    if (organization && organization !== 'All') {
      query += ' AND organization = ?';
      params.push(organization);
    }

    if (year && year !== 'All') {
      query += ' AND YEAR(issued_date) = ?';
      params.push(year);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(query, params);
    
    return NextResponse.json({ documents: rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let pdfResult: { url: string, public_id: string } | null = null;
  let docxResult: { url: string, public_id: string } | null = null;

  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await req.json();
      
      const {
        referenceNumber, organization, title, description,
        signatory, issuedDate, tags,
        pdfFilename, pdfUrl, pdfPublicId,
        docxFilename, docxUrl, docxPublicId
      } = data;

      if (!referenceNumber || !organization || !title || !issuedDate || !pdfUrl || !docxUrl) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const query = `
        INSERT INTO imp_doc (
          reference_number, organization, category, title, description,
          signatory, recipient, issued_date, tags,
          pdf_filename, pdf_url, pdf_public_id,
          docx_filename, docx_url, docx_public_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        referenceNumber, organization, 'NONE', title, description || '',
        signatory || '', '', issuedDate, tags || '',
        pdfFilename, pdfUrl, pdfPublicId,
        docxFilename, docxUrl, docxPublicId
      ];

      await pool.query(query, params);
      return NextResponse.json({ success: true, referenceNumber }, { status: 201 });
    }

    const formData = await req.formData();
    const organization = formData.get('organization') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const signatory = formData.get('signatory') as string || '';
    const issuedDate = formData.get('issuedDate') as string;
    const tags = formData.get('tags') as string || '';
    
    const pdfFile = formData.get('pdf') as File;
    const docxFile = formData.get('docx') as File;

    if (!organization || !title || !issuedDate || !pdfFile || !docxFile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate files
    if (pdfFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed for PDF attachment' }, { status: 400 });
    }
    if (docxFile.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return NextResponse.json({ error: 'Only DOCX files are allowed for DOCX attachment' }, { status: 400 });
    }
    if (pdfFile.size > 25 * 1024 * 1024 || docxFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size cannot exceed 25 MB' }, { status: 400 });
    }

    // Generate reference
    const orgCode = organization === 'SPHERE_HIVE' ? 'SH' : 'SP';
    const year = new Date(issuedDate).getFullYear().toString();
    const referenceNumber = await generateReferenceNumber(orgCode, year);

    const baseFilename = referenceNumber;
    const pdfFilename = `${baseFilename}__0001.pdf`;
    const docxFilename = `${baseFilename}__0001.docx`;

    // Folder structure: document-management/<org>/<year>/<reference>
    const orgFolder = organization.toLowerCase();
    const cloudinaryFolder = `document-management/${orgFolder}/${year}/${referenceNumber}`;

    // Convert File to Buffer
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    const docxBuffer = Buffer.from(await docxFile.arrayBuffer());

    // Upload to Supabase
    pdfResult = await uploadToSupabase(pdfBuffer, cloudinaryFolder, pdfFilename, pdfFile.type);
    
    try {
      docxResult = await uploadToSupabase(docxBuffer, cloudinaryFolder, docxFilename, docxFile.type);
    } catch (docxErr) {
      // If DOCX fails, clean up PDF
      if (pdfResult) await deleteFromSupabase(pdfResult.public_id);
      throw docxErr;
    }

    // Save to DB
    const query = `
      INSERT INTO imp_doc (
        reference_number, organization, category, title, description,
        signatory, recipient, issued_date, tags,
        pdf_filename, pdf_url, pdf_public_id,
        docx_filename, docx_url, docx_public_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      referenceNumber, organization, 'NONE', title, description,
      signatory, '', issuedDate, tags,
      pdfFilename, pdfResult.url, pdfResult.public_id,
      docxFilename, docxResult.url, docxResult.public_id
    ];

    try {
      await pool.query(query, params);
    } catch (dbErr) {
      // If DB fails, clean up both Supabase files
      if (pdfResult) await deleteFromSupabase(pdfResult.public_id);
      if (docxResult) await deleteFromSupabase(docxResult.public_id);
      throw dbErr;
    }

    return NextResponse.json({ success: true, referenceNumber }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/documents:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
