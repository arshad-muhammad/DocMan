import { NextRequest, NextResponse } from 'next/server';
import { generateReferenceNumber } from '@/lib/reference';

export async function POST(req: NextRequest) {
  try {
    const { organization, issuedDate } = await req.json();
    
    if (!organization || !issuedDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const orgCode = organization === 'SPHERE_HIVE' ? 'SH' : 'SP';
    const year = new Date(issuedDate).getFullYear().toString();
    const referenceNumber = await generateReferenceNumber(orgCode, year);

    return NextResponse.json({ referenceNumber });
  } catch (error) {
    console.error('Error generating reference:', error);
    return NextResponse.json({ error: 'Failed to generate reference' }, { status: 500 });
  }
}
