import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const { paramsToSign } = await req.json();

    if (!paramsToSign) {
      return NextResponse.json({ error: 'Missing paramsToSign' }, { status: 400 });
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (error) {
    console.error('Error signing cloudinary params:', error);
    return NextResponse.json({ error: 'Failed to sign' }, { status: 500 });
  }
}
