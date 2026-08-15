'use client';
import { useState, useRef } from 'react';
import { X, Loader2, Save, FileText, File as FileIcon } from 'lucide-react';

interface EditDocumentModalProps {
  document: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditDocumentModal({ document, onClose, onSuccess }: EditDocumentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState(document.title);
  const [description, setDescription] = useState(document.description || '');
  const [signatory, setSignatory] = useState(document.signatory || '');
  const [issuedDate, setIssuedDate] = useState(document.issued_date.split('T')[0]);
  const [tags, setTags] = useState(document.tags || '');
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [docxFile, setDocxFile] = useState<File | null>(null);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);

  const uploadToCloudinaryDirect = async (file: File, folder: string, filename: string, resourceType: 'image' | 'raw') => {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const publicId = resourceType === 'raw' ? filename : filename.replace(/\.[^/.]+$/, "");

    const signRes = await fetch('/api/cloudinary/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paramsToSign: { timestamp, folder, public_id: publicId } }),
    });
    
    if (!signRes.ok) throw new Error('Failed to get upload signature');
    const { signature, apiKey, cloudName } = await signRes.json();

    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('api_key', apiKey);
    uploadData.append('timestamp', timestamp.toString());
    uploadData.append('signature', signature);
    uploadData.append('folder', folder);
    uploadData.append('public_id', publicId);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
      method: 'POST',
      body: uploadData,
    });

    if (!uploadRes.ok) throw new Error(`Failed to upload ${file.name} to Cloudinary`);
    return await uploadRes.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.length < 3) return setError('Title must be at least 3 characters.');
    
    if (pdfFile || docxFile) {
      if (!pdfFile || !docxFile) {
        return setError('Both PDF and DOCX files must be uploaded if you choose to replace them.');
      }
      let msg = "Replace Files?\n\n";
      msg += `Current PDF: ${document.pdf_filename}\nWill be replaced with: ${pdfFile.name}\n\n`;
      msg += `Current DOCX: ${document.docx_filename}\nWill be replaced with: ${docxFile.name}\n\n`;
      msg += "The original files will be deleted.\nPress OK to upload and replace.";
      if (!window.confirm(msg)) return;
    }

    setLoading(true);
    setError('');

    try {
      let pdfUrl, pdfPublicId, docxUrl, docxPublicId;
      
      if (pdfFile && docxFile) {
        const year = new Date(document.issued_date).getFullYear().toString();
        const orgFolder = document.organization.toLowerCase();
        const cloudinaryFolder = `document-management/${orgFolder}/${year}/${document.reference_number}`;
        
        const newPdfVersion = (document.pdf_version || 1) + 1;
        const newDocxVersion = (document.docx_version || 1) + 1;
        
        const basePdfName = document.pdf_filename.replace(/(__\d+)?\.pdf$/i, '');
        const baseDocxName = document.docx_filename.replace(/(__\d+)?\.docx$/i, '');
        
        const newPdfFilename = `${basePdfName}__${newPdfVersion.toString().padStart(4, '0')}.pdf`;
        const newDocxFilename = `${baseDocxName}__${newDocxVersion.toString().padStart(4, '0')}.docx`;

        const pdfUpload = await uploadToCloudinaryDirect(pdfFile, cloudinaryFolder, newPdfFilename, 'image');
        const docxUpload = await uploadToCloudinaryDirect(docxFile, cloudinaryFolder, newDocxFilename, 'raw');
        
        pdfUrl = pdfUpload.secure_url;
        pdfPublicId = pdfUpload.public_id;
        docxUrl = docxUpload.secure_url;
        docxPublicId = docxUpload.public_id;
      }

      const res = await fetch(`/api/documents/${document.reference_number}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, signatory, issuedDate, tags,
          pdfUrl, pdfPublicId, docxUrl, docxPublicId
        }),
      });

      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (!res.ok) {
          throw new Error(`Server error: ${res.status} ${res.statusText}. ${text.substring(0, 100)}`);
        }
        data = {};
      }

      if (!res.ok) throw new Error(data.error || 'Failed to update document');

      alert('Document updated successfully.');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden my-8 relative">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-800 text-lg">Edit Document: {document.reference_number}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-slate-900 text-sm rounded-lg focus:ring-[#009F6B] focus:border-[#009F6B] block p-2.5"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-300 text-slate-900 text-sm rounded-lg focus:ring-[#009F6B] focus:border-[#009F6B] block p-2.5 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tags (Comma Separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-slate-900 text-sm rounded-lg focus:ring-[#009F6B] focus:border-[#009F6B] block p-2.5"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Signatory</label>
                <input
                  type="text"
                  value={signatory}
                  onChange={(e) => setSignatory(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-slate-900 text-sm rounded-lg focus:ring-[#009F6B] focus:border-[#009F6B] block p-2.5"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Issued Date</label>
                <input
                  type="date"
                  required
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-slate-900 text-sm rounded-lg focus:ring-[#009F6B] focus:border-[#009F6B] block p-2.5"
                />
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Replace PDF (Optional)</p>
                  <p className="text-sm font-mono text-slate-800 mb-2">Current: {document.pdf_filename}</p>
                  <input type="file" accept=".pdf" className="hidden" ref={pdfInputRef} onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                  <button type="button" onClick={() => pdfInputRef.current?.click()} className="w-full text-xs py-2 px-3 bg-red-50 text-red-600 border border-red-200 rounded-lg flex items-center justify-center gap-1 hover:bg-red-100 transition-colors">
                    <FileText size={14} /> Upload New PDF
                  </button>
                </div>
                
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Replace DOCX (Optional)</p>
                  <p className="text-sm font-mono text-slate-800 mb-2">Current: {document.docx_filename}</p>
                  <input type="file" accept=".docx" className="hidden" ref={docxInputRef} onChange={(e) => setDocxFile(e.target.files?.[0] || null)} />
                  <button type="button" onClick={() => docxInputRef.current?.click()} className="w-full text-xs py-2 px-3 bg-gray-100 text-black border border-gray-300 rounded-lg flex items-center justify-center gap-1 hover:bg-gray-200 transition-colors">
                    <FileIcon size={14} /> Upload New DOCX
                  </button>
                </div>
                {(pdfFile || docxFile) && (
                  <div className="text-xs text-emerald-600 font-medium">
                    {pdfFile && <div>Will replace PDF with: {pdfFile.name}</div>}
                    {docxFile && <div>Will replace DOCX with: {docxFile.name}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 bg-[#009F6B] hover:bg-[#008F5F] text-white px-6 py-2 rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
