// src/app/admin/questions/page.tsx

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Edit, Search, ChevronsUpDown, CheckCircle2, EyeOff, BookOpen, HelpCircle, AlertTriangle, UploadCloud, FileText, Download } from 'lucide-react';
import QuestionForm from './QuestionForm';

// --- INTERFACES ---
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
// Interface for the structured data after parsing
interface BulkQuestion {
    question_text_en: string;
    difficulty_level: 'easy' | 'medium' | 'hard';
    points: number;
    options: {
        option_text_en: string;
        is_correct: boolean;
    }[];
    categories: string[];
    explanation_en?: string;
    is_published?: boolean;
    language?: 'en' | 'ne' | 'both'; // FIX: Added language property
}


// --- Reusable State Components ---
const AdminLoading = () => <main className="flex min-h-screen w-full items-center justify-center bg-gray-900"><p className="text-lg text-gray-400">Loading Admin Section...</p></main>;
const AccessDenied = () => (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-gray-900">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-400">Access Denied</h1>
        <p className="mt-2 text-gray-400">You do not have the required permissions to view this page.</p>
        <Link href="/" className="text-cyan-400 hover:text-cyan-300 mt-6">Go to Homepage</Link>
    </main>
);
const StatCard = ({ icon, title, value, colorClass }: { icon: React.ReactNode, title: string, value: number, colorClass: string }) => (
    <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-5"><div className="flex items-center gap-4"><div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>{icon}</div><div><p className="text-sm text-gray-400">{title}</p><p className="text-2xl font-bold text-white">{value}</p></div></div></div>
);


// --- UPDATED: Bulk Upload Component for CSV ---
const BulkUploadSection = ({ allCategories, onUploadComplete }: { allCategories: Category[], onUploadComplete: () => void }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
            setFeedback(null);
        }
    };

    // CSV Parsing Function
    const parseCSV = (csvText: string): BulkQuestion[] => {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return []; // Must have headers and at least one row
        
        const headers = lines[0].split(',').map(h => h.trim());
        const questions: BulkQuestion[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers.forEach((header, index) => row[header] = values[index]);

            const question: BulkQuestion = {
                question_text_en: row.question_text_en,
                difficulty_level: row.difficulty_level,
                points: parseInt(row.points, 10),
                explanation_en: row.explanation_en,
                is_published: row.is_published ? row.is_published.toLowerCase() === 'true' : true,
                language: row.language || 'en', // FIX: Read language from CSV or default to 'en'
                options: [],
                categories: row.categories ? row.categories.split('|').map((c: string) => c.trim()) : []
            };

            for (let j = 1; j <= 4; j++) {
                if (row[`option${j}_text`]) {
                    question.options.push({
                        option_text_en: row[`option${j}_text`],
                        is_correct: row[`option${j}_is_correct`]?.toLowerCase() === 'true'
                    });
                }
            }
            questions.push(question);
        }
        return questions;
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setFeedback(null);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result;
                if (typeof content !== 'string') throw new Error("Could not read file content.");
                
                const questionsToUpload = parseCSV(content);
                
                const categoryMap = new Map(allCategories.map(c => [c.name_en.toLowerCase(), c.id]));
                let questionsAdded = 0;
                for (const q of questionsToUpload) {
                    const { data: questionData, error: questionError } = await supabase.from('questions').insert({
                        question_text_en: q.question_text_en,
                        difficulty_level: q.difficulty_level, 
                        points: q.points,
                        is_published: q.is_published ?? true,
                        explanation_en: q.explanation_en,
                        language: q.language ?? 'en', // FIX: Add language to the insert statement
                    }).select('id').single();

                    if (questionError) throw new Error(`Adding question "${q.question_text_en.substring(0, 20)}...": ${questionError.message}`);
                    const questionId = questionData.id;
                    
                    const optionsToInsert = q.options.map(opt => ({ question_id: questionId, ...opt }));
                    await supabase.from('options').insert(optionsToInsert);

                    const categoryIds = q.categories.map(name => categoryMap.get(name.toLowerCase())).filter((id): id is string => !!id);
                    if (categoryIds.length > 0) {
                        const categoriesToLink = categoryIds.map(catId => ({ question_id: questionId, category_id: catId }));
                        await supabase.from('question_categories').insert(categoriesToLink);
                    }
                    questionsAdded++;
                }
                setFeedback({ type: 'success', message: `Successfully added ${questionsAdded} questions!` });
                onUploadComplete();
            } catch (error: any) {
                setFeedback({ type: 'error', message: error.message || "An unknown error occurred." });
            } finally {
                setIsUploading(false);
                setFile(null);
            }
        };
        reader.readAsText(file);
    };

    // Function to download sample CSV
    const downloadSampleCSV = () => {
        // FIX: Added 'language' to headers and example row
        const headers = "question_text_en,difficulty_level,points,explanation_en,is_published,language,categories,option1_text,option1_is_correct,option2_text,option2_is_correct,option3_text,option3_is_correct,option4_text,option4_is_correct";
        const exampleRow = `"What is the capital of France?","easy",1,"Paris is the capital city.","true","en","General Knowledge|Geography","London","false","Paris","true","Berlin","false","Madrid","false"`;
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + exampleRow;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "sample_questions.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    // FIX: Updated sample headers display
    const sampleHeaders = `question_text_en, difficulty_level, points, language, categories, option1_text, ...`;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-12">
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-4"><UploadCloud className="h-6 w-6 text-cyan-400" /><h3 className="text-xl font-bold text-white">Bulk Import Questions</h3></div>
                <p className="text-sm text-slate-400 mb-4">Upload a CSV file with multiple questions.</p>
                <div className="flex items-center gap-4">
                    <label htmlFor="file-upload" className="cursor-pointer bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors">{file ? 'File Selected' : 'Choose File'}</label>
                    <input id="file-upload" type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                    <span className="text-slate-500 text-sm truncate">{file?.name || 'No file chosen'}</span>
                </div>
                <button onClick={handleUpload} disabled={!file || isUploading} className="w-full mt-4 py-2.5 px-4 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">{isUploading ? 'Uploading...' : 'Upload Questions'}</button>
                {feedback && <div className={`mt-4 p-3 rounded-md text-sm flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{feedback.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}{feedback.message}</div>}
            </div>
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-slate-400" />
                        <h3 className="text-xl font-bold text-white">CSV Data Format</h3>
                    </div>
                    <button onClick={downloadSampleCSV} className="flex items-center gap-2 text-sm bg-slate-700 text-white font-semibold py-2 px-3 rounded-lg hover:bg-slate-600 transition-colors">
                        <Download size={16} /> Download Sample
                    </button>
                </div>
                <p className="text-sm text-slate-400 mb-4">File must have these exact headers. Use "|" to separate multiple categories.</p>
                <pre className="bg-black/50 p-4 rounded-md text-xs text-slate-300 overflow-x-auto"><code>{sampleHeaders}</code></pre>
            </div>
        </div>
    );
};


// --- MAIN PAGE COMPONENT (NO CHANGES BELOW) ---
export default function ManageQuestionsPage() {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Question; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchPageData = useCallback(async () => {
    try {
      const { data: questionsData, error: questionsError } = await supabase.from('questions').select(`id, question_text_en, is_published, created_at, question_categories ( categories ( name_en ) )`).order('created_at', { ascending: false });
      const { data: categoriesData, error: categoriesError } = await supabase.from('categories').select('id, name_en').order('name_en', { ascending: true });
      if (questionsError) throw questionsError;
      if (categoriesError) throw categoriesError;
      setQuestions(questionsData || []);
      setAllCategories(categoriesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  useEffect(() => {
    const checkAdminAndFetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profile?.role === 'admin') {
            setIsAuthorized(true);
            await fetchPageData();
          }
        }
      } catch (error) {
        console.error("Auth/Fetch Error:", error);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };
    checkAdminAndFetchData();
  }, [fetchPageData]);

  const handleEdit = async (question: Question) => {
    try {
      const { data, error } = await supabase.from('questions').select(`*, options (*), question_categories (category_id)`).eq('id', question.id).single();
      if (error) throw error;
      setEditingQuestion(data);
      setShowForm(true);
    } catch (error) {
      console.error("Error fetching full question details for editing:", error);
      alert("Could not load question details for editing.");
    }
  };
  const handleCreateNew = () => { setEditingQuestion(null); setShowForm(true); };
  const handleCancel = () => { setShowForm(false); setEditingQuestion(null); };
  const handleSave = () => { setShowForm(false); setEditingQuestion(null); fetchPageData(); };

  const stats = useMemo(() => {
    const published = questions.filter(q => q.is_published).length;
    return { total: questions.length, published, drafts: questions.length - published };
  }, [questions]);
  const sortedAndFilteredQuestions = useMemo(() => {
    return [...questions]
      .filter(q => q.question_text_en.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(q => statusFilter === 'all' || (statusFilter === 'published' ? q.is_published : !q.is_published))
      .sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [questions, searchTerm, statusFilter, sortConfig]);
  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedAndFilteredQuestions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedAndFilteredQuestions, currentPage]);
  const totalPages = Math.ceil(sortedAndFilteredQuestions.length / ITEMS_PER_PAGE);
  const requestSort = (key: keyof Question) => {
    let direction: 'asc' | 'desc' = (sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  if (loading) return <AdminLoading />;
  if (!isAuthorized) return <AccessDenied />;

  return (
    <>
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div className="fixed inset-0 bg-black/60 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div
              key={editingQuestion ? editingQuestion.id : 'create-new-question'}
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full max-w-2xl bg-gray-900 shadow-2xl z-50 border-l border-gray-800"
            >
              <QuestionForm question={editingQuestion} allCategories={allCategories} onSave={handleSave} onCancel={handleCancel} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <main className="w-full p-8 sm:p-12 bg-gray-900 text-white min-h-screen">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10"><Link href="/admin" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"><ArrowLeft size={16} /> Back to Admin Dashboard</Link></div>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
            <h1 className="text-4xl font-bold">Question Management</h1>
            <button onClick={handleCreateNew} className="inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-5 rounded-lg transition-colors"><Plus size={18} /> New Question</button>
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard icon={<BookOpen size={22} />} title="Total Questions" value={stats.total} colorClass="bg-blue-500/20 text-blue-300" />
            <StatCard icon={<CheckCircle2 size={22} />} title="Published" value={stats.published} colorClass="bg-green-500/20 text-green-300" />
            <StatCard icon={<EyeOff size={22} />} title="Drafts" value={stats.drafts} colorClass="bg-yellow-500/20 text-yellow-300" />
          </motion.div>

          {/* ADDED: Bulk Upload Section Rendered Here */}
          <BulkUploadSection allCategories={allCategories} onUploadComplete={fetchPageData} />

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-grow"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input type="text" placeholder="Search questions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" /></div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"><option value="all">All Statuses</option><option value="published">Published</option><option value="draft">Draft</option></select>
          </div>
          <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-gray-900/50"><tr>
                  <th className="p-4 cursor-pointer hover:bg-gray-700/50 transition-colors" onClick={() => requestSort('question_text_en')}><div className="flex items-center gap-2">Question <ChevronsUpDown size={14} /></div></th>
                  <th className="p-4">Categories</th>
                  <th className="p-4 cursor-pointer hover:bg-gray-700/50 transition-colors" onClick={() => requestSort('is_published')}><div className="flex items-center gap-2">Status <ChevronsUpDown size={14} /></div></th>
                  <th className="p-4 text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {paginatedQuestions.length > 0 ? paginatedQuestions.map(question => (
                    <tr key={question.id} className="border-t border-gray-700/50 hover:bg-gray-700/50">
                      <td className="p-4 font-medium max-w-md truncate" title={question.question_text_en}>{question.question_text_en}</td>
                      <td className="p-4 text-gray-400 text-sm max-w-xs truncate">{question.question_categories.map(qc => qc.categories?.name_en).join(', ')}</td>
                      <td className="p-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${question.is_published ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{question.is_published ? 'Published' : 'Draft'}</span></td>
                      <td className="p-4 text-right"><button onClick={() => handleEdit(question)} className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"><Edit size={14} /> Edit</button></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="text-center text-gray-500 py-16">No questions found matching your criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 text-sm">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-2 px-4 py-2 bg-gray-700/80 rounded-md disabled:opacity-50 hover:bg-gray-700/100 transition-colors">Previous</button>
                <span className="font-semibold text-gray-300">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2 px-4 py-2 bg-gray-700/80 rounded-md disabled:opacity-50 hover:bg-gray-700/100 transition-colors">Next</button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
