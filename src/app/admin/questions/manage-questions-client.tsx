// src/app/admin/questions/manage-questions-client.tsx

'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Edit, Search, ChevronsUpDown, CheckCircle2, EyeOff, BookOpen, HelpCircle } from 'lucide-react';
import QuestionForm from './QuestionForm';

// --- Interfaces ---
interface Question {
  id: string;
  question_text_en: string;
  is_published: boolean;
  created_at: string;
  question_categories: { categories: { name_en: string } | null }[];
}
interface Category {
  id: string;
  name_en: string;
}

const StatCard = ({ icon, title, value, colorClass }: { icon: React.ReactNode, title: string, value: number, colorClass: string }) => (
    <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-5"><div className="flex items-center gap-4"><div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>{icon}</div><div><p className="text-sm text-gray-400">{title}</p><p className="text-2xl font-bold text-white">{value}</p></div></div></div>
);


export default function ManageQuestionsClient({ initialQuestions, initialCategories }: { initialQuestions: Question[], initialCategories: Category[] }) {
  const router = useRouter();
  
  // Data state is now initialized from server props
  const [questions, setQuestions] = useState(initialQuestions);
  const [allCategories] = useState(initialCategories);

  // All other interactive state remains here
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Question; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Handlers
  const handleEdit = async (question: Question) => {
    try {
      const { data, error } = await supabase.from('questions').select(`*, options (*), question_categories (category_id)`).eq('id', question.id).single();
      if (error) throw error;
      setEditingQuestion(data);
      setShowForm(true);
    } catch (error) {
      console.error("Error fetching full question details for editing:", error);
    }
  };

  const handleCreateNew = () => {
    setEditingQuestion(null);
    setShowForm(true);
  };
  const handleCancel = () => {
    setShowForm(false);
    setEditingQuestion(null);
  };
  const handleSave = () => {
    setShowForm(false);
    setEditingQuestion(null);
    // This is the new, modern way to refetch server data in Next.js
    router.refresh();
  };

  const stats = useMemo(() => { /* ... your stats logic ... */ }, [questions]);
  const sortedAndFilteredQuestions = useMemo(() => { /* ... your filtering logic ... */ }, [questions, searchTerm, statusFilter, sortConfig]);
  const paginatedQuestions = useMemo(() => { /* ... your pagination logic ... */ }, [sortedAndFilteredQuestions, currentPage]);
  const totalPages = Math.ceil(sortedAndFilteredQuestions.length / ITEMS_PER_PAGE);
  const requestSort = (key: keyof Question) => { /* ... your sorting logic ... */ };

  return (
    <>
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed top-0 right-0 h-full w-full max-w-2xl bg-gray-900 shadow-2xl z-50 border-l border-gray-700 overflow-y-auto">
            <QuestionForm question={editingQuestion} allCategories={allCategories} onSave={handleSave} onCancel={handleCancel} />
          </motion.div>
        )}
      </AnimatePresence>
      <main className="w-full p-8 sm:p-12">
        <div className="mx-auto max-w-7xl">
            {/* The rest of your entire modern UI (Header, StatCards, Search, Table, Pagination) goes here, completely unchanged from my previous response. */}
            <h1 className="text-4xl font-bold">Question Management</h1>
            {/* ... etc ... */}
        </div>
      </main>
    </>
  );
}