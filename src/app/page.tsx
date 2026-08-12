'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import UploadDocument from '@/components/UploadDocument';
import DocumentLibrary from '@/components/DocumentLibrary';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('library');

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex space-x-2 border-b border-gray-200">
          <button
            className={`py-3 px-6 font-medium text-sm rounded-t-lg transition-colors ${
              activeTab === 'upload'
                ? 'bg-white text-black border-t border-l border-r border-gray-200 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('upload')}
          >
            Upload Document
          </button>
          <button
            className={`py-3 px-6 font-medium text-sm rounded-t-lg transition-colors ${
              activeTab === 'library'
                ? 'bg-white text-black border-t border-l border-r border-gray-200 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('library')}
          >
            Document Library
          </button>
        </div>

        <div className="bg-white rounded-lg rounded-tl-none shadow-sm border border-gray-200 p-6 md:p-8">
          {activeTab === 'upload' ? (
            <UploadDocument onSuccess={() => setActiveTab('library')} />
          ) : (
            <DocumentLibrary />
          )}
        </div>
      </main>
    </div>
  );
}
