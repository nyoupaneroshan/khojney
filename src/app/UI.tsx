import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

// Consistent Loading/Error states
export const LoadingState = () => (
  <main className="flex min-h-screen flex-col items-center justify-center p-8">
    <p className="text-xl text-gray-400">Loading your quiz...</p>
  </main>
);

export const ErrorState = ({ error }: { error: string }) => (
  <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
    <div className="bg-red-900/50 border border-red-700 p-8 rounded-lg max-w-md">
      <h2 className="text-2xl font-bold text-red-400 mb-4">An Error Occurred</h2>
      <p className="text-red-300 mb-6">{error}</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
      >
        <ArrowLeftIcon className="h-5 w-5" /> Back to Categories
      </Link>
    </div>
  </main>
);