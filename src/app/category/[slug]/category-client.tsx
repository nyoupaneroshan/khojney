'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, List, Settings, X, BrainCircuit, ChevronDown, Lock, Gem } from 'lucide-react';
import { useAuth } from '@/components/AuthContext'; // Import useAuth hook to get user session

// --- Type Definitions (kept as is) ---
interface Category {
  id: string;
  name_en: string;
  slug: string;
  description_en: string | null;
}

interface Question {
  id: string;
  question_text_en: string;
}

// --- NEW: Quiz Options Modal Component ---
const QuizOptionsModal = ({ category, onClose }: { category: Category; onClose: () => void }) => {
  const router = useRouter();
  const [limit, setLimit] = useState(10);
  const [difficulty, setDifficulty] = useState('all');

  const handleStart = () => {
    router.push(`/quiz/play/${category.slug}?limit=${limit}&difficulty=${difficulty}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="bg-gray-900 border border-gray-700 rounded-3xl p-8 sm:p-10 max-w-md w-full relative shadow-3xl shadow-gray-900/60"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800" aria-label="Close modal"><X size={24} /></button>
        <div className="text-center">
            <Settings className="mx-auto h-16 w-16 text-cyan-400 mb-6 drop-shadow-md" />
            <h2 className="text-3xl font-bold text-white mb-3">Quiz Settings</h2>
            <p className="text-lg text-gray-300 mb-8">Customize your challenge for "{category.name_en}"</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-base font-medium text-gray-300 mb-2">Number of Questions</label>
            <div className="relative">
                <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="appearance-none w-full bg-gray-950 border border-gray-700 rounded-xl py-3 px-4 text-white pr-10
                               focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors cursor-pointer"
                >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={20}>20 Questions</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                    <ChevronDown size={20} />
                </div>
            </div>
          </div>
          <div>
            <label className="block text-base font-medium text-gray-300 mb-2">Difficulty</label>
            <div className="relative">
                <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="appearance-none w-full bg-gray-950 border border-gray-700 rounded-xl py-3 px-4 text-white pr-10
                               focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors cursor-pointer"
                >
                    <option value="all">All Levels</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                    <ChevronDown size={20} />
                </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
            <motion.button
                onClick={handleStart}
                whileHover={{ scale: 1.02, boxShadow: "0 10px 20px rgba(128,90,213,0.4)" }}
                whileTap={{ scale: 0.98 }}
                className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 shadow-lg"
            >
                <Play size={24} />
                Begin Quiz
            </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};


const QuestionListItem = ({ question, index }: { question: Question; index: number }) => (
    <motion.li
        variants={{
            hidden: { opacity: 0, y: 30, x: -10 },
            visible: { opacity: 1, y: 0, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
        }}
        whileHover={{ scale: 1.01, boxShadow: "0 8px 20px rgba(0,0,0,0.3)" }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-5 sm:p-6 flex items-center gap-4 sm:gap-6 transform transition-all duration-200"
    >
        <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-cyan-600 flex items-center justify-center font-extrabold text-white text-xl sm:text-2xl shadow-md">
            {String(index + 1).padStart(2, '0')}
        </div>
        <p className="text-xl sm:text-2xl text-gray-200 font-medium flex-grow">{question.question_text_en}</p>
    </motion.li>
);


export default function CategoryClient({ category, questions }: { category: Category; questions: Question[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { session, loadingAuth, userRole } = useAuth(); // <--- Get userRole from useAuth

  // Determine if the *current logged-in user* has the role 'user'
  // Only explicitly check if userRole is 'user', otherwise it's NOT a free tier user.
  const isFreeTierUser = userRole === 'user'; // This will be false for null (unauthenticated), premium_user, admin.

  const listStaggerVariants = {
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
    hidden: {
      opacity: 0,
    },
  };

  const hasQuestions = questions.length > 0; // Check if there are any questions at all

  return (
    <>
      <AnimatePresence>
        {/* Quiz Modal only opens if user has questions AND is NOT a free-tier user */}
        {isModalOpen && hasQuestions && !isFreeTierUser && <QuizOptionsModal category={category} onClose={() => setIsModalOpen(false)} />}
      </AnimatePresence>

      <main className="min-h-screen relative overflow-hidden
                       bg-gradient-to-br from-gray-950 via-slate-900 to-gray-800
                       text-white flex flex-col items-center py-10 px-4 sm:px-8 md:px-12">
        {/* Subtle background glow effect */}
        <div className="absolute top-10 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl opacity-50 animate-blob-slow z-0"></div>
        <div className="absolute bottom-20 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl opacity-50 animate-blob-slow animation-delay-2000 z-0"></div>

        <div className="w-full max-w-6xl mx-auto z-10">
            {/* Back Button */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mb-16"
            >
                <Link href="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors font-semibold
                                        px-4 py-2 rounded-full bg-gray-800/50 hover:bg-gray-700/60 border border-gray-700/50">
                    <ArrowLeft size={20} />
                    Back to All Categories
                </Link>
            </motion.div>

            {/* --- HERO SECTION --- */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="text-center mb-16"
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-teal-500 to-cyan-600 leading-tight tracking-tight drop-shadow-xl">
                {category.name_en}
              </h1>
              {category.description_en && <p className="text-xl sm:text-2xl text-gray-300 mt-5 max-w-3xl mx-auto font-light">{category.description_en}</p>}

              <motion.button
                  onClick={() => hasQuestions && !isFreeTierUser && setIsModalOpen(true)} // Only open modal if questions exist AND user is NOT free tier
                  disabled={!hasQuestions || isFreeTierUser} // Disable button if no questions OR user IS free tier
                  whileHover={{ scale: (!hasQuestions || isFreeTierUser) ? 1 : 1.05 }} // No hover/tap effect if disabled
                  whileTap={{ scale: (!hasQuestions || isFreeTierUser) ? 1 : 0.95 }}
                  className={`inline-flex items-center justify-center gap-3 text-white font-extrabold py-4 px-12 mt-10
                             rounded-full text-xl sm:text-2xl transition-all duration-300 shadow-lg transform
                             ${(!hasQuestions || isFreeTierUser)
                               ? 'bg-gray-700 cursor-not-allowed opacity-60 shadow-none' // Disabled styles
                               : 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-400 hover:to-teal-500 hover:shadow-green-500/40' // Enabled styles
                             }`}
              >
                  <Play size={28} />
                  Start Quiz
              </motion.button>
            </motion.div>

            <div className="border-t border-gray-700/40 my-20"></div> {/* Thicker, softer divider */}

            {/* --- QUESTION LIST SECTION --- */}
            <AnimatePresence mode="wait"> {/* Use AnimatePresence for smooth transitions between states */}
                {loadingAuth ? ( // Show loading state while auth is being checked
                    <motion.div
                        key="loading-questions"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="text-center py-20 px-6 bg-gray-800/30 rounded-2xl border border-gray-700/60 shadow-xl mt-16 backdrop-blur-sm"
                    >
                        <BrainCircuit className="mx-auto h-24 w-24 text-gray-600 mb-8 animate-pulse" />
                        <h3 className="text-3xl font-semibold text-gray-400 mb-3">Checking access to questions...</h3>
                        <p className="text-lg text-gray-500">Please wait a moment.</p>
                    </motion.div>
                ) : isFreeTierUser ? ( // <--- ONLY if user's role is specifically 'user' (free tier)
                    // --- Premium CTA Section ---
                    <motion.div
                        key="premium-cta" // Key for AnimatePresence
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="text-center py-20 px-6 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-2xl border border-indigo-700/60 shadow-xl mt-16 backdrop-blur-sm relative overflow-hidden group"
                    >
                        {/* Animated Background Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
                            className="absolute inset-0 bg-gradient-to-br from-purple-800/10 via-transparent to-transparent animate-pulse-slow rounded-2xl"
                        ></motion.div>

                        <div className="relative z-10 space-y-6">
                            <motion.div
                                initial={{ scale: 0.5, rotate: -30, opacity: 0 }}
                                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.3 }}
                                className="mx-auto h-24 w-24 text-yellow-400 mb-4 drop-shadow-lg"
                            >
                                <Lock className="w-full h-full" />
                            </motion.div>

                            <h3 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 leading-tight drop-shadow-lg">
                                Unlock Premium Questions!
                            </h3>
                            <p className="text-xl sm:text-2xl text-gray-300 max-w-2xl mx-auto font-light">
                                Become a premium member to gain access to our full library of challenging questions and exclusive content.
                            </p>
                            <motion.div
                                whileHover={{ scale: 1.05, boxShadow: "0 15px 30px rgba(251,191,36,0.4)" }}
                                whileTap={{ scale: 0.95 }}
                                className="mt-10 inline-block"
                            >
                                <Link href="/pricing" className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-extrabold py-4 px-12 rounded-full text-xl sm:text-2xl transition-all duration-300 shadow-lg transform group-hover:scale-105">
                                    <Gem size={28} />
                                    Go Premium!
                                </Link>
                            </motion.div>
                        </div>
                    </motion.div>
                ) : ( // User is NOT a 'user' role (i.e., they are premium/admin, OR unauthenticated)
                    hasQuestions ? ( // And there are questions
                        <motion.div
                            key="question-list"
                            initial="hidden"
                            animate="visible"
                            variants={listStaggerVariants}
                        >
                            <div className="flex items-center gap-4 mb-10">
                                <List className="text-gray-500 w-10 h-10" />
                                <h2 className="text-4xl font-bold text-gray-200">Available Questions</h2>
                            </div>
                            <motion.ul
                                className="space-y-4"
                            >
                                {questions.map((question, index) => (
                                    <QuestionListItem key={question.id} question={question} index={index} />
                                ))}
                            </motion.ul>
                        </motion.div>
                    ) : ( // User is NOT a 'user' role, but no questions in this category
                        // --- "No Questions Yet" for non-free-tier users (including premium/admin/unauthenticated) ---
                        <motion.div
                            key="no-questions-general" // Changed key for clarity
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="text-center py-20 px-6 bg-gray-800/30 rounded-2xl border border-gray-700/60 shadow-xl mt-16 backdrop-blur-sm"
                        >
                            <BrainCircuit className="mx-auto h-24 w-24 text-gray-600 mb-8" />
                            <h3 className="text-3xl font-semibold text-gray-400 mb-3">No Questions Yet</h3>
                            <p className="text-lg text-gray-500">
                                It looks like there are no questions available for this category yet.
                            </p>
                            <p className="text-lg text-gray-500 mt-2">
                                We are actively working on adding more content. Thank you for your patience!
                            </p>
                        </motion.div>
                    )
                )}
            </AnimatePresence>
        </div>
      </main>
    </>
  );
}