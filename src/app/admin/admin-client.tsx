// src/app/admin/admin-client.tsx

'use client';

import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { Users, HelpCircle, LayoutGrid, BarChart3, Clock, UserPlus, BookCopy, PlusCircle } from 'lucide-react';

// Type for the stats object passed from the server
interface AdminStats {
  users: number;
  questions: number;
  categories: number;
}

// Type for a recent attempt entry
interface RecentAttempt {
  id: string;
  score: number | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
  categories: { name_en: string } | null;
}

// --- MODERN UI SUB-COMPONENTS ---

const StatCard = ({ icon, title, value, description }: { icon: React.ReactNode, title: string, value: number, description: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6"
    >
        <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <div className="text-gray-500">{icon}</div>
        </div>
        <p className="text-4xl font-bold text-white mt-2">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
    </motion.div>
);

const ManagementCard = ({ href, icon, title, description }: { href: string, icon: React.ReactNode, title: string, description: string }) => (
    <Link href={href}>
        <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 h-full hover:border-cyan-500/50 hover:bg-gray-800/80 transition-all duration-300 group">
            <div className="text-cyan-400 mb-4">{icon}</div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
        </div>
    </Link>
);


// --- MAIN ADMIN CLIENT COMPONENT ---
export default function AdminClient({ user, stats, recentAttempts }: { user: User, stats: AdminStats, recentAttempts: RecentAttempt[] }) {
  return (
    <main className="min-h-screen w-full p-8 sm:p-12 bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl">
        {/* --- HEADER --- */}
        <div className="mb-12">
            <h1 className="text-4xl font-bold text-white">Admin Mission Control</h1>
            <p className="text-lg text-gray-400 mt-1">Oversee and manage the Khojney platform.</p>
        </div>

        {/* --- AT A GLANCE STATS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <StatCard icon={<Users size={24} />} title="Total Users" value={stats.users} description="All signed up users" />
            <StatCard icon={<HelpCircle size={24} />} title="Total Questions" value={stats.questions} description="Across all categories" />
            <StatCard icon={<LayoutGrid size={24} />} title="Total Categories" value={stats.categories} description="Published and unpublished" />
        </div>

        {/* --- MANAGEMENT & ACTIVITY GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Management Links */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
                    <ManagementCard href="/admin/users" icon={<UserPlus size={32} />} title="User Management" description="View user data, assign roles, and manage user access." />
                </motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
                    <ManagementCard href="/admin/questions" icon={<BookCopy size={32} />} title="Question Bank" description="Add, edit, and bulk upload questions for all categories." />
                </motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
                    <ManagementCard href="/admin/categories" icon={<PlusCircle size={32} />} title="Category Hub" description="Create new quiz categories and manage their hierarchy." />
                </motion.div>
                 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
                    <ManagementCard href="/admin/analytics" icon={<BarChart3 size={32} />} title="Platform Analytics" description="View detailed reports on quiz performance and user engagement." />
                </motion.div>
            </div>

            {/* Right Column: Recent Activity */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="lg:col-span-1 bg-gray-800/50 border border-gray-700/80 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Clock size={20} className="text-gray-400"/>
                    <h3 className="text-xl font-bold text-white">Recent Activity</h3>
                </div>
                <ul className="space-y-4">
                    {recentAttempts.length > 0 ? recentAttempts.map(attempt => (
                        <li key={attempt.id} className="text-sm border-b border-gray-700/50 pb-3">
                            <p className="font-semibold text-gray-200">{attempt.profiles?.full_name || 'A user'} completed a quiz.</p>
                            <p className="text-gray-400">"{attempt.categories?.name_en || 'General Quiz'}" with score {attempt.score}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date(attempt.created_at).toLocaleString()}</p>
                        </li>
                    )) : (
                        <p className="text-sm text-gray-500">No recent quiz attempts found.</p>
                    )}
                </ul>
            </motion.div>
        </div>
      </div>
    </main>
  );
}