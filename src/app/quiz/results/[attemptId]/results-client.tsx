// src/app/quiz/results/[id]/results-client.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ArrowLeft, Share2, Copy, Trophy, BarChart, Check, Clock } from 'lucide-react';

// =================================================================
// REDESIGNED PRESENTATIONAL COMPONENTS
// =================================================================

const ScoreCircle = ({ score, total }: { score: number; total: number }) => {
  const percentage = total > 0 ? (score / total) : 0;
  const circumference = 2 * Math.PI * 45; // 2 * pi * radius
  const strokeDashoffset = circumference * (1 - percentage);
  
  let colorClass = 'text-red-500';
  if (percentage >= 0.75) colorClass = 'text-green-400';
  else if (percentage >= 0.4) colorClass = 'text-yellow-500';

  return (
    <div className="relative w-40 h-40">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle className="text-slate-700" strokeWidth="8" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
        <motion.circle
          className={colorClass}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          transform="rotate(-90 50 50)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-5xl font-bold ${colorClass}`}>{score}</span>
        <span className="text-lg text-slate-400">/ {total}</span>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, colorClass = 'text-white' }: { label: string, value: string | number, icon: React.ReactNode, colorClass?: string }) => (
    <div className="bg-slate-800/50 p-4 rounded-lg text-center">
        <div className="flex items-center justify-center gap-2 text-slate-400">
            {icon}
            <p className="text-sm">{label}</p>
        </div>
        <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
    </div>
);


// =================================================================
// MAIN CLIENT COMPONENT
// =================================================================
export default function ResultsClient({ attemptId, stats, reviews }: { attemptId: string; stats: any; reviews: any[] }) {
  const [copied, setCopied] = useState(false);

  // Functionality unchanged
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Styling logic updated for new design
  const getOptionClassName = (option: any, userAnswer: any) => {
    const isSelected = userAnswer?.selected_option_id === option.id;
    const isCorrect = option.is_correct;
    if (isCorrect) return 'bg-green-500/20 border-green-500 text-white';
    if (isSelected && !isCorrect) return 'bg-red-500/20 border-red-500 text-white';
    return 'bg-slate-800/50 border-slate-700';
  };
  
  // Styling logic updated for new design
  const getIcon = (option: any, userAnswer: any) => {
    const isSelected = userAnswer?.selected_option_id === option.id;
    if (option.is_correct) return <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />;
    if (isSelected && !option.is_correct) return <XCircle className="h-6 w-6 text-red-400 flex-shrink-0" />;
    return <div className="h-6 w-6 flex-shrink-0" />;
  };

  return (
    <main className="min-h-screen flex-col items-center p-4 sm:p-8 bg-slate-900 text-white font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex justify-between items-center mb-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                <ArrowLeft className="h-5 w-5" /> Back to Dashboard
            </Link>
            <button onClick={handleShare} className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                {copied ? <Copy className="h-5 w-5 text-green-400" /> : <Share2 className="h-5 w-5" />}
                {copied ? 'Copied!' : 'Share'}
            </button>
            </div>
            
            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400 mb-2">Quiz Results</h1>
                <p className="text-lg text-slate-400">Category: {stats.categoryName}</p>
            </div>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="p-6 sm:p-8 mb-12 bg-slate-800/50 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-8 backdrop-blur-sm"
        >
            <div className="flex-shrink-0">
                <ScoreCircle score={stats.correctAnswers} total={stats.totalQuestions} />
            </div>
            <div className="w-full grid grid-cols-2 gap-4">
                <StatCard label="Accuracy" value={`${stats.accuracy}%`} icon={<BarChart size={16} />} />
                <StatCard label="Correct" value={stats.correctAnswers} icon={<Check size={16} />} colorClass="text-green-400" />
                <StatCard label="Incorrect" value={stats.totalQuestions - stats.correctAnswers} icon={<XCircle size={16} />} colorClass="text-red-400" />
                <StatCard label="Time / Q" value={`${stats.timePerQuestion}s`} icon={<Clock size={16} />} />
            </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="flex items-center gap-3 mb-6">
                <Trophy className="h-6 w-6 text-yellow-400" />
                <h2 className="text-3xl font-bold">Answer Review</h2>
            </div>
            <div className="space-y-6">
            {reviews.map((review, index) => (
                <div key={review.question_id} className="p-6 bg-slate-800/50 border border-slate-700/60 rounded-xl transition-shadow hover:shadow-xl">
                <p className="text-lg font-semibold mb-4 text-slate-200">
                    <span className="text-slate-500 mr-2">Q{index + 1}.</span>
                    {review.questions.question_text_en}
                </p>
                <ul className="space-y-3 mb-4">
                    {review.questions.options.map((option: any) => (
                    <li key={option.id} className={`p-3 rounded-lg border-2 flex items-center gap-4 ${getOptionClassName(option, review)}`}>
                        {getIcon(option, review)}
                        <span>{option.option_text_en}</span>
                    </li>
                    ))}
                </ul>
                {review.questions.explanation_en && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <p className="font-semibold text-cyan-300 mb-1">Explanation:</p>
                        <p className="text-slate-300/90">{review.questions.explanation_en}</p>
                    </div>
                )}
                </div>
            ))}
            </div>
        </motion.div>
      </div>
    </main>
  );
}
