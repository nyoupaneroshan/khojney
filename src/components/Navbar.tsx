'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Trophy, LogIn, UserCircle2, BrainCircuit, Settings, LogOut, ChevronDown, ChevronUp, LayoutDashboard, Menu, X } from 'lucide-react'; // Added Menu, X
import { ThemeToggle } from './ThemeToggle';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion'; // For mobile menu animations

export const Navbar = () => {
  const pathname = usePathname();
  const { session, loadingAuth } = useAuth();

  const isAuthenticated = !!session;

  const [showProfileDropdown, setShowProfileDropdown] = useState(false); // For desktop profile dropdown
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);     // For mobile hamburger menu
  const profileDropdownRef = useRef<HTMLDivElement>(null); // Ref for desktop profile dropdown click-outside

  // Condition to hide nav links: Not authenticated AND on the homepage AND auth state has finished loading.
  const shouldHideNavLinks = !isAuthenticated && pathname === '/' && !loadingAuth;

  const navLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Categories', href: '/categories', icon: LayoutGrid },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  ];

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownRef]);

  const handleLogout = async () => {
    setShowProfileDropdown(false); // Close desktop dropdown
    setIsMobileMenuOpen(false);    // Close mobile menu
    await supabase.auth.signOut();
  };

  if (loadingAuth) {
    return (
      <nav className="sticky top-0 z-50 bg-gray-900 bg-opacity-90 backdrop-blur-md border-b border-gray-800 py-4 px-6 shadow-xl">
        <div className="mx-auto max-w-7xl flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold text-white">
            <BrainCircuit size={30} className="text-cyan-400" /> Khojney App
          </Link>
          <div className="text-gray-400 text-sm">Loading user...</div>
        </div>
      </nav>
    );
  }

  const userAvatarUrl = session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${session?.user?.id || 'default'}&colorful=true`;

  return (
    <>
      <nav className="sticky top-0 z-50 bg-gray-900 bg-opacity-90 backdrop-blur-md border-b border-gray-800 py-4 px-6 shadow-xl">
        <div className="mx-auto max-w-7xl flex justify-between items-center">
          {/* Logo / App Name */}
          <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold text-white hover:text-cyan-400 transition-colors">
            <BrainCircuit size={30} className="text-cyan-400" />
            Khojney App
          </Link>

          {/* Desktop Navigation Links */}
          {!shouldHideNavLinks && (
            <div className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-lg font-medium transition-colors
                    ${pathname === link.href ? 'bg-gray-700 text-cyan-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`
                  }
                >
                  <link.icon size={20} />
                  {link.name}
                </Link>
              ))}
            </div>
          )}

          {/* Right side: Theme Toggle & Auth/User Section */}
          <div className="flex items-center gap-4">
            <ThemeToggle />

            {/* Desktop Auth/Profile Section */}
            {isAuthenticated ? (
              <div className="relative hidden md:block" ref={profileDropdownRef}> {/* Hidden on mobile */}
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2 p-2 rounded-full text-gray-300 hover:bg-gray-800 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  aria-label="User menu"
                  aria-expanded={showProfileDropdown}
                >
                  <img src={userAvatarUrl} alt="User Avatar" className="w-8 h-8 rounded-full border border-gray-600" />
                  <span className="hidden lg:inline-block text-sm font-medium">
                    {session?.user?.email?.split('@')[0] || 'User'}
                  </span>
                  {showProfileDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-2 z-50">
                    <Link href="/dashboard" onClick={() => setShowProfileDropdown(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                      <LayoutDashboard size={18} /> Dashboard
                    </Link>
                    <Link href="/settings" onClick={() => setShowProfileDropdown(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                      <Settings size={18} /> Settings
                    </Link>
                    <div className="border-t border-gray-700 my-1"></div>
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors">
                      <LogOut size={18} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/" className="hidden md:flex px-4 py-2 rounded-lg text-white font-semibold bg-cyan-600 hover:bg-cyan-500 transition-colors items-center gap-2"> {/* Hidden on mobile */}
                <LogIn size={20} />
                Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <div className="md:hidden"> {/* Visible on mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                aria-label="Open mobile menu"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 bg-gray-950 z-50 flex flex-col p-6 md:hidden" // Full screen overlay on mobile
          >
            {/* Mobile Menu Header */}
            <div className="flex justify-between items-center mb-8">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-2xl font-extrabold text-white">
                <BrainCircuit size={30} className="text-cyan-400" /> Khojney App
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                aria-label="Close mobile menu"
              >
                <X size={24} />
              </button>
            </div>

            {/* Mobile Auth/Profile Section */}
            {isAuthenticated ? (
              <div className="flex flex-col items-center gap-4 mb-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <img src={userAvatarUrl} alt="User Avatar" className="w-20 h-20 rounded-full border-2 border-cyan-400" />
                <span className="text-lg font-semibold text-white">
                  {session?.user?.email || 'User'}
                </span>
                <div className="flex flex-col w-full space-y-2 mt-4">
                  <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-3 px-4 py-3 rounded-md text-white bg-gray-700 hover:bg-gray-600 transition-colors">
                    <LayoutDashboard size={20} /> Dashboard
                  </Link>
                  <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-3 px-4 py-3 rounded-md text-white bg-gray-700 hover:bg-gray-600 transition-colors">
                    <Settings size={20} /> Settings
                  </Link>
                  <button onClick={handleLogout} className="flex items-center justify-center gap-3 px-4 py-3 rounded-md text-red-400 bg-red-900/20 hover:bg-red-900/30 transition-colors w-full">
                    <LogOut size={20} /> Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-8 w-full">
                <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-lg text-white font-semibold bg-cyan-600 hover:bg-cyan-500 transition-colors">
                  <LogIn size={20} />
                  Login
                </Link>
              </div>
            )}

            {/* Mobile Navigation Links */}
            {!shouldHideNavLinks && (
                <div className="flex flex-col space-y-3">
                    {navLinks.map((link) => (
                    <Link
                        key={link.name}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)} // Close menu on link click
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xl font-medium transition-colors
                            ${pathname === link.href ? 'bg-gray-800 text-cyan-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`
                        }
                    >
                        <link.icon size={24} />
                        {link.name}
                    </Link>
                    ))}
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};