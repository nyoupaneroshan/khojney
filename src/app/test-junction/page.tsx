'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TestJunctionPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleTestFetch = async () => {
    setLoading(true);
    setResult('');

    // Let's try to fetch EVERYTHING from question_categories
    const { data, error } = await supabase
      .from('question_categories')
      .select('*');

    if (error) {
      console.error('Error fetching from question_categories:', error);
      setResult(`Error: ${error.message}`);
    } else {
      console.log('Successfully fetched from question_categories:', data);
      setResult(`Success! Fetched ${data.length} rows. Check the console for details.`);
    }

    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
      <h1 className="text-3xl font-bold mb-6">Test Junction Table Read</h1>
      <p className="mb-4">
        This page will attempt to read all rows from the `question_categories` table to test its RLS policy.
      </p>
      <button
        onClick={handleTestFetch}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
      >
        {loading ? 'Fetching...' : 'Run Test Fetch'}
      </button>
      {result && (
        <div className="mt-8 p-4 border border-gray-600 rounded bg-gray-800 w-full max-w-2xl">
          <h2 className="text-xl mb-2">Result:</h2>
          <pre className="text-left whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </main>
  );
}