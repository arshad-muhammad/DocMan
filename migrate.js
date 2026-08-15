const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2;

async function downloadFile(url) {
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401) {
      console.warn(`  401 Unauthorized fetching ${url}. You might need to make the Cloudinary asset public or download it manually.`);
      return null;
    }
    throw new Error(`Failed to fetch ${url} (Status: ${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

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
    console.log('Fetching documents from DB...');
    const [docs] = await pool.query('SELECT * FROM imp_doc');
    console.log(`Found ${docs.length} documents. Migrating...`);

    for (const doc of docs) {
      console.log(`Processing document ID: ${doc.id} (${doc.reference_number})...`);

      // 1. Migrate PDF
      if (doc.pdf_url && doc.pdf_url.includes('cloudinary.com')) {
        console.log(`  Downloading PDF from Cloudinary...`);
        try {
          // Attempt to get a secure signed URL from Cloudinary to bypass 401s
          const signedUrl = cloudinary.url(doc.pdf_public_id, { resource_type: 'image', secure: true, sign_url: true });
          const pdfBuffer = await downloadFile(signedUrl) || await downloadFile(doc.pdf_url);
          
          if (!pdfBuffer) {
             console.error(`  Skipping PDF upload for doc ${doc.id} due to 401.`);
          } else {
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
            console.log(`  PDF updated in DB.`);
          }
        } catch (e) {
          console.error(`  Error migrating PDF for doc ${doc.id}:`, e);
        }
      }

      // 2. Migrate DOCX
      if (doc.docx_url && doc.docx_url.includes('cloudinary.com')) {
        console.log(`  Downloading DOCX from Cloudinary...`);
        try {
          const signedUrl = cloudinary.url(doc.docx_public_id, { resource_type: 'raw', secure: true, sign_url: true });
          const docxBuffer = await downloadFile(signedUrl) || await downloadFile(doc.docx_url);
          
          if (!docxBuffer) {
             console.error(`  Skipping DOCX upload for doc ${doc.id} due to 401.`);
          } else {
            const docxFilename = doc.docx_filename || `${doc.reference_number}.docx`;
            const docxPath = `document-management/${doc.organization.toLowerCase()}/${new Date(doc.issued_date).getFullYear()}/${doc.reference_number}/${docxFilename}`.replace(/\/+/g, '/');

            console.log(`  Uploading DOCX to Supabase as ${docxPath}...`);
            const { error: docxUploadError } = await supabase.storage.from('documents').upload(docxPath, docxBuffer, {
              contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              upsert: true,
            });

            if (docxUploadError) throw docxUploadError;

            const { data: docxUrlData } = supabase.storage.from('documents').getPublicUrl(docxPath);
            
            await pool.query('UPDATE imp_doc SET docx_url = ?, docx_public_id = ? WHERE id = ?', [docxUrlData.publicUrl, docxPath, doc.id]);
            console.log(`  DOCX updated in DB.`);
          }
        } catch (e) {
          console.error(`  Error migrating DOCX for doc ${doc.id}:`, e);
        }
      }
    }

    console.log('Fetching document versions from DB...');
    const [versions] = await pool.query('SELECT * FROM imp_doc_versions');
    console.log(`Found ${versions.length} versions. Migrating...`);

    for (const v of versions) {
      if (v.cloudinary_url && v.cloudinary_url.includes('cloudinary.com')) {
        console.log(`Processing version ID: ${v.id}...`);
        try {
          const signedUrl = cloudinary.url(v.cloudinary_public_id, { resource_type: v.file_type === 'pdf' ? 'image' : 'raw', secure: true, sign_url: true });
          const buffer = await downloadFile(signedUrl) || await downloadFile(v.cloudinary_url);
          
          if (!buffer) continue;
          
          // Try to deduce folder path from doc
          const [docRows] = await pool.query('SELECT * FROM imp_doc WHERE id = ?', [v.document_id]);
          if (docRows.length === 0) continue;
          const doc = docRows[0];

          const filePath = `document-management/${doc.organization.toLowerCase()}/${new Date(doc.issued_date).getFullYear()}/${doc.reference_number}/${v.filename}`.replace(/\/+/g, '/');
          const contentType = v.file_type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          
          console.log(`  Uploading version to Supabase as ${filePath}...`);
          const { error: vUploadError } = await supabase.storage.from('documents').upload(filePath, buffer, {
            contentType: contentType,
            upsert: true,
          });

          if (vUploadError) throw vUploadError;

          const { data: vUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
          
          await pool.query('UPDATE imp_doc_versions SET cloudinary_url = ?, cloudinary_public_id = ? WHERE id = ?', [vUrlData.publicUrl, filePath, v.id]);
          console.log(`  Version updated in DB.`);
        } catch (e) {
          console.error(`  Error migrating version ${v.id}:`, e);
        }
      }
    }

    console.log('Migration Complete!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

run();
