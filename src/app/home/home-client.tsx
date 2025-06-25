// src/app/home-client.tsx

'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, LogOut, Search, Menu, X, BrainCircuit, ChevronRight, UserCircle, Star, SortAsc, Users } from 'lucide-react';
import Auth from '@/components/Auth';
import { Category, HierarchicalCategory } from '../types';
import { useAuth } from '@/components/AuthContext';

// --- Debounce Hook (Logic Unchanged) ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// =================================================================
// REDESIGNED & NEW PRESENTATIONAL COMPONENTS
// =================================================================

const NavLinks = ({ onLogout, onLinkClick }: { onLogout: () => void; onLinkClick?: () => void }) => (
  <>
    <Link href="/dashboard" onClick={onLinkClick} className="flex items-center gap-3 rounded-md px-3 py-2 text-gray-300 transition-colors hover:bg-slate-700 hover:text-white">
      <LayoutDashboard size={20} />
      <span>Dashboard</span>
    </Link>
    <button onClick={() => { onLogout(); onLinkClick?.(); }} className="flex items-center gap-3 rounded-md px-3 py-2 text-red-400 transition-colors hover:bg-slate-700 hover:text-red-300">
      <LogOut size={20} />
      <span>Logout</span>
    </button>
  </>
);

const MobileMenu = ({ isOpen, onLogout, closeMenu }: { isOpen: boolean; onLogout: () => void; closeMenu: () => void }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="absolute top-full left-0 right-0 z-40 bg-slate-800/90 backdrop-blur-md shadow-2xl rounded-b-xl border-b border-t border-slate-700 md:hidden"
            >
                <nav className="p-4 flex flex-col space-y-1">
                    <NavLinks onLogout={onLogout} onLinkClick={closeMenu} />
                </nav>
            </motion.div>
        )}
    </AnimatePresence>
);

const Header = ({ user, onLogout, onMenuToggle }: { user: User; onLogout: () => void; onMenuToggle: () => void; }) => (
  <motion.header
    initial={{ opacity: 0, y: -40 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    className="relative z-50 flex justify-between items-center mb-12"
  >
    <Link href="/" className="flex items-center gap-4">
        {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="User Avatar" className="w-12 h-12 rounded-full border-2 border-slate-600" />
        ) : (
            <UserCircle className="w-12 h-12 text-slate-500" />
        )}
        <div>
            <span className="text-sm font-medium text-slate-400">Welcome back,</span>
            <h1 className="text-xl font-bold text-slate-100">
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
            </h1>
        </div>
    </Link>
    
    <nav className="hidden md:flex items-center gap-2">
      <NavLinks onLogout={onLogout} />
    </nav>

    <div className="md:hidden">
      <button onClick={onMenuToggle} className="p-2 text-slate-300 hover:text-white transition-colors">
        <Menu size={28} />
      </button>
    </div>
  </motion.header>
);

const SearchBar = ({ searchTerm, setSearchTerm }: { searchTerm: string, setSearchTerm: (term: string) => void }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        className="relative mb-8 max-w-xl mx-auto"
    >
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={22} />
        <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for an exam or subject..."
            className="w-full bg-slate-800/70 border border-slate-700 rounded-full py-4 pl-14 pr-12 text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-cyan-500/80 focus:border-cyan-500/10 transition-all duration-300 shadow-lg backdrop-blur-sm"
        />
        <AnimatePresence>
            {searchTerm && (
                <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </motion.button>
            )}
        </AnimatePresence>
    </motion.div>
);

// --- NEW: Filter Controls Component ---
type SortOrder = 'alphabetical' | 'popular';
const FilterControls = ({ sortOrder, setSortOrder }: { sortOrder: SortOrder, setSortOrder: (order: SortOrder) => void }) => {
    const baseClasses = "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300";
    const activeClasses = "bg-cyan-600 text-white shadow-md";
    const inactiveClasses = "bg-slate-800 text-slate-300 hover:bg-slate-700";
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center items-center gap-4 mb-12"
        >
            <button onClick={() => setSortOrder('alphabetical')} className={`${baseClasses} ${sortOrder === 'alphabetical' ? activeClasses : inactiveClasses}`}>
                <SortAsc size={16} /> Alphabetical
            </button>
            <button onClick={() => setSortOrder('popular')} className={`${baseClasses} ${sortOrder === 'popular' ? activeClasses : inactiveClasses}`}>
                <Users size={16} /> Popular
            </button>
        </motion.div>
    );
};

// --- NEW: Featured Exams Component ---
const FeaturedExams = ({ categories }: { categories: Category[] }) => (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-16"
    >
        <div className="flex items-center gap-3 mb-4">
            <Star className="text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Top Exams</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(category => (
                <Link key={category.id} href={`/category/${category.slug}`} legacyBehavior>
                    <motion.a
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="block text-center p-4 bg-slate-800/80 border border-slate-700 rounded-lg hover:bg-slate-700/60 hover:border-cyan-500/50 transition-all duration-200 cursor-pointer"
                    >
                        <h3 className="font-semibold text-white">{category.name_en}</h3>
                        {category.name_ne && <p className="text-xs text-slate-400">{category.name_ne}</p>}
                    </motion.a>
                </Link>
            ))}
        </div>
    </motion.div>
);


const SubCategoryList = ({ subCategories }: { subCategories: HierarchicalCategory[] }) => (
    <div className="bg-black/20 px-6 py-5 border-t border-slate-700/60">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Included Topics</h3>
        <ul className="space-y-2">
            {subCategories.map(sub => (
                <motion.li key={sub.id} whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                    <Link
                        href={`/category/${sub.slug}`}
                        className="flex items-center justify-between text-slate-300 hover:text-cyan-400 transition-colors group"
                    >
                        <span>{sub.name_en}</span>
                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-transform group-hover:translate-x-1" />
                    </Link>
                </motion.li>
            ))}
        </ul>
    </div>
);

const CategoryCard = ({ category }: { category: HierarchicalCategory }) => (
  <motion.div
    layout
    variants={itemVariants}
    whileHover={{ scale: 1.02, y: -5 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    className="bg-slate-800/50 border border-slate-700/60 rounded-xl shadow-lg relative overflow-hidden backdrop-blur-sm group flex flex-col"
  >
    <div className="p-6 flex-grow">
      <Link href={`/category/${category.slug}`} className="block">
        <div className="flex items-start gap-4 mb-4">
            <div className="mt-1 p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg flex-shrink-0">
                <BrainCircuit className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {category.name_en}
                </h2>
                {category.name_ne && <p className="text-sm text-slate-400 font-light">{category.name_ne}</p>}
            </div>
        </div>
        {category.description_en && <p className="text-slate-400 text-sm font-light leading-relaxed h-20 overflow-hidden">{category.description_en}</p>}
      </Link>
    </div>

    {category.subCategories.length > 0 && (
      <SubCategoryList subCategories={category.subCategories} />
    )}
  </motion.div>
);


// =================================================================
// MAIN CLIENT COMPONENT (LOGIC UPDATED FOR NEW FEATURES)
// =================================================================
export default function HomeClient({ session, initialCategories }: { session: Session | null, initialCategories: Category[] }) {
  const { session: authSession, loadingAuth } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('alphabetical');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const finalSession = session || authSession;
  
  // Logic Unchanged
  const filteredCategories = useMemo(() => {
    if (!debouncedSearchTerm) {
      return initialCategories;
    }
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    const categoryMap = new Map(initialCategories.map(c => [c.id, c]));
    const includedIds = new Set<string>();
    initialCategories.forEach(category => {
      if (
        category.name_en.toLowerCase().includes(lowercasedTerm) ||
        (category.name_ne && category.name_ne.toLowerCase().includes(lowercasedTerm)) ||
        (category.description_en && category.description_en.toLowerCase().includes(lowercasedTerm))
      ) {
        let current: Category | undefined = category;
        while (current) {
          includedIds.add(current.id);
          if (current.parent_category_id && categoryMap.has(current.parent_category_id)) {
            current = categoryMap.get(current.parent_category_id)!;
          } else {
            current = undefined; 
          }
        }
      }
    });
    return initialCategories.filter(c => includedIds.has(c.id));
  }, [debouncedSearchTerm, initialCategories]);

  // Logic updated to handle sorting
  const hierarchicalCategories = useMemo(() => {
    const categoryMap = new Map<string, HierarchicalCategory>();
    const topLevelCategories: HierarchicalCategory[] = [];
    filteredCategories.forEach(category => {
      categoryMap.set(category.id, { ...category, subCategories: [] });
    });
    const filteredAndMappedCategories = Array.from(categoryMap.values()).filter(c => {
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        return !debouncedSearchTerm ||
               c.name_en.toLowerCase().includes(lowercasedTerm) ||
               (c.name_ne && c.name_ne.toLowerCase().includes(lowercasedTerm)) ||
               (c.description_en && c.description_en.toLowerCase().includes(lowercasedTerm));
    });
    filteredAndMappedCategories.forEach(category => {
      if (category.parent_category_id && categoryMap.has(category.parent_category_id)) {
        const parent = categoryMap.get(category.parent_category_id)!;
        if (!parent.subCategories.some(sub => sub.id === category.id)) {
          parent.subCategories.push(category);
        }
      } else {
        if (!topLevelCategories.some(t => t.id === category.id)) {
            topLevelCategories.push(category);
        }
      }
    });
    categoryMap.forEach(cat => {
      cat.subCategories.sort((a, b) => a.name_en.localeCompare(b.name_en));
    });
    
    // Sorting logic implementation
    topLevelCategories.sort((a, b) => {
        if (sortOrder === 'popular') {
            // Sort by number of sub-categories (more topics = more popular)
            return b.subCategories.length - a.subCategories.length;
        }
        // Default to alphabetical
        return a.name_en.localeCompare(b.name_en);
    });

    return topLevelCategories;
  }, [filteredCategories, debouncedSearchTerm, sortOrder]);

  // NEW: Memoized list of featured exams
  const featuredExams = useMemo(() => {
      // In a real app, this might come from a DB flag. Here we hardcode them.
      const featuredSlugs = ['cmat', 'physics', 'chemistry', 'general-knowledge'];
      return initialCategories
        .filter(c => featuredSlugs.includes(c.slug))
        .sort((a,b) => featuredSlugs.indexOf(a.slug) - featuredSlugs.indexOf(b.slug)); // Keep order consistent
  }, [initialCategories]);

  const handleLogout = async () => { await supabase.auth.signOut(); };
  const toggleMobileMenu = () => setMobileMenuOpen(prev => !prev);
  
  return (
    <main className="min-h-screen relative overflow-x-hidden bg-slate-900 text-white font-sans flex flex-col items-center py-8 px-4 sm:px-6 md:px-8">
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl opacity-40 animate-blob-slow -translate-x-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl opacity-40 animate-blob-slow animation-delay-2000 translate-x-1/2"></div>

      <div className="mx-auto max-w-6xl w-full z-10">
        <AnimatePresence mode="wait">
          {loadingAuth ? (
            <motion.div key="loading" className="flex items-center justify-center h-[80vh] text-slate-400">Loading...</motion.div>
          ) : !finalSession ? (
            <motion.div key="auth" className="flex items-center justify-center h-[80vh]">
              <Auth />
            </motion.div>
          ) : (
            <motion.div key="main-content">
              <Header user={finalSession.user} onLogout={handleLogout} onMenuToggle={toggleMobileMenu} />
              <MobileMenu isOpen={isMobileMenuOpen} onLogout={handleLogout} closeMenu={() => setMobileMenuOpen(false)} />

              <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

              {/* Conditionally render featured exams only when not searching */}
              {!debouncedSearchTerm && featuredExams.length > 0 && (
                  <FeaturedExams categories={featuredExams} />
              )}
              
              <FilterControls sortOrder={sortOrder} setSortOrder={setSortOrder} />
              
              <AnimatePresence mode="popLayout">
                {hierarchicalCategories.length > 0 ? (
                    <motion.div
                        layout
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8"
                    >
                        {hierarchicalCategories.map((category) => (
                            <CategoryCard key={category.id} category={category} />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="no-results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="text-center py-16 px-6 bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-xl mt-8 backdrop-blur-sm"
                    >
                        <BrainCircuit className="mx-auto h-16 w-16 text-slate-600 mb-6" />
                        <h3 className="text-2xl font-semibold text-slate-200">No Exams Found</h3>
                        <p className="text-slate-400 mt-2 max-w-md mx-auto">
                            Your search for "{searchTerm}" did not match any exams. Please try another keyword.
                        </p>
                    </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
