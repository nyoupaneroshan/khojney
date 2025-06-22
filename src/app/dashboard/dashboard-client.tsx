// src/app/dashboard/dashboard-client.tsx

'use client';

import React, { useState, useMemo, useCallback } from 'react';
// In a real Next.js app, you would use these imports.
// Mocks are used for compatibility in this environment.
/*
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { ArrowLeft, User as UserIcon, CheckCircle2, AlertTriangle, BarChart3, Award, Hash, Star, ChevronLeft, ChevronRight, Trophy, Flame, Target } from 'lucide-react';
*/
import { motion } from 'framer-motion';
// --- FIX: Corrected icon names to match what's used in the code ---
import { ArrowLeft, User as UserIcon, CheckCircle2, AlertTriangle, BarChart3, Award, Hash, Star, ChevronLeft, ChevronRight, Trophy, Flame, Target } from 'lucide-react';


// --- MOCK DATA & FUNCTIONS ---
const Link = ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>;
const supabase = { from: (table: string) => ({ update: (data: any) => ({ eq: (c: any, v: any) => Promise.resolve({ error: null }) }) }) };
// --- END MOCK ---

// --- ADJUSTED & ALIGNED TYPE DEFINITIONS ---
type User = { id: string; email?: string; user_metadata?: { full_name?: string } };

// This Profile type now correctly reflects the `profiles` table from our advanced schema.
type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  current_streak: number | null;
};

type Attempt = {
  id: string;
  score: number | null;
  status: string;
  completed_at: string | null;
  categories: { name_en: string } | null;
};

type Performance = {
  category_name: string;
  correct_answers: number | null;
  total_questions_answered: number | null;
};

type Achievement = {
  earned_at: string;
  achievements: {
    name: string;
    description: string | null;
    icon_url: string | null;
  } | null;
};

type OverallStats = {
  total_quizzes: number;
  total_questions: number;
  accuracy: number;
};

type Filters = { category: string; status: string; };


// --- UI Sub-components ---

const DashboardHeader = ({ name }: { name: string }) => (
    <div className="flex justify-between items-center mb-10">
        <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Welcome back, {name}!</h1>
            <p className="text-lg text-gray-400 mt-1">Let's review your progress and conquer new challenges.</p>
        </div>
        <Link href="/categories" className="hidden sm:inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <ArrowLeft size={18} /> Back to Categories
        </Link>
    </div>
);

const StatCard = ({ icon, title, value, colorClass }: { icon: React.ReactNode, title: string, value: string | number, colorClass: string }) => (
    <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 flex items-center gap-5 shadow-lg">
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${colorClass}`}>{icon}</div>
        <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-gray-400">{title}</p>
        </div>
    </div>
);

const ProfileCard = ({ user, initialProfile }: { user: User, initialProfile: Profile | null }) => {
    const [fullName, setFullName] = useState(initialProfile?.full_name || '');
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setUpdating(true);
        setMessage(null);
        const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
        if (error) setMessage({ text: 'Error updating profile.', type: 'error' });
        else setMessage({ text: 'Profile updated!', type: 'success' });
        setUpdating(false);
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 h-full flex flex-col">
            <div className="flex items-center gap-4 mb-6"><UserIcon className="w-8 h-8 text-cyan-400" /><h2 className="text-2xl font-bold text-white">Your Profile</h2></div>
            <div className="space-y-2 mb-6"><p className="font-semibold text-lg text-white">{initialProfile?.full_name || 'No Name Set'}</p><p className="text-sm text-gray-400">{user.email}</p></div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div><label htmlFor="fullName" className="block text-sm font-medium text-gray-400 mb-1">Update Name</label><input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 text-white bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div>
                <div className="flex items-center justify-between gap-4">
                    <button type="submit" className="px-5 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 disabled:bg-gray-500 transition-colors" disabled={updating}>{updating ? 'Saving...' : 'Save'}</button>
                    {message && (<div className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {message.text}</div>)}
                </div>
            </form>
        </div>
    );
};

const PerformanceCard = ({ performanceData }: { performanceData: Performance[] | null }) => {
    return (
        <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 h-full">
             <div className="flex items-center gap-4 mb-6"><BarChart3 className="w-8 h-8 text-cyan-400" /><h2 className="text-2xl font-bold text-white">Category Performance</h2></div>
             <div className="space-y-4">
                {!performanceData || performanceData.length === 0 ? (
                    <p className="text-gray-400 text-center py-10">No performance data yet.</p>
                ) : (
                    performanceData.map(p => {
                        const percentage = (p.total_questions_answered || 0) > 0 ? ((p.correct_answers || 0) / p.total_questions_answered!) * 100 : 0;
                        return (
                            <div key={p.category_name}>
                                <div className="flex justify-between items-center mb-1 text-gray-300">
                                    <span className="font-semibold">{p.category_name}</span>
                                    <span className="text-sm">{p.correct_answers} / {p.total_questions_answered}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-3"><div className="bg-gradient-to-r from-cyan-500 to-blue-600 h-3 rounded-full" style={{ width: `${percentage}%` }} /></div>
                            </div>
                        )
                    })
                )}
             </div>
        </div>
    );
};

const AchievementsCard = ({ recentAchievements }: { recentAchievements: Achievement[] | null }) => {
    return (
        <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 h-full">
            <div className="flex items-center gap-4 mb-6"><Trophy className="w-8 h-8 text-yellow-400" /><h2 className="text-2xl font-bold text-white">Recent Achievements</h2></div>
            <div className="space-y-4">
                 {!recentAchievements || recentAchievements.length === 0 ? (
                    <p className="text-gray-400 text-center py-10">Your first achievement is just one quiz away!</p>
                ) : (
                    recentAchievements.map(({ achievements, earned_at }) => achievements && (
                        <div key={earned_at} className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-yellow-900/50 text-yellow-400 rounded-full flex items-center justify-center flex-shrink-0"><Award size={20} /></div>
                            <div>
                                <p className="font-bold text-white">{achievements.name}</p>
                                <p className="text-sm text-gray-400">Earned on {new Date(earned_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const QuizHistory = ({ initialAttempts }: { initialAttempts: Attempt[] }) => {
    const [filters, setFilters] = useState<Filters>({ category: 'all', status: 'all' });
    const [currentPage, setCurrentPage] = useState(1);
    const ATTEMPTS_PER_PAGE = 5;

    const availableCategories = useMemo(() => ['all', ...Array.from(new Set(initialAttempts.map(a => a.categories?.name_en).filter(Boolean)))], [initialAttempts]);

    const filteredAttempts = useMemo(() => initialAttempts.filter(attempt => 
        (filters.category === 'all' || attempt.categories?.name_en === filters.category) &&
        (filters.status === 'all' || attempt.status === filters.status)
    ), [initialAttempts, filters]);

    const paginatedAttempts = useMemo(() => filteredAttempts.slice((currentPage - 1) * ATTEMPTS_PER_PAGE, currentPage * ATTEMPTS_PER_PAGE), [filteredAttempts, currentPage]);
    const totalPages = Math.ceil(filteredAttempts.length / ATTEMPTS_PER_PAGE);

    const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setCurrentPage(1);
    }, []);

    return (
        <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 flex flex-col h-full">
            <div className="flex items-center gap-4 mb-6"><Award className="w-8 h-8 text-cyan-400" /><h2 className="text-2xl font-bold text-white">Quiz History</h2></div>
            {initialAttempts.length > 0 ? (
                <>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="flex-grow"><label htmlFor="category" className="sr-only">Category</label><select id="category" name="category" value={filters.category} onChange={handleFilterChange} className="w-full px-3 py-2 text-white bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">{availableCategories.map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>)}</select></div>
                        <div className="flex-grow"><label htmlFor="status" className="sr-only">Status</label><select id="status" name="status" value={filters.status} onChange={handleFilterChange} className="w-full px-3 py-2 text-white bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"><option value="all">All Statuses</option><option value="completed">Completed</option><option value="started">In Progress</option></select></div>
                    </div>
                    <div className="space-y-4 flex-grow min-h-[300px]">
                        {paginatedAttempts.length > 0 ? (
                            paginatedAttempts.map((attempt) => (
                                <Link key={attempt.id} href={`/quiz/results/${attempt.id}`} className="block p-4 rounded-lg bg-gray-900/70 border border-gray-700 hover:border-cyan-500/50 transition-all flex items-center gap-4 group">
                                    <div className="flex-grow"><p className="font-bold text-white group-hover:text-cyan-400">{attempt.categories?.name_en || 'General Quiz'}</p><p className="text-sm text-gray-400">{attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString() : 'In Progress'}</p></div>
                                    <div className="text-right">{attempt.status === 'completed' ? <><p className="font-bold text-xl text-cyan-400">{attempt.score ?? '-'}</p><p className="text-xs text-gray-500">Score</p></> : <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300">In Progress</span>}</div>
                                </Link>
                            ))
                        ) : (<div className="flex items-center justify-center h-full"><p className="text-gray-400">No attempts match filters.</p></div>)}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 text-sm">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-2 px-4 py-2 bg-gray-700/80 rounded-md disabled:opacity-50"><ChevronLeft size={16} /> Prev</button>
                            <span className="font-semibold text-gray-300">Page {currentPage} of {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2 px-4 py-2 bg-gray-700/80 rounded-md disabled:opacity-50">Next <ChevronRight size={16} /></button>
                        </div>
                    )}
                </>
            ) : (<div className="flex flex-col items-center justify-center text-center py-20 flex-grow"><p className="text-gray-400">No quiz history yet.</p><Link href="/categories" className="mt-4 inline-block bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg">Start a Quiz</Link></div>)}
        </div>
    );
};


// --- Main Dashboard Client Component ---

export default function DashboardClient({
  user,
  initialProfile,
  initialAttempts,
  categoryPerformance,
  recentAchievements,
  overallStats
}: {
  user: User | null;
  initialProfile: Profile | null;
  initialAttempts: Attempt[];
  categoryPerformance?: Performance[] | null;
  recentAchievements?: Achievement[] | null;
  overallStats?: OverallStats | null;
}) {

  if (!user || !initialProfile) {
      return (
          <main className="min-h-screen w-full flex items-center justify-center p-6 sm:p-10 bg-gray-900 text-white">
              <p>Loading user data...</p>
          </main>
      );
  }

  return (
    <main className="min-h-screen w-full p-6 sm:p-10 bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl">
        <DashboardHeader name={initialProfile?.full_name || user.user_metadata?.full_name || 'learner'} />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard icon={<Flame size={24} />} title="Day Streak" value={initialProfile?.current_streak || 0} colorClass="bg-orange-500/20 text-orange-300" />
            <StatCard icon={<Hash size={24} />} title="Quizzes Taken" value={overallStats?.total_quizzes || 0} colorClass="bg-blue-500/20 text-blue-300" />
            <StatCard icon={<Target size={24} />} title="Overall Accuracy" value={`${overallStats?.accuracy || 0}%`} colorClass="bg-green-500/20 text-green-300" />
            <StatCard icon={<Trophy size={24} />} title="Achievements Earned" value={recentAchievements?.length || 0} colorClass="bg-yellow-500/20 text-yellow-300" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-1 space-y-8">
                <ProfileCard user={user} initialProfile={initialProfile} />
                <AchievementsCard recentAchievements={recentAchievements} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 space-y-8">
                <PerformanceCard performanceData={categoryPerformance} />
                <QuizHistory initialAttempts={initialAttempts} />
            </motion.div>
        </div>
      </div>
    </main>
  );
}
