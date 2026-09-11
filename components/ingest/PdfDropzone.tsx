'use client';

import React from 'react';
import { UploadCloud } from 'lucide-react';

interface PdfDropzoneProps {
  onUpload: () => void;
}

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({ onUpload }) => {
  return (
    <div
      onClick={onUpload}
      className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/20 transition-all group flex flex-col items-center gap-2"
    >
      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
        <UploadCloud className="w-5 h-5" />
      </div>
      <div className="text-sm font-semibold text-zinc-900 dark:text-white">
        Drop supplier PDFs here
      </div>
      <div className="text-xs text-zinc-500">
        price lists, spec sheets, catalogues · max 40 MB
      </div>
      <div className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
        or click to browse local files
      </div>
    </div>
  );
};
