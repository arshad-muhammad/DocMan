CREATE TABLE imp_doc (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference_number VARCHAR(100) UNIQUE NOT NULL,
  organization VARCHAR(50) NOT NULL,
  category VARCHAR(50) DEFAULT 'NONE',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  signatory VARCHAR(100),
  recipient VARCHAR(100),
  issued_date DATE NOT NULL,
  tags VARCHAR(255),
  
  pdf_filename VARCHAR(255) NOT NULL,
  pdf_url TEXT NOT NULL,
  pdf_public_id VARCHAR(500) NOT NULL,
  pdf_version INT DEFAULT 1,
  
  docx_filename VARCHAR(255) NOT NULL,
  docx_url TEXT NOT NULL,
  docx_public_id VARCHAR(500) NOT NULL,
  docx_version INT DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE imp_doc_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  file_type ENUM('pdf', 'docx') NOT NULL,
  version_number INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  cloudinary_url TEXT NOT NULL,
  cloudinary_public_id VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES imp_doc(id) ON DELETE CASCADE
);
