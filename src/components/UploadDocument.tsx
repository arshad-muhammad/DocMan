'use client';
import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, File as FileIcon, X, Loader2, CheckCircle } from 'lucide-react';

interface UploadDocumentProps {
  onSuccess: () => void;
}

export default function UploadDocument({ onSuccess }: UploadDocumentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{ referenceNumber: string } | null>(null);
  
  const [organization, setOrganization] = useState<'SPHERE_HIVE' | 'SPECTRA'>('SPHERE_HIVE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [signatory, setSignatory] = useState('');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tags, setTags] = useState('');
  
  const [nextSequence, setNextSequence] = useState<string>('XXXX');
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [docxFile, setDocxFile] = useState<File | null>(null);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchNextSequence = async () => {
      try {
        const orgCode = organization === 'SPHERE_HIVE' ? 'SH' : 'SP';
        const year = issuedDate ? new Date(issuedDate).getFullYear().toString() : new Date().getFullYear().toString();
        const prefix = `${orgCode}-${year}`;
        
        const res = await fetch(`/api/next-sequence?prefix=${prefix}`);
        const data = await res.json();
        if (data.nextSequence) {
          setNextSequence(data.nextSequence);
        } else {
          setNextSequence('XXXX');
        }
      } catch (err) {
        setNextSequence('XXXX');
      }
    };
    fetchNextSequence();
  }, [organization, issuedDate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'docx') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'pdf' && file.type !== 'application/pdf') {
      setError('Only PDF files are allowed for PDF attachment.');
      return;
    }
    if (type === 'docx' && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setError('Only DOCX files are allowed for DOCX attachment.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('File size cannot exceed 25 MB.');
      return;
    }

    setError('');
    if (type === 'pdf') setPdfFile(file);
    else setDocxFile(file);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (title.length < 3) return setError('Title must be at least 3 characters.');
    if (!pdfFile) return setError('PDF file is required.');
    if (!docxFile) return setError('DOCX file is required.');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('organization', organization);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('signatory', signatory);
      formData.append('issuedDate', issuedDate);
      formData.append('tags', tags);
      formData.append('pdf', pdfFile);
      formData.append('docx', docxFile);

      // Save to DB and Upload to Supabase via our Next.js API
      const dbRes = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await dbRes.json();
      if (!dbRes.ok) throw new Error(data.error || 'Failed to save document record');

      setSuccessData({ referenceNumber: data.referenceNumber });
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Organization Entity</label>
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  organization === 'SPHERE_HIVE' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:text-black'
                }`}
                onClick={() => setOrganization('SPHERE_HIVE')}
              >
                Sphere Hive
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  organization === 'SPECTRA' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:text-black'
                }`}
                onClick={() => setOrganization('SPECTRA')}
              >
                Spectra
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Automated Reference Index Number</label>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-black font-mono font-bold text-sm tracking-wide">
                {organization === 'SPHERE_HIVE' ? 'SH' : 'SP'}-{issuedDate ? new Date(issuedDate).getFullYear() : new Date().getFullYear()}-{nextSequence}
              </span>
              <span className="text-xs text-gray-500 font-medium">(Estimated Next Number)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Letter Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sphere Hive Annual Operational Directives 2026"
              className="w-full bg-gray-50 border border-gray-300 text-slate-900 text-sm rounded-lg focus:ring-black focus:border-black block p-3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Summary / Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief executive summary or key objectives outlined in the letter..."
              rows={4}
              maxLength={1000}
              className="w-full bg-gray-50 border border-gray-300 text-slate-900 text-sm rounded-lg focus:ring-black focus:border-black block p-3 resize-none"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Signatory</label>
              <input
                type="text"
                value={signatory}
                onChange={(e) => setSignatory(e.target.value)}
                placeholder="e.g. Dr. Marcus Holloway (CEO)"
                className="w-full bg-gray-50 border border-gray-300 text-slate-900 text-sm rounded-lg focus:ring-black focus:border-black block p-3"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Issued Date</label>
              <input
                type="date"
                required
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-slate-900 text-sm rounded-lg focus:ring-black focus:border-black block p-3"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tags / Search Keywords (Comma Separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. Strategy, Directives, Charter 2026, Compliance"
              className="w-full bg-gray-50 border border-gray-300 text-slate-900 text-sm rounded-lg focus:ring-black focus:border-black block p-3"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* PDF Upload Card */}
            <div className="border-2 border-dashed border-red-200 bg-red-50/50 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors hover:bg-red-50 relative">
              <div className="bg-red-100 p-3 rounded-full mb-3 text-red-600">
                <FileText size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">PDF Format Attachment</h3>
              <p className="text-xs text-slate-500 mb-4">Official Signed PDF</p>
              
              <input 
                type="file" 
                accept=".pdf" 
                ref={pdfInputRef} 
                onChange={(e) => handleFileChange(e, 'pdf')} 
                className="hidden" 
              />
              <button 
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className="text-xs font-semibold bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg shadow-sm hover:bg-red-50"
              >
                Choose File
              </button>
              {pdfFile && (
                <div className="mt-3 text-xs font-medium text-slate-700 flex items-center bg-white px-3 py-1.5 rounded-md border border-red-100 max-w-full">
                  <span className="truncate">{pdfFile.name}</span>
                  <button type="button" onClick={() => setPdfFile(null)} className="ml-2 text-red-500 hover:text-red-700"><X size={14}/></button>
                </div>
              )}
              {!pdfFile && <p className="mt-3 text-xs text-slate-400">No file chosen</p>}
            </div>

            {/* DOCX Upload Card */}
            <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors hover:bg-gray-100 relative">
              <div className="bg-gray-200 p-3 rounded-full mb-3 text-black">
                <FileIcon size={24} />
              </div>
              <h3 className="text-sm font-bold text-black">DOCX Format Attachment</h3>
              <p className="text-xs text-gray-500 mb-4">Editable Word Template</p>

              <input 
                type="file" 
                accept=".docx" 
                ref={docxInputRef} 
                onChange={(e) => handleFileChange(e, 'docx')} 
                className="hidden" 
              />
              <button 
                type="button"
                onClick={() => docxInputRef.current?.click()}
                className="text-xs font-semibold bg-white border border-gray-300 text-black px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50"
              >
                Choose File
              </button>
              {docxFile && (
                <div className="mt-3 text-xs font-medium text-black flex items-center bg-white px-3 py-1.5 rounded-md border border-gray-200 max-w-full">
                  <span className="truncate">{docxFile.name}</span>
                  <button type="button" onClick={() => setDocxFile(null)} className="ml-2 text-gray-500 hover:text-black"><X size={14}/></button>
                </div>
              )}
              {!docxFile && <p className="mt-3 text-xs text-gray-400">No file chosen</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center space-x-2 bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
          <span>{loading ? 'Uploading...' : 'Upload Document'}</span>
        </button>
      </div>

      {/* Success Modal */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gray-100 mb-6">
              <CheckCircle size={40} className="text-black" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Successful!</h2>
            <p className="text-slate-500 mb-8 text-sm">
              Your document has been securely archived and automatically assigned the following reference index:
            </p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8 shadow-inner">
              <p className="text-2xl font-mono font-bold text-black tracking-wider">
                {successData.referenceNumber}
              </p>
            </div>
            
            <button
              onClick={() => {
                setSuccessData(null);
                onSuccess();
              }}
              className="w-full bg-black hover:bg-gray-800 text-white py-3.5 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              Go to Document Library
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
