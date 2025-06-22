// src/app/admin/categories/page.tsx

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Edit, Search, ChevronsUpDown, CheckCircle2, EyeOff, LayoutGrid, ChevronRight, ChevronDown, UploadCloud, FileText, Download, AlertTriangle } from 'lucide-react';
import CategoryForm from './CategoryForm';
import { AdminLoading, AccessDenied } from '@/app/admin/AdminStates';

// --- INTERFACES ---
interface Category {
  id: string;
  name_en: string;
  name_ne: string;
  slug: string;
  description_en: string;
  description_ne: string;
  is_published: boolean;
  parent_category_id: string | null;
  created_at: string;
}

// NEW: Interface for bulk category data from CSV
interface BulkCategory {
    name_en: string;
    slug: string;
    name_ne?: string;
    description_en?: string;
    description_ne?: string;
    parent_category_name?: string; // Use name for user-friendliness in CSV
    is_published?: boolean;
}


// --- MODERN UI SUB-COMPONENTS ---
const StatCard = ({ icon, title, value, colorClass }: { icon: React.ReactNode, title: string, value: number, colorClass: string }) => (
  <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-5">
    <div className="flex items-center gap-4">
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  </div>
);

// --- NEW: Bulk Upload Component for Categories ---
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

    const parseCSV = (csvText: string): BulkCategory[] => {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers.forEach((header, index) => row[header] = values[index]);
            return {
                name_en: row.name_en,
                slug: row.slug,
                name_ne: row.name_ne,
                description_en: row.description_en,
                description_ne: row.description_ne,
                parent_category_name: row.parent_category_name,
                is_published: row.is_published ? row.is_published.toLowerCase() === 'true' : true,
            };
        });
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
                const categoriesToUpload = parseCSV(content);
                const categoryMap = new Map(allCategories.map(c => [c.name_en.toLowerCase(), c.id]));
                let categoriesAdded = 0;

                for (const cat of categoriesToUpload) {
                    let parent_category_id: string | null = null;
                    if (cat.parent_category_name) {
                        parent_category_id = categoryMap.get(cat.parent_category_name.toLowerCase()) || null;
                        if (!parent_category_id) {
                            throw new Error(`Parent category "${cat.parent_category_name}" not found for child "${cat.name_en}". Please ensure parents exist or are listed before children in the CSV.`);
                        }
                    }
                    
                    const { data: newCatData, error } = await supabase.from('categories').insert({
                        name_en: cat.name_en, slug: cat.slug, name_ne: cat.name_ne,
                        description_en: cat.description_en, description_ne: cat.description_ne,
                        parent_category_id: parent_category_id,
                        is_published: cat.is_published ?? true
                    }).select('id, name_en').single();

                    if (error) throw new Error(`Error adding category "${cat.name_en}": ${error.message}`);
                    
                    // Add newly created category to the map so it can be a parent for subsequent rows
                    categoryMap.set(newCatData.name_en.toLowerCase(), newCatData.id);
                    categoriesAdded++;
                }
                setFeedback({ type: 'success', message: `Successfully added ${categoriesAdded} categories!` });
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

    const downloadSampleCSV = () => {
        const headers = "name_en,slug,name_ne,description_en,description_ne,parent_category_name,is_published";
        const exampleRow = `"Physics","physics","भौतिक विज्ञान","Questions related to classical and modern physics.","","","true"`;
        const exampleChildRow = `"Quantum Mechanics","quantum-mechanics","क्वान्टम मेकानिक्स","The study of matter and light on the atomic and subatomic scale.","","Physics","true"`;
        const csvContent = "data:text/csv;charset=utf-8," + [headers, exampleRow, exampleChildRow].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "sample_categories.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const sampleHeaders = `name_en, slug, name_ne, description_en, parent_category_name, ...`;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-12">
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-4"><UploadCloud className="h-6 w-6 text-cyan-400" /><h3 className="text-xl font-bold text-white">Bulk Import Categories</h3></div>
                <p className="text-sm text-slate-400 mb-4">Upload a CSV file to add multiple categories at once.</p>
                <div className="flex items-center gap-4">
                    <label htmlFor="file-upload" className="cursor-pointer bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors">{file ? 'File Selected' : 'Choose File'}</label>
                    <input id="file-upload" type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                    <span className="text-slate-500 text-sm truncate">{file?.name || 'No file chosen'}</span>
                </div>
                <button onClick={handleUpload} disabled={!file || isUploading} className="w-full mt-4 py-2.5 px-4 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">{isUploading ? 'Uploading...' : 'Upload Categories'}</button>
                {feedback && <div className={`mt-4 p-3 rounded-md text-sm flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{feedback.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}{feedback.message}</div>}
            </div>
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3"><FileText className="h-6 w-6 text-slate-400" /><h3 className="text-xl font-bold text-white">CSV Data Format</h3></div>
                    <button onClick={downloadSampleCSV} className="flex items-center gap-2 text-sm bg-slate-700 text-white font-semibold py-2 px-3 rounded-lg hover:bg-slate-600 transition-colors"><Download size={16} /> Download Sample</button>
                </div>
                <p className="text-sm text-slate-400 mb-4">File must have exact headers. `parent_category_name` must match an existing `name_en`.</p>
                <pre className="bg-black/50 p-4 rounded-md text-xs text-slate-300 overflow-x-auto"><code>{sampleHeaders}</code></pre>
            </div>
        </div>
    );
};

const CategoryRow: React.FC<CategoryRowProps> = ({ category, level, allCategories, handleEdit, searchTerm, statusFilter }) => {
  const [isOpen, setIsOpen] = useState(false);

  const subCategories = useMemo(() => {
    return allCategories
      .filter(cat => cat.parent_category_id === category.id)
      .sort((a, b) => a.name_en.localeCompare(b.name_en));
  }, [allCategories, category.id]);

  const matchesFilters = useCallback((cat: Category): boolean => {
    const nameMatches = cat.name_en.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatches = statusFilter === 'all' || (statusFilter === 'published' ? cat.is_published : !cat.is_published);
    return nameMatches && statusMatches;
  }, [searchTerm, statusFilter]);

  const shouldDisplay = useMemo(() => {
    if (matchesFilters(category)) return true;
    const checkDescendants = (cats: Category[]): boolean => {
      for (const cat of cats) {
        if (matchesFilters(cat)) return true;
        const children = allCategories.filter(c => c.parent_category_id === cat.id);
        if (checkDescendants(children)) return true;
      }
      return false;
    };
    return checkDescendants(subCategories);
  }, [category, subCategories, matchesFilters, allCategories]);

  if (!shouldDisplay) return null;

  return (
    <>
      <tr className="border-t border-slate-700/50 hover:bg-slate-700/50">
        <td className="p-4 font-semibold" style={{ paddingLeft: `${16 + level * 20}px` }}>
          <div className="flex items-center gap-2">
            {subCategories.length > 0 ? (
              <button onClick={() => setIsOpen(!isOpen)} className="text-slate-400 hover:text-white mr-1">
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : <div style={{ width: '20px' }} /> }
            {category.name_en}
          </div>
        </td>
        <td className="p-4 text-slate-400 font-mono hidden sm:table-cell">{category.slug}</td>
        <td className="p-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${category.is_published ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{category.is_published ? 'Published' : 'Draft'}</span></td>
        <td className="p-4 text-slate-400 hidden md:table-cell">{new Date(category.created_at).toLocaleDateString()}</td>
        <td className="p-4 text-right"><button onClick={() => handleEdit(category)} className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"><Edit size={14} /> Edit</button></td>
      </tr>
      {isOpen && subCategories.map(subCat => ( <CategoryRow key={subCat.id} category={subCat} level={level + 1} allCategories={allCategories} handleEdit={handleEdit} searchTerm={searchTerm} statusFilter={statusFilter} /> ))}
    </>
  );
};


// --- MAIN PAGE COMPONENT ---
export default function ManageCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Category; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
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
            await fetchCategories();
          }
        }
      } catch (error) {
        console.error("Auth/Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };
    checkAdminAndFetchData();
  }, [fetchCategories]);

  const handleEdit = (category: Category) => { setEditingCategory(category); setShowForm(true); };
  const handleCreateNew = () => { setEditingCategory(null); setShowForm(true); };
  const handleCancel = () => { setShowForm(false); setEditingCategory(null); };
  const handleSave = () => { setShowForm(false); setEditingCategory(null); fetchCategories(); };

  const stats = useMemo(() => {
    const published = categories.filter(c => c.is_published).length;
    return { total: categories.length, published, drafts: categories.length - published };
  }, [categories]);

  const topLevelCategories = useMemo(() => {
    return categories.filter(c => c.parent_category_id === null)
      .sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [categories, sortConfig]);

  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return topLevelCategories.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [topLevelCategories, currentPage]);

  const totalPages = Math.ceil(topLevelCategories.length / ITEMS_PER_PAGE);

  const requestSort = (key: keyof Category) => {
    let direction: 'asc' | 'desc' = (sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    setCurrentPage(1);
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
              key={editingCategory ? editingCategory.id : 'create-new-category'}
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-gray-900 shadow-2xl z-50 border-l border-gray-800"
            >
              <CategoryForm category={editingCategory} onSave={handleSave} onCancel={handleCancel} allCategories={categories} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <main className="w-full p-8 sm:p-12 bg-gray-900 text-white min-h-screen">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10"><Link href="/admin" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"><ArrowLeft size={16} /> Back to Admin Dashboard</Link></div>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
            <h1 className="text-4xl font-bold">Category Management</h1>
            <button onClick={handleCreateNew} className="inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-5 rounded-lg transition-colors"><Plus size={18} /> New Category</button>
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard icon={<LayoutGrid size={22} />} title="Total Categories" value={stats.total} colorClass="bg-purple-500/20 text-purple-300" />
            <StatCard icon={<CheckCircle2 size={22} />} title="Published" value={stats.published} colorClass="bg-green-500/20 text-green-300" />
            <StatCard icon={<EyeOff size={22} />} title="Drafts" value={stats.drafts} colorClass="bg-yellow-500/20 text-yellow-300" />
          </motion.div>
          
          {/* NEW: Rendering the bulk upload section */}
          <BulkUploadSection allCategories={categories} onUploadComplete={fetchCategories} />

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input type="text" placeholder="Search categories..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }} className="bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="all">All Statuses</option><option value="published">Published</option><option value="draft">Draft</option>
            </select>
          </div>
          <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="p-4 cursor-pointer hover:bg-gray-700/50 transition-colors" onClick={() => requestSort('name_en')}><div className="flex items-center gap-2">Name <ChevronsUpDown size={14} /></div></th>
                    <th className="p-4 cursor-pointer hover:bg-gray-700/50 transition-colors hidden sm:table-cell" onClick={() => requestSort('slug')}><div className="flex items-center gap-2">Slug <ChevronsUpDown size={14} /></div></th>
                    <th className="p-4 cursor-pointer hover:bg-gray-700/50 transition-colors" onClick={() => requestSort('is_published')}><div className="flex items-center gap-2">Status <ChevronsUpDown size={14} /></div></th>
                    <th className="p-4 cursor-pointer hover:bg-gray-700/50 transition-colors hidden md:table-cell" onClick={() => requestSort('created_at')}><div className="flex items-center gap-2">Created <ChevronsUpDown size={14} /></div></th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCategories.length > 0 ? (
                    paginatedCategories.map(category => (
                      <CategoryRow key={category.id} category={category} level={0} allCategories={categories} handleEdit={handleEdit} searchTerm={searchTerm} statusFilter={statusFilter}/>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="text-center text-gray-500 py-16">No categories found matching your criteria.</td></tr>
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
