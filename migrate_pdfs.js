const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2;
const AdmZip = require('adm-zip');

async function downloadFile(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  const supabase = createClient(supabaseUrl, supabaseKey);

  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    const [docs] = await pool.query("SELECT * FROM imp_doc WHERE pdf_url LIKE '%cloudinary%'");
    console.log(`Found ${docs.length} PDFs still on Cloudinary.`);

    for (const doc of docs) {
      console.log(`Processing document ID: ${doc.id} (${doc.reference_number})...`);
      try {
        console.log(`  Requesting secure Zip from Cloudinary...`);
        // Cloudinary requires public_id without extension for image type.
        const publicId = doc.pdf_public_id.replace(/\.pdf$/, '');
        
        const zipResult = await cloudinary.uploader.create_zip({
          public_ids: [publicId],
          resource_type: 'image'
        });

        console.log(`  Downloading Zip from ${zipResult.secure_url}...`);
        const zipBuffer = await downloadFile(zipResult.secure_url);
        
        const zip = new AdmZip(zipBuffer);
        const zipEntries = zip.getEntries();
        
        if (zipEntries.length === 0) {
           console.error('  Zip is empty!');
           continue;
        }

        // Extract PDF from the zip (there should be exactly one file)
        const pdfBuffer = zipEntries[0].getData();

        const pdfFilename = doc.pdf_filename || `${doc.reference_number}.pdf`;
        const pdfPath = `document-management/${doc.organization.toLowerCase()}/${new Date(doc.issued_date).getFullYear()}/${doc.reference_number}/${pdfFilename}`.replace(/\/+/g, '/');

        console.log(`  Uploading PDF to Supabase as ${pdfPath}...`);
        const { error: pdfUploadError } = await supabase.storage.from('documents').upload(pdfPath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

        if (pdfUploadError) throw pdfUploadError;

        const { data: pdfUrlData } = supabase.storage.from('documents').getPublicUrl(pdfPath);
        
        await pool.query('UPDATE imp_doc SET pdf_url = ?, pdf_public_id = ? WHERE id = ?', [pdfUrlData.publicUrl, pdfPath, doc.id]);
        console.log(`  Successfully extracted and migrated PDF to DB!`);
      } catch (e) {
        console.error(`  Error migrating PDF for doc ${doc.id}:`, e);
      }
    }
  } catch (err) {
    console.error('Failed:', err);
  } finally {
    pool.end();
  }
}

run();
