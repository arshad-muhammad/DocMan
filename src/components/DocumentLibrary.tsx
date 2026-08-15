'use client';
import { useState, useEffect } from 'react';
import { Search, Filter, Loader2, FileText, File as FileIcon, Eye, Trash2, Edit, Download } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import DeleteDocumentModal from './DeleteDocumentModal';
import EditDocumentModal from './EditDocumentModal';

export default function DocumentLibrary() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [organization, setOrganization] = useState('All');
  const [year, setYear] = useState('All');
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [docToEdit, setDocToEdit] = useState<any>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (organization !== 'All') params.append('organization', organization);
      if (year !== 'All') params.append('year', year);
      
      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add debounce for search if needed, but here simple useEffect is enough 
    // triggered by form submit or specific filter change. 
    fetchDocuments();
  }, [organization, year]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments();
  };

  const getDownloadUrl = (url: string, filename: string) => {
    return `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  };

  const currentYear = new Date().getFullYear().toString();
  
  // Dashboard stats
  const totalDocs = documents.length;
  const docsThisYear = documents.filter(d => new Date(d.issued_date).getFullYear().toString() === currentYear).length;
  const docsSphereHive = documents.filter(d => d.organization === 'SPHERE_HIVE').length;
  const docsSpectra = documents.filter(d => d.organization === 'SPECTRA').length;

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
          <p className="text-xs text-gray-500 font-semibold uppercase">Total Documents</p>
          <p className="text-3xl font-bold text-black">{totalDocs}</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
          <p className="text-xs text-gray-500 font-semibold uppercase">This Year</p>
          <p className="text-3xl font-bold text-black">{docsThisYear}</p>
        </div>
        <div className="bg-black border border-black p-4 rounded-xl shadow-sm">
          <p className="text-xs text-gray-400 font-semibold uppercase">Sphere Hive</p>
          <p className="text-3xl font-bold text-white">{docsSphereHive}</p>
        </div>
        <div className="bg-red-600 border border-red-700 p-4 rounded-xl shadow-sm">
          <p className="text-xs text-red-200 font-semibold uppercase">Spectra</p>
          <p className="text-3xl font-bold text-white">{docsSpectra}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-black">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center relative">
          <Search className="absolute left-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-black focus:border-black"
          />
          <button type="submit" className="hidden">Search</button>
        </form>

        <div className="flex flex-wrap gap-2">
          <select value={organization} onChange={(e) => setOrganization(e.target.value)} className="border border-gray-300 rounded-lg text-sm p-2 bg-white">
            <option value="All">All Organizations</option>
            <option value="SPHERE_HIVE">Sphere Hive</option>
            <option value="SPECTRA">Spectra</option>
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="border border-gray-300 rounded-lg text-sm p-2 bg-white">
            <option value="All">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-black">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <FileText className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-700">No documents found.</h3>
          <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">Your document archive is currently empty or no documents match your search criteria. Try another keyword or clear the filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Desktop Table view */}
          <table className="w-full text-left border-collapse hidden md:table">
            <thead>
              <tr className="border-b border-gray-200 text-sm font-semibold text-slate-500">
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Issued Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {documents.map(doc => (
                <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">{doc.reference_number}</td>
                  <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate" title={doc.title}>{doc.title}</td>
                  <td className="py-3 px-4 text-slate-600">{format(new Date(doc.issued_date), 'dd MMM yyyy')}</td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <Link href={`/documents/${doc.reference_number}`} className="inline-flex items-center justify-center p-2 bg-gray-100 text-black rounded-md hover:bg-gray-200 transition-colors" title="Preview">
                      <Eye size={16} />
                    </Link>
                    <a href={getDownloadUrl(doc.pdf_url, doc.pdf_filename)} download className="inline-flex items-center justify-center p-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors" title="Download PDF">
                      <FileText size={16} />
                    </a>
                    <a href={getDownloadUrl(doc.docx_url, doc.docx_filename)} download className="inline-flex items-center justify-center p-2 bg-gray-100 text-black rounded-md hover:bg-gray-200 transition-colors" title="Download DOCX">
                      <FileIcon size={16} />
                    </a>
                    <button 
                      onClick={() => { setDocToEdit(doc); setEditModalOpen(true); }}
                      className="inline-flex items-center justify-center p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                      title="Edit Document"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => { setDocToDelete(doc); setDeleteModalOpen(true); }}
                      className="inline-flex items-center justify-center p-2 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card view */}
          <div className="md:hidden space-y-4">
            {documents.map(doc => (
              <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs font-semibold text-black bg-gray-100 px-2 py-1 rounded border border-gray-200">{doc.reference_number}</span>
                  <span className="text-xs text-gray-500">{format(new Date(doc.issued_date), 'dd MMM yyyy')}</span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm">{doc.title}</h4>
                <div className="flex items-center gap-2">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">{doc.organization}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <Link href={`/documents/${doc.reference_number}`} className="text-sm font-medium text-black underline">
                    Preview
                  </Link>
                  <div className="flex space-x-2">
                    <a href={getDownloadUrl(doc.pdf_url, doc.pdf_filename)} download className="p-2 bg-red-50 text-red-600 rounded-md" title="Download PDF"><FileText size={16} /></a>
                    <a href={getDownloadUrl(doc.docx_url, doc.docx_filename)} download className="p-2 bg-gray-100 text-black rounded-md" title="Download DOCX"><FileIcon size={16} /></a>
                    <button onClick={() => { setDocToEdit(doc); setEditModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-md" title="Edit"><Edit size={16} /></button>
                    <button onClick={() => { setDocToDelete(doc); setDeleteModalOpen(true); }} className="p-2 bg-rose-50 text-rose-600 rounded-md" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {deleteModalOpen && docToDelete && (
        <DeleteDocumentModal 
          document={docToDelete} 
          onClose={() => setDeleteModalOpen(false)} 
          onSuccess={() => {
            setDeleteModalOpen(false);
            fetchDocuments();
          }} 
        />
      )}

      {editModalOpen && docToEdit && (
        <EditDocumentModal 
          document={docToEdit} 
          onClose={() => setEditModalOpen(false)} 
          onSuccess={() => {
            setEditModalOpen(false);
            fetchDocuments();
          }} 
        />
      )}
    </div>
  );
}
