'use client';
import { useEffect, useRef, useState } from 'react';
import * as docx from 'docx-preview';
import { Loader2 } from 'lucide-react';

interface DOCXViewerProps {
  url: string;
}

export default function DOCXViewer({ url }: DOCXViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadDocx = async () => {
      try {
        setLoading(true);
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch document');
        const blob = await res.blob();
        
        if (isMounted && containerRef.current) {
          await docx.renderAsync(blob, containerRef.current, containerRef.current, {
            inWrapper: false,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            useBase64URL: true,
          });
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error rendering document');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDocx();

    return () => {
      isMounted = false;
    };
  }, [url]);

  return (
    <div className="w-full h-full min-h-[600px] bg-gray-100 flex flex-col items-center overflow-auto rounded-lg border border-gray-200">
      {loading && (
        <div className="flex-1 flex items-center justify-center text-blue-600">
          <Loader2 className="animate-spin" size={32} />
        </div>
      )}
      {error && (
        <div className="flex-1 flex items-center justify-center text-red-600">
          <p>{error}</p>
        </div>
      )}
      <div 
        ref={containerRef} 
        className={`w-full ${loading || error ? 'hidden' : 'block'}`}
      />
    </div>
  );
}
