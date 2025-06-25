// src/components/layout/Navbar.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BrainCircuit, Home, LayoutGrid, Trophy, LogIn, Settings, LogOut, 
    LayoutDashboard, Menu, X, ChevronDown, 
    ArrowRight // <-- THIS IS THE FIX: Added the missing icon
} from 'lucide-react';

interface NavbarProps {
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

export const Navbar = ({ onLoginClick, onRegisterClick }: NavbarProps) => {
  const pathname = usePathname();
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const isHomepage = pathname === '/';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownRef]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
    // You might want to redirect here as well, e.g., router.push('/')
  };

  const userAvatarUrl = session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${session?.user?.id || 'default'}&colorful=true`;

  const marketingLinks = [
    { name: 'Features', href: '#features' },
    { name: '✨ AI Planner', href: '#ai-planner' },
    { name: 'FAQ', href: '#faq' },
  ];
  const appLinks = [
    { name: 'Home', href: '/home', icon: Home },
    { name: 'Categories', href: '/categories', icon: LayoutGrid },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  ];

  // --- RENDER HOMEPAGE NAVBAR ---
  if (isHomepage) {
    return (
      <header className="bg-slate-900/60 backdrop-blur-lg fixed top-0 left-0 right-0 z-50 border-b border-slate-700/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-white hover:text-cyan-400 transition-colors">
              <BrainCircuit size={28} className="text-cyan-400" />Khojney
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              {marketingLinks.map((link) => (
                <a key={link.name} href={link.href} className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-gray-300 hover:bg-slate-800 hover:text-white">
                  {link.name}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                  <Link href="/home" className="hidden md:flex items-center gap-2 bg-cyan-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-cyan-500">Go to App <ArrowRight size={18}/></Link>
              ) : (
                <div className="hidden md:flex items-center space-x-4">
                  <button onClick={onLoginClick} className="text-gray-300 hover:text-white font-medium transition-colors">Login</button>
                  <button onClick={onRegisterClick} className="bg-cyan-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-cyan-500 transition-all duration-300">Register</button>
                </div>
              )}
              <div className="md:hidden"><button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-300"><Menu size={24} /></button></div>
            </div>
          </div>
        </div>
        {/* Mobile Menu for Homepage can be implemented here if needed */}
      </header>
    );
  }

  // --- RENDER APP NAVBAR (for all other pages) ---
  return (
    <nav className="sticky top-0 z-50 bg-gray-900 bg-opacity-90 backdrop-blur-md border-b border-gray-800 py-3 px-6 shadow-xl">
      <div className="mx-auto max-w-7xl flex justify-between items-center">
        <Link href="/home" className="flex items-center gap-2 text-2xl font-extrabold text-white hover:text-cyan-400 transition-colors">
          <BrainCircuit size={30} className="text-cyan-400" />
          Khojney App
        </Link>
        
        <div className="hidden md:flex items-center space-x-2">
          {appLinks.map((link) => (
            <Link key={link.name} href={link.href} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${pathname.startsWith(link.href) ? 'bg-gray-700 text-cyan-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
              <link.icon size={20} />{link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="relative hidden md:block" ref={profileDropdownRef}>
              <button onClick={() => setProfileDropdownOpen(!isProfileDropdownOpen)} className="flex items-center gap-2 p-1 rounded-full text-gray-300 hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <img src={userAvatarUrl} alt="User Avatar" className="w-9 h-9 rounded-full border-2 border-gray-600" />
                <ChevronDown size={16} className={`transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -10}} className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-700">
                        <p className="text-sm font-medium text-white truncate">{session.user.user_metadata?.full_name || session.user.email}</p>
                    </div>
                    <Link href="/dashboard" onClick={() => setProfileDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"><LayoutDashboard size={18} /> Dashboard</Link>
                    <div className="border-t border-gray-700 my-1"></div>
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300"><LogOut size={18} /> Logout</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/" className="hidden md:flex px-4 py-2 rounded-lg text-white font-semibold bg-cyan-600 hover:bg-cyan-500"><LogIn size={20} /> Login</Link>
          )}
          <div className="md:hidden"><button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-300"><Menu size={24} /></button></div>
        </div>
      </div>
       {/* Mobile Menu for App */}
    </nav>
  );
};