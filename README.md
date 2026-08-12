# Sphere Hive Document Archive

A complete, production-ready Document Management  Application for internal document archiving. Users can upload, manage, search, preview, download, edit, and delete official club documents.

## 1. Project Setup
This project is built with Next.js (App Router), TypeScript, and Tailwind CSS. It uses MySQL for database storage and Cloudinary for file hosting.
No authentication is required as per the design requirements.

## 2. Node.js Version
Ensure you have **Node.js v18.17.0** or later installed.

## 3. Installing Dependencies
Clone the repository and install the dependencies using npm:
```bash
npm install
```

## 4. MySQL Setup
You need a running MySQL server. Create a database for the application:
```sql
CREATE DATABASE document_manager;
USE document_manager;
```

## 5. Creating the Tables (imp_doc and reference_counters)
Execute the following SQL commands to create the required tables:

```sql
CREATE TABLE reference_counters (
    prefix VARCHAR(50) PRIMARY KEY,
    last_sequence INT NOT NULL DEFAULT 0
);

CREATE TABLE imp_doc (
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
);
```

## 6. Cloudinary Setup
1. Create a free account at [Cloudinary](https://cloudinary.com/).
2. Navigate to your Dashboard to find your Cloud Name, API Key, and API Secret.
3. Your application uses Cloudinary to securely store `.pdf` and `.docx` files.

## 7. Environment Variables
Create a `.env` file in the root of your project:

```env
MYSQL_HOST="localhost"
MYSQL_PORT="3306"
MYSQL_USER="root"
MYSQL_PASSWORD="password"
MYSQL_DATABASE="document_manager"

CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```
**Important:** Never expose the `CLOUDINARY_API_SECRET` to the client-side code.

## 8. Running Development Server
Run the local development server:
```bash
npm run dev
```
Navigate to `http://localhost:3000` to access the Document Archive.

## 9. Building for Production
To build the application for production:
```bash
npm run build
```

## 10. Deployment
You can deploy this application on platforms like Vercel, Railway, or AWS.
Start the production server using:
```bash
npm start
```
Ensure that your production environment variables (Database URL and Cloudinary keys) are properly configured in your deployment platform.

## 11. File Upload Architecture
When a user uploads a document:
1. The Next.js API route (`/api/documents`) processes the `multipart/form-data`.
2. A unique reference number is generated atomically on the server.
3. Both PDF and DOCX files are renamed to match the reference number exactly.
4. The files are uploaded securely to Cloudinary using their Server SDK.
5. If the DOCX upload fails, the previously uploaded PDF is immediately deleted to prevent orphaned files.
6. The metadata and Cloudinary URLs/Public IDs are saved into the `imp_doc` MySQL table.

## 12. Cloudinary Folder Structure
Files are logically structured inside Cloudinary:
```text
document-management/
    sphere_hive/
        2026/
            SH-2026-MAIN-0001/
                SH-2026-MAIN-0001.pdf
                SH-2026-MAIN-0001.docx
```

## 13. Database Structure
The application uses two tables:
- `imp_doc`: Stores all document metadata and file URLs. Each row represents a single logical document containing both PDF and DOCX files.
- `reference_counters`: Stores the latest sequence number for each prefix (e.g., `SH-2026-MAIN`) to safely increment reference numbers during concurrent uploads using a row-level lock (`FOR UPDATE`).

## 14. Reference-Number Generation
Reference numbers follow the format `<ORGANIZATION_CODE>-<YEAR>-<CATEGORY>-<SEQUENCE>`.
Example: `SH-2026-MAIN-0002`
This string is generated **on the server** using a transaction. The server locks the counter row for the specific prefix, increments it safely, and commits the transaction, guaranteeing uniqueness and preventing duplicates even under high concurrency.

## 15. Document Deletion Workflow
Document deletion is deliberately strict to prevent accidents:
1. The user clicks "Delete" on a document.
2. A modal appears requiring the user to type the **exact reference number** (e.g., `SH-2026-MAIN-0002`).
3. The "Delete Permanently" button only activates if the input perfectly matches.
4. The client sends a DELETE request to `/api/documents/[id]` including the `confirmationName`.
5. The Server double-checks the confirmation string against the database record.
6. The Server securely deletes the PDF from Cloudinary.
7. The Server securely deletes the DOCX from Cloudinary.
8. The Server deletes the record from the `imp_doc` table.
9. If everything succeeds, a success message is shown and the library refreshes.
