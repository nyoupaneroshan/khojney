import Link from 'next/link';

export const AdminLoading = () => (
  <main className="flex min-h-screen flex-col items-center justify-center p-24">
    <p>Loading admin section...</p>
  </main>
);

export const AccessDenied = () => (
  <main className="flex min-h-screen flex-col items-center justify-center p-24">
    <h1 className="text-2xl text-red-500">Access Denied</h1>
    <p className="mt-4">You must be an admin to view this page.</p>
    <Link href="/" className="text-blue-400 hover:text-blue-300 mt-6">Go to Homepage</Link>
  </main>
);