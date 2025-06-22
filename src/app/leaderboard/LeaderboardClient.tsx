// src/app/leaderboard/leaderboard-client.tsx

'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Trophy, User, AlertTriangle, ChevronDown, Medal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces (kept as is) ---
interface Category { id: string; name_en: string; }
interface LeaderboardUser { rank: number; user_id: string; full_name: string | null; total_score: number; }
interface UserRank { rank: number; total_score: number; }

interface LeaderboardClientProps {
  leaderboardUsers: LeaderboardUser[];
  categories: Category[];
  currentPeriod: string;
  currentCategory: string | null;
  userRank: UserRank | null;
}

// --- Animation Variants ---
const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export default function LeaderboardClient({
  leaderboardUsers,
  categories,
  currentPeriod,
  currentCategory,
  userRank,
}: LeaderboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Functionality is kept exactly the same
  const handleFilterChange = (period: string, category: string | null) => {
    const params = new URLSearchParams();
    params.set('period', period);
    if (category) {
      params.set('category', category);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const timePeriods = ['all_time', 'monthly', 'weekly'];

  const getUserAvatarUrl = (userId: string | null, fullName: string | null) => {
    const seed = userId || (fullName ? fullName.replace(/\s/g, '') : 'unknown-user');
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffeedd,ffdfbf&backgroundType=solid,gradientLinear`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-900 text-white font-sans flex flex-col items-center py-8 px-4 sm:px-6 md:px-8">
      {/* Background glow effects */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl opacity-40 animate-blob-slow -translate-x-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl opacity-40 animate-blob-slow animation-delay-2000 translate-x-1/2"></div>

      <div className="w-full max-w-4xl mx-auto z-10">
        {/* Header Section */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
            className="inline-block p-4 bg-yellow-400/10 rounded-full mb-4"
          >
            <Trophy className="w-16 h-16 text-yellow-400" />
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400">
            Leaderboard
          </h1>
          <p className="text-lg text-slate-400 mt-3 max-w-2xl mx-auto">
            See how you stack up against the top performers.
          </p>
        </motion.div>

        {/* Filter Section */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="my-8 p-4 bg-slate-800/70 border border-slate-700/70 rounded-xl shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-sm"
        >
          <div className="flex w-full md:w-auto items-center gap-2 bg-slate-900/50 p-1 rounded-full border border-slate-700">
            {timePeriods.map((period) => (
              <button
                key={period}
                onClick={() => handleFilterChange(period, currentCategory)}
                className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                  currentPeriod === period
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <select
              onChange={(e) => handleFilterChange(currentPeriod, e.target.value || null)}
              value={currentCategory || ''}
              className="appearance-none w-full px-4 py-2.5 text-slate-100 bg-slate-800 border border-slate-600 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name_en}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <ChevronDown size={20} />
            </div>
          </div>
        </motion.div>

        {/* Leaderboard List */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
          className="space-y-3"
        >
           {leaderboardUsers.length > 0 ? (
              leaderboardUsers.map((user, index) => (
                <motion.div
                  key={user.user_id}
                  variants={listItemVariants}
                  className={`flex items-center p-4 rounded-lg border transition-all duration-300
                    ${user.rank === 1 ? 'bg-yellow-400/10 border-yellow-400/30' :
                      user.rank === 2 ? 'bg-slate-400/10 border-slate-400/30' :
                      user.rank === 3 ? 'bg-amber-500/10 border-amber-500/30' :
                      'bg-slate-800/50 border-slate-700/60'
                    }`}
                >
                  <div className="flex items-center gap-4 flex-grow min-w-0">
                    <span className="text-lg font-bold w-8 text-center flex-shrink-0 text-slate-400">{user.rank}</span>
                    <img
                      src={getUserAvatarUrl(user.user_id, user.full_name)}
                      alt={user.full_name || "User Avatar"}
                      className="w-12 h-12 rounded-full flex-shrink-0 border-2 border-slate-600"
                    />
                    <Link href={`/profile/${user.user_id}`} className="text-lg font-semibold text-white hover:text-cyan-300 transition-colors truncate">
                      {user.full_name || 'Anonymous User'}
                    </Link>
                    {/* Medal for top 3 */}
                    {user.rank <= 3 && (
                        <Medal size={20} className={
                            user.rank === 1 ? 'text-yellow-400' :
                            user.rank === 2 ? 'text-slate-400' : 'text-amber-500'
                        } />
                    )}
                  </div>
                  <p className="text-xl font-bold text-green-400 flex-shrink-0 ml-4">
                    {user.total_score} pts
                  </p>
                </motion.div>
              ))
           ) : (
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-center py-16 px-4 bg-slate-800/40 rounded-xl border border-slate-700/50 mt-8"
             >
               <AlertTriangle className="mx-auto h-16 w-16 text-slate-600 mb-4" />
               <p className="text-xl font-semibold text-slate-300">No scores found</p>
               <p className="text-slate-400 mt-1">Be the first to set a record for this filter!</p>
             </motion.div>
           )}
        </motion.div>
      </div>

      {/* Your Rank Sticky Bar */}
      {userRank && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.5 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 bg-slate-900/80 backdrop-blur-lg p-4 border border-cyan-500/40 shadow-2xl z-50 rounded-xl"
        >
          <div className="flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-cyan-400" />
              <p className="font-semibold text-slate-200">Your Rank</p>
            </div>
            <p className="text-2xl font-extrabold text-green-400">
              #{userRank.rank} 
              <span className="text-base font-medium text-slate-400 ml-2">({userRank.total_score} pts)</span>
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
