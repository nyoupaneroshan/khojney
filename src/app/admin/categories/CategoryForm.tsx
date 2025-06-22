// src/app/admin/categories/CategoryForm.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

// --- INTERFACES ---
interface Category {
  id?: string;
  name_en: string;
  name_ne: string;
  slug: string;
  description_en: string;
  description_ne: string;
  is_published: boolean;
  parent_category_id: string | null;
}

interface CategoryFormProps {
  category?: Category | null;
  onSave: (category: Category) => void;
  onCancel: () => void;
  allCategories: Category[];
}

// --- UI SUB-COMPONENTS ---
const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (checked: boolean) => void }) => (
    <button type="button" onClick={() => onChange(!checked)} className={`${checked ? 'bg-cyan-600' : 'bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900`} role="switch" aria-checked={checked}>
        <span aria-hidden="true" className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
);

// --- MAIN FORM COMPONENT ---
export default function CategoryForm({ category, onSave, onCancel, allCategories = [] }: CategoryFormProps) {
  const [name_en, setNameEn] = useState('');
  const [name_ne, setNameNe] = useState('');
  const [slug, setSlug] = useState('');
  const [description_en, setDescriptionEn] = useState('');
  const [description_ne, setDescriptionNe] = useState('');
  const [is_published, setIsPublished] = useState(false);
  const [parent_category_id, setParentCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setNameEn(category.name_en || '');
      setNameNe(category.name_ne || '');
      setSlug(category.slug || '');
      setDescriptionEn(category.description_en || '');
      setDescriptionNe(category.description_ne || '');
      setIsPublished(category.is_published || false);
      setParentCategoryId(category.parent_category_id || null);
    } else {
        // Reset form for "Create New"
        setNameEn('');
        setNameNe('');
        setSlug('');
        setDescriptionEn('');
        setDescriptionNe('');
        setIsPublished(false);
        setParentCategoryId(null);
    }
  }, [category]);
  
  const generateSlug = () => {
    setSlug(name_en.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const categoryData = {
      name_en, name_ne, slug, description_en, description_ne,
      is_published, parent_category_id: parent_category_id === '' ? null : parent_category_id,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = category?.id
      ? await supabase.from('categories').update(categoryData).eq('id', category.id).select().single()
      : await supabase.from('categories').insert(categoryData).select().single();
    if (error) {
      setError(error.message);
    } else if (data) {
      onSave(data);
    }
    setLoading(false);
  };
  
  const potentialParents = allCategories.filter(c => c.id !== category?.id);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* --- FORM HEADER --- */}
      <header className="flex-shrink-0 flex justify-between items-center p-6 border-b border-gray-700">
        <h2 className="text-2xl font-bold">{category ? 'Edit' : 'Create New'} Category</h2>
        <button onClick={onCancel} className="p-2 text-gray-500 hover:text-white rounded-full hover:bg-gray-800 transition-colors"><X size={24} /></button>
      </header>
      
      {/* --- FORM BODY --- */}
      <form onSubmit={handleSubmit} className="flex-grow p-6 space-y-8 overflow-y-auto">
        {/* Section 1: Basic Information */}
        <section className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-400 border-b border-cyan-400/20 pb-2">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label htmlFor="name_en" className="block text-sm font-medium text-gray-300">English Name</label><input id="name_en" type="text" value={name_en} onChange={(e) => setNameEn(e.target.value)} className="w-full mt-1 input-base" required /></div>
                <div><label htmlFor="name_ne" className="block text-sm font-medium text-gray-300">Nepali Name</label><input id="name_ne" type="text" value={name_ne} onChange={(e) => setNameNe(e.target.value)} className="w-full mt-1 input-base" /></div>
            </div>
            <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-300">Slug</label>
                <div className="flex items-center gap-2 mt-1">
                    <input id="slug" type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full input-base" required />
                    <button type="button" onClick={generateSlug} title="Generate slug from English name" className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"><RefreshCw size={18}/></button>
                </div>
            </div>
            <div>
                <label htmlFor="parent_category" className="block text-sm font-medium text-gray-300">Parent Category</label>
                <select id="parent_category" value={parent_category_id || ''} onChange={(e) => setParentCategoryId(e.target.value || null)} className="w-full mt-1 input-base">
                    <option value="">-- No Parent (Top Level) --</option>
                    {potentialParents.map(parent => (<option key={parent.id} value={parent.id}>{parent.name_en}</option>))}
                </select>
            </div>
        </section>

        {/* Section 2: Content */}
        <section className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-400 border-b border-cyan-400/20 pb-2">Content</h3>
            <div><label htmlFor="description_en" className="block text-sm font-medium text-gray-300">English Description</label><textarea id="description_en" value={description_en} onChange={(e) => setDescriptionEn(e.target.value)} rows={3} className="w-full mt-1 input-base"/></div>
            <div><label htmlFor="description_ne" className="block text-sm font-medium text-gray-300">Nepali Description</label><textarea id="description_ne" value={description_ne} rows={3} onChange={(e) => setDescriptionNe(e.target.value)} className="w-full mt-1 input-base"/></div>
        </section>

        {/* Section 3: Settings */}
        <section>
            <h3 className="text-lg font-semibold text-cyan-400 border-b border-cyan-400/20 pb-2">Settings</h3>
            <div className="flex items-center justify-between mt-4 p-3 bg-gray-800/50 rounded-lg">
                <label htmlFor="is_published" className="font-medium text-gray-200">Publish Category</label>
                <ToggleSwitch checked={is_published} onChange={setIsPublished} />
            </div>
        </section>
      </form>
      
      {/* --- STICKY FORM FOOTER --- */}
      <footer className="flex-shrink-0 p-6 border-t border-gray-700 bg-gray-900 flex justify-between items-center">
        {error && <div className="flex items-center gap-2 text-red-400 text-sm"><AlertCircle size={18} /><span>{error}</span></div>}
        <div className="flex-grow" />
        <div className="flex gap-4">
            <button type="button" onClick={onCancel} className="px-5 py-2 font-bold text-gray-300 bg-gray-700/50 rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="button" onClick={() => (document.querySelector('form') as HTMLFormElement)?.requestSubmit()} className="px-5 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 disabled:bg-gray-500 flex items-center gap-2" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Saving...' : 'Save Category'}
            </button>
        </div>
      </footer>
    </div>
  );
}