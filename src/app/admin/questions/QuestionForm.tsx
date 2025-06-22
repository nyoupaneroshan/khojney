// src/app/admin/questions/QuestionForm.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Plus, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react';

// --- INTERFACES ---
interface Option {
  id?: string;
  option_text_en: string;
  is_correct: boolean;
}
interface Question {
  id?: string;
  question_text_en: string;
  explanation_en: string | null;
  difficulty_level: 'easy' | 'medium' | 'hard';
  is_published: boolean;
}
interface Category {
  id: string;
  name_en: string;
}
interface QuestionFormProps {
  question?: Question & { options: Option[]; question_categories: { category_id: string }[] };
  allCategories: Category[];
  onSave: () => void;
  onCancel: () => void;
}

// --- UI SUB-COMPONENTS ---
const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (checked: boolean) => void }) => (
    <button type="button" onClick={() => onChange(!checked)} className={`${checked ? 'bg-cyan-600' : 'bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900`} role="switch" aria-checked={checked}>
        <span aria-hidden="true" className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
);

const MultiSelectCategories = ({ allCategories, selectedIds, setSelectedIds }: { allCategories: Category[], selectedIds: string[], setSelectedIds: (ids: string[]) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedCategories = allCategories.filter(c => selectedIds.includes(c.id));
    const availableCategories = allCategories.filter(c => !selectedIds.includes(c.id) && c.name_en.toLowerCase().includes(searchTerm.toLowerCase()));

    const toggleCategory = (catId: string) => {
        setSelectedIds(selectedIds.includes(catId) ? selectedIds.filter(id => id !== catId) : [...selectedIds, catId]);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-300 mb-2">Categories</label>
            <div className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 flex flex-wrap gap-2 items-center min-h-[42px]" onClick={() => setIsOpen(true)}>
                {selectedCategories.map(cat => (
                    <span key={cat.id} className="bg-cyan-900/70 text-cyan-200 text-sm font-medium px-2 py-1 rounded flex items-center gap-2">
                        {cat.name_en}
                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleCategory(cat.id); }} className="hover:text-white"><X size={14} /></button>
                    </span>
                ))}
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => { setIsOpen(true); setSearchTerm(e.target.value); }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={selectedCategories.length === 0 ? "Select categories..." : ""}
                    className="flex-grow bg-transparent focus:outline-none p-1 text-white"
                />
            </div>
            {isOpen && (
                <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md bg-gray-800 border border-gray-600 shadow-lg">
                    {availableCategories.length > 0 ? availableCategories.map(cat => (
                        <li key={cat.id} onClick={() => { toggleCategory(cat.id); setSearchTerm(''); setIsOpen(false); }} className="cursor-pointer select-none relative py-2 pl-3 pr-9 text-white hover:bg-cyan-600">
                            {cat.name_en}
                        </li>
                    )) : <li className="px-3 py-2 text-gray-500">No categories found.</li>}
                </ul>
            )}
        </div>
    );
};

// --- FORM COMPONENT ---
export default function QuestionForm({ question, allCategories, onSave, onCancel }: QuestionFormProps) {
  const [questionText, setQuestionText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isPublished, setIsPublished] = useState(false);
  const [options, setOptions] = useState<Option[]>([
    { option_text_en: '', is_correct: true }, { option_text_en: '', is_correct: false },
    { option_text_en: '', is_correct: false }, { option_text_en: '', is_correct: false },
  ]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (question) {
      setQuestionText(question.question_text_en || '');
      setExplanation(question.explanation_en || '');
      setDifficulty(question.difficulty_level || 'medium');
      setIsPublished(question.is_published || false);
      const existingOptions = question.options || [];
      const fillerOptions = Array(Math.max(0, 4 - existingOptions.length)).fill({ option_text_en: '', is_correct: false });
      setOptions([...existingOptions, ...fillerOptions]);
      setSelectedCategoryIds(question.question_categories.map(qc => qc.category_id));
    } else {
        // Reset form for "Create New"
        setQuestionText('');
        setExplanation('');
        setDifficulty('medium');
        setIsPublished(false);
        setOptions([
            { option_text_en: '', is_correct: true }, { option_text_en: '', is_correct: false },
            { option_text_en: '', is_correct: false }, { option_text_en: '', is_correct: false },
        ]);
        setSelectedCategoryIds([]);
    }
  }, [question]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index].option_text_en = value;
    setOptions(newOptions);
  };
  const handleCorrectOptionChange = (index: number) => {
    const newOptions = options.map((opt, i) => ({ ...opt, is_correct: i === index }));
    setOptions(newOptions);
  };
  const addOption = () => {
    setOptions([...options, { option_text_en: '', is_correct: false }]);
  };
  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    if (!newOptions.some(opt => opt.is_correct) && newOptions.length > 0) {
      newOptions[0].is_correct = true;
    }
    setOptions(newOptions);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (options.filter(opt => opt.is_correct).length !== 1) {
      setError("You must select exactly one correct answer.");
      setLoading(false);
      return;
    }
    const filledOptions = options.filter(opt => opt.option_text_en.trim() !== '');
    if (filledOptions.length < 2) {
        setError("Please provide at least two answer options.");
        setLoading(false);
        return;
    }

    try {
      const questionData = {
        question_text_en: questionText, explanation_en: explanation,
        difficulty_level: difficulty, is_published: isPublished, language: 'en',
      };
      let upsertedQuestionId = question?.id;
      if (upsertedQuestionId) {
        const { error: updateError } = await supabase.from('questions').update(questionData).eq('id', upsertedQuestionId);
        if (updateError) throw updateError;
      } else {
        const { data: newQuestion, error: insertError } = await supabase.from('questions').insert(questionData).select('id').single();
        if (insertError) throw insertError;
        upsertedQuestionId = newQuestion.id;
      }
      if (!upsertedQuestionId) throw new Error("Could not save the question.");

      await supabase.from('options').delete().eq('question_id', upsertedQuestionId);
      const optionsToInsert = filledOptions.map(opt => ({
        question_id: upsertedQuestionId, option_text_en: opt.option_text_en, is_correct: opt.is_correct,
      }));
      const { error: optionsError } = await supabase.from('options').insert(optionsToInsert);
      if (optionsError) throw optionsError;
      
      await supabase.from('question_categories').delete().eq('question_id', upsertedQuestionId);
      if (selectedCategoryIds.length > 0) {
        const categoriesToInsert = selectedCategoryIds.map(catId => ({
          question_id: upsertedQuestionId, category_id: catId,
        }));
        const { error: categoriesError } = await supabase.from('question_categories').insert(categoriesToInsert);
        if (categoriesError) throw categoriesError;
      }
      onSave();
    } catch (e: any) {
      console.error("Error saving question:", e);
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex justify-between items-center p-6 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-2xl font-bold text-white">{question ? 'Edit' : 'Create New'} Question</h2>
        <button onClick={onCancel} className="p-2 text-gray-500 hover:text-white rounded-full hover:bg-gray-800 transition-colors"><X size={24} /></button>
      </div>
      <form onSubmit={handleSubmit} className="flex-grow p-6 space-y-6 overflow-y-auto">
        <div>
          <label htmlFor="question_text_en" className="block text-sm font-medium text-gray-300">Question</label>
          <textarea id="question_text_en" value={questionText} onChange={(e) => setQuestionText(e.target.value)} required rows={3} className="w-full px-3 py-2 mt-1 text-white bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
        </div>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">Answer Options (Select one correct answer)</label>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-3">
              <button type="button" onClick={() => handleCorrectOptionChange(index)} className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${option.is_correct ? 'border-green-500 bg-green-500' : 'border-gray-500 hover:border-green-500'}`}>{option.is_correct && <Check size={16} className="text-white" />}</button>
              <input type="text" placeholder={`Option ${index + 1}`} value={option.option_text_en} onChange={(e) => handleOptionChange(index, e.target.value)} className="w-full px-3 py-2 text-white bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
              <button type="button" onClick={() => removeOption(index)} disabled={options.length <= 2} className="p-2 text-gray-500 hover:text-red-500 disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"><Trash2 size={18} /></button>
            </div>
          ))}
          <button type="button" onClick={addOption} className="text-sm text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"><Plus size={16}/> Add Option</button>
        </div>
        <MultiSelectCategories allCategories={allCategories} selectedIds={selectedCategoryIds} setSelectedIds={setSelectedCategoryIds} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label htmlFor="difficulty" className="block text-sm font-medium text-gray-300">Difficulty</label><select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className="w-full px-3 py-2 mt-1 text-white bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
          <div className="flex flex-col justify-start pt-2"><label className="block text-sm font-medium text-gray-300">Status</label><div className="flex items-center gap-3 mt-2"><ToggleSwitch checked={isPublished} onChange={setIsPublished} /><span className="text-sm text-gray-200">{isPublished ? 'Published' : 'Draft'}</span></div></div>
        </div>
        <div>
          <label htmlFor="explanation_en" className="block text-sm font-medium text-gray-300">Explanation <span className="text-gray-500">(Optional)</span></label>
          <textarea id="explanation_en" value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} className="w-full px-3 py-2 mt-1 text-white bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
        </div>
      </form>
      <div className="flex-shrink-0 p-6 border-t border-gray-700 bg-gray-900 flex justify-between items-center">
        {error && <div className="flex items-center gap-2 text-red-400 text-sm"><AlertCircle size={18} /><span>{error}</span></div>}
        <div className="flex-grow" />
        <div className="flex gap-4">
            <button type="button" onClick={onCancel} className="px-5 py-2 font-bold text-gray-300 bg-gray-700/50 rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="button" onClick={() => (document.querySelector('form') as HTMLFormElement)?.requestSubmit()} className="px-5 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 disabled:bg-gray-500 flex items-center gap-2" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Saving...' : 'Save Question'}
            </button>
        </div>
      </div>
    </div>
  );
}