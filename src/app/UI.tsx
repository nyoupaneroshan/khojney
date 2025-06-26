// src/app/UI.tsx

import Link from 'next/link';
// FIX: Using the modern 'lucide-react' icon library
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export const LoadingState = () => (
  <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900">
    <p className="text-xl text-gray-400">Loading...</p>
  </main>
);

export const ErrorState = ({ error }: { error: string }) => (
  <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-gray-900">
    <div className="bg-red-900/50 border border-red-700 p-8 rounded-lg max-w-md">
      <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
      <h2 className="text-2xl font-bold text-red-400 mb-4">An Error Occurred</h2>
      <p className="text-red-300 mb-6">{error}</p>
      <Link href="/" className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
        <ArrowLeft size={18} />
        Back to Home
      </Link>
    </div>
  </main>
);