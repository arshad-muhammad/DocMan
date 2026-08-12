'use client';
import { useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeleteDocumentModalProps {
  document: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteDocumentModal({ document, onClose, onSuccess }: DeleteDocumentModalProps) {
  const [confirmationName, setConfirmationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (confirmationName !== document.reference_number) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`/api/documents/${document.reference_number}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationName }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete document');
      
      alert(`Document deleted successfully.\n\n${document.reference_number}`);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  const isMatched = confirmationName === document.reference_number;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-rose-50/50">
          <div className="flex items-center space-x-2 text-rose-600">
            <AlertTriangle size={20} />
            <h3 className="font-bold">Delete Document?</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}
          
          <p className="text-sm text-slate-600">You are about to permanently delete:</p>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="font-mono text-emerald-600 font-bold text-sm">{document.reference_number}</p>
            <p className="text-slate-800 font-medium text-sm mt-1">{document.title}</p>
          </div>
          
          <div className="text-sm text-slate-600">
            <p className="font-medium mb-1">This will permanently delete:</p>
            <ul className="space-y-1">
              <li className="flex items-center text-red-600"><span className="mr-2">✓</span> PDF</li>
              <li className="flex items-center text-blue-600"><span className="mr-2">✓</span> DOCX</li>
              <li className="flex items-center text-slate-600"><span className="mr-2">✓</span> Database record</li>
            </ul>
          </div>
          
          <p className="text-sm font-bold text-rose-600">This action cannot be undone.</p>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Type the document filename to confirm:
            </label>
            <input
              type="text"
              value={confirmationName}
              onChange={(e) => setConfirmationName(e.target.value)}
              placeholder={document.reference_number}
              className="w-full bg-white border border-gray-300 text-slate-900 font-mono text-sm rounded-lg focus:ring-rose-500 focus:border-rose-500 block p-3"
            />
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!isMatched || loading}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-sm ${
              isMatched && !loading ? 'bg-rose-600 hover:bg-rose-700' : 'bg-rose-300 cursor-not-allowed'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
            <span>{loading ? 'Deleting...' : 'Delete Permanently'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
