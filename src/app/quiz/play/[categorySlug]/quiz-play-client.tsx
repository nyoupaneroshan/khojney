// src/app/quiz/play/[categorySlug]/quiz-play-client.tsx

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { Check, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, Question, Option } from './types';

// =================================================================
// REDESIGNED PRESENTATIONAL COMPONENTS
// =================================================================

const QuizProgressBar = ({ current, total }: { current: number; total: number }) => {
  const progressPercentage = total > 0 ? ((current + 1) / total) * 100 : 0;
  return (
    <div className="w-full bg-slate-700/50 rounded-full h-2">
      <motion.div 
        className="bg-cyan-400 h-2 rounded-full" 
        initial={{ width: '0%' }}
        animate={{ width: `${progressPercentage}%` }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
    </div>
  );
};

const CircularTimer = ({ timeLeft, totalTime }: { timeLeft: number, totalTime: number }) => {
    const progress = (timeLeft / totalTime) * 100;
    const circumference = 2 * Math.PI * 20; // 2 * pi * radius
    const offset = circumference - (progress / 100) * circumference;

    const timeColor = timeLeft <= 5 ? 'text-red-400' : 'text-cyan-300';

    return (
        <div className="relative h-20 w-20">
            <svg className="w-full h-full" viewBox="0 0 44 44">
                <circle className="text-slate-700" strokeWidth="4" stroke="currentColor" fill="transparent" r="20" cx="22" cy="22" />
                <motion.circle
                    className={timeLeft <= 5 ? "text-red-500" : "text-cyan-400"}
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="20"
                    cx="22"
                    cy="22"
                    transform="rotate(-90 22 22)"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: "linear" }}
                />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center font-mono text-2xl font-bold ${timeColor}`}>
                {timeLeft}
            </div>
        </div>
    );
};


const OptionButton = ({ option, state, onClick, index }: { option: Option, state: 'default' | 'correct' | 'incorrect', onClick: () => void, index: number }) => {
  const baseClasses = 'w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-center gap-4 text-lg backdrop-blur-sm';
  
  const stateClasses = {
    default: 'bg-slate-800/50 border-slate-700 hover:border-cyan-500/70 hover:bg-slate-700/50 text-slate-200',
    correct: 'bg-green-500/20 border-green-500 text-white font-semibold ring-2 ring-green-500/50',
    incorrect: 'bg-red-500/20 border-red-500 text-white font-semibold',
  };

  const Icon = { 
    correct: <Check className="h-6 w-6 text-white" />, 
    incorrect: <X className="h-6 w-6 text-white" />, 
    default: <span className="text-cyan-400 font-bold">{index + 1}</span>
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button onClick={onClick} disabled={state !== 'default'} className={`${baseClasses} ${stateClasses[state]}`}>
        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">{Icon[state]}</div>
        <span>{option.option_text_en}</span>
      </button>
    </motion.li>
  );
};

// --- SHUFFLE UTILITY FUNCTION (Logic Unchanged) ---
const shuffleArray = (array: any[]) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

// --- MAIN QUIZ CLIENT COMPONENT ---
const TIME_PER_QUESTION = 15;

export default function QuizPlayClient({ category, initialQuestions, user }: { category: Category, initialQuestions: Question[], user: User }) {
  const router = useRouter();

  // State Management Logic - Unchanged
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizAttemptId, setQuizAttemptId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Map<string, string>>(new Map());
  const [startTime, setStartTime] = useState(0);
  const [answerStatus, setAnswerStatus] = useState<'unanswered' | 'answered'>('unanswered');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);

  // Memoization Logic - Unchanged
  const shuffledQuestions = useMemo(() => shuffleArray([...initialQuestions]), [initialQuestions]);
  const currentQuestion = useMemo(() => shuffledQuestions[currentQuestionIndex], [shuffledQuestions, currentQuestionIndex]);
  const shuffledOptions = useMemo(() => currentQuestion ? shuffleArray([...currentQuestion.options]) : [], [currentQuestion]);

  // Effect Hooks for setup and timers - Unchanged
  useEffect(() => {
    const createAttempt = async () => {
      const { data: attemptData, error: attemptError } = await supabase.from('quiz_attempts').insert({ user_id: user.id, category_id: category.id }).select('id').single();
      if (attemptError) console.error("Failed to create quiz attempt:", attemptError);
      else { setQuizAttemptId(attemptData.id); setStartTime(Date.now()); }
    };
    createAttempt();
  }, [category.id, user.id]);

  useEffect(() => {
    if (answerStatus === 'answered' || !quizAttemptId) return;
    if (timeLeft === 0) { handleNextQuestion(); return; }
    const timerInterval = setInterval(() => setTimeLeft((prev) => prev > 0 ? prev - 1 : 0), 1000);
    return () => clearInterval(timerInterval);
  }, [timeLeft, answerStatus, quizAttemptId]);

  // Event Handlers - Logic Unchanged
  const handleFinishQuiz = useCallback(async () => {
    if (!quizAttemptId || isSubmitting) return;
    setIsSubmitting(true);
    let score = 0;
    shuffledQuestions.forEach(q => {
      const correctOption = q.options.find(o => o.is_correct);
      const userAnswer = userAnswers.get(q.id);
      if (correctOption && userAnswer === correctOption.id) {
        score++;
      }
    });
    const timeTakenInSeconds = Math.round((Date.now() - startTime) / 1000);
    const answersToSave = Array.from(userAnswers.entries()).map(([question_id, selected_option_id]) => ({ quiz_attempt_id: quizAttemptId, question_id, selected_option_id }));
    try {
        await supabase.from('user_answers').insert(answersToSave);
        await supabase.from('quiz_attempts').update({ score, status: 'completed', completed_at: new Date().toISOString(), time_taken_seconds: timeTakenInSeconds }).eq('id', quizAttemptId);
        router.push(`/quiz/results/${quizAttemptId}`);
    } catch (error) {
        console.error("Error finishing quiz:", error);
    }
  }, [quizAttemptId, isSubmitting, shuffledQuestions, userAnswers, startTime, router]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setAnswerStatus('unanswered');
      setSelectedOptionId(null);
      setTimeLeft(TIME_PER_QUESTION);
    } else {
      handleFinishQuiz();
    }
  }, [currentQuestionIndex, shuffledQuestions.length, handleFinishQuiz]);

  const handleOptionSelect = useCallback((option: Option) => {
    if (answerStatus === 'answered' || !currentQuestion) return;
    setAnswerStatus('answered');
    setSelectedOptionId(option.id);
    const newAnswers = new Map(userAnswers);
    newAnswers.set(currentQuestion.id, option.id);
    setUserAnswers(newAnswers);
  }, [answerStatus, currentQuestion, userAnswers]);
  
  // Keyboard navigation - Logic Unchanged
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (answerStatus === 'answered') {
      if (event.key === 'Enter' || event.key === ' ') handleNextQuestion();
      return;
    }
    const key = parseInt(event.key);
    if (key >= 1 && key <= shuffledOptions.length) {
      handleOptionSelect(shuffledOptions[key - 1]);
    }
  }, [answerStatus, shuffledOptions, handleOptionSelect, handleNextQuestion]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!quizAttemptId || !currentQuestion) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-900 text-white">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mb-4" />
        <p className="text-xl text-slate-300">Preparing your quiz...</p>
      </main>
    );
  }

  const correctOptionId = currentQuestion.options.find(o => o.is_correct)!.id;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-slate-900 text-white overflow-hidden">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentQuestion.id} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            transition={{ duration: 0.4, ease: 'easeInOut' }} 
            className="bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-700/60 w-full"
          >
            {/* Header */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-lg font-bold text-cyan-400">{category.name_en}</p>
                  <p className="text-sm text-slate-400">Question {currentQuestionIndex + 1} of {shuffledQuestions.length}</p>
                </div>
                <CircularTimer timeLeft={timeLeft} totalTime={TIME_PER_QUESTION} />
              </div>
              <QuizProgressBar current={currentQuestionIndex} total={shuffledQuestions.length} />
            </div>

            {/* Question */}
            <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-slate-100 min-h-[6rem] flex items-center">
              {currentQuestion.question_text_en}
            </h2>

            {/* Options */}
            <ul className="space-y-3 mb-6">
              {shuffledOptions.map((option, index) => {
                let state: 'default' | 'correct' | 'incorrect' = 'default';
                if (answerStatus === 'answered') {
                  if (option.id === correctOptionId) state = 'correct';
                  else if (option.id === selectedOptionId) state = 'incorrect';
                }
                return (
                  <OptionButton key={option.id} option={option} state={state} onClick={() => handleOptionSelect(option)} index={index}/>
                );
              })}
            </ul>

            {/* Next/Finish Button */}
            <div className="text-right h-14 flex items-center justify-end">
              {answerStatus === 'answered' && (
                <motion.button 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleNextQuestion} 
                  disabled={isSubmitting}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-lg disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting 
                    ? <><Loader2 className="animate-spin h-5 w-5"/> Saving...</>
                    : (currentQuestionIndex < shuffledQuestions.length - 1 ? 'Next Question' : 'Finish Quiz')}
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
