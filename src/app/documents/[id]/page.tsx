'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText, File as FileIcon, Edit, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import DOCXViewer from '@/components/DOCXViewer';
import EditDocumentModal from '@/components/EditDocumentModal';
import DeleteDocumentModal from '@/components/DeleteDocumentModal';
// import Header from '@/components/Header';
import { format } from 'date-fns';

export default function DocumentDetails() {
  const { id } = useParams();
  const router = useRouter();
  
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'pdf' | 'docx'>('pdf');

  const fetchDocument = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error('Document not found');
      const data = await res.json();
      setDocument(data.document);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDocument();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* <Header /> */}
        <div className="flex-1 flex justify-center items-center text-black">
          <Loader2 className="animate-spin" size={40} />
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* <Header /> */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <Link href="/" className="inline-flex items-center text-gray-500 hover:text-black mb-6 font-medium text-sm transition-colors">
            <ArrowLeft size={16} className="mr-2" /> Back to Document Library
          </Link>
          <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200">
            {error || 'Document not found'}
          </div>
        </div>
      </div>
    );
  }

  const getDownloadUrl = (url: string, filename: string) => {
    if (!url) return '';
    return `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename || 'document')}`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* <Header /> */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Link href="/" className="inline-flex items-center text-gray-500 hover:text-black mb-6 font-medium text-sm transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Document Library
        </Link>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
          {/* Metadata Sidebar */}
          <div className="w-full md:w-1/3 bg-gray-50 border-r border-gray-200 p-6 flex flex-col h-full">
            <div className="mb-6">
              <span className="font-mono text-sm font-semibold text-black bg-gray-200 px-2.5 py-1 rounded-md border border-gray-300">{document.reference_number}</span>
              <h2 className="text-xl font-bold text-black mt-4 leading-snug">{document.title}</h2>
              {document.description && <p className="text-sm text-gray-600 mt-2">{document.description}</p>}
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Organization</p>
                <p className="text-sm font-medium text-slate-800">{document.organization === 'SPHERE_HIVE' ? 'Sphere Hive' : 'Spectra'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Issued Date</p>
                <p className="text-sm font-medium text-slate-800">{format(new Date(document.issued_date), 'dd MMMM yyyy')}</p>
              </div>
              {document.signatory && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Signatory</p>
                  <p className="text-sm font-medium text-slate-800">{document.signatory}</p>
                </div>
              )}
              {document.tags && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Tags</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {document.tags.split(',').map((tag: string, i: number) => (
                      <span key={i} className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium">{tag.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 space-y-3 pt-6 border-t border-gray-200">
              {document.pdf_url && (
                <a href={getDownloadUrl(document.pdf_url, document.pdf_filename)} download className="w-full flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-red-200">
                  <Download size={16} /> <span>Download PDF</span>
                </a>
              )}
              {document.docx_url && (
                <a href={getDownloadUrl(document.docx_url, document.docx_filename)} download className="w-full flex items-center justify-center space-x-2 bg-black hover:bg-gray-800 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors border border-black">
                  <Download size={16} /> <span>Download DOCX</span>
                </a>
              )}
              <div className="flex space-x-3 pt-2">
                <button onClick={() => setEditModalOpen(true)} className="flex-1 flex items-center justify-center space-x-2 bg-white hover:bg-gray-50 text-slate-700 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-gray-300">
                  <Edit size={16} /> <span>Edit</span>
                </button>
                <button onClick={() => setDeleteModalOpen(true)} className="flex-1 flex items-center justify-center space-x-2 bg-white hover:bg-rose-50 text-rose-600 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-gray-300">
                  <Trash2 size={16} /> <span>Delete</span>
                </button>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="w-full md:w-2/3 flex flex-col h-[800px] md:h-auto">
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h3 className="font-semibold text-black flex items-center gap-2">
                {previewType === 'pdf' ? <FileText size={18} className="text-black" /> : <FileIcon size={18} className="text-black" />}
                {previewType === 'pdf' ? 'PDF Preview' : 'DOCX Preview'}
              </h3>
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setPreviewType('pdf')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${previewType === 'pdf' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
                >
                  PDF
                </button>
                <button
                  onClick={() => setPreviewType('docx')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${previewType === 'docx' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
                >
                  DOCX
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 bg-[#f0f2f5] overflow-hidden flex flex-col">
              {previewType === 'pdf' ? (
                <div className="w-full h-full flex-1 rounded-lg overflow-hidden border border-gray-200 bg-white">
                  {document.pdf_url ? (
                    <iframe 
                      src={`${document.pdf_url}#toolbar=0`} 
                      className="w-full h-full rounded-b-xl border-none bg-slate-100"
                      title={document.title}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      No PDF available
                    </div>
                  )}
                </div>
              ) : (
                document.docx_url ? (
                  <DOCXViewer url={document.docx_url} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    No DOCX available
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </main>

      {editModalOpen && (
        <EditDocumentModal 
          document={document} 
          onClose={() => setEditModalOpen(false)} 
          onSuccess={() => {
            setEditModalOpen(false);
            fetchDocument();
          }} 
        />
      )}

      {deleteModalOpen && (
        <DeleteDocumentModal 
          document={document} 
          onClose={() => setDeleteModalOpen(false)} 
          onSuccess={() => {
            setDeleteModalOpen(false);
            router.push('/');
          }} 
        />
      )}
    </div>
  );
}
