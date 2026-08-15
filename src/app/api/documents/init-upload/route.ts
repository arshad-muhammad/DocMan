import { NextRequest, NextResponse } from 'next/server';
import { generateReferenceNumber } from '@/lib/reference';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { organization, issuedDate } = await req.json();

    if (!organization || !issuedDate) {
      return NextResponse.json({ error: 'Missing organization or issuedDate' }, { status: 400 });
    }

    const orgCode = organization === 'SPHERE_HIVE' ? 'SH' : 'SP';
    const year = new Date(issuedDate).getFullYear().toString();
    const referenceNumber = await generateReferenceNumber(orgCode, year);

    const baseFilename = referenceNumber;
    const pdfFilename = `${baseFilename}__001.pdf`;
    const docxFilename = `${baseFilename}__001.docx`;

    const orgFolder = organization.toLowerCase();
    const storageFolder = `document-management/${orgFolder}/${year}/${referenceNumber}`;

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
      referenceNumber,
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
    console.error('Error in init-upload:', error);
    return NextResponse.json({ error: 'Failed to initialize upload' }, { status: 500 });
  }
}
