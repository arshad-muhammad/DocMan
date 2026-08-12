import cloudinary from './cloudinary';

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  filename: string,
  mimetype: string
): Promise<{ url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    // For raw files like docx, we use 'raw' resource_type.
    // For pdf, we can also use 'raw' or 'image' (Cloudinary treats PDF as image sometimes),
    // but 'raw' is safer for document downloads, though if we want to preview PDF, 
    // we might need 'image' or just rely on the URL.
    // The instructions say: "Store both Cloudinary URLs/public IDs in MySQL"
    // For PDFs to display directly in browser, it's often better to not use 'raw', 
    // but we can use 'auto' or 'image' if we want Cloudinary to serve it as PDF with content-type application/pdf.
    const resourceType = mimetype === 'application/pdf' ? 'image' : 'raw';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: resourceType === 'raw' ? filename : filename.replace(/\.[^/.]+$/, ""),
        resource_type: resourceType,
        use_filename: true,
        unique_filename: false,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}
